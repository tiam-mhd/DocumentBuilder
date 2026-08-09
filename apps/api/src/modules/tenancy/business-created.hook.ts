import { MembershipRole } from '@prisma/client';

/**
 * Hook after Business + OWNER membership are created inside a transaction.
 * Composite (TenancyModule): TrialFirstBusinessHook + DesignThemeSeedHook.
 */
export const BUSINESS_CREATED_HOOK = Symbol('BUSINESS_CREATED_HOOK');

export type BusinessCreatedContext = {
  userId: string;
  businessId: string;
  /** True when this user had zero OWNER memberships before this create. */
  isFirstOwnedBusiness: boolean;
};

export interface BusinessCreatedHook {
  afterBusinessCreated(
    // Prisma transaction client — typed loosely until Billing owns the hook.
    tx: unknown,
    context: BusinessCreatedContext,
  ): Promise<void>;
}

export class NoopBusinessCreatedHook implements BusinessCreatedHook {
  async afterBusinessCreated(): Promise<void> {
    // Tests / fallbacks only — production uses TrialFirstBusinessHook.
  }
}

export { MembershipRole };
