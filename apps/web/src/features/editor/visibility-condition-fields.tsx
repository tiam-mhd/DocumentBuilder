'use client';

import {
  REPEATER_SOURCE_MODULE,
  VISIBILITY_COLLECTION_PATHS,
  VISIBILITY_OPS,
  type BlockNode,
  type BlockVisibilityCondition,
  type VisibilityOp,
} from '@vdb/document-schema';
import { useTranslations } from 'next-intl';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { useEditorStore } from './store/editor-store';
import styles from './block-inspector.module.css';

type Props = {
  block: BlockNode;
  disabled: boolean;
};

export function VisibilityConditionFields({ block, disabled }: Props) {
  const t = useTranslations('editor');
  const { can } = useEntitlements();
  const updateBlockWhen = useEditorStore((s) => s.updateBlockWhen);
  const enabled = Boolean(block.when);
  const when: BlockVisibilityCondition = block.when ?? {
    op: 'exists',
    path: 'collection.certificates',
  };

  function setWhen(next: BlockVisibilityCondition | null) {
    updateBlockWhen(block.id, next);
  }

  function pathLocked(path: string): boolean {
    const source = path.replace(/^collection\./, '');
    const mod =
      REPEATER_SOURCE_MODULE[
        source as keyof typeof REPEATER_SOURCE_MODULE
      ] ?? null;
    if (!mod) return false;
    return !can(mod);
  }

  return (
    <fieldset className={styles.fieldset} disabled={disabled}>
      <legend className={styles.legend}>{t('visibilityTitle')}</legend>
      <p className={styles.hint}>{t('visibilityHint')}</p>
      <label className={styles.checkRow}>
        <input
          type="checkbox"
          disabled={disabled}
          checked={enabled}
          onChange={(e) => {
            if (e.target.checked) {
              setWhen({
                op: 'exists',
                path: 'collection.certificates',
              });
            } else {
              setWhen(null);
            }
          }}
        />
        <span>{t('visibilityEnable')}</span>
      </label>
      {enabled ? (
        <>
          <label className={styles.field}>
            <span>{t('visibilityOp')}</span>
            <select
              className={styles.input}
              disabled={disabled}
              value={when.op}
              onChange={(e) => {
                const op = e.target.value as VisibilityOp;
                setWhen({
                  ...when,
                  op,
                  value: op === 'eq' ? (when.value ?? '0') : undefined,
                });
              }}
            >
              {VISIBILITY_OPS.map((op) => (
                <option key={op} value={op}>
                  {t(`visibilityOp_${op}`)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>{t('visibilityPath')}</span>
            <select
              className={styles.input}
              disabled={disabled}
              value={when.path}
              onChange={(e) => setWhen({ ...when, path: e.target.value })}
            >
              {VISIBILITY_COLLECTION_PATHS.map((path) => {
                const locked = pathLocked(path);
                return (
                  <option key={path} value={path} disabled={locked}>
                    {t(`visibilityPath_${path.replace('collection.', '')}`)}
                    {locked ? ` (${t('sourceLocked')})` : ''}
                  </option>
                );
              })}
            </select>
          </label>
          {when.op === 'eq' ? (
            <label className={styles.field}>
              <span>{t('visibilityValue')}</span>
              <input
                className={styles.input}
                disabled={disabled}
                value={String(when.value ?? '')}
                onChange={(e) => setWhen({ ...when, value: e.target.value })}
                placeholder={t('visibilityValuePlaceholder')}
              />
            </label>
          ) : null}
        </>
      ) : null}
    </fieldset>
  );
}
