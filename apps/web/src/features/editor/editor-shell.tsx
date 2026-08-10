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
import { useMembershipPermissions } from '@/shared/lib/use-membership-permissions';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { BlockInspector } from './block-inspector';
import { BlockPalette } from './block-palette';
import { FlowCanvas } from './flow-canvas';
import { HtmlPreview } from './html-preview';
import { MasterPanel } from './master-panel';
import { ExportPanel } from './export-panel';
import { VersionHistoryPanel } from './version-history-panel';
import { WorkflowPanel } from './workflow-panel';
import { WebPublishPanel } from './web-publish-panel';
import { ShareLinksPanel } from './share-links-panel';
import { CommentsPanel } from './comments-panel';
import { useEditorAutosave } from './use-editor-autosave';
import { useEditorStore } from './store/editor-store';
import {
  documentCollectRequiredModuleCodes,
  getPrimaryPage,
} from '@vdb/document-schema';
import {
  DOCUMENT_BODY_LOCKED_STATUSES,
  EntitlementCodes,
  type DocumentStatusValue,
} from '@vdb/shared-types';
import { ModuleUpgradeCta } from '@/features/billing/module-upgrade-cta';
import styles from './editor-shell.module.css';

type Props = { documentId: string };

function asDocStatus(raw: string): DocumentStatusValue {
  if (
    raw === 'review' ||
    raw === 'approved' ||
    raw === 'published' ||
    raw === 'draft'
  ) {
    return raw;
  }
  return 'draft';
}

export function EditorShell({ documentId }: Props) {
  const t = useTranslations('editor');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const { activeBusiness } = useBusinesses();
  const { writable, loading: entLoading, can, has } = useEntitlements();
  const { canManageDocuments, canExportPdf } = useMembershipPermissions();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<DesignThemeTokens | null>(
    DEFAULT_DESIGN_THEME_TOKENS,
  );

  const body = useEditorStore((s) => s.body);
  const title = useEditorStore((s) => s.title);
  const docStatus = useEditorStore((s) => s.status);
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const pastLen = useEditorStore((s) => s.past.length);
  const futureLen = useEditorStore((s) => s.future.length);
  const loadDocument = useEditorStore((s) => s.loadDocument);
  const setTitle = useEditorStore((s) => s.setTitle);
  const setDocumentLocale = useEditorStore((s) => s.setDocumentLocale);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const reset = useEditorStore((s) => s.reset);

  const bodyLocked = DOCUMENT_BODY_LOCKED_STATUSES.includes(
    docStatus as DocumentStatusValue,
  );
  const disabled = !writable || entLoading || bodyLocked || !canManageDocuments;
  const missingModules = body
    ? documentCollectRequiredModuleCodes(body).filter((code) => !has(code))
    : [];

  useEditorAutosave(writable && !entLoading && !bodyLocked && canManageDocuments);

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
          status: asDocStatus(String(doc.status)),
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
          <span className={styles.meta}>{t(`status_${docStatus}`)}</span>
          <label className={styles.localeField}>
            <span className={styles.localeLabel}>{t('documentLocale')}</span>
            <select
              className={styles.localeSelect}
              value={body.locale === 'en' ? 'en' : 'fa'}
              disabled={disabled}
              onChange={(e) =>
                setDocumentLocale(e.target.value === 'en' ? 'en' : 'fa')
              }
              aria-label={t('documentLocale')}
            >
              <option value="fa">{t('localeFa')}</option>
              <option value="en">{t('localeEn')}</option>
            </select>
          </label>
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

      {!writable || !canManageDocuments ? (
        <p className={styles.warn}>{t('readOnly')}</p>
      ) : null}
      {bodyLocked ? (
        <p className={styles.warn}>{t('publishedLocked')}</p>
      ) : null}
      {missingModules.length > 0 ? (
        <div className={styles.warn}>
          <p>{t('modulesMissing', { codes: missingModules.join(', ') })}</p>
          <ModuleUpgradeCta />
        </div>
      ) : null}

      <div className={styles.layout}>
        <aside className={styles.side}>
          <BlockPalette disabled={disabled} />
          <MasterPanel disabled={disabled} />
          <WorkflowPanel
            businessId={activeBusiness.id}
            documentId={documentId}
            disabled={!writable || entLoading || !canManageDocuments}
          />
          <WebPublishPanel
            businessId={activeBusiness.id}
            documentId={documentId}
            disabled={!writable || entLoading}
          />
          <ShareLinksPanel
            businessId={activeBusiness.id}
            documentId={documentId}
            disabled={!writable || entLoading}
          />
          <CommentsPanel
            businessId={activeBusiness.id}
            documentId={documentId}
            disabled={!writable || entLoading || !canManageDocuments}
          />
          <ExportPanel
            disabled={!writable || entLoading || !canExportPdf}
            canExport={can(EntitlementCodes.ExportPdf) && canExportPdf}
          />
          <VersionHistoryPanel
            businessId={activeBusiness.id}
            documentId={documentId}
            disabled={!writable || entLoading || !canManageDocuments}
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
