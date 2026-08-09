import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../../../common/errors/domain.exception';
import type { RequestUser } from '../../identity/auth.types';
import { TenancyService } from '../../tenancy/tenancy.service';
import {
  BILLING_ADAPTER,
  type BillingAdapter,
} from '../adapters/billing-adapter.token';
import {
  ENTITLEMENT_META_KEY,
  type EntitlementRouteMeta,
} from '../decorators/require-entitlement.decorator';
import { EntitlementsService } from '../entitlements.service';

/**
 * JWT must already run. Resolves `:businessId`, membership, install license
 * (SELF_HOSTED), then entitlements.
 */
@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenancy: TenancyService,
    private readonly entitlements: EntitlementsService,
    @Inject(BILLING_ADAPTER) private readonly billing: BillingAdapter,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<EntitlementRouteMeta | undefined>(
      ENTITLEMENT_META_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!meta) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: RequestUser;
      params?: { businessId?: string };
    }>();
    const user = request.user;
    if (!user?.userId) {
      throw new DomainException(
        AuthErrorCodes.AuthRequired,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const businessId = request.params?.businessId;
    if (!businessId) {
      throw new DomainException(
        'BUSINESS_ID_REQUIRED',
        'businessId path param is required for entitlement checks',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.tenancy.assertMembership(user.userId, businessId);

    // Sensitive mutate/export: SELF_HOSTED must have an active install license.
    if (this.billing.requiresInstallationLicense()) {
      await this.billing.assertInstallationLicensed();
    }

    if (meta.requireAll && meta.requireAll.length > 0) {
      for (const code of meta.requireAll) {
        await this.entitlements.assertCan(businessId, code);
      }
      return true;
    }

    if (meta.requireWritable) {
      await this.entitlements.assertBusinessWritable(businessId);
    }

    return true;
  }
}
