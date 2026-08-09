/**
 * Phase 03 professional sample document body (i18n + many sections for pagination).
 * Used by scripts/e2e/professional-funnel.mjs
 */

/**
 * @param {object} input
 * @param {string} input.businessId
 * @param {string} input.documentId
 * @param {string} [input.templateId]
 * @param {string} [input.title]
 * @param {'fa'|'en'} [input.locale]
 * @param {object} [input.base]
 * @param {number} [input.sectionCount] default 24 — enough to force multi-page pack
 */
export function buildProfessionalDocumentBody(input) {
  const stamp = Date.now();
  const base = input.base && typeof input.base === 'object' ? input.base : {};
  const masters = Array.isArray(base.masters) ? base.masters : [];
  const pageSize = {
    size: 'A4',
    orientation: 'portrait',
    marginsMm: { top: 20, right: 20, bottom: 20, left: 20 },
    autoPaginate: true,
    ...(base.page && typeof base.page === 'object' ? base.page : {}),
  };
  const masterId = masters[0]?.id ?? null;
  const sectionCount = Math.max(8, input.sectionCount ?? 24);
  const locale = input.locale === 'en' ? 'en' : 'fa';

  /** @type {object[]} */
  const blocks = [
    {
      id: `toc_${stamp}`,
      type: 'toc',
      props: {
        title: locale === 'en' ? 'Contents' : 'فهرست',
        maxLevel: 2,
        showPageNumbers: true,
      },
    },
    {
      id: `txt_bind_${stamp}`,
      type: 'text',
      props: {
        content:
          locale === 'en'
            ? 'Projects: {{count(projects)}} — {{business.name}}'
            : 'تعداد پروژه‌ها: {{count(projects)}} — {{business.name}}',
        headingLevel: 2,
      },
      link: {
        kind: 'external',
        target: 'https://example.com/vdb-phase03',
      },
    },
    {
      id: `sec_proj_${stamp}`,
      type: 'section',
      props: {
        title: locale === 'en' ? 'Projects' : 'پروژه‌ها',
        headingLevel: 1,
      },
      children: [
        {
          id: `rep_${stamp}`,
          type: 'repeater',
          props: {
            source: 'projects',
            limit: 50,
            emptyMessage: locale === 'en' ? 'No projects' : 'پروژه‌ای نیست',
          },
          children: [
            {
              id: `rep_t_${stamp}`,
              type: 'text',
              props: { content: '{{item.title}}' },
            },
          ],
        },
      ],
    },
  ];

  for (let i = 0; i < sectionCount; i += 1) {
    blocks.push({
      id: `sec_bulk_${stamp}_${i}`,
      type: 'section',
      props: {
        title:
          locale === 'en'
            ? `Section ${i + 1}`
            : `بخش شماره ${i + 1}`,
        headingLevel: 1,
      },
      breakRules: { keepTogether: true },
      children: [
        {
          id: `txt_bulk_${stamp}_${i}`,
          type: 'text',
          props: {
            content:
              locale === 'en'
                ? `Paragraph ${i + 1}. Professional phase pagination sample with enough content to pack across logical pages.`
                : `پاراگراف ${i + 1}. نمونه صفحه‌بندی فاز حرفه‌ای با محتوای کافی برای چند صفحه منطقی.`,
          },
        },
      ],
    });
  }

  return {
    ...base,
    schemaVersion: 3,
    businessId: input.businessId,
    documentId: input.documentId,
    templateId: input.templateId ?? base.templateId ?? null,
    title:
      input.title ??
      base.title ??
      (locale === 'en' ? 'Professional sample' : 'سند نمونه حرفه‌ای'),
    locale,
    page: { ...pageSize, autoPaginate: true },
    masters,
    dataRefs: base.dataRefs ?? {},
    pages: [
      {
        id: base.pages?.[0]?.id ?? `pg_${stamp}`,
        masterId: base.pages?.[0]?.masterId ?? masterId,
        blocks,
      },
    ],
  };
}
