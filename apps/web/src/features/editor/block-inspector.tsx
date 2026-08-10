'use client';

import { useTranslations } from 'next-intl';
import { EntitlementCodes } from '@vdb/shared-types';
import { getBlockRegistry, getPrimaryPage } from '@vdb/document-schema';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { findBlock, isUnderRepeater, useEditorStore } from './store/editor-store';
import { BindingInsertField } from './binding-insert-field';
import { BlockLinkFields } from './block-link-fields';
import { BreakRulesFields } from './break-rules-fields';
import { VisibilityConditionFields } from './visibility-condition-fields';
import styles from './block-inspector.module.css';

type Props = { disabled: boolean };

export function BlockInspector({ disabled }: Props) {
  const t = useTranslations('editor');
  const tBlocks = useTranslations('blocks');
  const body = useEditorStore((s) => s.body);
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps);
  const updateTextContent = useEditorStore((s) => s.updateTextContent);

  const primaryBlocks = body ? getPrimaryPage(body).blocks : [];
  const block =
    body && selectedBlockId
      ? findBlock(primaryBlocks, selectedBlockId)
      : null;
  const repeaterScope = block
    ? isUnderRepeater(primaryBlocks, block.id)
    : false;

  function insertIntoText(expression: string) {
    if (!block || block.type !== 'text') return;
    const current = String(block.props.content ?? '');
    const sep = current && !current.endsWith(' ') ? ' ' : '';
    updateTextContent(block.id, `${current}${sep}${expression}`);
  }

  function insertIntoSectionTitle(expression: string) {
    if (!block || block.type !== 'section') return;
    const current = String(block.props.title ?? '');
    const sep = current && !current.endsWith(' ') ? ' ' : '';
    updateBlockProps(block.id, { title: `${current}${sep}${expression}` });
  }

  if (!block) {
    return (
      <div className={styles.wrap}>
        <h2 className={styles.title}>{t('inspectorTitle')}</h2>
        <p className={styles.hint}>{t('inspectorEmpty')}</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>
        {t('inspectorTitle')} ·{' '}
        {tBlocks(
          (getBlockRegistry().find((e) => e.type === block.type)?.labelKey ??
            block.type) as 'text',
        )}
      </h2>

      {block.type === 'text' ? (
        <>
          <label className={styles.field}>
            <span>{t('textContent')}</span>
            <textarea
              className={styles.textarea}
              rows={5}
              disabled={disabled}
              value={String(block.props.content ?? '')}
              onChange={(e) => updateTextContent(block.id, e.target.value)}
            />
          </label>
          <BindingInsertField
            disabled={disabled}
            repeaterScope={repeaterScope}
            onInsert={insertIntoText}
          />
          <label className={styles.field}>
            <span>{t('headingLevel')}</span>
            <select
              className={styles.input}
              disabled={disabled}
              value={
                block.props.headingLevel === undefined ||
                block.props.headingLevel === null ||
                block.props.headingLevel === ''
                  ? ''
                  : String(block.props.headingLevel)
              }
              onChange={(e) =>
                updateBlockProps(block.id, {
                  headingLevel: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            >
              <option value="">{t('headingNone')}</option>
              <option value="1">H1</option>
              <option value="2">H2</option>
              <option value="3">H3</option>
            </select>
          </label>
        </>
      ) : null}

      {block.type === 'section' ? (
        <>
          <label className={styles.field}>
            <span>{t('sectionTitle')}</span>
            <input
              className={styles.input}
              disabled={disabled}
              value={String(block.props.title ?? '')}
              onChange={(e) =>
                updateBlockProps(block.id, { title: e.target.value })
              }
            />
          </label>
          <BindingInsertField
            disabled={disabled}
            repeaterScope={repeaterScope}
            onInsert={insertIntoSectionTitle}
          />
          <label className={styles.field}>
            <span>{t('headingLevel')}</span>
            <select
              className={styles.input}
              disabled={disabled}
              value={String(block.props.headingLevel ?? 1)}
              onChange={(e) =>
                updateBlockProps(block.id, {
                  headingLevel: Number(e.target.value),
                })
              }
            >
              <option value="1">H1</option>
              <option value="2">H2</option>
              <option value="3">H3</option>
            </select>
          </label>
        </>
      ) : null}

      {block.type === 'image' ? (
        <label className={styles.field}>
          <span>{t('imageAlt')}</span>
          <input
            className={styles.input}
            disabled={disabled}
            value={String(block.props.alt ?? '')}
            onChange={(e) =>
              updateBlockProps(block.id, { alt: e.target.value })
            }
          />
        </label>
      ) : null}

      {block.type === 'gallery' ? (
        <label className={styles.field}>
          <span>{t('galleryId')}</span>
          <input
            className={styles.input}
            disabled={disabled}
            value={String(block.props.galleryId ?? '')}
            onChange={(e) =>
              updateBlockProps(block.id, {
                galleryId: e.target.value.trim() || null,
              })
            }
            placeholder={t('galleryIdPlaceholder')}
          />
        </label>
      ) : null}

      {block.type === 'map' ? (
        <>
          <label className={styles.field}>
            <span>{t('mapCenterLat')}</span>
            <input
              className={styles.input}
              type="number"
              step="any"
              disabled={disabled}
              value={Number(block.props.centerLat ?? 35.6892)}
              onChange={(e) =>
                updateBlockProps(block.id, {
                  centerLat: Number(e.target.value),
                })
              }
            />
          </label>
          <label className={styles.field}>
            <span>{t('mapCenterLng')}</span>
            <input
              className={styles.input}
              type="number"
              step="any"
              disabled={disabled}
              value={Number(block.props.centerLng ?? 51.389)}
              onChange={(e) =>
                updateBlockProps(block.id, {
                  centerLng: Number(e.target.value),
                })
              }
            />
          </label>
          <label className={styles.field}>
            <span>{t('mapZoom')}</span>
            <input
              className={styles.input}
              type="number"
              min={1}
              max={19}
              disabled={disabled}
              value={Number(block.props.zoom ?? 10)}
              onChange={(e) =>
                updateBlockProps(block.id, { zoom: Number(e.target.value) })
              }
            />
          </label>
          <label className={styles.field}>
            <span>{t('mapMarkersSource')}</span>
            <select
              className={styles.input}
              disabled={disabled}
              value={String(block.props.markersSource ?? 'locations')}
              onChange={(e) =>
                updateBlockProps(block.id, {
                  markersSource: e.target.value,
                })
              }
            >
              <option value="locations">{t('mapSourceLocations')}</option>
              <option value="branches">{t('mapSourceBranches')}</option>
              <option value="projects">{t('mapSourceProjects')}</option>
              <option value="none">{t('mapSourceNone')}</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>{t('mapCountry')}</span>
            <input
              className={styles.input}
              disabled={disabled}
              value={String(block.props.countryRestriction ?? '')}
              onChange={(e) =>
                updateBlockProps(block.id, {
                  countryRestriction: e.target.value.trim() || null,
                })
              }
              placeholder="IR"
            />
          </label>
          <label className={styles.field}>
            <span>{t('mapShowMarkers')}</span>
            <input
              type="checkbox"
              disabled={disabled}
              checked={Boolean(block.props.showMarkers ?? true)}
              onChange={(e) =>
                updateBlockProps(block.id, {
                  showMarkers: e.target.checked,
                })
              }
            />
          </label>
        </>
      ) : null}

      {block.type === 'orgChart' ? (
        <>
          <label className={styles.field}>
            <span>{t('orgChartLayout')}</span>
            <select
              className={styles.input}
              disabled={disabled}
              value={String(block.props.layout ?? 'tree-vertical')}
              onChange={(e) =>
                updateBlockProps(block.id, { layout: e.target.value })
              }
            >
              <option value="tree-vertical">{t('orgChartVertical')}</option>
              <option value="tree-horizontal">
                {t('orgChartHorizontal')}
              </option>
            </select>
          </label>
          <label className={styles.field}>
            <span>{t('orgChartRootId')}</span>
            <input
              className={styles.input}
              disabled={disabled}
              value={String(block.props.rootMemberId ?? '')}
              onChange={(e) =>
                updateBlockProps(block.id, {
                  rootMemberId: e.target.value.trim() || null,
                })
              }
              placeholder={t('orgChartRootPlaceholder')}
            />
          </label>
        </>
      ) : null}

      {block.type === 'timeline' ? (
        <>
          <label className={styles.field}>
            <span>{t('timelineLayout')}</span>
            <select
              className={styles.input}
              disabled={disabled}
              value={String(block.props.layout ?? 'vertical')}
              onChange={(e) =>
                updateBlockProps(block.id, { layout: e.target.value })
              }
            >
              <option value="vertical">{t('timelineVertical')}</option>
              <option value="alternating">{t('timelineAlternating')}</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>{t('timelineLimit')}</span>
            <input
              className={styles.input}
              type="number"
              min={1}
              max={100}
              disabled={disabled}
              value={Number(block.props.limit ?? 20)}
              onChange={(e) =>
                updateBlockProps(block.id, {
                  limit: Number(e.target.value),
                })
              }
            />
          </label>
        </>
      ) : null}

      {block.type === 'qr' ? (
        <>
          <label className={styles.field}>
            <span>{t('qrTargetType')}</span>
            <select
              className={styles.input}
              disabled={disabled}
              value={String(block.props.targetType ?? 'url')}
              onChange={(e) =>
                updateBlockProps(block.id, { targetType: e.target.value })
              }
            >
              <option value="url">{t('qrTypeUrl')}</option>
              <option value="phone">{t('qrTypePhone')}</option>
              <option value="email">{t('qrTypeEmail')}</option>
              <option value="map">{t('qrTypeMap')}</option>
              <option value="custom">{t('qrTypeCustom')}</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>{t('qrValue')}</span>
            <input
              className={styles.input}
              disabled={disabled}
              value={String(block.props.value ?? '')}
              onChange={(e) =>
                updateBlockProps(block.id, { value: e.target.value })
              }
              placeholder={t('qrValuePlaceholder')}
            />
          </label>
          <label className={styles.field}>
            <span>{t('qrSize')}</span>
            <input
              className={styles.input}
              type="number"
              min={64}
              max={512}
              disabled={disabled}
              value={Number(block.props.sizePx ?? 128)}
              onChange={(e) =>
                updateBlockProps(block.id, {
                  sizePx: Number(e.target.value),
                })
              }
            />
          </label>
          <label className={styles.field}>
            <span>{t('qrCaption')}</span>
            <input
              className={styles.input}
              disabled={disabled}
              value={String(block.props.caption ?? '')}
              onChange={(e) =>
                updateBlockProps(block.id, { caption: e.target.value })
              }
            />
          </label>
        </>
      ) : null}

      {block.type === 'toc' ? (
        <>
          <label className={styles.field}>
            <span>{t('tocTitle')}</span>
            <input
              className={styles.input}
              disabled={disabled}
              value={String(block.props.title ?? '')}
              onChange={(e) =>
                updateBlockProps(block.id, { title: e.target.value })
              }
              placeholder={t('tocTitlePlaceholder')}
            />
          </label>
          <label className={styles.field}>
            <span>{t('tocMaxLevel')}</span>
            <select
              className={styles.input}
              disabled={disabled}
              value={String(block.props.maxLevel ?? 3)}
              onChange={(e) =>
                updateBlockProps(block.id, {
                  maxLevel: Number(e.target.value),
                })
              }
            >
              <option value="1">H1</option>
              <option value="2">H1–H2</option>
              <option value="3">H1–H3</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>{t('tocShowPages')}</span>
            <input
              type="checkbox"
              disabled={disabled}
              checked={Boolean(block.props.showPageNumbers ?? true)}
              onChange={(e) =>
                updateBlockProps(block.id, {
                  showPageNumbers: e.target.checked,
                })
              }
            />
          </label>
        </>
      ) : null}

      {block.type === 'repeater' ? (
        <RepeaterInspectorFields block={block} disabled={disabled} />
      ) : null}

      {block.type === 'plugin.notice' ? (
        <>
          <label className={styles.label}>
            {t('noticeTitle')}
            <input
              className={styles.input}
              disabled={disabled}
              value={String(block.props.title ?? '')}
              onChange={(e) =>
                updateBlockProps(block.id, { title: e.target.value })
              }
            />
          </label>
          <label className={styles.label}>
            {t('noticeBody')}
            <textarea
              className={styles.textarea}
              disabled={disabled}
              rows={3}
              value={String(block.props.body ?? '')}
              onChange={(e) =>
                updateBlockProps(block.id, { body: e.target.value })
              }
            />
          </label>
        </>
      ) : null}

      {block.type === 'divider' ||
      block.type === 'headerSlot' ||
      block.type === 'footerSlot' ? (
        <p className={styles.hint}>{t('noProps')}</p>
      ) : null}

      <VisibilityConditionFields block={block} disabled={disabled} />
      <BlockLinkFields block={block} disabled={disabled} />
      <BreakRulesFields block={block} disabled={disabled} />
    </div>
  );
}

function RepeaterInspectorFields({
  block,
  disabled,
}: {
  block: import('@vdb/document-schema').BlockNode;
  disabled: boolean;
}) {
  const t = useTranslations('editor');
  const { can } = useEntitlements();
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps);
  const updateTextContent = useEditorStore((s) => s.updateTextContent);
  const appendChildBlock = useEditorStore((s) => s.appendChildBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const textChildren = (block.children ?? []).filter((c) => c.type === 'text');
  const projectsOk = can(EntitlementCodes.ModuleProjects);
  const timelineOk = can(EntitlementCodes.ModuleTimeline);

  return (
    <>
      <p className={styles.hint}>{t('repeaterHint')}</p>
      <label className={styles.field}>
        <span>{t('repeaterSource')}</span>
        <select
          className={styles.input}
          disabled={disabled}
          value={String(block.props.source ?? 'projects')}
          onChange={(e) =>
            updateBlockProps(block.id, { source: e.target.value })
          }
        >
          <option value="projects" disabled={!projectsOk}>
            {t('repeaterSourceProjects')}
            {!projectsOk ? ` (${t('sourceLocked')})` : ''}
          </option>
          <option value="teamMembers">{t('repeaterSourceTeam')}</option>
          <option value="branches">{t('repeaterSourceBranches')}</option>
          <option value="services">{t('repeaterSourceServices')}</option>
          <option value="clients">{t('repeaterSourceClients')}</option>
          <option value="certificates">
            {t('repeaterSourceCertificates')}
          </option>
          <option value="timelineEvents" disabled={!timelineOk}>
            {t('repeaterSourceTimeline')}
            {!timelineOk ? ` (${t('sourceLocked')})` : ''}
          </option>
        </select>
      </label>
      <label className={styles.field}>
        <span>{t('repeaterLimit')}</span>
        <input
          className={styles.input}
          type="number"
          min={1}
          max={100}
          disabled={disabled}
          value={Number(block.props.limit ?? 50)}
          onChange={(e) =>
            updateBlockProps(block.id, { limit: Number(e.target.value) })
          }
        />
      </label>
      <label className={styles.field}>
        <span>{t('repeaterEmptyMessage')}</span>
        <input
          className={styles.input}
          disabled={disabled}
          value={String(block.props.emptyMessage ?? '')}
          onChange={(e) =>
            updateBlockProps(block.id, { emptyMessage: e.target.value })
          }
          placeholder={t('repeaterEmptyMessagePlaceholder')}
        />
      </label>
      <p className={styles.hint}>{t('repeaterCardTitle')}</p>
      {textChildren.map((child, index) => (
        <label key={child.id} className={styles.field}>
          <span>
            {t('repeaterCardLine')} {index + 1}
          </span>
          <textarea
            className={styles.textarea}
            rows={2}
            disabled={disabled}
            value={String(child.props.content ?? '')}
            onChange={(e) => updateTextContent(child.id, e.target.value)}
          />
          {textChildren.length > 1 ? (
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={disabled}
              onClick={() => removeBlock(child.id)}
            >
              {t('repeaterRemoveLine')}
            </button>
          ) : null}
        </label>
      ))}
      <button
        type="button"
        className={styles.secondaryBtn}
        disabled={disabled}
        onClick={() => appendChildBlock(block.id, 'text')}
      >
        {t('repeaterAddLine')}
      </button>
    </>
  );
}
