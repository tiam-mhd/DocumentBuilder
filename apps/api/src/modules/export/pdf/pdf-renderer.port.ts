export const PDF_RENDERER = Symbol('PDF_RENDERER');

export type PdfRenderInput = {
  html: string;
  /** Print page size hint */
  format: 'A4' | 'A3';
  landscape: boolean;
  /**
   * When true (default for Playwright), request Chromium document outline
   * from headings + tagged PDF (ADR 018). Fake driver ignores.
   */
  outline?: boolean;
};

export interface PdfRenderer {
  readonly driver: 'fake' | 'playwright';
  render(input: PdfRenderInput): Promise<Buffer>;
}
