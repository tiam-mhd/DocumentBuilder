'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import type { DesignThemeTokens } from '@vdb/shared-types';
import { DEFAULT_DESIGN_THEME_TOKENS } from '@vdb/shared-types';
import { getDocument } from '@/shared/api/documents';
import { getDefaultTheme } from '@/shared/api/themes';
import { ApiClientError, mapApiErrorCode } from '@/shared/api/client';
import { useBusinesses } from '@/shared/lib/business-context';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { BlockInspector } from './block-inspector';
import { BlockPalette } from './block-palette';
import { FlowCanvas } from './flow-canvas';
import { HtmlPreview } from './html-preview';
import { MasterPanel } from './master-panel';
import { ExportPanel } from './export-panel';
import { useEditorAutosave } from './use-editor-autosave';
import { useEditorStore } from './store/editor-store';
import { getPrimaryPage } from '@vdb/document-schema';
import { EntitlementCodes } from '@vdb/shared-types';
import styles from './editor-shell.module.css';

type Props = { documentId: string };

export function EditorShell({ documentId }: Props) {
  const t = useTranslations('editor');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const { activeBusiness } = useBusinesses();
  const { writable, loading: entLoading, can } = useEntitlements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<DesignThemeTokens | null>(
    DEFAULT_DESIGN_THEME_TOKENS,
  );

  const body = useEditorStore((s) => s.body);
  const title = useEditorStore((s) => s.title);
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const pastLen = useEditorStore((s) => s.past.length);
  const futureLen = useEditorStore((s) => s.future.length);
  const loadDocument = useEditorStore((s) => s.loadDocument);
  const setTitle = useEditorStore((s) => s.setTitle);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const reset = useEditorStore((s) => s.reset);

  const disabled = !writable || entLoading;

  useEditorAutosave(writable && !entLoading);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!activeBusiness) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [doc, theme] = await Promise.all([
          getDocument(activeBusiness.id, documentId),
          getDefaultTheme(activeBusiness.id),
        ]);
        if (cancelled) return;
        loadDocument({
          businessId: activeBusiness.id,
          documentId: doc.id,
          title: doc.title,
          body: doc.body,
        });
        setTokens(theme.tokens);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiClientError) {
          setError(mapApiErrorCode(err.code, tErrors));
        } else {
          setError(tErrors('UNKNOWN'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      reset();
    };
  }, [activeBusiness, documentId, loadDocument, reset, tErrors]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (disabled) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key === 'y') {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, undo, redo]);

  if (!activeBusiness) {
    return (
      <section className={styles.shell}>
        <p className={styles.hint}>{t('needBusiness')}</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className={styles.shell}>
        <p className={styles.hint}>{t('loading')}</p>
      </section>
    );
  }

  if (error || !body) {
    return (
      <section className={styles.shell}>
        <p className={styles.meta}>
          <Link href={`/${locale}/app/documents`}>{t('backList')}</Link>
        </p>
        <p className={styles.error}>{error ?? tErrors('UNKNOWN')}</p>
      </section>
    );
  }

  const statusLabel =
    saveStatus === 'saving'
      ? t('statusSaving')
      : saveStatus === 'saved'
        ? t('statusSaved')
        : saveStatus === 'error'
          ? t('statusError')
          : saveStatus === 'readonly'
            ? t('statusReadonly')
            : t('statusIdle');

  return (
    <section className={styles.shell}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarStart}>
          <Link className={styles.back} href={`/${locale}/app/documents`}>
            {t('backList')}
          </Link>
          <input
            className={styles.titleInput}
            value={title}
            disabled={disabled}
            onChange={(e) => setTitle(e.target.value)}
            aria-label={t('docTitle')}
          />
        </div>
        <div className={styles.toolbarEnd}>
          <button
            type="button"
            className={styles.toolBtn}
            disabled={disabled || pastLen === 0}
            onClick={() => undo()}
          >
            {t('undo')}
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            disabled={disabled || futureLen === 0}
            onClick={() => redo()}
          >
            {t('redo')}
          </button>
          <span className={styles.saveStatus} data-status={saveStatus}>
            {statusLabel}
          </span>
        </div>
      </header>

      {!writable ? <p className={styles.warn}>{t('readOnly')}</p> : null}

      <div className={styles.layout}>
        <aside className={styles.side}>
          <BlockPalette disabled={disabled} />
          <MasterPanel disabled={disabled} />
          <ExportPanel
            disabled={disabled}
            canExport={can(EntitlementCodes.ExportPdf)}
          />
          <BlockInspector disabled={disabled} />
        </aside>
        <div className={styles.main}>
          <h2 className={styles.panelTitle}>{t('flowTitle')}</h2>
          <p className={styles.hint}>{t('flowHint')}</p>
          <FlowCanvas
            blocks={getPrimaryPage(body).blocks}
            selectedBlockId={selectedBlockId}
            disabled={disabled}
          />
        </div>
        <div className={styles.previewCol}>
          <HtmlPreview body={body} title={title} tokens={tokens} />
        </div>
      </div>
    </section>
  );
}
