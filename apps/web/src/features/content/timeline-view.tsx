'use client';

import type { PublicTimelineEvent } from '@vdb/shared-types';
import type { TimelineLayout } from '@vdb/document-schema';
import styles from './timeline-view.module.css';

type Props = {
  items: PublicTimelineEvent[];
  layout: TimelineLayout;
  heightPx?: number;
};

export function TimelineView({ items, layout, heightPx = 420 }: Props) {
  const layoutClass =
    layout === 'alternating' ? styles.alternating : styles.vertical;
  return (
    <div
      className={`${styles.wrap} ${layoutClass}`}
      style={{ maxHeight: heightPx }}
    >
      <ul className={styles.list}>
        {items.map((ev) => (
          <li key={ev.id} className={styles.item}>
            <div className={styles.date}>{ev.occurredAt.slice(0, 10)}</div>
            <div className={styles.card}>
              <p className={styles.title}>{ev.title}</p>
              {ev.body ? <p className={styles.body}>{ev.body}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
