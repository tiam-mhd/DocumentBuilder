'use client';

import type { PublicOrgChartNode } from '@vdb/shared-types';
import type { OrgChartLayout } from '@vdb/document-schema';
import styles from './org-chart-tree.module.css';

type Props = {
  roots: PublicOrgChartNode[];
  layout: OrgChartLayout;
  heightPx?: number;
};

function NodeList({ nodes }: { nodes: PublicOrgChartNode[] }) {
  if (nodes.length === 0) return null;
  return (
    <ul className={styles.list}>
      {nodes.map((n) => (
        <li key={n.id} className={styles.item}>
          <div className={styles.node}>
            <div className={styles.name}>{n.name}</div>
            {n.roleTitle ? (
              <div className={styles.role}>{n.roleTitle}</div>
            ) : null}
          </div>
          <NodeList nodes={n.children} />
        </li>
      ))}
    </ul>
  );
}

export function OrgChartTreeView({ roots, layout, heightPx = 360 }: Props) {
  const layoutClass =
    layout === 'tree-horizontal' ? styles.horizontal : styles.vertical;
  return (
    <div
      className={`${styles.wrap} ${layoutClass}`}
      style={{ maxHeight: heightPx }}
    >
      <NodeList nodes={roots} />
    </div>
  );
}
