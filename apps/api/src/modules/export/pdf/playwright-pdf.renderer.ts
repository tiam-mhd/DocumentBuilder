import { Injectable, Logger } from '@nestjs/common';
import type { PdfRenderInput, PdfRenderer } from './pdf-renderer.port';

/**
 * Chromium HTML→PDF via Playwright.
 * Requires `npx playwright install chromium` on the worker host.
 */
@Injectable()
export class PlaywrightPdfRenderer implements PdfRenderer {
  readonly driver = 'playwright' as const;
  private readonly logger = new Logger(PlaywrightPdfRenderer.name);

  async render(input: PdfRenderInput): Promise<Buffer> {
    let chromium: typeof import('playwright').chromium;
    try {
      ({ chromium } = await import('playwright'));
    } catch (err) {
      this.logger.error('playwright package missing', err);
      throw new Error('Playwright is not installed');
    }

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(input.html, { waitUntil: 'networkidle' });
      const pdf = await page.pdf({
        format: input.format,
        landscape: input.landscape,
        printBackground: true,
        preferCSSPageSize: true,
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
