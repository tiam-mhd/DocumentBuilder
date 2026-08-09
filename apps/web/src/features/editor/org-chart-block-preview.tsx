'use client';

import { useEffect, useState } from 'react';
import { parseOrgChartBlockProps, type BlockNode } from '@vdb/document-schema';
import type { PublicOrgChartNode } from '@vdb/shared-types';
import { getOrgChartTree } from '@/shared/api/org-chart';
import { useBusinesses } from '@/shared/lib/business-context';
import { OrgChartTreeView } from '@/features/content/org-chart-tree';
import { useTranslations } from 'next-intl';
import styles from './html-preview.module.css';

type Props = { block: BlockNode };

export function OrgChartBlockPreview({ block }: Props) {
  const t = useTranslations('editor');
  const { activeBusiness } = useBusinesses();
  const props = parseOrgChartBlockProps(block.props);
  const [roots, setRoots] = useState<PublicOrgChartNode[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!activeBusiness) {
      setRoots([]);
      return;
    }
    let cancelled = false;
    void getOrgChartTree(activeBusiness.id, {
      rootMemberId: props.rootMemberId,
    })
      .then((tree) => {
        if (!cancelled) {
          setRoots(tree.roots);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoots([]);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeBusiness?.id, props.rootMemberId]);

  if (failed) {
    return (
      <div className={styles.imagePh} style={{ minHeight: props.heightPx }}>
        {t('orgChartPlaceholder')}
      </div>
    );
  }

  if (roots.length === 0) {
    return (
      <div className={styles.imagePh} style={{ minHeight: props.heightPx }}>
        {t('orgChartEmpty')}
      </div>
    );
  }

  return (
    <OrgChartTreeView
      roots={roots}
      layout={props.layout}
      heightPx={props.heightPx}
    />
  );
}
