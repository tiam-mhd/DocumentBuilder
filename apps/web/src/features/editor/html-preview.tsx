'use client';

import {
  formatPageNumberLabel,
  getPrimaryPage,
  isBlockVisible,
  resolveMaster,
  type BlockNode,
  type DocumentBody,
  type MasterPage,
  type VisibilityContext,
} from '@vdb/document-schema';
import type { DesignThemeTokens } from '@vdb/shared-types';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { MapBlockPreview } from './map-block-preview';
import { OrgChartBlockPreview } from './org-chart-block-preview';
import { QrBlockPreview } from './qr-block-preview';
import { RepeaterBlockPreview } from './repeater-block-preview';
import { TimelineBlockPreview } from './timeline-block-preview';
import { TocBlockPreview } from './toc-block-preview';
import { useVisibilityContext } from './use-visibility-context';
import styles from './html-preview.module.css';

type Props = {
  body: DocumentBody;
  title: string;
  tokens: DesignThemeTokens | null;
  /** 1-based page index for preview (MVP single page → 1). */
  pageIndex?: number;
};

function renderBlock(
  block: BlockNode,
  t: (key: string) => string,
  body: DocumentBody,
  visibility: VisibilityContext,
) {
  if (!isBlockVisible(block, visibility)) return null;
  switch (block.type) {
    case 'text': {
      const content = String(block.props.content ?? '') || t('emptyText');
      const level = Number(block.props.headingLevel);
      if (level === 1 || level === 2 || level === 3) {
        const Tag = (`h${level}` as 'h1' | 'h2' | 'h3');
        return (
          <Tag key={block.id} className={styles.sectionTitle}>
            {content}
          </Tag>
        );
      }
      return (
        <p key={block.id} className={styles.text}>
          {content}
        </p>
      );
    }
    case 'image':
      return (
        <div key={block.id} className={styles.imagePh}>
          {t('imagePlaceholder')}
          {block.props.alt ? ` — ${String(block.props.alt)}` : ''}
        </div>
      );
    case 'gallery':
      return (
        <div key={block.id} className={styles.imagePh}>
          {t('galleryPlaceholder')}
          {block.props.galleryId
            ? ` — ${String(block.props.galleryId)}`
            : ''}
        </div>
      );
    case 'map':
      return <MapBlockPreview key={block.id} block={block} />;
    case 'orgChart':
      return <OrgChartBlockPreview key={block.id} block={block} />;
    case 'timeline':
      return <TimelineBlockPreview key={block.id} block={block} />;
    case 'qr':
      return <QrBlockPreview key={block.id} block={block} />;
    case 'toc':
      return (
        <TocBlockPreview
          key={block.id}
          block={block}
          body={body}
          visibility={visibility}
        />
      );
    case 'repeater':
      return (
        <RepeaterBlockPreview
          key={block.id}
          block={block}
          renderChild={(c) => renderBlock(c, t, body, visibility)}
        />
      );
    case 'section': {
      const level = Number(block.props.headingLevel);
      const h = level === 1 || level === 2 || level === 3 ? level : 3;
      const TitleTag = (`h${h}` as 'h1' | 'h2' | 'h3');
      return (
        <section key={block.id} className={styles.sectionBlock}>
          {block.props.title ? (
            <TitleTag className={styles.sectionTitle}>
              {String(block.props.title)}
            </TitleTag>
          ) : null}
          {(block.children ?? []).map((c) =>
            renderBlock(c, t, body, visibility),
          )}
        </section>
      );
    }
    case 'divider':
      return <hr key={block.id} className={styles.divider} />;
    case 'headerSlot':
    case 'footerSlot':
      return null;
    default:
      return (
        <p key={block.id} className={styles.unknown}>
          {t('unknownBlock')}
        </p>
      );
  }
}

function Band({
  band,
  className,
  t,
  body,
  visibility,
}: {
  band: MasterPage['header'];
  className: string;
  t: (key: string) => string;
  body: DocumentBody;
  visibility: VisibilityContext;
}) {
  if (!band.enabled) return null;
  return (
    <div className={className}>
      {band.blocks.map((b) => renderBlock(b, t, body, visibility))}
    </div>
  );
}

export function HtmlPreview({ body, title, tokens, pageIndex = 1 }: Props) {
  const t = useTranslations('editor');
  const visibility = useVisibilityContext(body);
  const primary = getPrimaryPage(body);
  const master = resolveMaster(body.masters, primary.masterId);
  const total = Math.max(1, body.pages.length);
  const pageLabel =
    master?.pageNumber.enabled
      ? formatPageNumberLabel(master.pageNumber, pageIndex, total)
      : null;

  const style = tokens
    ? ({
        background: tokens.colors.background,
        color: tokens.colors.text,
        fontFamily: `"${tokens.typography.bodyFamily}", var(--font-sans, sans-serif)`,
        fontWeight: tokens.typography.bodyWeight,
        fontSize: `${tokens.typography.baseSizePx}px`,
        ['--doc-primary' as string]: tokens.colors.primary,
        ['--doc-secondary' as string]: tokens.colors.secondary,
        ['--doc-heading-family' as string]: `"${tokens.typography.headingFamily}", var(--font-sans, sans-serif)`,
        ['--doc-heading-weight' as string]: String(
          tokens.typography.headingWeight,
        ),
      } as CSSProperties)
    : undefined;

  const pageNumberClass =
    master?.pageNumber.position === 'footer-start'
      ? styles.pageNumStart
      : master?.pageNumber.position === 'footer-end' ||
          master?.pageNumber.position === 'header-end'
        ? styles.pageNumEnd
        : styles.pageNumCenter;

  return (
    <div
      className={styles.preview}
      style={style}
      data-testid="editor-html-preview"
    >
      <p className={styles.eyebrow}>{t('previewLabel')}</p>
      {master &&
      master.pageNumber.enabled &&
      master.pageNumber.position === 'header-end' &&
      pageLabel ? (
        <p className={`${styles.pageNum} ${pageNumberClass}`}>{pageLabel}</p>
      ) : null}
      {master ? (
        <Band
          band={master.header}
          className={styles.headerBand}
          t={t}
          body={body}
          visibility={visibility}
        />
      ) : null}
      <h2 className={styles.docTitle}>{title || t('untitled')}</h2>
      <div className={styles.flow}>
        {primary.blocks.map((b) => renderBlock(b, t, body, visibility))}
      </div>
      {master ? (
        <Band
          band={master.footer}
          className={styles.footerBand}
          t={t}
          body={body}
          visibility={visibility}
        />
      ) : null}
      {master &&
      master.pageNumber.enabled &&
      master.pageNumber.position.startsWith('footer') &&
      pageLabel ? (
        <p className={`${styles.pageNum} ${pageNumberClass}`}>{pageLabel}</p>
      ) : null}
    </div>
  );
}
