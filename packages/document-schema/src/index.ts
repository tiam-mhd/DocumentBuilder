import { z } from 'zod';

/**
 * Bump when Document / Template JSON shape changes incompatibly.
 * v2: Core flow blocks.
 * v3: Master pages (header/footer/page numbers) + pages[].masterId.
 * Gallery, map, orgChart, timeline, core `qr` / `toc` / `repeater`, and optional
 * block `when` visibility are additive — still schema v3.
 */
export const DOCUMENT_SCHEMA_VERSION = 3 as const;
export const TEMPLATE_SCHEMA_VERSION = DOCUMENT_SCHEMA_VERSION;

/** Phase-01 core blocks — see `.cursor/rules/13-templates-blocks.mdc`. */
export const CORE_BLOCK_TYPES = [
  'text',
  'image',
  'section',
  'divider',
  'headerSlot',
  'footerSlot',
  'qr',
  'toc',
  'repeater',
] as const;

/** Sellable module blocks (Phase 02+). */
export const MODULE_BLOCK_TYPES = [
  'gallery',
  'map',
  'orgChart',
  'timeline',
] as const;

export const ALL_BLOCK_TYPES = [
  ...CORE_BLOCK_TYPES,
  ...MODULE_BLOCK_TYPES,
] as const;

export const CoreBlockTypeSchema = z.enum(CORE_BLOCK_TYPES);
export type CoreBlockType = z.infer<typeof CoreBlockTypeSchema>;

export const ModuleBlockTypeSchema = z.enum(MODULE_BLOCK_TYPES);
export type ModuleBlockType = z.infer<typeof ModuleBlockTypeSchema>;

export const BlockTypeSchema = z.enum(ALL_BLOCK_TYPES);
export type BlockType = z.infer<typeof BlockTypeSchema>;

export type BlockRegistryEntry = {
  type: BlockType;
  labelKey: string;
  allowsChildren: boolean;
  moduleCode: string | null;
};

export const CORE_BLOCK_REGISTRY: readonly BlockRegistryEntry[] = [
  {
    type: 'text',
    labelKey: 'text',
    allowsChildren: false,
    moduleCode: null,
  },
  {
    type: 'image',
    labelKey: 'image',
    allowsChildren: false,
    moduleCode: null,
  },
  {
    type: 'section',
    labelKey: 'section',
    allowsChildren: true,
    moduleCode: null,
  },
  {
    type: 'divider',
    labelKey: 'divider',
    allowsChildren: false,
    moduleCode: null,
  },
  {
    type: 'headerSlot',
    labelKey: 'headerSlot',
    allowsChildren: false,
    moduleCode: null,
  },
  {
    type: 'footerSlot',
    labelKey: 'footerSlot',
    allowsChildren: false,
    moduleCode: null,
  },
  {
    type: 'qr',
    labelKey: 'qr',
    allowsChildren: false,
    moduleCode: null,
  },
  {
    type: 'toc',
    labelKey: 'toc',
    allowsChildren: false,
    moduleCode: null,
  },
  {
    type: 'repeater',
    labelKey: 'repeater',
    allowsChildren: true,
    moduleCode: null,
  },
] as const;

export const MODULE_BLOCK_REGISTRY: readonly BlockRegistryEntry[] = [
  {
    type: 'gallery',
    labelKey: 'gallery',
    allowsChildren: false,
    moduleCode: 'module.gallery',
  },
  {
    type: 'map',
    labelKey: 'map',
    allowsChildren: false,
    moduleCode: 'module.map',
  },
  {
    type: 'orgChart',
    labelKey: 'orgChart',
    allowsChildren: false,
    moduleCode: 'module.org_chart',
  },
  {
    type: 'timeline',
    labelKey: 'timeline',
    allowsChildren: false,
    moduleCode: 'module.timeline',
  },
] as const;

/** Full registry (core + module blocks). */
export const BLOCK_REGISTRY: readonly BlockRegistryEntry[] = [
  ...CORE_BLOCK_REGISTRY,
  ...MODULE_BLOCK_REGISTRY,
] as const;

export const VISIBILITY_OPS = ['exists', 'empty', 'eq'] as const;
export type VisibilityOp = (typeof VISIBILITY_OPS)[number];

export const VisibilityConditionSchema = z
  .object({
    op: z.enum(VISIBILITY_OPS),
    /** MVP: `collection.<RepeaterSource>` only. */
    path: z.string().min(1).max(120),
    /** Required when `op === 'eq'`. */
    value: z.string().max(200).optional(),
  })
  .superRefine((cond, ctx) => {
    if (cond.op === 'eq' && (cond.value === undefined || cond.value === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'value is required when op is eq',
        path: ['value'],
      });
    }
  });
export type BlockVisibilityCondition = z.infer<typeof VisibilityConditionSchema>;

export function parseVisibilityCondition(
  input: unknown,
): BlockVisibilityCondition | null {
  if (input === undefined || input === null) return null;
  return VisibilityConditionSchema.parse(input);
}

/** Render-time values for `when` evaluation (ADR 014). */
export type VisibilityContext = {
  /** Item counts keyed by repeater/collection source name. */
  collection: Record<string, number>;
};

export function resolveVisibilityValue(
  path: string,
  ctx: VisibilityContext,
): number | undefined {
  const m = /^collection\.([a-zA-Z][a-zA-Z0-9_]*)$/.exec(path.trim());
  if (!m) return undefined;
  const key = m[1]!;
  return ctx.collection[key] ?? 0;
}

/** True = show block. Missing `when` or missing ctx → show. */
export function evaluateVisibilityCondition(
  when: BlockVisibilityCondition | null | undefined,
  ctx?: VisibilityContext | null,
): boolean {
  if (!when) return true;
  if (!ctx) return true;
  const count = resolveVisibilityValue(when.path, ctx) ?? 0;
  switch (when.op) {
    case 'exists':
      return count > 0;
    case 'empty':
      return count === 0;
    case 'eq':
      return String(count) === String(when.value ?? '');
    default:
      return true;
  }
}

export type BlockNode = {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  children?: BlockNode[];
  /** Optional visibility condition (ADR 014). Absent = always show. */
  when?: BlockVisibilityCondition | null;
};

export function isBlockVisible(
  block: BlockNode,
  ctx?: VisibilityContext | null,
): boolean {
  return evaluateVisibilityCondition(block.when, ctx);
}

export const BlockNodeSchema: z.ZodType<BlockNode> = z.lazy(() =>
  z
    .object({
      id: z.string().min(1),
      type: BlockTypeSchema,
      props: z.record(z.string(), z.unknown()).default({}),
      children: z.array(BlockNodeSchema).optional(),
      when: VisibilityConditionSchema.nullable().optional(),
    })
    .superRefine((node, ctx) => {
      const entry = BLOCK_REGISTRY.find((e) => e.type === node.type);
      if (!entry) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown block type: ${node.type}`,
        });
        return;
      }
      const childCount = node.children?.length ?? 0;
      if (!entry.allowsChildren && childCount > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Block type ${node.type} cannot have children`,
        });
      }
    }),
) as z.ZodType<BlockNode>;

/** @deprecated use BlockNode */
export type Block = BlockNode;
export const BlockSchema = BlockNodeSchema;

export const PageNumberPositionSchema = z.enum([
  'footer-start',
  'footer-center',
  'footer-end',
  'header-end',
]);
export type PageNumberPosition = z.infer<typeof PageNumberPositionSchema>;

export const PageNumberFormatSchema = z.enum(['number', 'pageOfTotal']);
export type PageNumberFormat = z.infer<typeof PageNumberFormatSchema>;

export const PageNumberSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  position: PageNumberPositionSchema.default('footer-center'),
  format: PageNumberFormatSchema.default('pageOfTotal'),
  prefix: z.string().default(''),
  suffix: z.string().default(''),
});

export type PageNumberSettings = z.infer<typeof PageNumberSettingsSchema>;

export const MasterBandSchema = z.object({
  enabled: z.boolean().default(true),
  blocks: z.array(BlockNodeSchema).default([]),
});

export type MasterBand = z.infer<typeof MasterBandSchema>;

export const MasterPageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  header: MasterBandSchema.default({}),
  footer: MasterBandSchema.default({}),
  pageNumber: PageNumberSettingsSchema.default({}),
});

export type MasterPage = z.infer<typeof MasterPageSchema>;

export const PageConfigSchema = z.object({
  size: z.enum(['A4', 'A3']).default('A4'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  marginsMm: z
    .object({
      top: z.number().nonnegative(),
      right: z.number().nonnegative(),
      bottom: z.number().nonnegative(),
      left: z.number().nonnegative(),
    })
    .default({ top: 20, right: 20, bottom: 20, left: 20 }),
});

export type PageConfig = z.infer<typeof PageConfigSchema>;

/** One printable page / flow segment. */
export const DocumentPageSchema = z.object({
  id: z.string().min(1),
  /** References `masters[].id`; null = no master chrome. */
  masterId: z.string().nullable().default(null),
  blocks: z.array(BlockNodeSchema).default([]),
});

export type DocumentPage = z.infer<typeof DocumentPageSchema>;

export const TemplateBodySchema = z.object({
  schemaVersion: z.literal(TEMPLATE_SCHEMA_VERSION),
  businessId: z.string().min(1),
  templateId: z.string().min(1),
  page: PageConfigSchema.default({}),
  masters: z.array(MasterPageSchema).default([]),
  pages: z.array(DocumentPageSchema).min(1),
});

export type TemplateBody = z.infer<typeof TemplateBodySchema>;

export const DocumentBodySchema = z.object({
  schemaVersion: z.literal(DOCUMENT_SCHEMA_VERSION),
  businessId: z.string().min(1),
  documentId: z.string().min(1),
  templateId: z.string().nullable().default(null),
  title: z.string().default(''),
  dataRefs: z.record(z.string(), z.unknown()).default({}),
  page: PageConfigSchema.default({}),
  masters: z.array(MasterPageSchema).default([]),
  pages: z.array(DocumentPageSchema).min(1),
});

export type DocumentBody = z.infer<typeof DocumentBodySchema>;

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultMasterPage(name = 'Default'): MasterPage {
  return MasterPageSchema.parse({
    id: newId('mst'),
    name,
    header: {
      enabled: true,
      blocks: [
        {
          id: newId('txt'),
          type: 'text',
          props: { content: '{{business.name}}' },
        },
      ],
    },
    footer: {
      enabled: true,
      blocks: [
        {
          id: newId('txt'),
          type: 'text',
          props: { content: '' },
        },
      ],
    },
    pageNumber: {
      enabled: true,
      position: 'footer-center',
      format: 'pageOfTotal',
      prefix: '',
      suffix: '',
    },
  });
}

export function formatPageNumberLabel(
  settings: PageNumberSettings,
  pageIndex1Based: number,
  totalPages: number,
): string {
  const core =
    settings.format === 'pageOfTotal'
      ? `${pageIndex1Based} / ${totalPages}`
      : String(pageIndex1Based);
  return `${settings.prefix}${core}${settings.suffix}`;
}

export function resolveMaster(
  masters: MasterPage[],
  masterId: string | null | undefined,
): MasterPage | null {
  if (!masterId) return null;
  return masters.find((m) => m.id === masterId) ?? null;
}

export function getPrimaryPage(body: {
  pages: DocumentPage[];
}): DocumentPage {
  return body.pages[0]!;
}

/** Upgrade v2 `{ blocks }` bodies to v3 masters + pages. */
export function upgradeDocumentLikeInput(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  const raw = input as Record<string, unknown>;
  const version = Number(raw.schemaVersion ?? 0);

  if (version >= 3 && Array.isArray(raw.pages) && raw.pages.length > 0) {
    return { ...raw, schemaVersion: DOCUMENT_SCHEMA_VERSION };
  }

  const legacyBlocks = Array.isArray(raw.blocks)
    ? (raw.blocks as BlockNode[])
    : [];
  const master = createDefaultMasterPage();
  const pageId = newId('pg');

  return {
    ...raw,
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    masters: Array.isArray(raw.masters) && (raw.masters as unknown[]).length > 0
      ? raw.masters
      : [master],
    pages:
      Array.isArray(raw.pages) && (raw.pages as unknown[]).length > 0
        ? raw.pages
        : [
            {
              id: pageId,
              masterId: master.id,
              blocks: legacyBlocks,
            },
          ],
  };
}

export function parseTemplateBody(input: unknown): TemplateBody {
  return TemplateBodySchema.parse(upgradeDocumentLikeInput(input));
}

export function parseDocumentBody(input: unknown): DocumentBody {
  return DocumentBodySchema.parse(upgradeDocumentLikeInput(input));
}

export function cloneBlocksWithNewIds(blocks: BlockNode[]): BlockNode[] {
  return blocks.map((block) => ({
    id: newId(block.type.slice(0, 3)),
    type: block.type,
    props: { ...block.props },
    children: block.children
      ? cloneBlocksWithNewIds(block.children)
      : undefined,
    ...(block.when ? { when: { ...block.when } } : {}),
  }));
}

function cloneMasterWithNewIds(master: MasterPage): MasterPage {
  return MasterPageSchema.parse({
    ...master,
    id: newId('mst'),
    header: {
      ...master.header,
      blocks: cloneBlocksWithNewIds(master.header.blocks),
    },
    footer: {
      ...master.footer,
      blocks: cloneBlocksWithNewIds(master.footer.blocks),
    },
  });
}

/** Starter flow with one default master + one page. */
export function createEmptyTemplateBody(
  businessId: string,
  templateId: string,
): TemplateBody {
  const master = createDefaultMasterPage();
  return TemplateBodySchema.parse({
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    businessId,
    templateId,
    page: {},
    masters: [master],
    pages: [
      {
        id: newId('pg'),
        masterId: master.id,
        blocks: [
          {
            id: newId('hdr'),
            type: 'headerSlot',
            props: { slot: 'header' },
          },
          {
            id: newId('sec'),
            type: 'section',
            props: { title: '' },
            children: [
              {
                id: newId('txt'),
                type: 'text',
                props: { content: '', binding: null },
              },
            ],
          },
          {
            id: newId('div'),
            type: 'divider',
            props: {},
          },
          {
            id: newId('ftr'),
            type: 'footerSlot',
            props: { slot: 'footer' },
          },
        ],
      },
    ],
  });
}

export function createEmptyDocumentBody(
  businessId: string,
  documentId: string,
  opts?: { title?: string; templateId?: string | null },
): DocumentBody {
  const master = createDefaultMasterPage();
  return DocumentBodySchema.parse({
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    businessId,
    documentId,
    templateId: opts?.templateId ?? null,
    title: opts?.title ?? '',
    dataRefs: {},
    page: {},
    masters: [master],
    pages: [
      {
        id: newId('pg'),
        masterId: master.id,
        blocks: [],
      },
    ],
  });
}

/** Copy template structure into a document instance. */
export function createDocumentBodyFromTemplate(input: {
  businessId: string;
  documentId: string;
  templateId: string;
  title: string;
  templateBody: TemplateBody;
}): DocumentBody {
  const template = parseTemplateBody(input.templateBody);
  const idMap = new Map<string, string>();
  const masters = template.masters.map((m) => {
    const cloned = cloneMasterWithNewIds(m);
    idMap.set(m.id, cloned.id);
    return cloned;
  });
  if (masters.length === 0) {
    masters.push(createDefaultMasterPage());
  }
  const pages = template.pages.map((p) => ({
    id: newId('pg'),
    masterId: p.masterId ? (idMap.get(p.masterId) ?? masters[0]!.id) : masters[0]!.id,
    blocks: cloneBlocksWithNewIds(p.blocks),
  }));

  return DocumentBodySchema.parse({
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    businessId: input.businessId,
    documentId: input.documentId,
    templateId: input.templateId,
    title: input.title,
    dataRefs: {},
    page: template.page,
    masters,
    pages: pages.length > 0 ? pages : [
      {
        id: newId('pg'),
        masterId: masters[0]!.id,
        blocks: [],
      },
    ],
  });
}

export function isKnownBlockType(type: string): type is BlockType {
  return (ALL_BLOCK_TYPES as readonly string[]).includes(type);
}

export function isCoreBlockType(type: string): type is CoreBlockType {
  return (CORE_BLOCK_TYPES as readonly string[]).includes(type);
}

/** Marker sources for map blocks (`module.map`). */
export const MAP_MARKERS_SOURCES = [
  'locations',
  'branches',
  'projects',
  'none',
] as const;
export type MapMarkersSource = (typeof MAP_MARKERS_SOURCES)[number];

export const MapBlockPropsSchema = z.object({
  centerLat: z.number().min(-90).max(90).default(35.6892),
  centerLng: z.number().min(-180).max(180).default(51.389),
  zoom: z.number().min(1).max(19).default(10),
  markersSource: z.enum(MAP_MARKERS_SOURCES).default('locations'),
  /** ISO-ish country filter (e.g. IR); empty/null = no filter. */
  countryRestriction: z.string().max(8).nullable().default(null),
  showMarkers: z.boolean().default(true),
  heightPx: z.number().min(120).max(800).default(280),
});
export type MapBlockProps = z.infer<typeof MapBlockPropsSchema>;

export function defaultMapBlockProps(): MapBlockProps {
  return MapBlockPropsSchema.parse({});
}

export function parseMapBlockProps(
  props: Record<string, unknown> | undefined | null,
): MapBlockProps {
  return MapBlockPropsSchema.parse(props ?? {});
}

/** Layouts for orgChart blocks (`module.org_chart`). */
export const ORG_CHART_LAYOUTS = [
  'tree-vertical',
  'tree-horizontal',
] as const;
export type OrgChartLayout = (typeof ORG_CHART_LAYOUTS)[number];

export const OrgChartBlockPropsSchema = z.object({
  layout: z.enum(ORG_CHART_LAYOUTS).default('tree-vertical'),
  /** Optional subtree root; null = all roots (members with no parent). */
  rootMemberId: z.string().min(1).nullable().default(null),
  showPhotos: z.boolean().default(false),
  heightPx: z.number().min(120).max(1200).default(360),
});
export type OrgChartBlockProps = z.infer<typeof OrgChartBlockPropsSchema>;

export function defaultOrgChartBlockProps(): OrgChartBlockProps {
  return OrgChartBlockPropsSchema.parse({});
}

export function parseOrgChartBlockProps(
  props: Record<string, unknown> | undefined | null,
): OrgChartBlockProps {
  return OrgChartBlockPropsSchema.parse(props ?? {});
}

/** Layouts for timeline blocks (`module.timeline`). */
export const TIMELINE_LAYOUTS = ['vertical', 'alternating'] as const;
export type TimelineLayout = (typeof TIMELINE_LAYOUTS)[number];

export const TimelineBlockPropsSchema = z.object({
  layout: z.enum(TIMELINE_LAYOUTS).default('vertical'),
  /** Max events to render (newest first). */
  limit: z.number().int().min(1).max(100).default(20),
  heightPx: z.number().min(120).max(1600).default(420),
});
export type TimelineBlockProps = z.infer<typeof TimelineBlockPropsSchema>;

export function defaultTimelineBlockProps(): TimelineBlockProps {
  return TimelineBlockPropsSchema.parse({});
}

export function parseTimelineBlockProps(
  props: Record<string, unknown> | undefined | null,
): TimelineBlockProps {
  return TimelineBlockPropsSchema.parse(props ?? {});
}

/** QR target kinds (core `qr` block). */
export const QR_TARGET_TYPES = [
  'url',
  'phone',
  'email',
  'map',
  'custom',
] as const;
export type QrTargetType = (typeof QR_TARGET_TYPES)[number];

export const QrBlockPropsSchema = z.object({
  targetType: z.enum(QR_TARGET_TYPES).default('url'),
  /** Raw user value — encoded via buildQrPayload. */
  value: z.string().max(2000).default(''),
  sizePx: z.number().int().min(64).max(512).default(128),
  caption: z.string().max(200).default(''),
});
export type QrBlockProps = z.infer<typeof QrBlockPropsSchema>;

export function defaultQrBlockProps(): QrBlockProps {
  return QrBlockPropsSchema.parse({});
}

export function parseQrBlockProps(
  props: Record<string, unknown> | undefined | null,
): QrBlockProps {
  return QrBlockPropsSchema.parse(props ?? {});
}

/**
 * Encode QR payload string from block props.
 * Returns empty string when value is blank (caller shows placeholder).
 */
export function buildQrPayload(
  props: QrBlockProps | Record<string, unknown> | null | undefined,
): string {
  const p = parseQrBlockProps(props);
  const raw = p.value.trim();
  if (!raw) return '';
  switch (p.targetType) {
    case 'url':
      return raw;
    case 'phone': {
      const digits = raw.replace(/[^\d+]/g, '');
      return digits ? `tel:${digits}` : '';
    }
    case 'email': {
      const email = raw.replace(/^mailto:/i, '').trim();
      return email ? `mailto:${email}` : '';
    }
    case 'map': {
      // Accept "lat,lng" or an already-formed geo/http URL.
      if (/^(geo:|https?:\/\/)/i.test(raw)) return raw;
      const m = raw.match(
        /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
      );
      if (m) return `geo:${m[1]},${m[2]}`;
      return raw;
    }
    case 'custom':
      return raw;
    default:
      return raw;
  }
}

/** Heading levels eligible for auto TOC (ADR 012). */
export const TOC_HEADING_LEVELS = [1, 2, 3] as const;
export type TocHeadingLevel = (typeof TOC_HEADING_LEVELS)[number];

export const TocBlockPropsSchema = z.object({
  /** Include headings up to this level (inclusive). */
  maxLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(3),
  showPageNumbers: z.boolean().default(true),
  /** Optional heading above the list. */
  title: z.string().max(120).default(''),
});
export type TocBlockProps = z.infer<typeof TocBlockPropsSchema>;

export function defaultTocBlockProps(): TocBlockProps {
  return TocBlockPropsSchema.parse({});
}

export function parseTocBlockProps(
  props: Record<string, unknown> | undefined | null,
): TocBlockProps {
  return TocBlockPropsSchema.parse(props ?? {});
}

export type TocEntry = {
  id: string;
  title: string;
  level: TocHeadingLevel;
  /** 1-based logical page index in `pages[]`. */
  pageNumber: number;
};

function parseHeadingLevel(raw: unknown, fallback: TocHeadingLevel | null): TocHeadingLevel | null {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  return fallback;
}

function collectTocFromBlocks(
  blocks: BlockNode[],
  pageNumber: number,
  maxLevel: TocHeadingLevel,
  out: TocEntry[],
  visibility?: VisibilityContext,
): void {
  for (const b of blocks) {
    if (!isBlockVisible(b, visibility)) continue;
    if (b.type === 'toc') continue;
    if (b.type === 'section') {
      const title = String(b.props.title ?? '').trim();
      const level = parseHeadingLevel(b.props.headingLevel, 1);
      if (title && level && level <= maxLevel) {
        out.push({ id: b.id, title, level, pageNumber });
      }
      if (b.children?.length) {
        collectTocFromBlocks(
          b.children,
          pageNumber,
          maxLevel,
          out,
          visibility,
        );
      }
      continue;
    }
    if (b.type === 'text') {
      const level = parseHeadingLevel(b.props.headingLevel, null);
      const title = String(b.props.content ?? '').trim();
      if (level && title && level <= maxLevel) {
        out.push({ id: b.id, title, level, pageNumber });
      }
      continue;
    }
    if (b.children?.length) {
      collectTocFromBlocks(b.children, pageNumber, maxLevel, out, visibility);
    }
  }
}

/**
 * Build TOC entries from document/template body pages (logical page numbers).
 * See ADR 012. Hidden blocks (ADR 014) are skipped when `visibility` is passed.
 */
export function buildTableOfContents(
  body: {
    pages?: { id?: string; blocks: BlockNode[] }[];
  },
  props?: TocBlockProps | Record<string, unknown> | null,
  visibility?: VisibilityContext,
): TocEntry[] {
  const opts = parseTocBlockProps(props);
  const out: TocEntry[] = [];
  const pages = body.pages ?? [];
  pages.forEach((page, index) => {
    collectTocFromBlocks(
      page.blocks ?? [],
      index + 1,
      opts.maxLevel,
      out,
      visibility,
    );
  });
  return out;
}

/** Collection sources for `repeater` blocks (ADR 013). */
export const REPEATER_SOURCES = [
  'projects',
  'teamMembers',
  'branches',
  'services',
  'clients',
  'certificates',
  'timelineEvents',
] as const;
export type RepeaterSource = (typeof REPEATER_SOURCES)[number];

/** Module code required for a source, or null if foundational. */
export const REPEATER_SOURCE_MODULE: Record<
  RepeaterSource,
  string | null
> = {
  projects: 'module.projects',
  teamMembers: null,
  branches: null,
  services: null,
  clients: null,
  certificates: null,
  timelineEvents: 'module.timeline',
};

export const RepeaterBlockPropsSchema = z.object({
  source: z.enum(REPEATER_SOURCES).default('projects'),
  limit: z.number().int().min(1).max(100).default(50),
  emptyMessage: z.string().max(200).default(''),
});
export type RepeaterBlockProps = z.infer<typeof RepeaterBlockPropsSchema>;

export function defaultRepeaterBlockProps(): RepeaterBlockProps {
  return RepeaterBlockPropsSchema.parse({});
}

export function parseRepeaterBlockProps(
  props: Record<string, unknown> | undefined | null,
): RepeaterBlockProps {
  return RepeaterBlockPropsSchema.parse(props ?? {});
}

const ITEM_PLACEHOLDER = /\{\{\s*item\.([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

/** Replace `{{item.key}}` placeholders; unknown keys → empty. */
export function bindItemPlaceholders(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(ITEM_PLACEHOLDER, (_m, key: string) => {
    return values[key] ?? '';
  });
}

function bindStringProp(
  props: Record<string, unknown>,
  key: string,
  values: Record<string, string>,
): void {
  if (typeof props[key] === 'string') {
    props[key] = bindItemPlaceholders(props[key] as string, values);
  }
}

/** Deep-clone blocks and apply item bindings to string props. */
export function bindBlockTree(
  blocks: BlockNode[],
  values: Record<string, string>,
): BlockNode[] {
  return blocks.map((b) => {
    const props: Record<string, unknown> = { ...b.props };
    bindStringProp(props, 'content', values);
    bindStringProp(props, 'title', values);
    bindStringProp(props, 'alt', values);
    bindStringProp(props, 'value', values);
    bindStringProp(props, 'caption', values);
    bindStringProp(props, 'emptyMessage', values);
    const children =
      b.type === 'repeater'
        ? [] // nested repeater unsupported — drop children
        : b.children
          ? bindBlockTree(b.children, values)
          : undefined;
    return {
      id: b.id,
      type: b.type,
      props,
      ...(children ? { children } : {}),
      ...(b.when ? { when: { ...b.when } } : {}),
    };
  });
}

function collectRepeaterSourcesFromBlocks(
  blocks: BlockNode[],
  out: Set<RepeaterSource>,
): void {
  for (const b of blocks) {
    if (b.type === 'repeater') {
      const props = parseRepeaterBlockProps(b.props);
      out.add(props.source);
    }
    if (b.children?.length) {
      collectRepeaterSourcesFromBlocks(b.children, out);
    }
  }
}

/** Unique repeater sources used in a document/template body. */
export function documentCollectRepeaterSources(body: {
  pages?: { blocks: BlockNode[] }[];
  masters?: {
    header?: { blocks?: BlockNode[] };
    footer?: { blocks?: BlockNode[] };
  }[];
}): RepeaterSource[] {
  const out = new Set<RepeaterSource>();
  for (const page of body.pages ?? []) {
    collectRepeaterSourcesFromBlocks(page.blocks ?? [], out);
  }
  for (const master of body.masters ?? []) {
    collectRepeaterSourcesFromBlocks(master.header?.blocks ?? [], out);
    collectRepeaterSourcesFromBlocks(master.footer?.blocks ?? [], out);
  }
  return [...out];
}

/** Paths usable in the condition builder UI (ADR 014). */
export const VISIBILITY_COLLECTION_PATHS: readonly string[] =
  REPEATER_SOURCES.map((s) => `collection.${s}`);

function collectVisibilitySourcesFromBlocks(
  blocks: BlockNode[],
  out: Set<RepeaterSource>,
): void {
  for (const b of blocks) {
    const path = b.when?.path?.trim();
    if (path) {
      const m = /^collection\.([a-zA-Z][a-zA-Z0-9_]*)$/.exec(path);
      const source = m?.[1];
      if (source && (REPEATER_SOURCES as readonly string[]).includes(source)) {
        out.add(source as RepeaterSource);
      }
    }
    if (b.children?.length) {
      collectVisibilitySourcesFromBlocks(b.children, out);
    }
  }
}

/** Unique collection sources referenced by any block `when` path. */
export function documentCollectVisibilitySources(body: {
  pages?: { blocks: BlockNode[] }[];
  masters?: {
    header?: { blocks?: BlockNode[] };
    footer?: { blocks?: BlockNode[] };
  }[];
}): RepeaterSource[] {
  const out = new Set<RepeaterSource>();
  for (const page of body.pages ?? []) {
    collectVisibilitySourcesFromBlocks(page.blocks ?? [], out);
  }
  for (const master of body.masters ?? []) {
    collectVisibilitySourcesFromBlocks(master.header?.blocks ?? [], out);
    collectVisibilitySourcesFromBlocks(master.footer?.blocks ?? [], out);
  }
  return [...out];
}

/** Unique sellable module codes required by blocks / repeater / visibility paths. */
export function documentCollectRequiredModuleCodes(body: {
  pages?: { blocks: BlockNode[] }[];
  masters?: {
    header?: { blocks?: BlockNode[] };
    footer?: { blocks?: BlockNode[] };
  }[];
}): string[] {
  const out = new Set<string>();
  const visit = (blocks: BlockNode[]) => {
    for (const b of blocks) {
      const entry = BLOCK_REGISTRY.find((e) => e.type === b.type);
      if (entry?.moduleCode) out.add(entry.moduleCode);
      if (b.type === 'repeater') {
        const props = parseRepeaterBlockProps(b.props);
        const mod = REPEATER_SOURCE_MODULE[props.source];
        if (mod) out.add(mod);
      }
      const whenPath = b.when?.path?.trim();
      if (whenPath) {
        const m = /^collection\.([a-zA-Z][a-zA-Z0-9_]*)$/.exec(whenPath);
        const source = m?.[1];
        if (
          source &&
          (REPEATER_SOURCES as readonly string[]).includes(source)
        ) {
          const mod = REPEATER_SOURCE_MODULE[source as RepeaterSource];
          if (mod) out.add(mod);
        }
      }
      if (b.children?.length) visit(b.children);
    }
  };
  for (const page of body.pages ?? []) visit(page.blocks ?? []);
  for (const master of body.masters ?? []) {
    visit(master.header?.blocks ?? []);
    visit(master.footer?.blocks ?? []);
  }
  return [...out].sort();
}

function walkBlocks(
  blocks: BlockNode[],
  visit: (b: BlockNode) => void,
): void {
  for (const b of blocks) {
    visit(b);
    if (b.children?.length) walkBlocks(b.children, visit);
  }
}

/** True if any page/master band contains the given block type. */
export function documentContainsBlockType(
  body: {
    pages?: { blocks: BlockNode[] }[];
    masters?: {
      header?: { blocks?: BlockNode[] };
      footer?: { blocks?: BlockNode[] };
    }[];
  },
  type: BlockType,
): boolean {
  let found = false;
  const check = (b: BlockNode) => {
    if (b.type === type) found = true;
  };
  for (const page of body.pages ?? []) {
    walkBlocks(page.blocks ?? [], check);
    if (found) return true;
  }
  for (const master of body.masters ?? []) {
    walkBlocks(master.header?.blocks ?? [], check);
    walkBlocks(master.footer?.blocks ?? [], check);
    if (found) return true;
  }
  return found;
}

/**
 * PDF / HTML render contract (locked for export pipeline):
 * 1. For each page in order, resolve master via page.masterId.
 * 2. If master.header.enabled → render header.blocks.
 * 3. Render page.blocks (headerSlot/footerSlot are placeholders — chrome comes from master).
 * 4. If master.footer.enabled → render footer.blocks.
 * 5. If master.pageNumber.enabled → inject formatted label at position.
 */
export const MASTER_RENDER_CONTRACT = {
  schemaVersion: DOCUMENT_SCHEMA_VERSION,
  steps: [
    'resolve-master',
    'header',
    'page-body',
    'footer',
    'page-number',
  ] as const,
} as const;
