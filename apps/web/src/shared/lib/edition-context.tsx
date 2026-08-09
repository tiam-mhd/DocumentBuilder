'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { fetchSystemConfig, type PublicSystemConfig } from '@/shared/api/system';

type EditionContextValue = {
  config: PublicSystemConfig | null;
  loading: boolean;
  error: string | null;
};

const EditionContext = createContext<EditionContextValue>({
  config: null,
  loading: true,
  error: null,
});

export function EditionProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicSystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchSystemConfig();
        if (!cancelled) {
          setConfig(data);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('NETWORK_ERROR');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <EditionContext.Provider value={{ config, loading, error }}>
      {children}
    </EditionContext.Provider>
  );
}

export function useEdition() {
  return useContext(EditionContext);
}
