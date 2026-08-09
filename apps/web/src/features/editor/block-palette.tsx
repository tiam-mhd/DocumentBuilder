'use client';

import { CORE_BLOCK_REGISTRY, type CoreBlockType } from '@vdb/document-schema';
import { useTranslations } from 'next-intl';
import { useEditorStore } from './store/editor-store';
import styles from './block-palette.module.css';

type Props = { disabled: boolean };

export function BlockPalette({ disabled }: Props) {
  const t = useTranslations('editor');
  const tBlocks = useTranslations('blocks');
  const addBlock = useEditorStore((s) => s.addBlock);

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>{t('paletteTitle')}</h2>
      <div className={styles.grid}>
        {CORE_BLOCK_REGISTRY.map((entry) => (
          <button
            key={entry.type}
            type="button"
            className={styles.btn}
            disabled={disabled}
            onClick={() => addBlock(entry.type as CoreBlockType)}
          >
            {tBlocks(entry.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
