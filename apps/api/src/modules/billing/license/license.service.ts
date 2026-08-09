import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditActions,
  LicenseErrorCodes,
  type PublicInstallationLicense,
} from '@vdb/shared-types';
import { DomainException } from '../../../common/errors/domain.exception';
import { EditionService } from '../../../config/edition/edition.service';
import { PrismaService } from '../../../config/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  hashLicenseKey,
  licenseKeyHint,
  normalizeLicenseKey,
  verifyLicenseKeyFormat,
} from './license.crypto';

@Injectable()
export class LicenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly edition: EditionService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async getPublicStatus(): Promise<PublicInstallationLicense> {
    if (!this.edition.isSelfHosted()) {
      return {
        required: false,
        active: true,
        organizationName: null,
        keyHint: null,
        activatedAt: null,
        expiresAt: null,
      };
    }

    const active = await this.findActiveLicense();
    if (!active) {
      return {
        required: true,
        active: false,
        organizationName: null,
        keyHint: null,
        activatedAt: null,
        expiresAt: null,
      };
    }

    return {
      required: true,
      active: true,
      organizationName: active.organizationName,
      keyHint: active.keyHint,
      activatedAt: active.activatedAt.toISOString(),
      expiresAt: active.expiresAt ? active.expiresAt.toISOString() : null,
    };
  }

  async assertActive(): Promise<void> {
    if (!this.edition.isSelfHosted()) {
      return;
    }
    const active = await this.findActiveLicense();
    if (!active) {
      throw new DomainException(
        LicenseErrorCodes.Required,
        'Installation license required for SELF_HOSTED',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    if (active.expiresAt && active.expiresAt.getTime() < Date.now()) {
      throw new DomainException(
        LicenseErrorCodes.Expired,
        'Installation license expired',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  async isActive(): Promise<boolean> {
    if (!this.edition.isSelfHosted()) return true;
    const active = await this.findActiveLicense();
    return Boolean(active);
  }

  async activate(input: {
    licenseKey: string;
    organizationName?: string;
    userId?: string | null;
  }): Promise<PublicInstallationLicense> {
    if (!this.edition.isSelfHosted()) {
      throw new DomainException(
        LicenseErrorCodes.NotApplicable,
        'License activation is only for SELF_HOSTED edition',
        HttpStatus.FORBIDDEN,
      );
    }

    const existing = await this.findActiveLicense();
    if (existing) {
      throw new DomainException(
        LicenseErrorCodes.AlreadyActive,
        'An installation license is already active',
        HttpStatus.CONFLICT,
      );
    }

    const issuerSecret = this.config.get<string>('LICENSE_ISSUER_SECRET') ?? '';
    const verified = verifyLicenseKeyFormat(input.licenseKey, issuerSecret);
    if (!verified.ok) {
      throw new DomainException(
        LicenseErrorCodes.Invalid,
        'License key is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }

    const pepper = this.config.getOrThrow<string>('LICENSE_PEPPER');
    const normalized = normalizeLicenseKey(input.licenseKey);
    const keyHash = hashLicenseKey(normalized, pepper);

    const duplicate = await this.prisma.installationLicense.findUnique({
      where: { keyHash },
    });
    if (duplicate && !duplicate.revokedAt) {
      throw new DomainException(
        LicenseErrorCodes.AlreadyActive,
        'This license key is already registered',
        HttpStatus.CONFLICT,
      );
    }

    const now = new Date();
    await this.prisma.installationLicense.create({
      data: {
        keyHash,
        keyHint: licenseKeyHint(normalized),
        organizationName:
          input.organizationName?.trim() ||
          verified.organizationName ||
          null,
        activatedAt: now,
        expiresAt: verified.expiresAt,
        revokedAt: null,
      },
    });

    await this.audit.log({
      action: AuditActions.BillingLicenseActivated,
      entityType: 'installation_license',
      entityId: null,
      businessId: null,
      userId: input.userId ?? null,
      meta: {
        keyHint: licenseKeyHint(normalized),
        organizationName:
          input.organizationName?.trim() ||
          verified.organizationName ||
          null,
      },
    });

    return this.getPublicStatus();
  }

  private async findActiveLicense() {
    const now = new Date();
    return this.prisma.installationLicense.findFirst({
      where: {
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { activatedAt: 'desc' },
    });
  }
}
