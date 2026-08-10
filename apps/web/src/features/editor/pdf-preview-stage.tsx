'use client';

import { useTranslations } from 'next-intl';
import styles from './pdf-preview-stage.module.css';

/**
 * Shell placeholder until ADR 036 preview enqueue API ships (phase 07).
 * Must never enqueue a fake successful PDF job from this UI.
 */
export function PdfPreviewStage() {
  const t = useTranslations('editor');

  return (
    <div className={styles.panel} role="status">
      <h2 className={styles.title}>{t('pdfPreviewStageTitle')}</h2>
      <p className={styles.body}>{t('pdfPreviewStageBody')}</p>
      <p className={styles.meta}>{t('pdfPreviewStageMeta')}</p>
      <button type="button" className={styles.cta} disabled>
        {t('pdfPreviewGenerateDisabled')}
      </button>
    </div>
  );
}
