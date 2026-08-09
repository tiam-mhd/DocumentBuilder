import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  WorkspaceBackupStatus as PrismaBackupStatus,
  WorkspaceRestoreStatus as PrismaRestoreStatus,
} from '@prisma/client';
import type { Job } from 'bullmq';
import JSZip from 'jszip';
import {
  AuditActions,
  BackupErrorCodes,
  type BusinessBackupManifest,
  type PublicWorkspaceBackupJob,
  type PublicWorkspaceRestoreJob,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { MongoService } from '../../config/mongo/mongo.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  OBJECT_STORAGE,
  type ObjectStorage,
} from '../assets/storage/object-storage.port';
import {
  BackupQueueService,
  type BackupWorkspaceJobPayload,
} from './backup-queue.service';
import {
  RestoreQueueService,
  type RestoreWorkspaceJobPayload,
} from './restore-queue.service';
import {
  BACKUP_MANIFEST_NAME,
  BACKUP_MONGO_NAME,
  BACKUP_PG_NAME,
  buildManifest,
  emptyBackupCounts,
  extFromKey,
  newEntityId,
  parseManifest,
  remapId,
  serializeRow,
  type BackupMongoPayload,
  type BackupPgPayload,
} from './package-format';

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mongo: MongoService,
    private readonly config: ConfigService,
    private readonly backupQueue: BackupQueueService,
    private readonly restoreQueue: RestoreQueueService,
    private readonly audit: AuditService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  onModuleInit(): void {
    this.backupQueue.startWorker((job) => this.processBackupJob(job));
    this.restoreQueue.startWorker((job) => this.processRestoreJob(job));
  }

  async createBackup(input: {
    businessId: string;
    userId: string;
  }): Promise<PublicWorkspaceBackupJob> {
    const row = await this.prisma.workspaceBackupJob.create({
      data: {
        businessId: input.businessId,
        createdByUserId: input.userId,
        status: PrismaBackupStatus.queued,
      },
    });
    try {
      await this.backupQueue.enqueue({
        jobId: row.id,
        businessId: input.businessId,
      });
    } catch (err) {
      await this.prisma.workspaceBackupJob.update({
        where: { id: row.id },
        data: {
          status: PrismaBackupStatus.failed,
          errorCode: BackupErrorCodes.QueueUnavailable,
          errorMessage: err instanceof Error ? err.message : 'Queue error',
          finishedAt: new Date(),
        },
      });
      throw new DomainException(
        BackupErrorCodes.QueueUnavailable,
        'Backup queue unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return this.toPublicBackup(row);
  }

  async getBackup(
    businessId: string,
    jobId: string,
  ): Promise<PublicWorkspaceBackupJob> {
    const row = await this.requireBackup(businessId, jobId);
    return this.toPublicBackup(row);
  }

  async listBackups(
    businessId: string,
    page: number,
    pageSize: number,
  ): Promise<{
    items: PublicWorkspaceBackupJob[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const p = Math.max(1, page);
    const ps = Math.min(50, Math.max(1, pageSize));
    const where = { businessId };
    const [rows, total] = await Promise.all([
      this.prisma.workspaceBackupJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * ps,
        take: ps,
      }),
      this.prisma.workspaceBackupJob.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toPublicBackup(r)),
      total,
      page: p,
      pageSize: ps,
    };
  }

  async readBackupFile(
    businessId: string,
    jobId: string,
  ): Promise<{ body: Buffer; contentType: string; filename: string }> {
    const row = await this.requireBackup(businessId, jobId);
    if (row.status !== PrismaBackupStatus.completed || !row.storageKey) {
      throw new DomainException(
        BackupErrorCodes.NotReady,
        'Backup not ready',
        HttpStatus.CONFLICT,
      );
    }
    const obj = await this.storage.get(row.storageKey);
    if (!obj) {
      throw new DomainException(
        BackupErrorCodes.NotFound,
        'Backup file missing',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      body: obj.body,
      contentType: obj.contentType || 'application/zip',
      filename: `business-backup-${businessId.slice(0, 8)}.zip`,
    };
  }

  async uploadRestorePackage(input: {
    businessId: string;
    userId: string;
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<PublicWorkspaceRestoreJob> {
    const maxBytes = this.config.get<number>('BACKUP_MAX_BYTES') ?? 100 * 1024 * 1024;
    if (!input.buffer?.length) {
      throw new DomainException(
        BackupErrorCodes.FileRequired,
        'ZIP file required',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (input.buffer.length > maxBytes) {
      throw new DomainException(
        BackupErrorCodes.FileTooLarge,
        'Backup ZIP too large',
        HttpStatus.BAD_REQUEST,
      );
    }

    let manifest: BusinessBackupManifest;
    try {
      const zip = await JSZip.loadAsync(input.buffer);
      const manifestFile = zip.file(BACKUP_MANIFEST_NAME);
      if (!manifestFile) throw new Error('manifest.json missing');
      const text = await manifestFile.async('string');
      manifest = parseManifest(JSON.parse(text));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'parse failed';
      if (msg.includes('unsupported formatVersion')) {
        throw new DomainException(
          BackupErrorCodes.UnsupportedVersion,
          msg,
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new DomainException(
        BackupErrorCodes.InvalidPackage,
        msg,
        HttpStatus.BAD_REQUEST,
      );
    }

    const jobId = newEntityId();
    const storageKey = `${input.businessId}/restores/${jobId}/package.zip`;
    await this.storage.put(storageKey, input.buffer, 'application/zip');

    const targetEmpty = await this.isWorkspaceEmpty(input.businessId);
    const row = await this.prisma.workspaceRestoreJob.create({
      data: {
        id: jobId,
        businessId: input.businessId,
        createdByUserId: input.userId,
        status: PrismaRestoreStatus.uploaded,
        storageKey,
        byteSize: input.buffer.length,
        originalFilename: input.filename.slice(0, 255),
        mimeType: input.mimeType || 'application/zip',
        preview: manifest as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toPublicRestore(row, targetEmpty);
  }

  async getRestore(
    businessId: string,
    jobId: string,
  ): Promise<PublicWorkspaceRestoreJob> {
    const row = await this.requireRestore(businessId, jobId);
    const targetEmpty = await this.isWorkspaceEmpty(businessId);
    return this.toPublicRestore(row, targetEmpty);
  }

  async commitRestore(input: {
    businessId: string;
    jobId: string;
    confirmReplace: boolean;
  }): Promise<PublicWorkspaceRestoreJob> {
    const row = await this.requireRestore(input.businessId, input.jobId);
    if (row.status !== PrismaRestoreStatus.uploaded) {
      throw new DomainException(
        BackupErrorCodes.RestoreInvalidState,
        'Restore is not awaiting commit',
        HttpStatus.CONFLICT,
      );
    }

    const empty = await this.isWorkspaceEmpty(input.businessId);
    if (!empty && !input.confirmReplace) {
      throw new DomainException(
        BackupErrorCodes.TargetNotEmpty,
        'Target business is not empty; pass confirmReplace=true',
        HttpStatus.CONFLICT,
      );
    }

    const updated = await this.prisma.workspaceRestoreJob.update({
      where: { id: row.id },
      data: {
        status: PrismaRestoreStatus.queued,
        confirmReplace: input.confirmReplace,
      },
    });

    try {
      await this.restoreQueue.enqueue({
        jobId: updated.id,
        businessId: input.businessId,
      });
    } catch (err) {
      await this.prisma.workspaceRestoreJob.update({
        where: { id: updated.id },
        data: {
          status: PrismaRestoreStatus.failed,
          errorCode: BackupErrorCodes.QueueUnavailable,
          errorMessage: err instanceof Error ? err.message : 'Queue error',
          finishedAt: new Date(),
        },
      });
      throw new DomainException(
        BackupErrorCodes.QueueUnavailable,
        'Restore queue unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return this.toPublicRestore(updated, empty);
  }

  private async processBackupJob(
    job: Job<BackupWorkspaceJobPayload>,
  ): Promise<void> {
    const { jobId, businessId } = job.data;
    await this.prisma.workspaceBackupJob.update({
      where: { id: jobId },
      data: {
        status: PrismaBackupStatus.processing,
        startedAt: new Date(),
      },
    });
    try {
      const zipBuffer = await this.buildPackageZip(businessId);
      const storageKey = `${businessId}/backups/${jobId}/package.zip`;
      await this.storage.put(storageKey, zipBuffer, 'application/zip');

      const zip = await JSZip.loadAsync(zipBuffer);
      const manifestText = await zip.file(BACKUP_MANIFEST_NAME)!.async('string');
      const manifest = parseManifest(JSON.parse(manifestText));

      await this.prisma.workspaceBackupJob.update({
        where: { id: jobId },
        data: {
          status: PrismaBackupStatus.completed,
          storageKey,
          byteSize: zipBuffer.length,
          manifest: manifest as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });

      await this.audit.log({
        action: AuditActions.WorkspaceBackupCompleted,
        entityType: 'workspace_backup_job',
        entityId: jobId,
        businessId,
        meta: { byteSize: zipBuffer.length, counts: manifest.counts },
      });
    } catch (err) {
      this.logger.error(`Backup ${jobId} failed`, err);
      await this.prisma.workspaceBackupJob.update({
        where: { id: jobId },
        data: {
          status: PrismaBackupStatus.failed,
          errorCode: BackupErrorCodes.Failed,
          errorMessage: err instanceof Error ? err.message : 'Backup failed',
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  }

  private async processRestoreJob(
    job: Job<RestoreWorkspaceJobPayload>,
  ): Promise<void> {
    const { jobId, businessId } = job.data;
    const row = await this.prisma.workspaceRestoreJob.findFirst({
      where: { id: jobId, businessId },
    });
    if (!row) return;

    await this.prisma.workspaceRestoreJob.update({
      where: { id: jobId },
      data: {
        status: PrismaRestoreStatus.processing,
        startedAt: new Date(),
      },
    });

    try {
      const obj = await this.storage.get(row.storageKey);
      if (!obj) throw new Error('Restore package missing from storage');

      if (row.confirmReplace) {
        await this.softClearWorkspace(businessId);
      } else {
        const empty = await this.isWorkspaceEmpty(businessId);
        if (!empty) {
          throw new Error('Target not empty and confirmReplace is false');
        }
        // Soft-delete seed default theme so restore can recreate brand tokens cleanly.
        await this.prisma.designTheme.updateMany({
          where: { businessId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      }

      const remapped = await this.applyPackageZip(businessId, obj.body);

      await this.prisma.workspaceRestoreJob.update({
        where: { id: jobId },
        data: {
          status: PrismaRestoreStatus.completed,
          result: { remappedEntities: remapped } as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });

      await this.audit.log({
        action: AuditActions.WorkspaceRestoreCompleted,
        entityType: 'workspace_restore_job',
        entityId: jobId,
        businessId,
        meta: { remappedEntities: remapped, confirmReplace: row.confirmReplace },
      });
    } catch (err) {
      this.logger.error(`Restore ${jobId} failed`, err);
      await this.prisma.workspaceRestoreJob.update({
        where: { id: jobId },
        data: {
          status: PrismaRestoreStatus.failed,
          errorCode: BackupErrorCodes.RestoreFailed,
          errorMessage: err instanceof Error ? err.message : 'Restore failed',
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  }

  async buildPackageZip(businessId: string): Promise<Buffer> {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
    });
    if (!business) throw new Error('Business not found');

    const soft = { businessId, deletedAt: null as Date | null };
    const [
      designThemes,
      fontFaces,
      mediaAssets,
      templates,
      documents,
      documentVersions,
      documentComments,
      projectCategories,
      projects,
      branches,
      teamMembers,
      services,
      clients,
      certificates,
      galleries,
      galleryItems,
      locations,
      timelineEvents,
    ] = await Promise.all([
      this.prisma.designTheme.findMany({ where: soft }),
      this.prisma.fontFace.findMany({ where: soft }),
      this.prisma.mediaAsset.findMany({ where: soft }),
      this.prisma.documentTemplate.findMany({ where: soft }),
      this.prisma.document.findMany({ where: soft }),
      this.prisma.documentVersion.findMany({ where: { businessId } }),
      this.prisma.documentComment.findMany({ where: soft }),
      this.prisma.projectCategory.findMany({ where: soft }),
      this.prisma.project.findMany({ where: soft }),
      this.prisma.branch.findMany({ where: soft }),
      this.prisma.teamMember.findMany({ where: soft }),
      this.prisma.businessService.findMany({ where: soft }),
      this.prisma.client.findMany({ where: soft }),
      this.prisma.certificate.findMany({ where: soft }),
      this.prisma.gallery.findMany({ where: soft }),
      this.prisma.galleryItem.findMany({ where: soft }),
      this.prisma.location.findMany({ where: soft }),
      this.prisma.timelineEvent.findMany({ where: soft }),
    ]);

    const db = await this.mongo.getDb();
    const [templateBodies, documentBodies, documentVersionBodies] =
      await Promise.all([
        db.collection('template_bodies').find({ businessId }).toArray(),
        db.collection('document_bodies').find({ businessId }).toArray(),
        db
          .collection('document_version_bodies')
          .find({ businessId })
          .toArray(),
      ]);

    const pg: BackupPgPayload = {
      designThemes: designThemes.map((r) => serializeRow({ ...r })),
      fontFaces: fontFaces.map((r) => serializeRow({ ...r })),
      mediaAssets: mediaAssets.map((r) => serializeRow({ ...r })),
      templates: templates.map((r) => serializeRow({ ...r })),
      documents: documents.map((r) => serializeRow({ ...r })),
      documentVersions: documentVersions.map((r) => serializeRow({ ...r })),
      documentComments: documentComments.map((r) => serializeRow({ ...r })),
      projectCategories: projectCategories.map((r) => serializeRow({ ...r })),
      projects: projects.map((r) => serializeRow({ ...r })),
      branches: branches.map((r) => serializeRow({ ...r })),
      teamMembers: teamMembers.map((r) => serializeRow({ ...r })),
      services: services.map((r) => serializeRow({ ...r })),
      clients: clients.map((r) => serializeRow({ ...r })),
      certificates: certificates.map((r) => serializeRow({ ...r })),
      galleries: galleries.map((r) => serializeRow({ ...r })),
      galleryItems: galleryItems.map((r) => serializeRow({ ...r })),
      locations: locations.map((r) => serializeRow({ ...r })),
      timelineEvents: timelineEvents.map((r) => serializeRow({ ...r })),
    };

    const mongoPayload: BackupMongoPayload = {
      templateBodies: templateBodies.map((d) =>
        serializeRow(d as Record<string, unknown>),
      ),
      documentBodies: documentBodies.map((d) =>
        serializeRow(d as Record<string, unknown>),
      ),
      documentVersionBodies: documentVersionBodies.map((d) =>
        serializeRow(d as Record<string, unknown>),
      ),
    };

    const zip = new JSZip();
    const counts = emptyBackupCounts();
    counts.designThemes = pg.designThemes.length;
    counts.fontFaces = pg.fontFaces.length;
    counts.mediaAssets = pg.mediaAssets.length;
    counts.templates = pg.templates.length;
    counts.documents = pg.documents.length;
    counts.documentVersions = pg.documentVersions.length;
    counts.documentComments = pg.documentComments.length;
    counts.projectCategories = pg.projectCategories.length;
    counts.projects = pg.projects.length;
    counts.branches = pg.branches.length;
    counts.teamMembers = pg.teamMembers.length;
    counts.services = pg.services.length;
    counts.clients = pg.clients.length;
    counts.certificates = pg.certificates.length;
    counts.galleries = pg.galleries.length;
    counts.galleryItems = pg.galleryItems.length;
    counts.locations = pg.locations.length;
    counts.timelineEvents = pg.timelineEvents.length;
    counts.templateBodies = mongoPayload.templateBodies.length;
    counts.documentBodies = mongoPayload.documentBodies.length;
    counts.documentVersionBodies = mongoPayload.documentVersionBodies.length;

    for (const font of fontFaces) {
      const obj = await this.storage.get(font.storageKey);
      if (obj) {
        const ext = extFromKey(font.storageKey) || '.bin';
        zip.file(`files/fonts/${font.id}/original${ext}`, obj.body);
        counts.fontFiles += 1;
      }
    }

    for (const media of mediaAssets) {
      const keys: Array<{ variant: string; key: string | null }> = [
        { variant: 'original', key: media.storageKey },
        { variant: 'thumb', key: media.thumbKey },
        { variant: 'web', key: media.webKey },
        { variant: 'print', key: media.printKey },
      ];
      for (const { variant, key } of keys) {
        if (!key) continue;
        const obj = await this.storage.get(key);
        if (!obj) continue;
        const ext = extFromKey(key) || '';
        zip.file(`files/media/${media.id}/${variant}${ext}`, obj.body);
        if (variant === 'original') counts.mediaFiles += 1;
      }
    }

    const manifest = buildManifest({
      businessId,
      name: business.name,
      counts,
    });
    zip.file(BACKUP_MANIFEST_NAME, JSON.stringify(manifest, null, 2));
    zip.file(BACKUP_PG_NAME, JSON.stringify(pg));
    zip.file(BACKUP_MONGO_NAME, JSON.stringify(mongoPayload));

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  /** Applies package into target business; returns remapped entity count. */
  async applyPackageZip(
    targetBusinessId: string,
    zipBuffer: Buffer,
  ): Promise<number> {
    const zip = await JSZip.loadAsync(zipBuffer);
    const manifest = parseManifest(
      JSON.parse(await zip.file(BACKUP_MANIFEST_NAME)!.async('string')),
    );
    void manifest;
    const pg = JSON.parse(
      await zip.file(BACKUP_PG_NAME)!.async('string'),
    ) as BackupPgPayload;
    const mongoPayload = JSON.parse(
      await zip.file(BACKUP_MONGO_NAME)!.async('string'),
    ) as BackupMongoPayload;

    const ids = {
      theme: new Map<string, string>(),
      font: new Map<string, string>(),
      media: new Map<string, string>(),
      template: new Map<string, string>(),
      document: new Map<string, string>(),
      version: new Map<string, string>(),
      comment: new Map<string, string>(),
      category: new Map<string, string>(),
      project: new Map<string, string>(),
      branch: new Map<string, string>(),
      member: new Map<string, string>(),
      service: new Map<string, string>(),
      client: new Map<string, string>(),
      certificate: new Map<string, string>(),
      gallery: new Map<string, string>(),
      galleryItem: new Map<string, string>(),
      location: new Map<string, string>(),
      timeline: new Map<string, string>(),
    };

    let remapped = 0;

    // Fonts + files
    for (const row of pg.fontFaces) {
      const oldId = String(row.id);
      const newId = remapId(ids.font, oldId)!;
      const ext = extFromKey(String(row.storageKey ?? '')) || '.bin';
      const storageKey = `${targetBusinessId}/fonts/${newId}/original${ext}`;
      const fileKey = Object.keys(zip.files).find((k) =>
        k.startsWith(`files/fonts/${oldId}/original`),
      );
      const fileEntry = fileKey ? zip.file(fileKey) : null;
      if (fileEntry) {
        const body = await fileEntry.async('nodebuffer');
        await this.storage.put(
          storageKey,
          body,
          String(row.mimeType ?? 'application/octet-stream'),
        );
      }
      await this.prisma.fontFace.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          family: String(row.family),
          weight: Number(row.weight ?? 400),
          style: (row.style as 'normal' | 'italic') ?? 'normal',
          originalName: String(row.originalName ?? 'font'),
          mimeType: String(row.mimeType ?? 'font/ttf'),
          byteSize: Number(row.byteSize ?? 0),
          storageKey,
        },
      });
      remapped += 1;
    }

    // Media + files
    for (const row of pg.mediaAssets) {
      const oldId = String(row.id);
      const newId = remapId(ids.media, oldId)!;
      const ext = extFromKey(String(row.storageKey ?? '')) || '';
      const storageKey = `${targetBusinessId}/media/${newId}/original${ext}`;
      let thumbKey: string | null = null;
      let webKey: string | null = null;
      let printKey: string | null = null;

      for (const variant of ['original', 'thumb', 'web', 'print'] as const) {
        const matchKey = Object.keys(zip.files).find((k) =>
          k.startsWith(`files/media/${oldId}/${variant}`),
        );
        if (!matchKey) continue;
        const entry = zip.file(matchKey);
        if (!entry) continue;
        const body = await entry.async('nodebuffer');
        const vExt = extFromKey(matchKey) || ext;
        const key =
          variant === 'original'
            ? storageKey
            : `${targetBusinessId}/media/${newId}/${variant}${vExt}`;
        await this.storage.put(
          key,
          body,
          String(row.mimeType ?? 'application/octet-stream'),
        );
        if (variant === 'thumb') thumbKey = key;
        if (variant === 'web') webKey = key;
        if (variant === 'print') printKey = key;
      }

      await this.prisma.mediaAsset.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          originalName: String(row.originalName ?? 'file'),
          mimeType: String(row.mimeType ?? 'application/octet-stream'),
          byteSize: Number(row.byteSize ?? 0),
          width: row.width == null ? null : Number(row.width),
          height: row.height == null ? null : Number(row.height),
          storageKey,
          thumbKey,
          webKey,
          printKey,
          status: (row.status as 'ready') ?? 'ready',
          meta: (row.meta as Prisma.InputJsonValue) ?? undefined,
        },
      });
      remapped += 1;
    }

    for (const row of pg.designThemes) {
      const oldId = String(row.id);
      const newId = remapId(ids.theme, oldId)!;
      const tokens = this.remapThemeTokens(
        row.tokens as Record<string, unknown>,
        ids.font,
      );
      await this.prisma.designTheme.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          name: String(row.name),
          isDefault: Boolean(row.isDefault),
          tokens: tokens as Prisma.InputJsonValue,
        },
      });
      remapped += 1;
    }

    for (const row of pg.locations) {
      const newId = remapId(ids.location, String(row.id))!;
      await this.prisma.location.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          name: String(row.name),
          country: String(row.country ?? ''),
          province: String(row.province ?? ''),
          city: String(row.city ?? ''),
          address: String(row.address ?? row.addressLine1 ?? ''),
          lat: Number(row.lat ?? 0),
          lng: Number(row.lng ?? 0),
        },
      });
      remapped += 1;
    }

    for (const row of pg.projectCategories) {
      const newId = remapId(ids.category, String(row.id))!;
      await this.prisma.projectCategory.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          name: String(row.name),
          sortOrder: Number(row.sortOrder ?? 0),
          translations: (row.translations as Prisma.InputJsonValue) ?? {},
        },
      });
      remapped += 1;
    }

    for (const row of pg.branches) {
      const newId = remapId(ids.branch, String(row.id))!;
      await this.prisma.branch.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          name: String(row.name),
          addressLine1: String(row.addressLine1 ?? ''),
          addressLine2: String(row.addressLine2 ?? ''),
          city: String(row.city ?? ''),
          province: String(row.province ?? ''),
          postalCode: String(row.postalCode ?? ''),
          country: String(row.country ?? ''),
          phone: String(row.phone ?? ''),
          translations: (row.translations as Prisma.InputJsonValue) ?? {},
          locationId: remapId(ids.location, row.locationId as string | null),
          sortOrder: Number(row.sortOrder ?? 0),
          fields: (row.fields as Prisma.InputJsonValue) ?? {},
        },
      });
      remapped += 1;
    }

    for (const row of pg.teamMembers) {
      const newId = remapId(ids.member, String(row.id))!;
      await this.prisma.teamMember.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          branchId: remapId(ids.branch, row.branchId as string | null),
          parentMemberId: null,
          name: String(row.name),
          roleTitle: String(row.roleTitle ?? ''),
          department: String(row.department ?? ''),
          translations: (row.translations as Prisma.InputJsonValue) ?? {},
          photoMediaId: remapId(ids.media, row.photoMediaId as string | null),
          sortOrder: Number(row.sortOrder ?? 0),
          fields: (row.fields as Prisma.InputJsonValue) ?? {},
        },
      });
      remapped += 1;
    }
    for (const row of pg.teamMembers) {
      const parentOld = row.parentMemberId as string | null;
      if (!parentOld) continue;
      const newId = ids.member.get(String(row.id))!;
      const parentId = ids.member.get(parentOld) ?? null;
      if (parentId) {
        await this.prisma.teamMember.update({
          where: { id: newId },
          data: { parentMemberId: parentId },
        });
      }
    }

    for (const row of pg.services) {
      const newId = remapId(ids.service, String(row.id))!;
      await this.prisma.businessService.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          name: String(row.name ?? row.title ?? 'Service'),
          description: String(row.description ?? ''),
          translations: (row.translations as Prisma.InputJsonValue) ?? {},
          iconMediaId: remapId(ids.media, row.iconMediaId as string | null),
          sortOrder: Number(row.sortOrder ?? 0),
          fields: (row.fields as Prisma.InputJsonValue) ?? {},
        },
      });
      remapped += 1;
    }

    for (const row of pg.clients) {
      const newId = remapId(ids.client, String(row.id))!;
      await this.prisma.client.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          name: String(row.name),
          website: String(row.website ?? ''),
          translations: (row.translations as Prisma.InputJsonValue) ?? {},
          logoMediaId: remapId(ids.media, row.logoMediaId as string | null),
          sortOrder: Number(row.sortOrder ?? 0),
          fields: (row.fields as Prisma.InputJsonValue) ?? {},
        },
      });
      remapped += 1;
    }

    for (const row of pg.certificates) {
      const newId = remapId(ids.certificate, String(row.id))!;
      await this.prisma.certificate.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          name: String(row.name ?? row.title ?? 'Certificate'),
          issuer: String(row.issuer ?? ''),
          translations: (row.translations as Prisma.InputJsonValue) ?? {},
          issuedAt: row.issuedAt ? new Date(String(row.issuedAt)) : null,
          expiresAt: row.expiresAt ? new Date(String(row.expiresAt)) : null,
          documentMediaId: remapId(
            ids.media,
            row.documentMediaId as string | null,
          ),
          sortOrder: Number(row.sortOrder ?? 0),
          fields: (row.fields as Prisma.InputJsonValue) ?? {},
        },
      });
      remapped += 1;
    }

    for (const row of pg.galleries) {
      const newId = remapId(ids.gallery, String(row.id))!;
      await this.prisma.gallery.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          name: String(row.name),
          description: String(row.description ?? ''),
          sortOrder: Number(row.sortOrder ?? 0),
        },
      });
      remapped += 1;
    }

    for (const row of pg.galleryItems) {
      const newId = remapId(ids.galleryItem, String(row.id))!;
      const galleryId = remapId(ids.gallery, row.galleryId as string)!;
      const mediaId = remapId(ids.media, row.mediaId as string)!;
      await this.prisma.galleryItem.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          galleryId,
          mediaId,
          caption: String(row.caption ?? ''),
          sortOrder: Number(row.sortOrder ?? 0),
        },
      });
      remapped += 1;
    }

    for (const row of pg.projects) {
      const newId = remapId(ids.project, String(row.id))!;
      const mediaIds = Array.isArray(row.mediaIds)
        ? (row.mediaIds as string[])
            .map((id) => ids.media.get(id))
            .filter(Boolean)
        : [];
      await this.prisma.project.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          categoryId: remapId(ids.category, row.categoryId as string | null),
          title: String(row.title),
          description: String(row.description ?? ''),
          translations: (row.translations as Prisma.InputJsonValue) ?? {},
          status: (row.status as 'draft') ?? 'draft',
          coverMediaId: remapId(ids.media, row.coverMediaId as string | null),
          mediaIds: mediaIds as Prisma.InputJsonValue,
          locationId: remapId(ids.location, row.locationId as string | null),
          fields: (row.fields as Prisma.InputJsonValue) ?? {},
        },
      });
      remapped += 1;
    }

    for (const row of pg.timelineEvents) {
      const newId = remapId(ids.timeline, String(row.id))!;
      await this.prisma.timelineEvent.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          title: String(row.title),
          body: String(row.body ?? row.description ?? ''),
          occurredAt: row.occurredAt
            ? new Date(String(row.occurredAt))
            : new Date(),
          sortOrder: Number(row.sortOrder ?? 0),
          translations: (row.translations as Prisma.InputJsonValue) ?? {},
          mediaId: remapId(ids.media, row.mediaId as string | null),
          fields: (row.fields as Prisma.InputJsonValue) ?? {},
        },
      });
      remapped += 1;
    }

    for (const row of pg.templates) {
      const newId = remapId(ids.template, String(row.id))!;
      await this.prisma.documentTemplate.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          themeId: remapId(ids.theme, row.themeId as string | null),
          name: String(row.name),
          description:
            row.description == null ? null : String(row.description),
        },
      });
      remapped += 1;
    }

    for (const row of pg.documents) {
      const newId = remapId(ids.document, String(row.id))!;
      await this.prisma.document.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          templateId: remapId(ids.template, row.templateId as string | null),
          title: String(row.title),
          status: (row.status as 'draft') ?? 'draft',
          locale: String(row.locale ?? 'fa'),
        },
      });
      remapped += 1;
    }

    for (const row of pg.documentVersions) {
      const newId = remapId(ids.version, String(row.id))!;
      const documentId = remapId(ids.document, String(row.documentId))!;
      await this.prisma.documentVersion.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          documentId,
          versionNumber: Number(row.versionNumber),
          source: (row.source as 'manual') ?? 'manual',
          note: row.note == null ? null : String(row.note),
          title: String(row.title),
          locale: String(row.locale ?? 'fa'),
          status: (row.status as 'draft') ?? 'draft',
          createdByUserId:
            row.createdByUserId == null
              ? null
              : String(row.createdByUserId),
        },
      });
      remapped += 1;
    }

    for (const row of pg.documentComments) {
      const newId = remapId(ids.comment, String(row.id))!;
      const documentId = remapId(ids.document, String(row.documentId))!;
      await this.prisma.documentComment.create({
        data: {
          id: newId,
          businessId: targetBusinessId,
          documentId,
          authorUserId: String(row.authorUserId),
          body: String(row.body),
          pageId: row.pageId == null ? null : String(row.pageId),
          blockId: row.blockId == null ? null : String(row.blockId),
          resolvedAt: row.resolvedAt
            ? new Date(String(row.resolvedAt))
            : null,
          resolvedByUserId:
            row.resolvedByUserId == null
              ? null
              : String(row.resolvedByUserId),
        },
      });
      remapped += 1;
    }

    const db = await this.mongo.getDb();
    for (const body of mongoPayload.templateBodies) {
      const templateId = ids.template.get(String(body.templateId));
      if (!templateId) continue;
      const { _id, updatedAt, ...rest } = body as Record<string, unknown> & {
        _id?: unknown;
        updatedAt?: unknown;
      };
      void _id;
      void updatedAt;
      await db.collection('template_bodies').updateOne(
        { businessId: targetBusinessId, templateId },
        {
          $set: {
            ...rest,
            businessId: targetBusinessId,
            templateId,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
      remapped += 1;
    }

    for (const body of mongoPayload.documentBodies) {
      const documentId = ids.document.get(String(body.documentId));
      if (!documentId) continue;
      const templateId = body.templateId
        ? ids.template.get(String(body.templateId)) ?? null
        : null;
      const { _id, updatedAt, ...rest } = body as Record<string, unknown> & {
        _id?: unknown;
        updatedAt?: unknown;
      };
      void _id;
      void updatedAt;
      await db.collection('document_bodies').updateOne(
        { businessId: targetBusinessId, documentId },
        {
          $set: {
            ...rest,
            businessId: targetBusinessId,
            documentId,
            templateId,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
      remapped += 1;
    }

    for (const body of mongoPayload.documentVersionBodies) {
      const versionId = ids.version.get(String(body.versionId));
      const documentId = ids.document.get(String(body.documentId));
      if (!versionId || !documentId) continue;
      const { _id, createdAt, ...rest } = body as Record<string, unknown> & {
        _id?: unknown;
        createdAt?: unknown;
      };
      void _id;
      await db.collection('document_version_bodies').updateOne(
        { businessId: targetBusinessId, versionId },
        {
          $set: {
            ...rest,
            businessId: targetBusinessId,
            documentId,
            versionId,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
      remapped += 1;
    }

    return remapped;
  }

  private remapThemeTokens(
    tokens: Record<string, unknown> | null | undefined,
    fontMap: Map<string, string>,
  ): Record<string, unknown> {
    if (!tokens || typeof tokens !== 'object') return {};
    const next = JSON.parse(JSON.stringify(tokens)) as Record<string, unknown>;
    const fonts = next.fonts as Record<string, unknown> | undefined;
    if (fonts) {
      if (typeof fonts.headingFontFaceId === 'string') {
        fonts.headingFontFaceId =
          fontMap.get(fonts.headingFontFaceId) ?? null;
      }
      if (typeof fonts.bodyFontFaceId === 'string') {
        fonts.bodyFontFaceId = fontMap.get(fonts.bodyFontFaceId) ?? null;
      }
    }
    return next;
  }

  async isWorkspaceEmpty(businessId: string): Promise<boolean> {
    const soft = { businessId, deletedAt: null as Date | null };
    const [
      docs,
      media,
      templates,
      themes,
      fonts,
      projects,
      members,
    ] = await Promise.all([
      this.prisma.document.count({ where: soft }),
      this.prisma.mediaAsset.count({ where: soft }),
      this.prisma.documentTemplate.count({ where: soft }),
      this.prisma.designTheme.count({ where: soft }),
      this.prisma.fontFace.count({ where: soft }),
      this.prisma.project.count({ where: soft }),
      this.prisma.teamMember.count({ where: soft }),
    ]);
    // Default theme may exist from seed — ignore single default-only theme if nothing else.
    const content =
      docs +
      media +
      templates +
      fonts +
      projects +
      members +
      (themes > 1 ? themes : 0);
    return content === 0;
  }

  private async softClearWorkspace(businessId: string): Promise<void> {
    const now = new Date();
    const soft = { deletedAt: now };
    await this.prisma.$transaction([
      this.prisma.documentComment.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.document.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.documentTemplate.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.galleryItem.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.gallery.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.project.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.projectCategory.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.teamMember.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.branch.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.businessService.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.client.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.certificate.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.location.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.timelineEvent.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.mediaAsset.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.fontFace.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
      this.prisma.designTheme.updateMany({
        where: { businessId, deletedAt: null },
        data: soft,
      }),
    ]);

    const db = await this.mongo.getDb();
    await Promise.all([
      db.collection('document_bodies').deleteMany({ businessId }),
      db.collection('template_bodies').deleteMany({ businessId }),
      db.collection('document_version_bodies').deleteMany({ businessId }),
    ]);
  }

  private async requireBackup(businessId: string, jobId: string) {
    const row = await this.prisma.workspaceBackupJob.findFirst({
      where: { id: jobId, businessId },
    });
    if (!row) {
      throw new DomainException(
        BackupErrorCodes.NotFound,
        'Backup job not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async requireRestore(businessId: string, jobId: string) {
    const row = await this.prisma.workspaceRestoreJob.findFirst({
      where: { id: jobId, businessId },
    });
    if (!row) {
      throw new DomainException(
        BackupErrorCodes.RestoreNotFound,
        'Restore job not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private toPublicBackup(row: {
    id: string;
    businessId: string;
    status: string;
    byteSize: number | null;
    mimeType: string;
    storageKey: string | null;
    manifest: Prisma.JsonValue | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
  }): PublicWorkspaceBackupJob {
    return {
      id: row.id,
      businessId: row.businessId,
      status: row.status,
      byteSize: row.byteSize,
      mimeType: row.mimeType,
      manifest: (row.manifest as BusinessBackupManifest | null) ?? null,
      errorCode: row.errorCode,
      errorMessage: row.errorMessage,
      downloadUrl:
        row.status === 'completed' && row.storageKey
          ? `/businesses/${row.businessId}/backups/${row.id}/file`
          : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? null,
      finishedAt: row.finishedAt?.toISOString() ?? null,
    };
  }

  private toPublicRestore(
    row: {
      id: string;
      businessId: string;
      status: string;
      originalFilename: string;
      byteSize: number;
      mimeType: string;
      preview: Prisma.JsonValue | null;
      result: Prisma.JsonValue | null;
      confirmReplace: boolean;
      errorCode: string | null;
      errorMessage: string | null;
      createdAt: Date;
      updatedAt: Date;
      startedAt: Date | null;
      finishedAt: Date | null;
    },
    targetEmpty: boolean | null,
  ): PublicWorkspaceRestoreJob {
    return {
      id: row.id,
      businessId: row.businessId,
      status: row.status,
      originalFilename: row.originalFilename,
      byteSize: row.byteSize,
      mimeType: row.mimeType,
      preview: (row.preview as BusinessBackupManifest | null) ?? null,
      result: (row.result as { remappedEntities: number } | null) ?? null,
      confirmReplace: row.confirmReplace,
      targetEmpty,
      errorCode: row.errorCode,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? null,
      finishedAt: row.finishedAt?.toISOString() ?? null,
    };
  }
}
