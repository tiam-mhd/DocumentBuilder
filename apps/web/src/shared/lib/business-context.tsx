'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { PublicBusiness } from '@vdb/shared-types';
import {
  createBusiness,
  listBusinesses,
  deleteBusiness,
  updateBusiness,
} from '@/shared/api/businesses';
import { useAuth } from '@/shared/lib/auth-context';
import {
  clearActiveBusinessId,
  getActiveBusinessId,
  setActiveBusinessId,
} from '@/shared/lib/business-storage';

type BusinessContextValue = {
  businesses: PublicBusiness[];
  activeBusiness: PublicBusiness | null;
  loading: boolean;
  refresh: () => Promise<void>;
  selectBusiness: (businessId: string) => void;
  create: (name: string) => Promise<PublicBusiness>;
  rename: (businessId: string, name: string) => Promise<PublicBusiness>;
  remove: (businessId: string) => Promise<void>;
};

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<PublicBusiness[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setBusinesses([]);
      setActiveId(null);
      clearActiveBusinessId();
      return;
    }
    const list = await listBusinesses();
    setBusinesses(list);
    const stored = getActiveBusinessId();
    const stillValid = list.some((b) => b.id === stored);
    if (stillValid && stored) {
      setActiveId(stored);
      setActiveBusinessId(stored);
    } else if (list[0]) {
      setActiveId(list[0].id);
      setActiveBusinessId(list[0].id);
    } else {
      setActiveId(null);
      clearActiveBusinessId();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await refresh();
      } catch {
        if (!cancelled) {
          setBusinesses([]);
          setActiveId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, refresh]);

  const selectBusiness = useCallback(
    (businessId: string) => {
      if (!businesses.some((b) => b.id === businessId)) return;
      setActiveId(businessId);
      setActiveBusinessId(businessId);
    },
    [businesses],
  );

  const create = useCallback(
    async (name: string) => {
      const created = await createBusiness(name);
      await refresh();
      setActiveId(created.id);
      setActiveBusinessId(created.id);
      return created;
    },
    [refresh],
  );

  const rename = useCallback(
    async (businessId: string, name: string) => {
      const updated = await updateBusiness(businessId, name);
      await refresh();
      return updated;
    },
    [refresh],
  );

  const remove = useCallback(
    async (businessId: string) => {
      await deleteBusiness(businessId);
      await refresh();
    },
    [refresh],
  );

  const activeBusiness =
    businesses.find((b) => b.id === activeId) ?? null;

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        activeBusiness,
        loading: authLoading || loading,
        refresh,
        selectBusiness,
        create,
        rename,
        remove,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinesses(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error('useBusinesses must be used within BusinessProvider');
  }
  return ctx;
}
