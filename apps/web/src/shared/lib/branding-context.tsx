'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PublicBusinessBranding } from '@vdb/shared-types';
import { fetchBranding, brandingLogoAbsoluteUrl } from '@/shared/api/branding';
import { getStoredAccessToken } from '@/shared/lib/auth-storage';
import { useAuth } from '@/shared/lib/auth-context';
import { useBusinesses } from '@/shared/lib/business-context';

type BrandingContextValue = {
  branding: PublicBusinessBranding | null;
  logoSrc: string | null;
  refresh: () => Promise<void>;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { activeBusiness } = useBusinesses();
  const [branding, setBranding] = useState<PublicBusinessBranding | null>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !activeBusiness?.id) {
      setBranding(null);
      setLogoSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    try {
      const data = await fetchBranding(activeBusiness.id);
      setBranding(data);
      setLogoSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      if (!data.hasLogo) return;
      const url = brandingLogoAbsoluteUrl(data.businessId, true);
      if (!url) return;
      const token = getStoredAccessToken();
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store',
      });
      if (!res.ok) return;
      const blob = await res.blob();
      setLogoSrc(URL.createObjectURL(blob));
    } catch {
      setBranding(null);
    }
  }, [isAuthenticated, activeBusiness?.id]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  useEffect(() => {
    return () => {
      if (logoSrc) URL.revokeObjectURL(logoSrc);
    };
  }, [logoSrc]);

  const value = useMemo(
    () => ({ branding, logoSrc, refresh }),
    [branding, logoSrc, refresh],
  );

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBusinessBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error('useBusinessBranding requires BrandingProvider');
  }
  return ctx;
}
