'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
import { EditorBanner } from './editor-banner';
import bannerStyles from './editor-banner.module.css';
import { EditorLeftRail } from './editor-left-rail';
import { EditorModeSwitcher } from './editor-mode-switcher';
import { FlowCanvas } from './flow-canvas';
import { HtmlPreview } from './html-preview';
import { PdfPreviewStage } from './pdf-preview-stage';
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

type MorePanelId =
  | 'masters'
  | 'workflow'
  | 'webPublish'
  | 'share'
  | 'comments'
  | 'export'
  | 'versions';

const MORE_ITEMS: MorePanelId[] = [
  'masters',
  'workflow',
  'comments',
  'versions',
  'share',
  'webPublish',
  'export',
];

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
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [focusPaletteNonce, setFocusPaletteNonce] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [activeMore, setActiveMore] = useState<MorePanelId | null>(null);
  const moreWrapRef = useRef<HTMLDivElement>(null);
  const moreMenuId = useId();

  const body = useEditorStore((s) => s.body);
  const title = useEditorStore((s) => s.title);
  const docStatus = useEditorStore((s) => s.status);
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const editorMode = useEditorStore((s) => s.editorMode);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const pastLen = useEditorStore((s) => s.past.length);
  const futureLen = useEditorStore((s) => s.future.length);
  const loadDocument = useEditorStore((s) => s.loadDocument);
  const setTitle = useEditorStore((s) => s.setTitle);
  const setDocumentLocale = useEditorStore((s) => s.setDocumentLocale);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const reset = useEditorStore((s) => s.reset);
  const retrySave = useEditorStore((s) => s.retrySave);

  const bodyLocked = DOCUMENT_BODY_LOCKED_STATUSES.includes(
    docStatus as DocumentStatusValue,
  );
  const subscriptionLocked = !writable && !entLoading;
  const roleLocked = writable && !canManageDocuments;
  const disabled =
    !writable || entLoading || bodyLocked || !canManageDocuments;
  const mutationDisabled = disabled || editorMode !== 'edit';
  const missingModules = body
    ? documentCollectRequiredModuleCodes(body).filter((code) => !has(code))
    : [];

  function mutationLockTitle(): string | undefined {
    if (!mutationDisabled) return undefined;
    if (editorMode !== 'edit') return t('lockReasonPreviewMode');
    if (entLoading) return t('lockReasonLoading');
    if (subscriptionLocked) return t('lockReasonSubscription');
    if (roleLocked) return t('lockReasonRole');
    if (bodyLocked) return t('lockReasonBodyLocked');
    return t('mutationLockedGeneric');
  }

  useEditorAutosave(
    writable && !entLoading && !bodyLocked && canManageDocuments,
  );

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
      if (mutationDisabled) return;
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
  }, [mutationDisabled, undo, redo]);

  /** Collapse left rail when leaving edit so preview stage stays uncluttered (IA §I). */
  useEffect(() => {
    if (editorMode !== 'edit') {
      setLeftCollapsed(true);
    }
  }, [editorMode]);

  useEffect(() => {
    if (!moreOpen && !activeMore) return;
    function onPointer(e: MouseEvent) {
      const el = moreWrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMoreOpen(false);
        setActiveMore(null);
      }
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onEsc);
    };
  }, [moreOpen, activeMore]);

  if (!activeBusiness) {
    return (
      <section className={styles.shell}>
        <EditorBanner tone="warning" title={t('needBusinessTitle')}>
          <p>{t('needBusiness')}</p>
        </EditorBanner>
      </section>
    );
  }

  if (loading) {
    return (
      <section className={styles.shell}>
        <EditorBanner tone="info">
          <p>{t('loading')}</p>
        </EditorBanner>
      </section>
    );
  }

  if (error || !body) {
    return (
      <section className={styles.shell}>
        <EditorBanner
          tone="danger"
          title={t('loadErrorTitle')}
          action={
            <Link
              className={bannerStyles.actionLink}
              href={`/${locale}/app/documents`}
            >
              {t('backList')}
            </Link>
          }
        >
          <p>{error ?? tErrors('UNKNOWN')}</p>
        </EditorBanner>
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

  const lockTitle = mutationLockTitle();

  function openMorePanel(id: MorePanelId) {
    setActiveMore(id);
    setMoreOpen(false);
  }

  function focusPaletteForEmpty() {
    setLeftCollapsed(false);
    setFocusPaletteNonce((n) => n + 1);
  }

  function moreLabel(id: MorePanelId): string {
    switch (id) {
      case 'masters':
        return t('moreMasters');
      case 'workflow':
        return t('moreWorkflow');
      case 'webPublish':
        return t('moreWebPublish');
      case 'share':
        return t('moreShare');
      case 'comments':
        return t('moreComments');
      case 'export':
        return t('moreExport');
      case 'versions':
        return t('moreVersions');
    }
  }

  return (
    <section
      className={styles.shell}
      data-left-collapsed={leftCollapsed}
      data-editor-mode={editorMode}
    >
      <header className={styles.topBar}>
        <div className={styles.topGroup} data-group="document">
          <Link className={styles.back} href={`/${locale}/app/documents`}>
            {t('backList')}
          </Link>
          <input
            className={styles.titleInput}
            value={title}
            disabled={mutationDisabled}
            title={lockTitle}
            onChange={(e) => setTitle(e.target.value)}
            aria-label={t('docTitle')}
          />
          <span className={styles.statusChip} data-status={docStatus}>
            {t(`status_${docStatus}`)}
          </span>
          <label className={styles.localeField} title={lockTitle}>
            <span className={styles.localeLabel}>{t('documentLocale')}</span>
            <select
              className={styles.localeSelect}
              value={body.locale === 'en' ? 'en' : 'fa'}
              disabled={mutationDisabled}
              title={lockTitle}
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

        <div className={styles.topGroup} data-group="modes">
          <EditorModeSwitcher />
        </div>

        <div className={styles.topGroup} data-group="history">
          <button
            type="button"
            className={styles.toolBtn}
            disabled={mutationDisabled || pastLen === 0}
            title={
              mutationDisabled
                ? lockTitle
                : pastLen === 0
                  ? t('undoEmpty')
                  : t('undo')
            }
            onClick={() => undo()}
          >
            {t('undo')}
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            disabled={mutationDisabled || futureLen === 0}
            title={
              mutationDisabled
                ? lockTitle
                : futureLen === 0
                  ? t('redoEmpty')
                  : t('redo')
            }
            onClick={() => redo()}
          >
            {t('redo')}
          </button>
        </div>

        <div className={styles.topGroup} data-group="save">
          <span className={styles.saveStatus} data-status={saveStatus}>
            {statusLabel}
          </span>
        </div>

        <div className={styles.topGroup} data-group="more" ref={moreWrapRef}>
          <button
            type="button"
            className={styles.toolBtn}
            aria-expanded={moreOpen}
            aria-controls={moreMenuId}
            onClick={() => setMoreOpen((v) => !v)}
          >
            {t('moreMenu')}
          </button>
          {moreOpen ? (
            <ul id={moreMenuId} className={styles.moreMenu} role="menu">
              {MORE_ITEMS.map((id) => (
                <li key={id} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.moreItem}
                    onClick={() => openMorePanel(id)}
                  >
                    {moreLabel(id)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      {subscriptionLocked ? (
        <EditorBanner
          tone="warning"
          title={t('bannerSubscriptionTitle')}
          action={<ModuleUpgradeCta />}
        >
          <p>{t('bannerSubscriptionBody')}</p>
        </EditorBanner>
      ) : null}

      {roleLocked ? (
        <EditorBanner tone="warning" title={t('bannerRoleTitle')}>
          <p>{t('bannerRoleBody')}</p>
        </EditorBanner>
      ) : null}

      {bodyLocked ? (
        <EditorBanner
          tone="warning"
          title={t('bannerBodyLockedTitle')}
          action={
            <button
              type="button"
              className={bannerStyles.actionBtn}
              onClick={() => openMorePanel('workflow')}
            >
              {t('bannerBodyLockedCta')}
            </button>
          }
        >
          <p>{t('bannerBodyLockedBody')}</p>
        </EditorBanner>
      ) : null}

      {saveStatus === 'error' ? (
        <EditorBanner
          tone="danger"
          title={t('bannerSaveErrorTitle')}
          action={
            <button
              type="button"
              className={bannerStyles.actionBtn}
              onClick={() => retrySave()}
            >
              {t('bannerSaveErrorRetry')}
            </button>
          }
        >
          <p>{t('bannerSaveErrorBody')}</p>
        </EditorBanner>
      ) : null}

      {missingModules.length > 0 ? (
        <EditorBanner
          tone="warning"
          title={t('bannerModulesTitle')}
          action={<ModuleUpgradeCta />}
        >
          <p>{t('bannerModulesBody')}</p>
        </EditorBanner>
      ) : null}

      {(subscriptionLocked || bodyLocked || roleLocked) &&
      editorMode !== 'edit' ? (
        <EditorBanner tone="info" title={t('bannerPreviewOkTitle')}>
          <p>{t('bannerPreviewOkBody')}</p>
        </EditorBanner>
      ) : null}

      <div className={styles.workspace}>
        <EditorLeftRail
          disabled={mutationDisabled}
          body={body}
          selectedBlockId={selectedBlockId}
          leftCollapsed={leftCollapsed}
          onToggleCollapse={() => setLeftCollapsed((v) => !v)}
          focusPaletteNonce={focusPaletteNonce}
        />

        <div className={styles.centerStage}>
          {editorMode === 'edit' ? (
            <div className={styles.stageBlock}>
              <h2 className={styles.stageTitle}>{t('canvasStageTitle')}</h2>
              <p className={styles.hint}>{t('canvasStageHint')}</p>
              <div className={styles.paperHost}>
                <FlowCanvas
                  blocks={getPrimaryPage(body).blocks}
                  selectedBlockId={selectedBlockId}
                  disabled={mutationDisabled}
                  onRequestAddBlock={focusPaletteForEmpty}
                />
              </div>
            </div>
          ) : null}

          {editorMode === 'htmlPreview' ? (
            <div className={styles.stageBlock}>
              <h2 className={styles.stageTitle}>{t('htmlPreviewStageTitle')}</h2>
              <p className={styles.hint}>{t('htmlPreviewStageHint')}</p>
              <div className={styles.paperHost}>
                <HtmlPreview body={body} title={title} tokens={tokens} />
              </div>
            </div>
          ) : null}

          {editorMode === 'pdfPreview' ? (
            <div className={styles.stageBlock}>
              <PdfPreviewStage />
            </div>
          ) : null}
        </div>

        {editorMode === 'edit' ? (
          <aside className={styles.rightRail} aria-label={t('rightRailLabel')}>
            <div className={styles.railHeader}>
              <span className={styles.railTitle}>{t('inspectorRailTitle')}</span>
            </div>
            <BlockInspector disabled={mutationDisabled} />
          </aside>
        ) : null}
      </div>

      {activeMore ? (
        <div className={styles.drawerRoot} role="presentation">
          <button
            type="button"
            className={styles.drawerScrim}
            aria-label={t('closeDrawer')}
            onClick={() => setActiveMore(null)}
          />
          <aside
            className={styles.drawerPanel}
            role="dialog"
            aria-modal="true"
            aria-label={moreLabel(activeMore)}
          >
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>{moreLabel(activeMore)}</h2>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => setActiveMore(null)}
              >
                {t('closeDrawer')}
              </button>
            </div>
            <div className={styles.drawerBody}>
              {activeMore === 'masters' ? (
                <MasterPanel disabled={disabled} />
              ) : null}
              {activeMore === 'workflow' ? (
                <WorkflowPanel
                  businessId={activeBusiness.id}
                  documentId={documentId}
                  disabled={
                    !writable || entLoading || !canManageDocuments
                  }
                />
              ) : null}
              {activeMore === 'webPublish' ? (
                <WebPublishPanel
                  businessId={activeBusiness.id}
                  documentId={documentId}
                  disabled={!writable || entLoading}
                />
              ) : null}
              {activeMore === 'share' ? (
                <ShareLinksPanel
                  businessId={activeBusiness.id}
                  documentId={documentId}
                  disabled={!writable || entLoading}
                />
              ) : null}
              {activeMore === 'comments' ? (
                <CommentsPanel
                  businessId={activeBusiness.id}
                  documentId={documentId}
                  disabled={
                    !writable || entLoading || !canManageDocuments
                  }
                />
              ) : null}
              {activeMore === 'export' ? (
                <ExportPanel
                  disabled={!writable || entLoading || !canExportPdf}
                  canExport={
                    can(EntitlementCodes.ExportPdf) && canExportPdf
                  }
                />
              ) : null}
              {activeMore === 'versions' ? (
                <VersionHistoryPanel
                  businessId={activeBusiness.id}
                  documentId={documentId}
                  disabled={
                    !writable || entLoading || !canManageDocuments
                  }
                />
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
