'use client';

import {
  getPrimaryPage,
  resolveMaster,
  type PageNumberFormat,
  type PageNumberPosition,
} from '@vdb/document-schema';
import { useTranslations } from 'next-intl';
import {
  masterFooterText,
  masterHeaderText,
  useEditorStore,
} from './store/editor-store';
import styles from './master-panel.module.css';

type Props = { disabled: boolean };

const POSITIONS: PageNumberPosition[] = [
  'footer-start',
  'footer-center',
  'footer-end',
  'header-end',
];

const POSITION_I18N: Record<PageNumberPosition, string> = {
  'footer-start': 'footerStart',
  'footer-center': 'footerCenter',
  'footer-end': 'footerEnd',
  'header-end': 'headerEnd',
};

const FORMATS: PageNumberFormat[] = ['number', 'pageOfTotal'];

export function MasterPanel({ disabled }: Props) {
  const t = useTranslations('editor');
  const body = useEditorStore((s) => s.body);
  const setPageMasterId = useEditorStore((s) => s.setPageMasterId);
  const updateMaster = useEditorStore((s) => s.updateMaster);

  if (!body) return null;

  const primary = getPrimaryPage(body);
  const master =
    resolveMaster(body.masters, primary.masterId) ?? body.masters[0] ?? null;

  if (!master) {
    return (
      <div className={styles.wrap}>
        <h2 className={styles.title}>{t('masterTitle')}</h2>
        <p className={styles.hint}>{t('masterMissing')}</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>{t('masterTitle')}</h2>
      <p className={styles.hint}>{t('masterHint')}</p>

      <label className={styles.field}>
        <span>{t('pageMaster')}</span>
        <select
          className={styles.input}
          disabled={disabled}
          value={primary.masterId ?? ''}
          onChange={(e) =>
            setPageMasterId(e.target.value ? e.target.value : null)
          }
        >
          <option value="">{t('masterNone')}</option>
          {body.masters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>{t('masterName')}</span>
        <input
          className={styles.input}
          disabled={disabled}
          value={master.name}
          onChange={(e) =>
            updateMaster(master.id, { name: e.target.value })
          }
        />
      </label>

      <label className={styles.check}>
        <input
          type="checkbox"
          disabled={disabled}
          checked={master.header.enabled}
          onChange={(e) =>
            updateMaster(master.id, { headerEnabled: e.target.checked })
          }
        />
        <span>{t('headerEnabled')}</span>
      </label>
      <label className={styles.field}>
        <span>{t('headerText')}</span>
        <input
          className={styles.input}
          disabled={disabled || !master.header.enabled}
          value={masterHeaderText(master)}
          onChange={(e) =>
            updateMaster(master.id, { headerText: e.target.value })
          }
        />
      </label>

      <label className={styles.check}>
        <input
          type="checkbox"
          disabled={disabled}
          checked={master.footer.enabled}
          onChange={(e) =>
            updateMaster(master.id, { footerEnabled: e.target.checked })
          }
        />
        <span>{t('footerEnabled')}</span>
      </label>
      <label className={styles.field}>
        <span>{t('footerText')}</span>
        <input
          className={styles.input}
          disabled={disabled || !master.footer.enabled}
          value={masterFooterText(master)}
          onChange={(e) =>
            updateMaster(master.id, { footerText: e.target.value })
          }
        />
      </label>

      <label className={styles.check}>
        <input
          type="checkbox"
          disabled={disabled}
          checked={master.pageNumber.enabled}
          onChange={(e) =>
            updateMaster(master.id, { pageNumberEnabled: e.target.checked })
          }
        />
        <span>{t('pageNumberEnabled')}</span>
      </label>
      <label className={styles.field}>
        <span>{t('pageNumberPosition')}</span>
        <select
          className={styles.input}
          disabled={disabled || !master.pageNumber.enabled}
          value={master.pageNumber.position}
          onChange={(e) =>
            updateMaster(master.id, {
              pageNumberPosition: e.target.value as PageNumberPosition,
            })
          }
        >
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {t(`pageNumberPos.${POSITION_I18N[p]}`)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span>{t('pageNumberFormat')}</span>
        <select
          className={styles.input}
          disabled={disabled || !master.pageNumber.enabled}
          value={master.pageNumber.format}
          onChange={(e) =>
            updateMaster(master.id, {
              pageNumberFormat: e.target.value as PageNumberFormat,
            })
          }
        >
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {t(`pageNumberFmt.${f}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
