'use client';

import { useTranslations } from 'next-intl';
import { getPrimaryPage } from '@vdb/document-schema';
import { findBlock, useEditorStore } from './store/editor-store';
import styles from './block-inspector.module.css';

type Props = { disabled: boolean };

export function BlockInspector({ disabled }: Props) {
  const t = useTranslations('editor');
  const tBlocks = useTranslations('blocks');
  const body = useEditorStore((s) => s.body);
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps);
  const updateTextContent = useEditorStore((s) => s.updateTextContent);

  const block =
    body && selectedBlockId
      ? findBlock(getPrimaryPage(body).blocks, selectedBlockId)
      : null;

  if (!block) {
    return (
      <div className={styles.wrap}>
        <h2 className={styles.title}>{t('inspectorTitle')}</h2>
        <p className={styles.hint}>{t('inspectorEmpty')}</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>
        {t('inspectorTitle')} · {tBlocks(block.type)}
      </h2>

      {block.type === 'text' ? (
        <label className={styles.field}>
          <span>{t('textContent')}</span>
          <textarea
            className={styles.textarea}
            rows={5}
            disabled={disabled}
            value={String(block.props.content ?? '')}
            onChange={(e) => updateTextContent(block.id, e.target.value)}
          />
        </label>
      ) : null}

      {block.type === 'section' ? (
        <label className={styles.field}>
          <span>{t('sectionTitle')}</span>
          <input
            className={styles.input}
            disabled={disabled}
            value={String(block.props.title ?? '')}
            onChange={(e) =>
              updateBlockProps(block.id, { title: e.target.value })
            }
          />
        </label>
      ) : null}

      {block.type === 'image' ? (
        <label className={styles.field}>
          <span>{t('imageAlt')}</span>
          <input
            className={styles.input}
            disabled={disabled}
            value={String(block.props.alt ?? '')}
            onChange={(e) =>
              updateBlockProps(block.id, { alt: e.target.value })
            }
          />
        </label>
      ) : null}

      {block.type === 'divider' ||
      block.type === 'headerSlot' ||
      block.type === 'footerSlot' ? (
        <p className={styles.hint}>{t('noProps')}</p>
      ) : null}
    </div>
  );
}
