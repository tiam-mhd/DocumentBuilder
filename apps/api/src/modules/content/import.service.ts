import { randomBytes } from 'crypto';
import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ImportEntityType as PrismaImportEntityType,
  ImportFileFormat as PrismaImportFileFormat,
  ImportJobStatus as PrismaImportJobStatus,
  ProjectStatus as PrismaProjectStatus,
  Prisma,
  type ImportJob,
} from '@prisma/client';
import type { Job } from 'bullmq';
import {
  ImportErrorCodes,
  ImportFileFormat,
  PROJECT_IMPORT_FIELDS,
  ProjectImportField,
  ProjectStatus,
  type ImportColumnMapping,
  type ImportPreview,
  type ImportResult,
  type ImportRowError,
  type ProjectImportFieldValue,
  type PublicImportJob,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import {
  OBJECT_STORAGE,
  type ObjectStorage,
} from '../assets/storage/object-storage.port';
import {
  detectImportFormat,
  parseImportBuffer,
  type ParsedSheet,
} from './import-parse';
import {
  ImportQueueService,
  type ImportContentJobPayload,
} from './import-queue.service';

const SAMPLE_SIZE = 20;
const SAMPLE_ERRORS = 50;

type PreparedRow = {
  rowNumber: number;
  title: string;
  description: string;
  status: PrismaProjectStatus;
  categoryId: string | null;
  locationId: string | null;
  fields: Record<string, unknown>;
  translations: { en?: { title?: string; description?: string } };
};

@Injectable()
export class ImportService implements OnModuleInit {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly queue: ImportQueueService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  onModuleInit(): void {
    this.queue.startWorker((job) => this.processQueuedCommit(job));
  }

  async uploadProjects(input: {
    businessId: string;
    userId: string;
    file: Express.Multer.File | undefined;
  }): Promise<PublicImportJob> {
    if (!input.file?.buffer?.length) {
      throw new DomainException(
        ImportErrorCodes.FileRequired,
        'File is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const maxBytes = this.config.getOrThrow<number>('IMPORT_MAX_BYTES');
    if (input.file.size > maxBytes || input.file.buffer.length > maxBytes) {
      throw new DomainException(
        ImportErrorCodes.FileTooLarge,
        `File exceeds IMPORT_MAX_BYTES (${maxBytes})`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const format = detectImportFormat(
      input.file.originalname || 'upload',
      input.file.mimetype || '',
    );
    const maxRows = this.config.getOrThrow<number>('IMPORT_MAX_ROWS');
    const parsed = await parseImportBuffer(input.file.buffer, format, maxRows);

    const id = cryptoRandomId();
    const ext = format === ImportFileFormat.Csv ? 'csv' : 'xlsx';
    const storageKey = `${input.businessId}/imports/${id}/original.${ext}`;
    await this.storage.put(
      storageKey,
      input.file.buffer,
      input.file.mimetype ||
        (format === ImportFileFormat.Csv
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    );

    const preview = this.buildUploadPreview(parsed);
    const row = await this.prisma.importJob.create({
      data: {
        id,
        businessId: input.businessId,
        createdByUserId: input.userId,
        entityType: PrismaImportEntityType.projects,
        status: PrismaImportJobStatus.uploaded,
        format:
          format === ImportFileFormat.Csv
            ? PrismaImportFileFormat.csv
            : PrismaImportFileFormat.xlsx,
        originalFilename: (input.file.originalname || `import.${ext}`).slice(
          0,
          255,
        ),
        mimeType: (input.file.mimetype || 'application/octet-stream').slice(
          0,
          120,
        ),
        byteSize: input.file.buffer.length,
        storageKey,
        preview: preview as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toPublic(row);
  }

  async get(businessId: string, importId: string): Promise<PublicImportJob> {
    const row = await this.requireJob(businessId, importId);
    return this.toPublic(row);
  }

  async setMapping(input: {
    businessId: string;
    importId: string;
    mapping: ImportColumnMapping;
  }): Promise<PublicImportJob> {
    const job = await this.requireJob(input.businessId, input.importId);
    if (
      job.status !== PrismaImportJobStatus.uploaded &&
      job.status !== PrismaImportJobStatus.mapped
    ) {
      throw new DomainException(
        ImportErrorCodes.InvalidState,
        'Mapping can only be set before commit',
        HttpStatus.CONFLICT,
      );
    }

    const mapping = this.normalizeMapping(input.mapping);
    if (!mapping.title) {
      throw new DomainException(
        ImportErrorCodes.TitleColumnRequired,
        'Mapping must include title column',
        HttpStatus.BAD_REQUEST,
      );
    }

    const parsed = await this.loadParsed(job);
    const { preview } = await this.evaluateRows(
      input.businessId,
      parsed,
      mapping,
    );

    const row = await this.prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: PrismaImportJobStatus.mapped,
        mapping: mapping as unknown as Prisma.InputJsonValue,
        preview: preview as unknown as Prisma.InputJsonValue,
        errorCode: null,
        errorMessage: null,
      },
    });
    return this.toPublic(row);
  }

  async commit(input: {
    businessId: string;
    importId: string;
  }): Promise<PublicImportJob> {
    const job = await this.requireJob(input.businessId, input.importId);
    if (job.status !== PrismaImportJobStatus.mapped) {
      throw new DomainException(
        ImportErrorCodes.InvalidState,
        'Import must be mapped before commit',
        HttpStatus.CONFLICT,
      );
    }
    const mapping = (job.mapping ?? null) as ImportColumnMapping | null;
    if (!mapping?.title) {
      throw new DomainException(
        ImportErrorCodes.MappingRequired,
        'Column mapping is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const preview = (job.preview ?? {}) as Partial<ImportPreview>;
    const totalRows = Number(preview.totalRows ?? 0);
    const syncMax = this.config.getOrThrow<number>('IMPORT_SYNC_MAX_ROWS');

    if (totalRows > syncMax) {
      const queued = await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: PrismaImportJobStatus.queued,
          errorCode: null,
          errorMessage: null,
        },
      });
      await this.queue.enqueue({
        jobId: job.id,
        businessId: input.businessId,
      });
      return this.toPublic(queued);
    }

    return this.runCommit(job);
  }

  private async processQueuedCommit(
    job: Job<ImportContentJobPayload>,
  ): Promise<void> {
    const { jobId, businessId } = job.data;
    const row = await this.prisma.importJob.findFirst({
      where: { id: jobId, businessId },
    });
    if (!row) {
      this.logger.warn(`Import job ${jobId} missing`);
      return;
    }
    if (
      row.status !== PrismaImportJobStatus.queued &&
      row.status !== PrismaImportJobStatus.processing
    ) {
      return;
    }
    try {
      await this.runCommit(row);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Commit failed';
      const code =
        err instanceof DomainException
          ? err.code
          : ImportErrorCodes.CommitFailed;
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: PrismaImportJobStatus.failed,
          errorCode: code,
          errorMessage: message.slice(0, 500),
          finishedAt: new Date(),
        },
      });
      throw err;
    }
  }

  private async runCommit(job: ImportJob): Promise<PublicImportJob> {
    const mapping = (job.mapping ?? null) as ImportColumnMapping | null;
    if (!mapping?.title) {
      throw new DomainException(
        ImportErrorCodes.MappingRequired,
        'Column mapping is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: PrismaImportJobStatus.processing,
        startedAt: new Date(),
        errorCode: null,
        errorMessage: null,
      },
    });

    try {
      const parsed = await this.loadParsed(job);
      const { prepared, errors } = await this.evaluateRows(
        job.businessId,
        parsed,
        mapping,
      );

      await this.prisma.$transaction(async (tx) => {
        for (const row of prepared) {
          await tx.project.create({
            data: {
              businessId: job.businessId,
              title: row.title,
              description: row.description,
              status: row.status,
              categoryId: row.categoryId,
              locationId: row.locationId,
              mediaIds: [] as unknown as Prisma.InputJsonValue,
              fields: row.fields as Prisma.InputJsonValue,
              translations: (row.translations ?? {}) as Prisma.InputJsonValue,
            },
          });
        }
      });

      const result: ImportResult = {
        created: prepared.length,
        skipped: errors.length,
        errors: errors.slice(0, SAMPLE_ERRORS),
      };

      const updated = await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: PrismaImportJobStatus.completed,
          result: result as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });
      return this.toPublic(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Commit failed';
      const code =
        err instanceof DomainException
          ? err.code
          : ImportErrorCodes.CommitFailed;
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: PrismaImportJobStatus.failed,
          errorCode: code,
          errorMessage: message.slice(0, 500),
          finishedAt: new Date(),
        },
      });
      if (err instanceof DomainException) throw err;
      throw new DomainException(
        ImportErrorCodes.CommitFailed,
        message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async loadParsed(job: ImportJob): Promise<ParsedSheet> {
    const stored = await this.storage.get(job.storageKey);
    if (!stored) {
      throw new DomainException(
        ImportErrorCodes.NotFound,
        'Import file missing from storage',
        HttpStatus.NOT_FOUND,
      );
    }
    const maxRows = this.config.getOrThrow<number>('IMPORT_MAX_ROWS');
    const format =
      job.format === PrismaImportFileFormat.csv
        ? ImportFileFormat.Csv
        : ImportFileFormat.Xlsx;
    return parseImportBuffer(stored.body, format, maxRows);
  }

  private buildUploadPreview(parsed: ParsedSheet): ImportPreview {
    return {
      headers: parsed.headers,
      totalRows: parsed.rows.length,
      sampleRows: parsed.rows.slice(0, SAMPLE_SIZE).map((r) => r.cells),
      errorCount: 0,
      sampleErrors: [],
    };
  }

  private normalizeMapping(
    raw: ImportColumnMapping,
  ): ImportColumnMapping {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new DomainException(
        ImportErrorCodes.InvalidMapping,
        'Mapping must be an object',
        HttpStatus.BAD_REQUEST,
      );
    }
    const out: ImportColumnMapping = {};
    for (const field of PROJECT_IMPORT_FIELDS) {
      const col = raw[field];
      if (col == null || col === '') continue;
      if (typeof col !== 'string') {
        throw new DomainException(
          ImportErrorCodes.InvalidMapping,
          `Invalid mapping for ${field}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      out[field] = col.trim();
    }
    const used = new Set<string>();
    for (const [field, col] of Object.entries(out)) {
      if (!col) continue;
      if (used.has(col)) {
        throw new DomainException(
          ImportErrorCodes.InvalidMapping,
          `Column "${col}" mapped more than once`,
          HttpStatus.BAD_REQUEST,
        );
      }
      used.add(col);
      void field;
    }
    return out;
  }

  private async evaluateRows(
    businessId: string,
    parsed: ParsedSheet,
    mapping: ImportColumnMapping,
  ): Promise<{
    prepared: PreparedRow[];
    errors: ImportRowError[];
    preview: ImportPreview;
  }> {
    for (const col of Object.values(mapping)) {
      if (col && !parsed.headers.includes(col)) {
        throw new DomainException(
          ImportErrorCodes.InvalidMapping,
          `Unknown column "${col}"`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const [categories, locations] = await Promise.all([
      this.prisma.projectCategory.findMany({
        where: { businessId, deletedAt: null },
        select: { id: true, name: true },
      }),
      this.prisma.location.findMany({
        where: { businessId, deletedAt: null },
        select: { id: true, name: true },
      }),
    ]);
    const categoryByName = new Map(
      categories.map((c) => [c.name.trim().toLowerCase(), c.id]),
    );
    const locationByName = new Map(
      locations.map((l) => [l.name.trim().toLowerCase(), l.id]),
    );

    const prepared: PreparedRow[] = [];
    const errors: ImportRowError[] = [];
    const mappedSample: Record<string, string>[] = [];

    for (const row of parsed.rows) {
      const mapped: Record<string, string> = {};
      for (const field of PROJECT_IMPORT_FIELDS) {
        const col = mapping[field as ProjectImportFieldValue];
        if (!col) continue;
        mapped[field] = row.cells[col] ?? '';
      }
      if (mappedSample.length < SAMPLE_SIZE) {
        mappedSample.push({ ...mapped, _row: String(row.rowNumber) });
      }

      const title = (mapped[ProjectImportField.Title] ?? '').trim();
      if (!title || title.length > 200) {
        errors.push({
          row: row.rowNumber,
          code: ImportErrorCodes.Empty,
          message: 'Title is required (1–200 chars)',
        });
        continue;
      }

      let status: PrismaProjectStatus = PrismaProjectStatus.draft;
      const statusRaw = (mapped[ProjectImportField.Status] ?? '')
        .trim()
        .toLowerCase();
      if (statusRaw) {
        const allowed = Object.values(ProjectStatus) as string[];
        if (!allowed.includes(statusRaw)) {
          errors.push({
            row: row.rowNumber,
            code: 'PROJECT_INVALID_STATUS',
            message: `Invalid status "${statusRaw}"`,
          });
          continue;
        }
        status = statusRaw as PrismaProjectStatus;
      }

      let categoryId: string | null = null;
      const catName = (mapped[ProjectImportField.Category] ?? '').trim();
      if (catName) {
        const id = categoryByName.get(catName.toLowerCase());
        if (!id) {
          errors.push({
            row: row.rowNumber,
            code: 'PROJECT_CATEGORY_NOT_FOUND',
            message: `Category not found: ${catName}`,
          });
          continue;
        }
        categoryId = id;
      }

      let locationId: string | null = null;
      const locName = (mapped[ProjectImportField.Location] ?? '').trim();
      if (locName) {
        const id = locationByName.get(locName.toLowerCase());
        if (!id) {
          errors.push({
            row: row.rowNumber,
            code: 'PROJECT_LOCATION_NOT_FOUND',
            message: `Location not found: ${locName}`,
          });
          continue;
        }
        locationId = id;
      }

      const fields: Record<string, unknown> = {};
      const yearRaw = (mapped[ProjectImportField.Year] ?? '').trim();
      if (yearRaw) {
        const year = Number(yearRaw);
        if (!Number.isFinite(year) || year < 1000 || year > 9999) {
          errors.push({
            row: row.rowNumber,
            code: 'PROJECT_INVALID_FIELDS',
            message: `Invalid year "${yearRaw}"`,
          });
          continue;
        }
        fields.year = Math.trunc(year);
      }

      const titleEn = (mapped[ProjectImportField.TitleEn] ?? '').trim();
      const descriptionEn = (
        mapped[ProjectImportField.DescriptionEn] ?? ''
      ).trim();
      const translations: PreparedRow['translations'] = {};
      if (titleEn || descriptionEn) {
        translations.en = {};
        if (titleEn) translations.en.title = titleEn.slice(0, 200);
        if (descriptionEn) {
          translations.en.description = descriptionEn.slice(0, 5000);
        }
      }

      prepared.push({
        rowNumber: row.rowNumber,
        title,
        description: (mapped[ProjectImportField.Description] ?? '')
          .trim()
          .slice(0, 5000),
        status,
        categoryId,
        locationId,
        fields,
        translations,
      });
    }

    const preview: ImportPreview = {
      headers: parsed.headers,
      totalRows: parsed.rows.length,
      sampleRows: parsed.rows.slice(0, SAMPLE_SIZE).map((r) => r.cells),
      mappedSample,
      errorCount: errors.length,
      sampleErrors: errors.slice(0, SAMPLE_ERRORS),
    };

    return { prepared, errors, preview };
  }

  private async requireJob(
    businessId: string,
    importId: string,
  ): Promise<ImportJob> {
    const row = await this.prisma.importJob.findFirst({
      where: { id: importId, businessId },
    });
    if (!row) {
      throw new DomainException(
        ImportErrorCodes.NotFound,
        'Import job not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private toPublic(row: ImportJob): PublicImportJob {
    return {
      id: row.id,
      businessId: row.businessId,
      entityType: row.entityType,
      status: row.status,
      format: row.format,
      originalFilename: row.originalFilename,
      mimeType: row.mimeType,
      byteSize: row.byteSize,
      mapping: (row.mapping as ImportColumnMapping | null) ?? null,
      preview: (row.preview as ImportPreview | null) ?? null,
      result: (row.result as ImportResult | null) ?? null,
      errorCode: row.errorCode,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? null,
      finishedAt: row.finishedAt?.toISOString() ?? null,
    };
  }
}

function cryptoRandomId(): string {
  return `imp_${randomBytes(12).toString('hex')}`;
}
