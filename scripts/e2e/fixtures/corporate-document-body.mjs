/**
 * Shared corporate sample document body (Phase 02 E2E / fixtures).
 * Used by scripts/e2e/corporate-sample.mjs
 */

/**
 * @param {object} input
 * @param {string} input.businessId
 * @param {string} input.documentId
 * @param {string} [input.templateId]
 * @param {string} [input.title]
 * @param {object} [input.base] existing parsed body from API (keeps masters/page)
 */
export function buildCorporateDocumentBody(input) {
  const stamp = Date.now();
  const base = input.base && typeof input.base === 'object' ? input.base : {};
  const masters = Array.isArray(base.masters) ? base.masters : [];
  const pageSize = base.page ?? { size: 'A4', orientation: 'portrait' };
  const masterId = masters[0]?.id ?? null;

  return {
    ...base,
    schemaVersion: 3,
    businessId: input.businessId,
    documentId: input.documentId,
    templateId: input.templateId ?? base.templateId ?? null,
    title: input.title ?? base.title ?? 'پروفایل شرکتی نمونه',
    page: pageSize,
    masters,
    dataRefs: base.dataRefs ?? {},
    pages: [
      {
        id: base.pages?.[0]?.id ?? `pg_${stamp}`,
        masterId: base.pages?.[0]?.masterId ?? masterId,
        blocks: [
          {
            id: `toc_${stamp}`,
            type: 'toc',
            props: {
              title: 'فهرست',
              maxLevel: 2,
              showPageNumbers: true,
            },
          },
          {
            id: `sec_about_${stamp}`,
            type: 'section',
            props: { title: 'درباره شرکت', headingLevel: 1 },
            children: [
              {
                id: `txt_about_${stamp}`,
                type: 'text',
                props: {
                  content:
                    'سند نمونه فاز Corporate — پروژه‌ها، نقشه، چارت و تایم‌لاین.',
                },
              },
            ],
          },
          {
            id: `sec_proj_${stamp}`,
            type: 'section',
            props: { title: 'پروژه‌ها', headingLevel: 1 },
            children: [
              {
                id: `rep_${stamp}`,
                type: 'repeater',
                props: {
                  source: 'projects',
                  limit: 20,
                  emptyMessage: 'پروژه‌ای ثبت نشده',
                },
                children: [
                  {
                    id: `rep_t_${stamp}`,
                    type: 'text',
                    props: { content: '{{item.title}} — {{item.status}}' },
                  },
                ],
              },
            ],
          },
          {
            id: `map_${stamp}`,
            type: 'map',
            props: {
              centerLat: 35.6892,
              centerLng: 51.389,
              zoom: 10,
              markersSource: 'locations',
              countryRestriction: null,
              showMarkers: true,
              heightPx: 280,
            },
          },
          {
            id: `org_${stamp}`,
            type: 'orgChart',
            props: {
              layout: 'tree-vertical',
              rootMemberId: null,
              showPhotos: false,
              heightPx: 360,
            },
          },
          {
            id: `tl_${stamp}`,
            type: 'timeline',
            props: {
              layout: 'vertical',
              limit: 20,
              heightPx: 420,
            },
          },
          {
            id: `sec_cert_${stamp}`,
            type: 'section',
            props: { title: 'گواهینامه‌ها', headingLevel: 2 },
            when: { op: 'exists', path: 'collection.certificates' },
            children: [
              {
                id: `txt_cert_${stamp}`,
                type: 'text',
                props: { content: 'فهرست گواهینامه‌ها (در صورت وجود).' },
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Minimal body with only a map block — for module.map deny tests.
 * @param {object} input
 * @param {string} input.businessId
 * @param {string} input.documentId
 * @param {object} [input.base]
 */
export function buildMapOnlyDocumentBody(input) {
  const stamp = Date.now();
  const base = input.base && typeof input.base === 'object' ? input.base : {};
  const masters = Array.isArray(base.masters) ? base.masters : [];
  const masterId = masters[0]?.id ?? null;
  return {
    ...base,
    schemaVersion: 3,
    businessId: input.businessId,
    documentId: input.documentId,
    templateId: base.templateId ?? null,
    title: base.title ?? 'Map deny',
    page: base.page ?? { size: 'A4', orientation: 'portrait' },
    masters,
    dataRefs: {},
    pages: [
      {
        id: base.pages?.[0]?.id ?? `pg_${stamp}`,
        masterId: base.pages?.[0]?.masterId ?? masterId,
        blocks: [
          {
            id: `map_deny_${stamp}`,
            type: 'map',
            props: {
              centerLat: 35.7,
              centerLng: 51.4,
              zoom: 9,
              markersSource: 'none',
              showMarkers: false,
              heightPx: 200,
            },
          },
        ],
      },
    ],
  };
}
