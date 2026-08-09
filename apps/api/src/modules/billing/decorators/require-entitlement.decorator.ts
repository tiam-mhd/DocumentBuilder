import { SetMetadata } from '@nestjs/common';

export const ENTITLEMENT_META_KEY = 'vdb:entitlement';

export type EntitlementRouteMeta = {
  /** Require subscription in trial|active|grace (effective). */
  requireWritable?: boolean;
  /** All of these codes must be present (implies writable). */
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
