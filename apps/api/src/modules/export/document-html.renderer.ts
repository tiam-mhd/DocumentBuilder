import { Injectable } from '@nestjs/common';
import {
  formatPageNumberLabel,
  parseDocumentBody,
  resolveMaster,
  type BlockNode,
  type DocumentBody,
  type MasterPage,
} from '@vdb/document-schema';
import type { DesignThemeTokens } from '@vdb/shared-types';

export type EmbeddedFont = {
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  mimeType: string;
  /** Base64 font bytes for @font-face data URL embed. */
  base64: string;
};

export type BuildHtmlInput = {
  title: string;
  body: DocumentBody;
  tokens: DesignThemeTokens;
  fonts: EmbeddedFont[];
  /** Document dir for RTL (fa) vs LTR. */
  dir: 'rtl' | 'ltr';
  lang: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class DocumentHtmlRenderer {
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
  color:${escapeHtml(tokens.colors.text)};
  background:${escapeHtml(tokens.colors.background)};
  font-family:${JSON.stringify(tokens.typography.bodyFamily)},"Vazirmatn",sans-serif;
  font-weight:${tokens.typography.bodyWeight};
  font-size:${tokens.typography.baseSizePx}px;
  line-height:1.55;
}
h1,h2,h3{
  font-family:${JSON.stringify(tokens.typography.headingFamily)},"Vazirmatn",sans-serif;
  font-weight:${tokens.typography.headingWeight};
  color:${escapeHtml(tokens.colors.primary)};
}
.page{
  page-break-after:always;
  padding:20mm;
  min-height:240mm;
}
.page:last-child{page-break-after:auto}
.header,.footer{font-size:0.9em;opacity:0.92}
.header{border-bottom:1px solid ${escapeHtml(tokens.colors.secondary)};padding-bottom:8px;margin-bottom:16px}
.footer{border-top:1px solid ${escapeHtml(tokens.colors.secondary)};padding-top:8px;margin-top:16px}
.page-num{font-size:0.8em;color:${escapeHtml(tokens.colors.secondary)};margin:6px 0}
.page-num.center{text-align:center}
.page-num.start{text-align:start}
.page-num.end{text-align:end}
.divider{border:none;border-top:1px solid ${escapeHtml(tokens.colors.secondary)};margin:12px 0}
.section{border-inline-start:3px solid ${escapeHtml(tokens.colors.secondary)};padding-inline-start:10px;margin:10px 0}
.image-ph{border:1px dashed ${escapeHtml(tokens.colors.secondary)};padding:24px;text-align:center}
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

    const header =
      master?.header.enabled
        ? `<header class="header">${this.renderBlocks(master.header.blocks)}</header>`
        : '';
    const footer =
      master?.footer.enabled
        ? `<footer class="footer">${this.renderBlocks(master.footer.blocks)}</footer>`
        : '';

    return `<section class="page">
${headerNum}
${header}
${input.title ? `<h1>${escapeHtml(input.title)}</h1>` : ''}
<div class="flow">${this.renderBlocks(input.pageBlocks)}</div>
${footer}
${footerNum}
</section>`;
  }

  private renderBlocks(blocks: BlockNode[]): string {
    return blocks.map((b) => this.renderBlock(b)).join('');
  }

  private renderBlock(block: BlockNode): string {
    switch (block.type) {
      case 'text':
        return `<p>${escapeHtml(String(block.props.content ?? ''))}</p>`;
      case 'image':
        return `<div class="image-ph">${escapeHtml(String(block.props.alt ?? 'image'))}</div>`;
      case 'section': {
        const title = block.props.title
          ? `<h3>${escapeHtml(String(block.props.title))}</h3>`
          : '';
        return `<section class="section">${title}${this.renderBlocks(block.children ?? [])}</section>`;
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
}
