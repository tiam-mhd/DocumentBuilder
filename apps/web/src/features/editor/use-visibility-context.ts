'use client';

import { useEffect, useState } from 'react';
import {
  documentCollectVisibilitySources,
  documentCollectRepeaterSources,
  type DocumentBody,
  type VisibilityContext,
} from '@vdb/document-schema';
import { listCollection } from '@/shared/api/collections';
import { useBusinesses } from '@/shared/lib/business-context';

/** Load collection counts for `when` evaluation in the editor preview. */
export function useVisibilityContext(
  body: DocumentBody | null,
): VisibilityContext {
  const { activeBusiness } = useBusinesses();
  const [ctx, setCtx] = useState<VisibilityContext>({ collection: {} });

  const sourcesKey = body
    ? [
        ...new Set([
          ...documentCollectVisibilitySources(body),
          ...documentCollectRepeaterSources(body),
        ]),
      ]
        .sort()
        .join(',')
    : '';

  useEffect(() => {
    if (!activeBusiness || !sourcesKey) {
      setCtx({ collection: {} });
      return;
    }
    const sources = sourcesKey.split(',').filter(Boolean);
    let cancelled = false;
    void Promise.all(
      sources.map(async (source) => {
        try {
          const list = await listCollection(activeBusiness.id, source, {
            limit: 1,
          });
          return [source, list.total] as const;
        } catch {
          return [source, 0] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const collection: Record<string, number> = {};
      for (const [source, count] of pairs) {
        collection[source] = count;
      }
      setCtx({ collection });
    });
    return () => {
      cancelled = true;
    };
  }, [activeBusiness?.id, sourcesKey]);

  return ctx;
}
