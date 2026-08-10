'use client';

import {
  bindDocumentBlocks,
  blockAnchorId,
  formatPageNumberLabel,
  isBlockVisible,
  resolveBlockLinkHref,
  resolveMaster,
  type BindingContext,
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
import { useBindingContext } from './use-binding-context';
import { usePaginatedPreviewBody } from './use-paginated-preview-body';
import { useVisibilityContext } from './use-visibility-context';
import styles from './html-preview.module.css';

type Props = {
  body: DocumentBody;
  title: string;
  tokens: DesignThemeTokens | null;
};

function renderBlock(
  block: BlockNode,
  t: (key: string) => string,
  body: DocumentBody,
  visibility: VisibilityContext,
  binding: BindingContext,
) {
  if (!isBlockVisible(block, visibility)) return null;
  switch (block.type) {
    case 'text': {
      const raw = String(block.props.content ?? '') || t('emptyText');
      const href = resolveBlockLinkHref(block.link ?? null);
      const content = href ? (
        <a className={styles.docLink} href={href}>
          {raw}
        </a>
      ) : (
        raw
      );
      const level = Number(block.props.headingLevel);
      if (level === 1 || level === 2 || level === 3) {
        const Tag = (`h${level}` as 'h1' | 'h2' | 'h3');
        return (
          <Tag
            key={block.id}
            className={styles.sectionTitle}
            id={blockAnchorId(block.id)}
          >
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
          binding={binding}
          renderChild={(c) =>
            renderBlock(c, t, body, visibility, binding)
          }
        />
      );
    case 'section': {
      const level = Number(block.props.headingLevel);
      const h = level === 1 || level === 2 || level === 3 ? level : 3;
      const TitleTag = (`h${h}` as 'h1' | 'h2' | 'h3');
      const titleRaw = String(block.props.title ?? '').trim();
      const href = resolveBlockLinkHref(block.link ?? null);
      const titleNode = href ? (
        <a className={styles.docLink} href={href}>
          {titleRaw}
        </a>
      ) : (
        titleRaw
      );
      return (
        <section key={block.id} className={styles.sectionBlock}>
          {titleRaw ? (
            <TitleTag
              className={styles.sectionTitle}
              id={blockAnchorId(block.id)}
            >
              {titleNode}
            </TitleTag>
          ) : null}
          {(block.children ?? []).map((c) =>
            renderBlock(c, t, body, visibility, binding),
          )}
        </section>
      );
    }
    case 'divider':
      return <hr key={block.id} className={styles.divider} />;
    case 'headerSlot':
    case 'footerSlot':
      return null;
    case 'plugin.notice': {
      const title = String(block.props.title ?? '').trim();
      const body = String(block.props.body ?? '').trim();
      return (
        <aside key={block.id} className={styles.notice}>
          {title ? <strong className={styles.noticeTitle}>{title}</strong> : null}
          {body ? <p className={styles.noticeBody}>{body}</p> : t('noticeEmpty')}
        </aside>
      );
    }
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
  binding,
}: {
  band: MasterPage['header'];
  className: string;
  t: (key: string) => string;
  body: DocumentBody;
  visibility: VisibilityContext;
  binding: BindingContext;
}) {
  if (!band.enabled) return null;
  return (
    <div className={className}>
      {band.blocks.map((b) =>
        renderBlock(b, t, body, visibility, binding),
      )}
    </div>
  );
}

export function HtmlPreview({ body, title, tokens }: Props) {
  const t = useTranslations('editor');
  const visibility = useVisibilityContext(body);
  const binding = useBindingContext(body);
  const paginated = usePaginatedPreviewBody(body, binding, visibility);
  const boundBody: DocumentBody = {
    ...paginated,
    pages: paginated.pages.map((p) => ({
      ...p,
      blocks: bindDocumentBlocks(p.blocks, binding),
    })),
    masters: paginated.masters.map((m) => ({
      ...m,
      header: {
        ...m.header,
        blocks: bindDocumentBlocks(m.header.blocks, binding),
      },
      footer: {
        ...m.footer,
        blocks: bindDocumentBlocks(m.footer.blocks, binding),
      },
    })),
  };

  const docLocale = boundBody.locale === 'en' ? 'en' : 'fa';
  const docDir = docLocale === 'en' ? 'ltr' : 'rtl';
  const total = Math.max(1, boundBody.pages.length);

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

  return (
    <div
      className={styles.preview}
      style={style}
      dir={docDir}
      lang={docLocale}
      data-testid="editor-html-preview"
    >
      <p className={styles.eyebrow}>{t('previewLabel')}</p>
      <p className={styles.approx}>{t('previewApprox')}</p>
      {boundBody.pages.map((page, index) => {
        const pageIndex = index + 1;
        const master = resolveMaster(boundBody.masters, page.masterId);
        const pageLabel =
          master?.pageNumber.enabled
            ? formatPageNumberLabel(
                master.pageNumber,
                pageIndex,
                total,
              )
            : null;
        const pageNumberClass =
          master?.pageNumber.position === 'footer-start'
            ? styles.pageNumStart
            : master?.pageNumber.position === 'footer-end' ||
                master?.pageNumber.position === 'header-end'
              ? styles.pageNumEnd
              : styles.pageNumCenter;

        return (
          <article
            key={page.id}
            className={styles.pageFrame}
            data-testid="preview-page"
          >
            <p className={styles.pageFrameLabel}>
              {t('previewPageLabel', { n: pageIndex })}
            </p>
            {master &&
            master.pageNumber.enabled &&
            master.pageNumber.position === 'header-end' &&
            pageLabel ? (
              <p className={`${styles.pageNum} ${pageNumberClass}`}>
                {pageLabel}
              </p>
            ) : null}
            {master ? (
              <Band
                band={master.header}
                className={styles.headerBand}
                t={t}
                body={boundBody}
                visibility={visibility}
                binding={binding}
              />
            ) : null}
            {index === 0 ? (
              <h2 className={styles.docTitle}>{title || t('untitled')}</h2>
            ) : null}
            <div className={styles.flow}>
              {page.blocks.map((b) =>
                renderBlock(b, t, boundBody, visibility, binding),
              )}
            </div>
            {master ? (
              <Band
                band={master.footer}
                className={styles.footerBand}
                t={t}
                body={boundBody}
                visibility={visibility}
                binding={binding}
              />
            ) : null}
            {master &&
            master.pageNumber.enabled &&
            master.pageNumber.position.startsWith('footer') &&
            pageLabel ? (
              <p className={`${styles.pageNum} ${pageNumberClass}`}>
                {pageLabel}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
