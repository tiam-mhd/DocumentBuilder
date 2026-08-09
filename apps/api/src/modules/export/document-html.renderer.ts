import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  bindBlockTree,
  formatPageNumberLabel,
  parseDocumentBody,
  parseMapBlockProps,
  parseOrgChartBlockProps,
  parseQrBlockProps,
  parseRepeaterBlockProps,
  parseTimelineBlockProps,
  parseTocBlockProps,
  buildTableOfContents,
  isBlockVisible,
  resolveMaster,
  type BlockNode,
  type DocumentBody,
  type MasterPage,
  type MapBlockProps,
  type OrgChartLayout,
  type TimelineLayout,
  type VisibilityContext,
} from '@vdb/document-schema';
import type {
  DesignThemeTokens,
  PublicCollectionItem,
  PublicOrgChartNode,
  PublicTimelineEvent,
} from '@vdb/shared-types';
import type { AppEnv } from '../../config/env.validation';

export type EmbeddedFont = {
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  mimeType: string;
  /** Base64 font bytes for @font-face data URL embed. */
  base64: string;
};

export type MapMarkerPoint = {
  lat: number;
  lng: number;
  name: string;
};

export type OrgChartRenderTree = {
  layout: OrgChartLayout;
  showPhotos: boolean;
  heightPx: number;
  roots: PublicOrgChartNode[];
};

export type TimelineRenderData = {
  layout: TimelineLayout;
  heightPx: number;
  items: PublicTimelineEvent[];
};

export type QrRenderData = {
  dataUrl: string | null;
  sizePx: number;
  caption: string;
  payload: string;
};

type RenderCtx = {
  mapMarkersByBlockId: Record<string, MapMarkerPoint[]>;
  orgChartByBlockId: Record<string, OrgChartRenderTree>;
  timelineByBlockId: Record<string, TimelineRenderData>;
  qrByBlockId: Record<string, QrRenderData>;
  repeaterItemsByBlockId: Record<string, PublicCollectionItem[]>;
  visibility: VisibilityContext;
  /** Full body pages for TOC scan (logical page numbers). */
  pages: DocumentBody['pages'];
};

export type BuildHtmlInput = {
  title: string;
  body: DocumentBody;
  tokens: DesignThemeTokens;
  fonts: EmbeddedFont[];
  /** Document dir for RTL (fa) vs LTR. */
  dir: 'rtl' | 'ltr';
  lang: string;
  /** Pre-resolved markers per map block id (export path). */
  mapMarkersByBlockId?: Record<string, MapMarkerPoint[]>;
  /** Pre-resolved org chart trees per orgChart block id. */
  orgChartByBlockId?: Record<string, OrgChartRenderTree>;
  /** Pre-resolved timeline events per timeline block id. */
  timelineByBlockId?: Record<string, TimelineRenderData>;
  /** Pre-resolved QR PNG data URLs per qr block id. */
  qrByBlockId?: Record<string, QrRenderData>;
  /** Pre-resolved collection items per repeater block id. */
  repeaterItemsByBlockId?: Record<string, PublicCollectionItem[]>;
  /** Collection counts for `when` evaluation (ADR 014). */
  visibility?: VisibilityContext;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Build static map URL from ADR-008 template, or null for placeholder. */
export function buildStaticMapUrl(
  template: string,
  props: MapBlockProps,
  markers: MapMarkerPoint[],
): string | null {
  const t = template.trim();
  if (!t || t.toLowerCase() === 'none') return null;
  const w = Math.round(Math.min(800, Math.max(200, props.heightPx * 2)));
  const h = Math.round(props.heightPx);
  const markerQs = markers
    .slice(0, 40)
    .map((m) => `${m.lat},${m.lng},lightblue1`)
    .join('|');
  return t
    .replaceAll('{lat}', String(props.centerLat))
    .replaceAll('{lng}', String(props.centerLng))
    .replaceAll('{zoom}', String(props.zoom))
    .replaceAll('{w}', String(w))
    .replaceAll('{h}', String(h))
    .replaceAll('{markers}', markerQs ? `&markers=${markerQs}` : '');
}

@Injectable()
export class DocumentHtmlRenderer {
  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  build(input: BuildHtmlInput): string {
    const body = parseDocumentBody(input.body);
    const { tokens } = input;
    const fontFaces = input.fonts
      .map(
        (f) => `@font-face{
  font-family:${JSON.stringify(f.family)};
  font-weight:${f.weight};
  font-style:${f.style};
  src:url(data:${f.mimeType};base64,${f.base64}) format(${f.mimeType.includes('woff2') ? '"woff2"' : f.mimeType.includes('otf') ? '"opentype"' : '"truetype"'});
  font-display:swap;
}`,
      )
      .join('\n');

    const pagesHtml = body.pages
      .map((page, index) => {
        const master = resolveMaster(body.masters, page.masterId);
        const pageNo = index + 1;
        const total = body.pages.length;
        return this.renderPage({
          pageBlocks: page.blocks,
          master,
          pageNo,
          total,
          title: index === 0 ? input.title : '',
          ctx: {
            mapMarkersByBlockId: input.mapMarkersByBlockId ?? {},
            orgChartByBlockId: input.orgChartByBlockId ?? {},
            timelineByBlockId: input.timelineByBlockId ?? {},
            qrByBlockId: input.qrByBlockId ?? {},
            repeaterItemsByBlockId: input.repeaterItemsByBlockId ?? {},
            visibility: input.visibility ?? { collection: {} },
            pages: body.pages,
          },
        });
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="${escapeHtml(input.lang)}" dir="${input.dir}">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(input.title)}</title>
<style>
${fontFaces}
*{box-sizing:border-box}
body{
  margin:0;
  font-family:${JSON.stringify(tokens.typography.bodyFamily)},serif;
  color:${tokens.colors.text};
  background:${tokens.colors.background};
}
h1,h2,h3{font-family:${JSON.stringify(tokens.typography.headingFamily)},serif;color:${tokens.colors.primary}}
.page{padding:24px;page-break-after:always}
.header,.footer{font-size:0.85rem;color:${tokens.colors.secondary};margin:8px 0}
.flow{display:flex;flex-direction:column;gap:12px}
.image-ph,.gallery-ph,.map-ph,.org-ph,.tl-ph,.qr-ph,.repeater-empty{
  border:1px dashed ${tokens.colors.secondary};
  padding:16px;text-align:center;color:${tokens.colors.secondary}
}
.repeater{display:flex;flex-direction:column;gap:12px}
.repeater-card{
  border:1px solid ${tokens.colors.secondary};
  border-radius:6px;
  padding:12px;
  background:${tokens.colors.background};
}
.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:6px}
.qr-img{display:block;image-rendering:pixelated}
.qr-caption{font-size:0.85rem;color:${tokens.colors.secondary};margin:0}
.map-img{max-width:100%;height:auto;display:block}
.divider{border:none;border-top:1px solid ${tokens.colors.secondary};margin:8px 0}
.page-num{font-size:0.8rem}
.page-num.start{text-align:start}
.page-num.center{text-align:center}
.page-num.end{text-align:end}
.org-chart{overflow:auto;padding:8px}
.org-chart.vertical ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;align-items:center;gap:8px}
.org-chart.horizontal ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:row;align-items:flex-start;gap:12px}
.org-chart li{display:flex;flex-direction:column;align-items:center;gap:8px}
.org-chart.horizontal>ul>li,.org-chart.horizontal li>ul{flex-direction:row}
.org-node{
  border:1px solid ${tokens.colors.secondary};
  border-radius:6px;
  padding:8px 12px;
  min-width:120px;
  text-align:center;
  background:${tokens.colors.background};
}
.org-node .name{font-weight:600;color:${tokens.colors.primary}}
.org-node .role{font-size:0.85rem;color:${tokens.colors.secondary}}
.timeline{overflow:auto;padding:8px 4px;position:relative}
.timeline ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:16px}
.timeline .tl-item{display:grid;grid-template-columns:7rem 1fr;gap:12px;align-items:start}
.timeline.alternating .tl-item:nth-child(even){grid-template-columns:1fr 7rem}
.timeline.alternating .tl-item:nth-child(even) .tl-date{order:2;text-align:end}
.timeline.alternating .tl-item:nth-child(even) .tl-card{order:1}
.tl-date{font-size:0.85rem;color:${tokens.colors.secondary};padding-top:4px}
.tl-card{border:1px solid ${tokens.colors.secondary};border-radius:6px;padding:10px 12px;background:${tokens.colors.background}}
.tl-card .title{font-weight:600;color:${tokens.colors.primary};margin:0 0 4px}
.tl-card .body{margin:0;font-size:0.95rem}
.toc{margin:8px 0}
.toc-title{font-size:1.1rem;margin:0 0 8px;color:${tokens.colors.primary}}
.toc-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.toc-item{display:flex;gap:8px;align-items:baseline;justify-content:space-between}
.toc-item.l2{padding-inline-start:1rem}
.toc-item.l3{padding-inline-start:2rem}
.toc-label{flex:1}
.toc-dots{flex:1;border-bottom:1px dotted ${tokens.colors.secondary};margin:0 6px;min-width:1rem;height:0.6em}
.toc-page{font-variant-numeric:tabular-nums;color:${tokens.colors.secondary}}
.heading{margin:0 0 8px;color:${tokens.colors.primary}}
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
  }

  private renderPage(input: {
    pageBlocks: BlockNode[];
    master: MasterPage | null;
    pageNo: number;
    total: number;
    title: string;
    ctx: RenderCtx;
  }): string {
    const master = input.master;
    const pageLabel =
      master?.pageNumber.enabled
        ? formatPageNumberLabel(master.pageNumber, input.pageNo, input.total)
        : null;
    const pageNumClass =
      master?.pageNumber.position === 'footer-start'
        ? 'start'
        : master?.pageNumber.position === 'footer-end' ||
            master?.pageNumber.position === 'header-end'
          ? 'end'
          : 'center';

    const headerNum =
      pageLabel && master?.pageNumber.position === 'header-end'
        ? `<p class="page-num ${pageNumClass}">${escapeHtml(pageLabel)}</p>`
        : '';
    const footerNum =
      pageLabel && master?.pageNumber.position.startsWith('footer')
        ? `<p class="page-num ${pageNumClass}">${escapeHtml(pageLabel)}</p>`
        : '';

    const ctx = input.ctx;
    const header =
      master?.header.enabled
        ? `<header class="header">${this.renderBlocks(master.header.blocks, ctx)}</header>`
        : '';
    const footer =
      master?.footer.enabled
        ? `<footer class="footer">${this.renderBlocks(master.footer.blocks, ctx)}</footer>`
        : '';

    return `<section class="page">
${headerNum}
${header}
${input.title ? `<h1>${escapeHtml(input.title)}</h1>` : ''}
<div class="flow">${this.renderBlocks(input.pageBlocks, ctx)}</div>
${footer}
${footerNum}
</section>`;
  }

  private renderBlocks(blocks: BlockNode[], ctx: RenderCtx): string {
    return blocks
      .filter((b) => isBlockVisible(b, ctx.visibility))
      .map((b) => this.renderBlock(b, ctx))
      .join('');
  }

  private renderBlock(block: BlockNode, ctx: RenderCtx): string {
    if (!isBlockVisible(block, ctx.visibility)) return '';
    switch (block.type) {
      case 'text': {
        const content = escapeHtml(String(block.props.content ?? ''));
        const level = Number(block.props.headingLevel);
        if (level === 1 || level === 2 || level === 3) {
          return `<h${level} class="heading" id="h-${escapeHtml(block.id)}">${content}</h${level}>`;
        }
        return `<p>${content}</p>`;
      }
      case 'image':
        return `<div class="image-ph">${escapeHtml(String(block.props.alt ?? 'image'))}</div>`;
      case 'gallery':
        return `<div class="gallery-ph">gallery:${escapeHtml(String(block.props.galleryId ?? ''))}</div>`;
      case 'map': {
        const props = parseMapBlockProps(block.props);
        const markers = ctx.mapMarkersByBlockId[block.id] ?? [];
        const template = this.config.get('MAP_STATIC_URL_TEMPLATE', {
          infer: true,
        });
        const url = buildStaticMapUrl(template, props, markers);
        if (url) {
          return `<figure class="map-wrap"><img class="map-img" src="${escapeHtml(url)}" alt="map" width="100%" style="height:${props.heightPx}px;object-fit:cover"/></figure>`;
        }
        const label = `map ${props.centerLat.toFixed(2)},${props.centerLng.toFixed(2)} z${props.zoom}${markers.length ? ` · ${markers.length} markers` : ''}`;
        return `<div class="map-ph" style="min-height:${props.heightPx}px">${escapeHtml(label)}</div>`;
      }
      case 'orgChart': {
        const props = parseOrgChartBlockProps(block.props);
        const tree = ctx.orgChartByBlockId[block.id] ?? {
          layout: props.layout,
          showPhotos: props.showPhotos,
          heightPx: props.heightPx,
          roots: [],
        };
        const layoutClass =
          tree.layout === 'tree-horizontal' ? 'horizontal' : 'vertical';
        if (tree.roots.length === 0) {
          return `<div class="org-ph" style="min-height:${tree.heightPx}px">org chart</div>`;
        }
        return `<div class="org-chart ${layoutClass}" style="max-height:${tree.heightPx}px">${this.renderOrgNodes(tree.roots)}</div>`;
      }
      case 'timeline': {
        const props = parseTimelineBlockProps(block.props);
        const data = ctx.timelineByBlockId[block.id] ?? {
          layout: props.layout,
          heightPx: props.heightPx,
          items: [],
        };
        if (data.items.length === 0) {
          return `<div class="tl-ph" style="min-height:${data.heightPx}px">timeline</div>`;
        }
        const layoutClass =
          data.layout === 'alternating' ? 'alternating' : 'vertical';
        const items = data.items
          .map((ev) => {
            const dateLabel = escapeHtml(ev.occurredAt.slice(0, 10));
            const body = ev.body
              ? `<p class="body">${escapeHtml(ev.body)}</p>`
              : '';
            return `<li class="tl-item"><div class="tl-date">${dateLabel}</div><div class="tl-card"><p class="title">${escapeHtml(ev.title)}</p>${body}</div></li>`;
          })
          .join('');
        return `<div class="timeline ${layoutClass}" style="max-height:${data.heightPx}px"><ul>${items}</ul></div>`;
      }
      case 'qr': {
        const props = parseQrBlockProps(block.props);
        const data = ctx.qrByBlockId[block.id] ?? {
          dataUrl: null,
          sizePx: props.sizePx,
          caption: props.caption,
          payload: '',
        };
        if (!data.dataUrl) {
          return `<div class="qr-ph" style="width:${data.sizePx}px;height:${data.sizePx}px">QR</div>`;
        }
        const caption = data.caption
          ? `<p class="qr-caption">${escapeHtml(data.caption)}</p>`
          : '';
        return `<figure class="qr-wrap"><img class="qr-img" src="${escapeHtml(data.dataUrl)}" width="${data.sizePx}" height="${data.sizePx}" alt="QR"/>${caption}</figure>`;
      }
      case 'toc': {
        const props = parseTocBlockProps(block.props);
        const entries = buildTableOfContents(
          { pages: ctx.pages },
          props,
          ctx.visibility,
        );
        const heading = props.title
          ? `<h2 class="toc-title">${escapeHtml(props.title)}</h2>`
          : '';
        if (entries.length === 0) {
          return `<nav class="toc">${heading}<p class="toc-empty">—</p></nav>`;
        }
        const items = entries
          .map((e) => {
            const page = props.showPageNumbers
              ? `<span class="toc-dots" aria-hidden="true"></span><span class="toc-page">${e.pageNumber}</span>`
              : '';
            return `<li class="toc-item l${e.level}"><span class="toc-label">${escapeHtml(e.title)}</span>${page}</li>`;
          })
          .join('');
        return `<nav class="toc">${heading}<ul class="toc-list">${items}</ul></nav>`;
      }
      case 'repeater': {
        const props = parseRepeaterBlockProps(block.props);
        const items = ctx.repeaterItemsByBlockId[block.id] ?? [];
        if (items.length === 0) {
          const msg = props.emptyMessage.trim() || '—';
          return `<div class="repeater-empty">${escapeHtml(msg)}</div>`;
        }
        const cards = items
          .map((item) => {
            const bound = bindBlockTree(block.children ?? [], item.values);
            return `<div class="repeater-card">${this.renderBlocks(bound, ctx)}</div>`;
          })
          .join('');
        return `<div class="repeater">${cards}</div>`;
      }
      case 'section': {
        const titleRaw = String(block.props.title ?? '').trim();
        const level = Number(block.props.headingLevel);
        const h = level === 1 || level === 2 || level === 3 ? level : 2;
        const title = titleRaw
          ? `<h${h} class="heading" id="h-${escapeHtml(block.id)}">${escapeHtml(titleRaw)}</h${h}>`
          : '';
        return `<section class="section">${title}${this.renderBlocks(block.children ?? [], ctx)}</section>`;
      }
      case 'divider':
        return `<hr class="divider"/>`;
      case 'headerSlot':
      case 'footerSlot':
        return '';
      default:
        return '';
    }
  }

  private renderOrgNodes(nodes: PublicOrgChartNode[]): string {
    if (nodes.length === 0) return '';
    const items = nodes
      .map((n) => {
        const role = n.roleTitle
          ? `<div class="role">${escapeHtml(n.roleTitle)}</div>`
          : '';
        const kids =
          n.children.length > 0 ? this.renderOrgNodes(n.children) : '';
        return `<li><div class="org-node"><div class="name">${escapeHtml(n.name)}</div>${role}</div>${kids}</li>`;
      })
      .join('');
    return `<ul>${items}</ul>`;
  }
}
