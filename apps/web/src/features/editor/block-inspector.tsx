'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntitlementCodes } from '@vdb/shared-types';
import {
  getBlockRegistry,
  type BlockNode,
  type DocumentBody,
} from '@vdb/document-schema';
import { useEntitlements } from '@/features/billing/use-entitlements';
import { findBlock, isUnderRepeater, useEditorStore } from './store/editor-store';
import { BindingInsertField } from './binding-insert-field';
import { BlockLinkFields } from './block-link-fields';
import { BreakRulesFields } from './break-rules-fields';
import { VisibilityConditionFields } from './visibility-condition-fields';
import styles from './block-inspector.module.css';

type Props = { disabled: boolean };

type InspectorTab = 'content' | 'design' | 'advanced';

function findBlockInBody(
  body: DocumentBody,
  id: string,
): BlockNode | null {
  for (const page of body.pages) {
    const found = findBlock(page.blocks, id);
    if (found) return found;
  }
  return null;
}

function isUnderRepeaterInBody(body: DocumentBody, id: string): boolean {
  for (const page of body.pages) {
    if (isUnderRepeater(page.blocks, id)) return true;
  }
  return false;
}

function hasDesignControls(type: string): boolean {
  return (
    type === 'qr' ||
    type === 'orgChart' ||
    type === 'timeline' ||
    type === 'text' ||
    type === 'section'
  );
}

export function BlockInspector({ disabled }: Props) {
  const t = useTranslations('editor');
  const tBlocks = useTranslations('blocks');
  const body = useEditorStore((s) => s.body);
  const title = useEditorStore((s) => s.title);
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps);
  const updateTextContent = useEditorStore((s) => s.updateTextContent);
  const [tab, setTab] = useState<InspectorTab>('content');

  const block =
    body && selectedBlockId
      ? findBlockInBody(body, selectedBlockId)
      : null;
  const repeaterScope =
    body && block ? isUnderRepeaterInBody(body, block.id) : false;

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
        {title ? (
          <p className={styles.docSummary}>
            <span className={styles.docSummaryLabel}>{t('inspectorDocTitle')}</span>
            <span className={styles.docSummaryValue}>{title}</span>
          </p>
        ) : null}
        <p className={styles.hint}>{t('inspectorPageSettingsHint')}</p>
      </div>
    );
  }

  const typeLabel = tBlocks(
    (getBlockRegistry().find((e) => e.type === block.type)?.labelKey ??
      block.type) as 'text',
  );

  const designReady = hasDesignControls(block.type);

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>
        {t('inspectorTitle')} · {typeLabel}
      </h2>

      <div className={styles.tabs} role="tablist" aria-label={t('inspectorTabs')}>
        <button
          type="button"
          role="tab"
          className={styles.tab}
          aria-selected={tab === 'content'}
          data-active={tab === 'content' ? 'true' : 'false'}
          onClick={() => setTab('content')}
        >
          {t('inspectorTabContent')}
        </button>
        <button
          type="button"
          role="tab"
          className={styles.tab}
          aria-selected={tab === 'design'}
          data-active={tab === 'design' ? 'true' : 'false'}
          onClick={() => setTab('design')}
        >
          {t('inspectorTabDesign')}
        </button>
        <button
          type="button"
          role="tab"
          className={styles.tab}
          aria-selected={tab === 'advanced'}
          data-active={tab === 'advanced' ? 'true' : 'false'}
          onClick={() => setTab('advanced')}
        >
          {t('inspectorTabAdvanced')}
        </button>
      </div>

      <div className={styles.tabPanel} role="tabpanel">
        {tab === 'content' ? (
          <div className={styles.panelStack}>
            {block.type === 'text' ? (
              <>
                <label className={styles.field}>
                  <span>{t('textContent')}</span>
                  <textarea
                    className={styles.textarea}
                    rows={5}
                    disabled={disabled}
                    value={String(block.props.content ?? '')}
                    onChange={(e) =>
                      updateTextContent(block.id, e.target.value)
                    }
                  />
                </label>
                <BindingInsertField
                  disabled={disabled}
                  repeaterScope={repeaterScope}
                  onInsert={insertIntoText}
                />
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
                      updateBlockProps(block.id, {
                        zoom: Number(e.target.value),
                      })
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
            ) : null}

            {block.type === 'timeline' ? (
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
                      updateBlockProps(block.id, {
                        targetType: e.target.value,
                      })
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
                <label className={styles.field}>
                  <span>{t('noticeTitle')}</span>
                  <input
                    className={styles.input}
                    disabled={disabled}
                    value={String(block.props.title ?? '')}
                    onChange={(e) =>
                      updateBlockProps(block.id, { title: e.target.value })
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>{t('noticeBody')}</span>
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

            {block.type === 'headerSlot' || block.type === 'footerSlot' ? (
              <p className={styles.hint}>{t('inspectorSlotsHint')}</p>
            ) : null}

            {block.type === 'divider' ? (
              <p className={styles.hint}>{t('inspectorDividerContentHint')}</p>
            ) : null}
          </div>
        ) : null}

        {tab === 'design' ? (
          <div className={styles.panelStack}>
            {block.type === 'text' || block.type === 'section' ? (
              <label className={styles.field}>
                <span>{t('headingLevel')}</span>
                <select
                  className={styles.input}
                  disabled={disabled}
                  value={
                    block.type === 'section'
                      ? String(block.props.headingLevel ?? 1)
                      : block.props.headingLevel === undefined ||
                          block.props.headingLevel === null ||
                          block.props.headingLevel === ''
                        ? ''
                        : String(block.props.headingLevel)
                  }
                  onChange={(e) =>
                    updateBlockProps(block.id, {
                      headingLevel:
                        block.type === 'section'
                          ? Number(e.target.value)
                          : e.target.value
                            ? Number(e.target.value)
                            : null,
                    })
                  }
                >
                  {block.type === 'text' ? (
                    <option value="">{t('headingNone')}</option>
                  ) : null}
                  <option value="1">H1</option>
                  <option value="2">H2</option>
                  <option value="3">H3</option>
                </select>
              </label>
            ) : null}

            {block.type === 'qr' ? (
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
            ) : null}

            {block.type === 'orgChart' ? (
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
            ) : null}

            {block.type === 'timeline' ? (
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
                  <option value="alternating">
                    {t('timelineAlternating')}
                  </option>
                </select>
              </label>
            ) : null}

            {!designReady ? (
              <p className={styles.hint}>{t('inspectorDesignEmpty')}</p>
            ) : null}
          </div>
        ) : null}

        {tab === 'advanced' ? (
          <div className={styles.panelStack}>
            <VisibilityConditionFields block={block} disabled={disabled} />
            <BlockLinkFields block={block} disabled={disabled} />
            <BreakRulesFields block={block} disabled={disabled} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RepeaterInspectorFields({
  block,
  disabled,
}: {
  block: BlockNode;
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
