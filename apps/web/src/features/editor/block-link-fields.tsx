'use client';

import {
  BLOCK_LINK_KINDS,
  type BlockLink,
  type BlockLinkKind,
  type BlockNode,
} from '@vdb/document-schema';
import { useTranslations } from 'next-intl';
import { useEditorStore } from './store/editor-store';
import styles from './block-inspector.module.css';

type Props = { block: BlockNode; disabled: boolean };

export function BlockLinkFields({ block, disabled }: Props) {
  const t = useTranslations('editor');
  const updateBlockLink = useEditorStore((s) => s.updateBlockLink);
  const link = block.link ?? null;
  const kind = link?.kind ?? '';
  const target = link?.target ?? '';

  function setKind(next: '' | BlockLinkKind) {
    if (!next) {
      updateBlockLink(block.id, null);
      return;
    }
    updateBlockLink(block.id, {
      kind: next,
      target: target || (next === 'internal' ? '' : ''),
    });
  }

  function setTarget(value: string) {
    if (!kind) return;
    const next: BlockLink = { kind: kind as BlockLinkKind, target: value };
    updateBlockLink(block.id, next);
  }

  return (
    <fieldset className={styles.field} disabled={disabled}>
      <legend className={styles.title}>{t('linkTitle')}</legend>
      <p className={styles.hint}>{t('linkHint')}</p>
      <label className={styles.field}>
        <span>{t('linkKind')}</span>
        <select
          className={styles.input}
          disabled={disabled}
          value={kind}
          onChange={(e) =>
            setKind(e.target.value as '' | BlockLinkKind)
          }
        >
          <option value="">{t('linkNone')}</option>
          {BLOCK_LINK_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`linkKind_${k}` as 'linkKind_external')}
            </option>
          ))}
        </select>
      </label>
      {kind ? (
        <label className={styles.field}>
          <span>
            {kind === 'internal'
              ? t('linkTargetInternal')
              : kind === 'email'
                ? t('linkTargetEmail')
                : kind === 'phone'
                  ? t('linkTargetPhone')
                  : t('linkTargetUrl')}
          </span>
          <input
            className={styles.input}
            disabled={disabled}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={
              kind === 'internal'
                ? t('linkTargetInternalPh')
                : kind === 'email'
                  ? 'name@example.com'
                  : kind === 'phone'
                    ? '+98912…'
                    : 'https://…'
            }
          />
        </label>
      ) : null}
    </fieldset>
  );
}
