'use client';

import { BINDING_CATALOG } from '@vdb/document-schema';
import { useTranslations } from 'next-intl';
import { useEntitlements } from '@/features/billing/use-entitlements';
import type { EntitlementCode } from '@vdb/shared-types';
import styles from './block-inspector.module.css';

type Props = {
  disabled: boolean;
  /** When true, include {{item.*}} catalog entries. */
  repeaterScope?: boolean;
  onInsert: (expression: string) => void;
};

export function BindingInsertField({
  disabled,
  repeaterScope = false,
  onInsert,
}: Props) {
  const t = useTranslations('editor');
  const { has } = useEntitlements();

  const entries = BINDING_CATALOG.filter((e) => {
    if (e.repeaterOnly && !repeaterScope) return false;
    if (e.moduleCode && !has(e.moduleCode as EntitlementCode)) return false;
    return true;
  });

  return (
    <label className={styles.field}>
      <span>{t('bindingsInsert')}</span>
      <select
        className={styles.input}
        disabled={disabled || entries.length === 0}
        defaultValue=""
        onChange={(e) => {
          const value = e.target.value;
          e.target.value = '';
          if (value) onInsert(value);
        }}
      >
        <option value="">{t('bindingsPick')}</option>
        {entries.map((e) => (
          <option key={e.id} value={e.expression}>
            {t(`bindings.${e.labelKey}` as 'bindings.businessName')}
          </option>
        ))}
      </select>
      <span className={styles.hint}>{t('bindingsHint')}</span>
    </label>
  );
}
