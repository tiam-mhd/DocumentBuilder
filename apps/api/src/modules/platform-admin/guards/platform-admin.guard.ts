import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformAdminErrorCodes } from '@vdb/shared-types';
import type { Request } from 'express';
import { DomainException } from '../../../common/errors/domain.exception';
import type { AppEnv } from '../../../config/env.validation';
import { EditionService } from '../../../config/edition/edition.service';
import type { RequestUser } from '../../identity/auth.types';
import { PlatformAdminService } from '../platform-admin.service';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly edition: EditionService,
    private readonly platformAdmin: PlatformAdminService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.edition.isSaas()) {
      throw new DomainException(
        PlatformAdminErrorCodes.EditionRequired,
        'Platform admin requires SAAS edition',
        HttpStatus.FORBIDDEN,
      );
    }

    const req = context.switchToHttp().getRequest<
      Request & { user?: RequestUser }
    >();
    const user = req.user;
    if (!user?.userId) {
      throw new DomainException(
        PlatformAdminErrorCodes.Forbidden,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    this.assertIpAllowed(req);

    const ok = await this.platformAdmin.isPlatformAdmin(user.userId);
    if (!ok) {
      throw new DomainException(
        PlatformAdminErrorCodes.Forbidden,
        'Platform admin required',
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }

  private assertIpAllowed(req: Request): void {
    const raw = this.config.get('PLATFORM_ADMIN_IP_ALLOWLIST', { infer: true });
    const allow = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allow.length === 0) return;

    const clientIp = clientIpFromRequest(req);
    if (!clientIp || !allow.includes(clientIp)) {
      throw new DomainException(
        PlatformAdminErrorCodes.IpDenied,
        'Client IP not allowlisted for platform admin',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}

export function clientIpFromRequest(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]!.trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]!.trim();
  }
  const ip = req.ip?.trim();
  return ip || null;
}
