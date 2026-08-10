'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { BlockNode, DocumentBody } from '@vdb/document-schema';
import { getBlockRegistry } from '@vdb/document-schema';
import { useEditorStore } from './store/editor-store';
import styles from './editor-layers-tree.module.css';

type Props = {
  body: DocumentBody;
  selectedBlockId: string | null;
  readOnly: boolean;
};

type FlatRow = {
  id: string;
  depth: number;
  type: string;
  summary: string;
};

function blockLabelKey(type: string): string {
  return getBlockRegistry().find((e) => e.type === type)?.labelKey ?? type;
}

function summarize(
  block: BlockNode,
  t: (key: string) => string,
): string {
  if (block.type === 'text') {
    const c = String(block.props.content ?? '').trim();
    return c.slice(0, 40) || t('emptyText');
  }
  if (block.type === 'section') {
    const title = String(block.props.title ?? '').trim();
    return title || t('sectionUntitled');
  }
  return '';
}

function walkBlocks(
  blocks: BlockNode[],
  depth: number,
  t: (key: string) => string,
  out: FlatRow[],
) {
  for (const block of blocks) {
    out.push({
      id: block.id,
      depth,
      type: block.type,
      summary: summarize(block, t),
    });
    if (block.children?.length) {
      walkBlocks(block.children, depth + 1, t, out);
    }
  }
}

export function EditorLayersTree({
  body,
  selectedBlockId,
  readOnly,
}: Props) {
  const t = useTranslations('editor');
  const tBlocks = useTranslations('blocks');
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const listRef = useRef<HTMLUListElement>(null);

  const rows = useMemo(() => {
    const out: { pageId: string; pageIndex: number; rows: FlatRow[] }[] = [];
    body.pages.forEach((page, pageIndex) => {
      const flat: FlatRow[] = [];
      walkBlocks(page.blocks, 0, t, flat);
      out.push({ pageId: page.id, pageIndex, rows: flat });
    });
    return out;
  }, [body.pages, t]);

  useEffect(() => {
    if (!selectedBlockId || !listRef.current) return;
    const safe = selectedBlockId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const el = listRef.current.querySelector(`[data-block-id="${safe}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedBlockId]);

  return (
    <div className={styles.wrap}>
      <ul
        ref={listRef}
        className={styles.tree}
        role="tree"
        aria-label={t('layersTreeLabel')}
      >
        {rows.map((page) => (
          <li key={page.pageId} role="treeitem" aria-expanded="true">
            <div className={styles.pageLabel}>
              {t('layersPage', { n: page.pageIndex + 1 })}
            </div>
            {page.rows.length === 0 ? (
              <p className={styles.empty}>{t('layersEmptyPage')}</p>
            ) : (
              <ul className={styles.pageChildren} role="group">
                {page.rows.map((row) => {
                  const selected = row.id === selectedBlockId;
                  const typeLabel = tBlocks(
                    blockLabelKey(row.type) as 'text',
                  );
                  return (
                    <li key={row.id} role="none">
                      <button
                        type="button"
                        role="treeitem"
                        data-block-id={row.id}
                        aria-selected={selected}
                        className={styles.row}
                        data-selected={selected ? 'true' : 'false'}
                        style={{ paddingInlineStart: `${0.55 + row.depth * 0.85}rem` }}
                        disabled={false}
                        onClick={() => selectBlock(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            selectBlock(row.id);
                          }
                        }}
                      >
                        <span className={styles.type}>{typeLabel}</span>
                        {row.summary ? (
                          <span className={styles.summary}>{row.summary}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {readOnly ? (
        <p className={styles.readOnlyHint}>{t('layersReadOnly')}</p>
      ) : null}
    </div>
  );
}
