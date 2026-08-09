'use client';

import { useEffect, useState } from 'react';
import { parseTimelineBlockProps, type BlockNode } from '@vdb/document-schema';
import type { PublicTimelineEvent } from '@vdb/shared-types';
import { listTimelineEvents } from '@/shared/api/timeline';
import { useBusinesses } from '@/shared/lib/business-context';
import { TimelineView } from '@/features/content/timeline-view';
import { useTranslations } from 'next-intl';
import styles from './html-preview.module.css';

type Props = { block: BlockNode };

export function TimelineBlockPreview({ block }: Props) {
  const t = useTranslations('editor');
  const { activeBusiness } = useBusinesses();
  const props = parseTimelineBlockProps(block.props);
  const [items, setItems] = useState<PublicTimelineEvent[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!activeBusiness) {
      setItems([]);
      return;
    }
    let cancelled = false;
    void listTimelineEvents(activeBusiness.id, {
      page: 1,
      pageSize: props.limit,
    })
      .then((list) => {
        if (!cancelled) {
          setItems(list.items.slice(0, props.limit));
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeBusiness?.id, props.limit]);

  if (failed) {
    return (
      <div className={styles.imagePh} style={{ minHeight: props.heightPx }}>
        {t('timelinePlaceholder')}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.imagePh} style={{ minHeight: props.heightPx }}>
        {t('timelineEmpty')}
      </div>
    );
  }

  return (
    <TimelineView
      items={items}
      layout={props.layout}
      heightPx={props.heightPx}
    />
  );
}
