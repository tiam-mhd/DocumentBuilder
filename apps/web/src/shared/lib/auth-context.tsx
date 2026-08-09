'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { PublicUser } from '@vdb/shared-types';
import { fetchMe, logoutRequest } from '@/shared/api/auth';
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
} from '@/shared/lib/auth-storage';
import { ApiClientError } from '@/shared/api/client';

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  setSession: (token: string, expiresInSeconds: number, user: PublicUser) => void;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = getStoredAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        clearStoredAccessToken();
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refreshMe();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  const setSession = useCallback(
    (token: string, expiresInSeconds: number, nextUser: PublicUser) => {
      setStoredAccessToken(token, expiresInSeconds);
      setUser(nextUser);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      if (getStoredAccessToken()) {
        await logoutRequest();
      }
    } catch {
      // still clear local session
    } finally {
      clearStoredAccessToken();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        setSession,
        refreshMe,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
