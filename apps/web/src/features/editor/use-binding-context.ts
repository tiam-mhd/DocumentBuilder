'use client';

import { useEffect, useState } from 'react';
import {
  documentCollectBindingSources,
  type BindingContext,
  type DocumentBody,
  type RepeaterSource,
} from '@vdb/document-schema';
import { listCollection } from '@/shared/api/collections';
import { useBusinesses } from '@/shared/lib/business-context';

const EMPTY: BindingContext = {
  business: { name: '' },
  collections: {},
};

/** Build ADR 016 BindingContext for editor preview (same resolver as PDF). */
export function useBindingContext(body: DocumentBody | null): BindingContext {
  const { activeBusiness } = useBusinesses();
  const [ctx, setCtx] = useState<BindingContext>(EMPTY);

  const locale = body?.locale === 'en' ? 'en' : 'fa';
  const sourcesKey = body
    ? documentCollectBindingSources(body).slice().sort().join(',')
    : '';

  useEffect(() => {
    if (!activeBusiness || !body) {
      setCtx(EMPTY);
      return;
    }
    let cancelled = false;
    const sources = documentCollectBindingSources(body);
    void (async () => {
      const collections: BindingContext['collections'] = {};
      await Promise.all(
        sources.map(async (source: RepeaterSource) => {
          try {
            const list = await listCollection(activeBusiness.id, source, {
              limit: 100,
              locale,
            });
            collections[source] = {
              total: list.total,
              items: list.items,
            };
          } catch {
            collections[source] = { total: 0, items: [] };
          }
        }),
      );
      if (!cancelled) {
        setCtx({
          business: { name: activeBusiness.name },
          collections,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBusiness?.id, activeBusiness?.name, sourcesKey, locale, body]);

  return ctx;
}
