'use client';

import { useEffect, useState } from 'react';
import {
  documentCollectRepeaterSources,
  paginateDocumentBody,
  parseRepeaterBlockProps,
  walkDocumentBlocks,
  type BindingContext,
  type DocumentBody,
  type VisibilityContext,
} from '@vdb/document-schema';
import type { PublicCollectionItem } from '@vdb/shared-types';
import { listCollection } from '@/shared/api/collections';
import { useBusinesses } from '@/shared/lib/business-context';

/**
 * Approximate smart pagination for editor preview (ADR 017).
 * Same packer as PDF; height estimates — not Chromium measure.
 */
export function usePaginatedPreviewBody(
  body: DocumentBody,
  binding: BindingContext,
  visibility: VisibilityContext,
): DocumentBody {
  const { activeBusiness } = useBusinesses();
  const [paginated, setPaginated] = useState(body);
  const locale = body.locale === 'en' ? 'en' : 'fa';
  const sourcesKey = documentCollectRepeaterSources(body).slice().sort().join(',');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const repeaterItemsByBlockId: Record<string, PublicCollectionItem[]> =
        {};
      if (activeBusiness) {
        const jobs: Promise<void>[] = [];
        for (const page of body.pages) {
          walkDocumentBlocks(page.blocks, (b) => {
            if (b.type !== 'repeater') return;
            const props = parseRepeaterBlockProps(b.props);
            jobs.push(
              listCollection(activeBusiness.id, props.source, {
                limit: props.limit,
                locale,
              })
                .then((list) => {
                  repeaterItemsByBlockId[b.id] = list.items;
                })
                .catch(() => {
                  repeaterItemsByBlockId[b.id] = [];
                }),
            );
          });
        }
        await Promise.all(jobs);
      }
      if (cancelled) return;
      setPaginated(
        paginateDocumentBody(body, {
          visibility,
          repeaterItemsByBlockId,
          binding,
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [
    activeBusiness?.id,
    body,
    binding,
    visibility,
    locale,
    sourcesKey,
  ]);

  return paginated;
}
