export const PDF_RENDERER = Symbol('PDF_RENDERER');

export type PdfRenderInput = {
  html: string;
  /** Print page size hint */
  format: 'A4' | 'A3';
  landscape: boolean;
};

export interface PdfRenderer {
  readonly driver: 'fake' | 'playwright';
  render(input: PdfRenderInput): Promise<Buffer>;
}
