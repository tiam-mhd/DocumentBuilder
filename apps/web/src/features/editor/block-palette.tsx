'use client';

import {
  getBlockRegistry,
  type BlockType,
} from '@vdb/document-schema';
import { useTranslations } from 'next-intl';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { ModuleUpgradeCta } from '@/features/billing/module-upgrade-cta';
import { useEditorStore } from './store/editor-store';
import styles from './block-palette.module.css';

type Props = { disabled: boolean };

export function BlockPalette({ disabled }: Props) {
  const t = useTranslations('editor');
  const tBlocks = useTranslations('blocks');
  const addBlock = useEditorStore((s) => s.addBlock);
  const { can } = useEntitlements();

  const registry = getBlockRegistry();
  const allowed = registry.filter((entry) => {
    if (!entry.moduleCode) return true;
    return can(entry.moduleCode);
  });
  const locked = registry.filter((entry) => {
    if (!entry.moduleCode) return false;
    return !can(entry.moduleCode);
  });

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>{t('paletteTitle')}</h2>
      <div className={styles.grid}>
        {allowed.map((entry) => (
          <button
            key={entry.type}
            type="button"
            className={styles.btn}
            disabled={disabled}
            onClick={() => addBlock(entry.type as BlockType)}
          >
            {tBlocks(entry.labelKey)}
          </button>
        ))}
      </div>
      {locked.length > 0 ? (
        <div className={styles.locked}>
          <p className={styles.lockedTitle}>{t('paletteLockedTitle')}</p>
          <ul className={styles.lockedList}>
            {locked.map((entry) => (
              <li key={entry.type} className={styles.lockedItem}>
                <span>{tBlocks(entry.labelKey)}</span>
                <span className={styles.lockedCode}>{entry.moduleCode}</span>
              </li>
            ))}
          </ul>
          <ModuleUpgradeCta />
        </div>
      ) : null}
    </div>
  );
}
