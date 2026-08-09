'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PublicBusinessEntitlements } from '@vdb/shared-types';
import { fetchBusinessEntitlements } from '@/shared/api/entitlements';
import { useBusinesses } from '@/shared/lib/business-context';

export function useEntitlements() {
  const { activeBusiness, loading: businessLoading } = useBusinesses();
  const [entitlements, setEntitlements] =
    useState<PublicBusinessEntitlements | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!activeBusiness) {
      setEntitlements(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBusinessEntitlements(activeBusiness.id);
      setEntitlements(data);
    } catch {
      setEntitlements(null);
      setError('load_failed');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness]);

  useEffect(() => {
    if (businessLoading) return;
    void refresh();
  }, [businessLoading, refresh]);

  function can(code: string): boolean {
    if (!entitlements?.writable) return false;
    return entitlements.codes.includes(code);
  }

  return {
    entitlements,
    loading: businessLoading || loading,
    error,
    refresh,
    writable: entitlements?.writable ?? false,
    can,
  };
}
