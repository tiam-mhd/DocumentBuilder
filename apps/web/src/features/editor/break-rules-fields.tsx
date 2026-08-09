'use client';

import {
  effectiveBreakRules,
  type BlockBreakRules,
  type BlockNode,
} from '@vdb/document-schema';
import { useTranslations } from 'next-intl';
import { useEditorStore } from './store/editor-store';
import styles from './block-inspector.module.css';

type Props = { block: BlockNode; disabled: boolean };

export function BreakRulesFields({ block, disabled }: Props) {
  const t = useTranslations('editor');
  const updateBlockBreakRules = useEditorStore((s) => s.updateBlockBreakRules);
  const effective = effectiveBreakRules(block);

  function patch(partial: Partial<BlockBreakRules>) {
    updateBlockBreakRules(block.id, {
      keepTogether: partial.keepTogether ?? effective.keepTogether,
      keepWithNext: partial.keepWithNext ?? effective.keepWithNext,
      breakBefore: partial.breakBefore ?? effective.breakBefore,
      breakAfter: partial.breakAfter ?? effective.breakAfter,
    });
  }

  return (
    <fieldset className={styles.field} disabled={disabled}>
      <legend className={styles.title}>{t('breakRulesTitle')}</legend>
      <p className={styles.hint}>{t('breakRulesHint')}</p>
      {(
        [
          ['keepTogether', 'breakKeepTogether'],
          ['keepWithNext', 'breakKeepWithNext'],
          ['breakBefore', 'breakBefore'],
          ['breakAfter', 'breakAfter'],
        ] as const
      ).map(([key, labelKey]) => (
        <label key={key} className={styles.field}>
          <span>{t(labelKey)}</span>
          <input
            type="checkbox"
            disabled={disabled}
            checked={effective[key]}
            onChange={(e) => patch({ [key]: e.target.checked })}
          />
        </label>
      ))}
    </fieldset>
  );
}
