'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  bindBlockTree,
  parseRepeaterBlockProps,
  type BlockNode,
} from '@vdb/document-schema';
import type { PublicCollectionItem } from '@vdb/shared-types';
import { listCollection } from '@/shared/api/collections';
import { useBusinesses } from '@/shared/lib/business-context';
import { useTranslations } from 'next-intl';
import styles from './html-preview.module.css';

type Props = {
  block: BlockNode;
  renderChild: (child: BlockNode) => ReactNode;
};

export function RepeaterBlockPreview({ block, renderChild }: Props) {
  const t = useTranslations('editor');
  const { activeBusiness } = useBusinesses();
  const props = parseRepeaterBlockProps(block.props);
  const [items, setItems] = useState<PublicCollectionItem[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!activeBusiness) {
      setItems([]);
      return;
    }
    let cancelled = false;
    void listCollection(activeBusiness.id, props.source, {
      limit: props.limit,
    })
      .then((list) => {
        if (!cancelled) {
          setItems(list.items);
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
  }, [activeBusiness?.id, props.source, props.limit]);

  if (failed) {
    return (
      <div className={styles.imagePh} data-testid="repeater-preview-failed">
        {t('repeaterPlaceholder')}
      </div>
    );
  }

  if (items.length === 0) {
    const msg = props.emptyMessage.trim() || t('repeaterEmpty');
    return (
      <div className={styles.imagePh} data-testid="repeater-preview-empty">
        {msg}
      </div>
    );
  }

  return (
    <div className={styles.repeater} data-testid="repeater-preview">
      {items.map((item) => {
        const bound = bindBlockTree(block.children ?? [], item.values);
        return (
          <div key={item.id} className={styles.repeaterCard}>
            {bound.map((c) => renderChild(c))}
          </div>
        );
      })}
    </div>
  );
}
