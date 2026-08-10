'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { DocumentBody } from '@vdb/document-schema';
import { BlockPalette } from './block-palette';
import { EditorLayersTree } from './editor-layers-tree';
import styles from './editor-left-rail.module.css';

type Props = {
  disabled: boolean;
  body: DocumentBody;
  selectedBlockId: string | null;
  leftCollapsed: boolean;
  onToggleCollapse: () => void;
  /** Increment to force Palette tab + expand (empty-canvas CTA). */
  focusPaletteNonce?: number;
};

type TabId = 'palette' | 'layers';

export function EditorLeftRail({
  disabled,
  body,
  selectedBlockId,
  leftCollapsed,
  onToggleCollapse,
  focusPaletteNonce = 0,
}: Props) {
  const t = useTranslations('editor');
  const [tab, setTab] = useState<TabId>('palette');

  useEffect(() => {
    if (focusPaletteNonce > 0) {
      setTab('palette');
    }
  }, [focusPaletteNonce]);

  return (
    <aside className={styles.rail} aria-label={t('leftRailLabel')}>
      <div className={styles.header}>
        {!leftCollapsed ? (
          <div className={styles.tabs} role="tablist" aria-label={t('leftRailTabs')}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'palette'}
              className={styles.tab}
              data-active={tab === 'palette' ? 'true' : 'false'}
              onClick={() => setTab('palette')}
            >
              {t('leftTabPalette')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'layers'}
              className={styles.tab}
              data-active={tab === 'layers' ? 'true' : 'false'}
              onClick={() => setTab('layers')}
            >
              {t('leftTabLayers')}
            </button>
          </div>
        ) : (
          <span className={styles.collapsedLabel}>{t('paletteRailTitle')}</span>
        )}
        <button
          type="button"
          className={styles.collapseBtn}
          aria-pressed={leftCollapsed}
          onClick={onToggleCollapse}
          title={leftCollapsed ? t('expandLeftRail') : t('collapseLeftRail')}
        >
          {leftCollapsed ? t('expandLeftRailShort') : t('collapseLeftRailShort')}
        </button>
      </div>

      {!leftCollapsed ? (
        <div
          className={styles.body}
          role="tabpanel"
          aria-label={
            tab === 'palette' ? t('leftTabPalette') : t('leftTabLayers')
          }
        >
          {tab === 'palette' ? (
            <BlockPalette disabled={disabled} />
          ) : (
            <EditorLayersTree
              body={body}
              selectedBlockId={selectedBlockId}
              readOnly={disabled}
            />
          )}
        </div>
      ) : null}
    </aside>
  );
}
