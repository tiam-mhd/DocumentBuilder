import path from 'node:path';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AppEdition,
  BrandingErrorCodes,
  EntitlementCodes,
  type PublicBrandingResolve,
  type PublicBusinessBranding,
  type PublicBusinessBrandingCapabilities,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { EditionService } from '../../config/edition/edition.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import {
  OBJECT_STORAGE,
  type ObjectStorage,
} from '../assets/storage/object-storage.port';
import { EntitlementsService } from '../billing/entitlements.service';

const HEX_COLOR = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
const HOSTNAME = /^(?=.{1,253}$)(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const LOGO_EXT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

@Injectable()
export class BrandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly edition: EditionService,
    private readonly entitlements: EntitlementsService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async getForMember(businessId: string): Promise<PublicBusinessBranding> {
    const row = await this.ensureRow(businessId);
    const capabilities = await this.resolveCapabilities(businessId);
    return this.toPublic(row, capabilities);
  }

  async update(input: {
    businessId: string;
    displayName?: string | null;
    primaryColor?: string | null;
    customDomain?: string | null;
    hidePoweredBy?: boolean;
  }): Promise<PublicBusinessBranding> {
    await this.assertCanCustomize(input.businessId);
    const capabilities = await this.resolveCapabilities(input.businessId);

    let displayName: string | null | undefined = input.displayName;
    if (displayName !== undefined) {
      displayName =
        displayName === null || displayName.trim() === ''
          ? null
          : displayName.trim().slice(0, 120);
    }

    let primaryColor: string | null | undefined = input.primaryColor;
    if (primaryColor !== undefined) {
      if (primaryColor === null || primaryColor.trim() === '') {
        primaryColor = null;
      } else {
        const c = primaryColor.trim();
        if (!HEX_COLOR.test(c)) {
          throw new DomainException(
            BrandingErrorCodes.InvalidColor,
            'primaryColor must be #RGB or #RRGGBB',
            HttpStatus.BAD_REQUEST,
          );
        }
        primaryColor = c.toUpperCase();
      }
    }

    let customDomain: string | null | undefined = input.customDomain;
    if (customDomain !== undefined) {
      if (!capabilities.canSetCustomDomain) {
        throw new DomainException(
          BrandingErrorCodes.NotAllowed,
          'Custom domain requires white-label',
          HttpStatus.FORBIDDEN,
        );
      }
      if (customDomain === null || customDomain.trim() === '') {
        customDomain = null;
      } else {
        customDomain = this.normalizeHostname(customDomain);
        const taken = await this.prisma.businessBranding.findFirst({
          where: {
            customDomain,
            NOT: { businessId: input.businessId },
          },
        });
        if (taken) {
          throw new DomainException(
            BrandingErrorCodes.DomainTaken,
            'Custom domain already in use',
            HttpStatus.CONFLICT,
          );
        }
      }
    }

    let hidePoweredBy = input.hidePoweredBy;
    if (hidePoweredBy === true && !capabilities.canHidePoweredBy) {
      throw new DomainException(
        BrandingErrorCodes.NotAllowed,
        'Hiding Powered-by requires white-label',
        HttpStatus.FORBIDDEN,
      );
    }
    if (hidePoweredBy !== undefined && !capabilities.canHidePoweredBy) {
      hidePoweredBy = false;
    }

    const row = await this.prisma.businessBranding.upsert({
      where: { businessId: input.businessId },
      create: {
        businessId: input.businessId,
        displayName: displayName ?? null,
        primaryColor: primaryColor ?? null,
        customDomain: customDomain ?? null,
        hidePoweredBy: hidePoweredBy ?? false,
      },
      update: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(primaryColor !== undefined ? { primaryColor } : {}),
        ...(customDomain !== undefined ? { customDomain } : {}),
        ...(hidePoweredBy !== undefined ? { hidePoweredBy } : {}),
      },
    });

    return this.toPublic(row, capabilities);
  }

  async uploadLogo(input: {
    businessId: string;
    file: Express.Multer.File;
  }): Promise<PublicBusinessBranding> {
    await this.assertCanCustomize(input.businessId);
    if (!input.file?.buffer?.length) {
      throw new DomainException(
        BrandingErrorCodes.LogoInvalidType,
        'Empty upload',
        HttpStatus.BAD_REQUEST,
      );
    }
    const ext = this.validateLogo(input.file);
    const mime = LOGO_EXT_MIME[ext];
    const storageKey = `${input.businessId}/branding/logo.${ext}`;

    const existing = await this.ensureRow(input.businessId);
    if (existing.logoStorageKey && existing.logoStorageKey !== storageKey) {
      try {
        await this.storage.delete(existing.logoStorageKey);
      } catch {
        // best-effort
      }
    }

    try {
      await this.storage.put(storageKey, input.file.buffer, mime);
    } catch (err) {
      throw new DomainException(
        BrandingErrorCodes.LogoInvalidType,
        err instanceof Error ? err.message : 'Logo storage failed',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const row = await this.prisma.businessBranding.update({
      where: { businessId: input.businessId },
      data: {
        logoStorageKey: storageKey,
        logoMimeType: mime,
        logoByteSize: input.file.size,
      },
    });
    const capabilities = await this.resolveCapabilities(input.businessId);
    return this.toPublic(row, capabilities);
  }

  async deleteLogo(businessId: string): Promise<PublicBusinessBranding> {
    await this.assertCanCustomize(businessId);
    const existing = await this.ensureRow(businessId);
    if (existing.logoStorageKey) {
      try {
        await this.storage.delete(existing.logoStorageKey);
      } catch {
        // best-effort
      }
    }
    const row = await this.prisma.businessBranding.update({
      where: { businessId },
      data: {
        logoStorageKey: null,
        logoMimeType: null,
        logoByteSize: null,
      },
    });
    const capabilities = await this.resolveCapabilities(businessId);
    return this.toPublic(row, capabilities);
  }

  async getLogoBytes(businessId: string): Promise<{
    body: Buffer;
    contentType: string;
  }> {
    const row = await this.prisma.businessBranding.findUnique({
      where: { businessId },
    });
    if (!row?.logoStorageKey) {
      throw new DomainException(
        BrandingErrorCodes.LogoNotFound,
        'Logo not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const obj = await this.storage.get(row.logoStorageKey);
    if (!obj) {
      throw new DomainException(
        BrandingErrorCodes.LogoNotFound,
        'Logo not found in storage',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      body: obj.body,
      contentType: row.logoMimeType ?? obj.contentType,
    };
  }

  async resolveByHost(hostRaw: string): Promise<PublicBrandingResolve> {
    const host = this.normalizeHostname(hostRaw);
    const row = await this.prisma.businessBranding.findUnique({
      where: { customDomain: host },
      include: { business: true },
    });
    if (!row || row.business.deletedAt) {
      throw new DomainException(
        BrandingErrorCodes.InvalidDomain,
        'No branding for host',
        HttpStatus.NOT_FOUND,
      );
    }
    const capabilities = await this.resolveCapabilities(row.businessId);
    const pub = this.toPublic(row, capabilities);
    return {
      businessId: pub.businessId,
      displayName: pub.displayName,
      primaryColor: pub.primaryColor,
      hasLogo: pub.hasLogo,
      logoUrl: pub.logoUrl,
      hidePoweredBy: pub.hidePoweredBy,
      showPoweredByEffective: pub.showPoweredByEffective,
      customDomain: pub.customDomain,
    };
  }

  async resolveCapabilities(
    businessId: string,
  ): Promise<PublicBusinessBrandingCapabilities> {
    if (this.edition.getEdition() === AppEdition.SelfHosted) {
      return {
        canCustomize: true,
        canHidePoweredBy: true,
        canSetCustomDomain: true,
        requiresEntitlement: false,
      };
    }
    const ents = await this.entitlements.getForBusiness(businessId);
    const allowed = ents.codes.includes(EntitlementCodes.BrandingWhiteLabel);
    return {
      canCustomize: allowed,
      canHidePoweredBy: allowed,
      canSetCustomDomain: allowed,
      requiresEntitlement: true,
    };
  }

  private async assertCanCustomize(businessId: string): Promise<void> {
    const caps = await this.resolveCapabilities(businessId);
    if (!caps.canCustomize) {
      throw new DomainException(
        BrandingErrorCodes.NotAllowed,
        'White-label branding requires branding.white_label (or SELF_HOSTED)',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async ensureRow(businessId: string) {
    const existing = await this.prisma.businessBranding.findUnique({
      where: { businessId },
    });
    if (existing) return existing;
    return this.prisma.businessBranding.create({
      data: { businessId },
    });
  }

  private normalizeHostname(raw: string): string {
    let h = raw.trim().toLowerCase();
    h = h.replace(/^https?:\/\//, '');
    h = h.split('/')[0] ?? h;
    h = h.split(':')[0] ?? h;
    if (!HOSTNAME.test(h) || h.includes('..')) {
      throw new DomainException(
        BrandingErrorCodes.InvalidDomain,
        'Invalid hostname',
        HttpStatus.BAD_REQUEST,
      );
    }
    return h;
  }

  private validateLogo(file: Express.Multer.File): string {
    if (file.size > MAX_LOGO_BYTES) {
      throw new DomainException(
        BrandingErrorCodes.LogoTooLarge,
        'Logo exceeds 2MB',
        HttpStatus.BAD_REQUEST,
      );
    }
    const name = file.originalname.toLowerCase();
    const ext = path.extname(name).replace('.', '');
    if (ext === 'svg' || file.mimetype === 'image/svg+xml') {
      throw new DomainException(
        BrandingErrorCodes.LogoInvalidType,
        'SVG logos are not allowed',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!LOGO_EXT_MIME[ext]) {
      throw new DomainException(
        BrandingErrorCodes.LogoInvalidType,
        'Logo must be png, jpg, or webp',
        HttpStatus.BAD_REQUEST,
      );
    }
    return ext === 'jpeg' ? 'jpg' : ext;
  }

  private toPublic(
    row: {
      businessId: string;
      displayName: string | null;
      primaryColor: string | null;
      logoStorageKey: string | null;
      customDomain: string | null;
      hidePoweredBy: boolean;
      updatedAt: Date;
    },
    capabilities: PublicBusinessBrandingCapabilities,
  ): PublicBusinessBranding {
    const hide = capabilities.canHidePoweredBy && row.hidePoweredBy;
    const editionDefaultShow = this.edition.getPublicConfig().showPoweredBy;
    return {
      businessId: row.businessId,
      displayName: row.displayName,
      primaryColor: row.primaryColor,
      hasLogo: Boolean(row.logoStorageKey),
      logoUrl: row.logoStorageKey
        ? `/api/businesses/${row.businessId}/branding/logo/file`
        : null,
      customDomain: row.customDomain,
      hidePoweredBy: row.hidePoweredBy,
      showPoweredByEffective: editionDefaultShow ? !hide : false,
      capabilities,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
