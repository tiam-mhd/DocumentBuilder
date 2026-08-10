'use client';

import {
  getBlockRegistry,
  type BlockType,
} from '@vdb/document-schema';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { ModuleUpgradeCta } from '@/features/billing/module-upgrade-cta';
import { useEditorStore } from './store/editor-store';
import styles from './block-palette.module.css';

type Props = { disabled: boolean };

type PaletteGroupId =
  | 'structure'
  | 'text'
  | 'media'
  | 'data'
  | 'modules'
  | 'other';

const GROUP_TYPES: Record<PaletteGroupId, readonly string[]> = {
  structure: ['section', 'divider', 'headerSlot', 'footerSlot', 'row', 'column'],
  text: ['text'],
  media: ['image', 'gallery'],
  data: ['qr', 'toc', 'repeater'],
  modules: ['map', 'orgChart', 'timeline'],
};

const GROUP_ORDER: PaletteGroupId[] = [
  'structure',
  'text',
  'media',
  'data',
  'modules',
];

export function BlockPalette({ disabled }: Props) {
  const t = useTranslations('editor');
  const tBlocks = useTranslations('blocks');
  const addBlock = useEditorStore((s) => s.addBlock);
  const { can } = useEntitlements();
  const [query, setQuery] = useState('');

  const registry = getBlockRegistry();
  const q = query.trim().toLowerCase();

  const { groups, locked } = useMemo(() => {
    const lockedEntries = registry.filter((entry) => {
      if (!entry.moduleCode) return false;
      return !can(entry.moduleCode);
    });

    const match = (type: string, labelKey: string) => {
      if (!q) return true;
      const label = tBlocks(labelKey as 'text').toLowerCase();
      return label.includes(q) || type.toLowerCase().includes(q);
    };

    const grouped = GROUP_ORDER.map((id) => {
      const types = new Set(GROUP_TYPES[id]);
      const items = registry.filter((entry) => {
        if (!types.has(entry.type)) return false;
        if (entry.moduleCode && !can(entry.moduleCode)) return false;
        return match(entry.type, entry.labelKey);
      });
      return { id, items };
    }).filter((g) => g.items.length > 0);

    const typed = new Set(GROUP_ORDER.flatMap((id) => [...GROUP_TYPES[id]]));
    const leftovers = registry.filter((entry) => {
      if (typed.has(entry.type)) return false;
      if (entry.moduleCode && !can(entry.moduleCode)) return false;
      return match(entry.type, entry.labelKey);
    });
    if (leftovers.length > 0) {
      grouped.push({ id: 'other' as PaletteGroupId, items: leftovers });
    }

    return { groups: grouped, locked: lockedEntries };
  }, [registry, can, q, tBlocks]);

  return (
    <div className={styles.wrap}>
      <label className={styles.searchField}>
        <span className={styles.srOnly}>{t('paletteSearch')}</span>
        <input
          className={styles.search}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('paletteSearchPlaceholder')}
          disabled={disabled}
        />
      </label>

      {groups.length === 0 ? (
        <p className={styles.empty}>{t('paletteSearchEmpty')}</p>
      ) : (
        groups.map((group) => (
          <div key={group.id} className={styles.group}>
            <h3 className={styles.groupTitle}>
              {group.id === 'structure'
                ? t('paletteGroup_structure')
                : group.id === 'text'
                  ? t('paletteGroup_text')
                  : group.id === 'media'
                    ? t('paletteGroup_media')
                    : group.id === 'data'
                      ? t('paletteGroup_data')
                      : group.id === 'modules'
                        ? t('paletteGroup_modules')
                        : t('paletteGroup_other')}
            </h3>
            <div className={styles.grid}>
              {group.items.map((entry) => (
                <button
                  key={entry.type}
                  type="button"
                  className={styles.btn}
                  disabled={disabled}
                  onClick={() => addBlock(entry.type as BlockType)}
                >
                  {tBlocks(entry.labelKey as 'text')}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {locked.length > 0 ? (
        <div className={styles.locked}>
          <p className={styles.lockedTitle}>{t('paletteLockedTitle')}</p>
          <ul className={styles.lockedList}>
            {locked.map((entry) => (
              <li key={entry.type} className={styles.lockedItem}>
                <span>{tBlocks(entry.labelKey as 'text')}</span>
                <span className={styles.lockedBadge}>{t('sourceLocked')}</span>
              </li>
            ))}
          </ul>
          <ModuleUpgradeCta />
        </div>
      ) : null}
    </div>
  );
}
