import { SetMetadata } from '@nestjs/common';

export const ENTITLEMENT_META_KEY = 'vdb:entitlement';
/** Membership RBAC codes — composes with entitlement meta (separate key). */
export const MEMBERSHIP_PERMISSION_META_KEY = 'vdb:membership-permission';

export type EntitlementRouteMeta = {
  /** Require subscription in trial|active|grace (effective). */
  requireWritable?: boolean;
  /** All of these subscription entitlement codes must be present (implies writable). */
  requireAll?: string[];
};

export const RequireWritable = () =>
  SetMetadata(ENTITLEMENT_META_KEY, {
    requireWritable: true,
  } satisfies EntitlementRouteMeta);

export const RequireEntitlement = (...codes: string[]) =>
  SetMetadata(ENTITLEMENT_META_KEY, {
    requireWritable: true,
    requireAll: codes,
  } satisfies EntitlementRouteMeta);

export const RequireModule = (...moduleCodes: string[]) =>
  RequireEntitlement(...moduleCodes);

/**
 * Require ALL listed membership permission codes (role matrix).
 * Independent of subscription entitlements — use alongside @RequireWritable / @RequireModule.
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(MEMBERSHIP_PERMISSION_META_KEY, permissions);
