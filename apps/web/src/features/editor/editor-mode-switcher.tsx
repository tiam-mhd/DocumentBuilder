'use client';

import { useId, type KeyboardEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  useEditorStore,
  type EditorMode,
} from './store/editor-store';
import styles from './editor-mode-switcher.module.css';

const MODES: EditorMode[] = ['edit', 'htmlPreview', 'pdfPreview'];

export function EditorModeSwitcher() {
  const t = useTranslations('editor');
  const locale = useLocale();
  const rtl = locale === 'fa';
  const mode = useEditorStore((s) => s.editorMode);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const groupId = useId();

  function labelFor(m: EditorMode): string {
    switch (m) {
      case 'edit':
        return t('modeEdit');
      case 'htmlPreview':
        return t('modeHtmlPreview');
      case 'pdfPreview':
        return t('modePdfPreview');
    }
  }

  function move(delta: number) {
    const idx = MODES.indexOf(mode);
    const next = MODES[(idx + delta + MODES.length) % MODES.length];
    setEditorMode(next);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const forward = e.key === 'ArrowRight';
      // Visual next: in RTL the flex order is mirrored, so ArrowRight still
      // moves toward the visual end of the control.
      const delta = rtl ? (forward ? -1 : 1) : forward ? 1 : -1;
      move(delta);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setEditorMode(MODES[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      setEditorMode(MODES[MODES.length - 1]);
    }
  }

  return (
    <div
      className={styles.switcher}
      role="radiogroup"
      aria-label={t('modeSwitcherLabel')}
      id={groupId}
      onKeyDown={onKeyDown}
    >
      {MODES.map((m) => {
        const selected = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            className={styles.option}
            aria-checked={selected}
            data-active={selected ? 'true' : 'false'}
            tabIndex={selected ? 0 : -1}
            onClick={() => setEditorMode(m)}
          >
            {labelFor(m)}
          </button>
        );
      })}
    </div>
  );
}
