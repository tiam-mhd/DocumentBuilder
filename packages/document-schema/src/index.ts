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

/** Built-in types only (core + sellable modules). */
export const BuiltinBlockTypeSchema = z.enum(ALL_BLOCK_TYPES);
export type BuiltinBlockType = z.infer<typeof BuiltinBlockTypeSchema>;

/**
 * Effective block type string: built-in or first-party `plugin.*` (ADR 030).
 * Prefer `isKnownBlockType` / `getBlockRegistry` over assuming a closed enum.
 */
export type BlockType = string;

/** Plugin block types must be namespaced — never collide with core/module. */
export const PLUGIN_BLOCK_TYPE_RE = /^plugin\.[a-z][a-z0-9_]*$/;

export function isPluginBlockType(type: string): boolean {
  return PLUGIN_BLOCK_TYPE_RE.test(type);
}

export type BlockRegistryEntry = {
  type: string;
  labelKey: string;
  allowsChildren: boolean;
  moduleCode: string | null;
  /** Set when contributed by a first-party plugin. */
  pluginId?: string;
};

/** Mutable first-party plugin contributions (boot via `@vdb/plugins`). */
let pluginBlockEntries: BlockRegistryEntry[] = [];

export function registerPluginBlocks(
  pluginId: string,
  entries: readonly Omit<BlockRegistryEntry, 'pluginId'>[],
): void {
  const id = pluginId.trim();
  if (!id) {
    throw new Error('pluginId is required');
  }
  for (const e of entries) {
    if (!isPluginBlockType(e.type)) {
      throw new Error(
        `Plugin block type must match ${PLUGIN_BLOCK_TYPE_RE}: ${e.type}`,
      );
    }
    if ((ALL_BLOCK_TYPES as readonly string[]).includes(e.type)) {
      throw new Error(`Plugin block collides with built-in type: ${e.type}`);
    }
    const existing = pluginBlockEntries.find((x) => x.type === e.type);
    if (existing && existing.pluginId !== id) {
      throw new Error(`Duplicate plugin block type: ${e.type}`);
    }
    if (existing) continue;
    pluginBlockEntries.push({ ...e, pluginId: id });
  }
}

/** Test helper — clears plugin contributions. */
export function clearPluginBlockRegistry(): void {
  pluginBlockEntries = [];
}

/** Built-in + registered first-party plugin blocks. */
export function getBlockRegistry(): readonly BlockRegistryEntry[] {
  return [...BLOCK_REGISTRY, ...pluginBlockEntries];
}

export function getPluginBlockRegistry(): readonly BlockRegistryEntry[] {
  return pluginBlockEntries;
}

export const BlockTypeSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((t) => isKnownBlockType(t), {
    message: 'Unknown block type',
  });

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

export type BlockBreakRules = {
  /** Prefer not splitting this block across pages (atomic unit). */
  keepTogether?: boolean;
  /** Prefer staying with the following sibling (orphan titles). */
  keepWithNext?: boolean;
  /** Force a page break before this block. */
  breakBefore?: boolean;
  /** Force a page break after this block. */
  breakAfter?: boolean;
};

export const BlockBreakRulesSchema = z.object({
  keepTogether: z.boolean().optional(),
  keepWithNext: z.boolean().optional(),
  breakBefore: z.boolean().optional(),
  breakAfter: z.boolean().optional(),
});

/** Clickable link on a block (ADR 018 — Interactive PDF). */
export const BLOCK_LINK_KINDS = [
  'external',
  'email',
  'phone',
  'internal',
] as const;
export type BlockLinkKind = (typeof BLOCK_LINK_KINDS)[number];

export type BlockLink = {
  kind: BlockLinkKind;
  /**
   * external: URL · email: address · phone: number ·
   * internal: target block id (renders as `#h-{id}`).
   */
  target: string;
};

export const BlockLinkSchema = z.object({
  kind: z.enum(BLOCK_LINK_KINDS),
  target: z.string().min(1).max(2000),
});

/**
 * Resolve a safe href for PDF/HTML. Invalid → null (render without link).
 * Never uses eval; schemes are whitelist-only.
 */
export function resolveBlockLinkHref(link: BlockLink | null | undefined): string | null {
  if (!link || typeof link.target !== 'string') return null;
  const target = link.target.trim();
  if (!target || target.length > 2000) return null;

  switch (link.kind) {
    case 'internal': {
      // Block ids are cuid-like / schema ids — allow alnum _ -
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(target)) return null;
      return `#h-${target}`;
    }
    case 'email': {
      const addr = target.replace(/^mailto:/i, '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return null;
      return `mailto:${addr}`;
    }
    case 'phone': {
      const num = target.replace(/^tel:/i, '').replace(/[^\d+]/g, '');
      if (num.length < 5 || num.length > 20) return null;
      return `tel:${num}`;
    }
    case 'external': {
      let url = target;
      if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
        url = `https://${url}`;
      }
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return null;
        }
        return parsed.toString();
      } catch {
        return null;
      }
    }
    default:
      return null;
  }
}

/** Stable HTML/PDF fragment id for headings & internal links (ADR 012/018). */
export function blockAnchorId(blockId: string): string {
  return `h-${blockId}`;
}

export type BlockNode = {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  children?: BlockNode[];
  /** Optional visibility condition (ADR 014). Absent = always show. */
  when?: BlockVisibilityCondition | null;
  /** Optional page-break / keep rules (ADR 017). */
  breakRules?: BlockBreakRules | null;
  /** Optional clickable link (ADR 018). */
  link?: BlockLink | null;
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
      breakRules: BlockBreakRulesSchema.nullable().optional(),
      link: BlockLinkSchema.nullable().optional(),
    })
    .superRefine((node, ctx) => {
      const entry = getBlockRegistry().find((e) => e.type === node.type);
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
  /** When true (default), export/preview run estimate-based smart pagination (ADR 017). */
  autoPaginate: z.boolean().default(true),
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
  /** Content locale for preview/PDF (ADR 015). Default fa. */
  locale: z.enum(['fa', 'en']).default('fa'),
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
    ...(block.breakRules ? { breakRules: { ...block.breakRules } } : {}),
    ...(block.link ? { link: { ...block.link } } : {}),
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

/** Snapshot marketplace listing body into a Business-owned TemplateBody. */
export function createTemplateBodyFromMarketplace(input: {
  businessId: string;
  templateId: string;
  marketplaceBody: unknown;
}): TemplateBody {
  const source = parseTemplateBody(input.marketplaceBody);
  const idMap = new Map<string, string>();
  const masters = source.masters.map((m) => {
    const cloned = cloneMasterWithNewIds(m);
    idMap.set(m.id, cloned.id);
    return cloned;
  });
  if (masters.length === 0) {
    masters.push(createDefaultMasterPage());
  }
  const pages = source.pages.map((p) => ({
    id: newId('pg'),
    masterId: p.masterId
      ? (idMap.get(p.masterId) ?? masters[0]!.id)
      : masters[0]!.id,
    blocks: cloneBlocksWithNewIds(p.blocks),
  }));

  return TemplateBodySchema.parse({
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    businessId: input.businessId,
    templateId: input.templateId,
    page: source.page,
    masters,
    pages:
      pages.length > 0
        ? pages
        : [
            {
              id: newId('pg'),
              masterId: masters[0]!.id,
              blocks: [],
            },
          ],
  });
}

export function isKnownBlockType(type: string): boolean {
  return getBlockRegistry().some((e) => e.type === type);
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

const ANY_PLACEHOLDER = /\{\{\s*([^}]+?)\s*\}\}/g;
export const BINDING_EXPR_MAX_LEN = 120;

/** Context for safe placeholder resolution (ADR 016). */
export type BindingCollectionSnapshot = {
  total: number;
  items: Array<{ values: Record<string, string> }>;
};

export type BindingContext = {
  business: { name: string };
  collections: Partial<Record<RepeaterSource, BindingCollectionSnapshot>>;
  /** Set inside repeater card expansion. */
  item?: Record<string, string>;
};

export type BindingExpression =
  | { kind: 'business'; field: 'name' }
  | { kind: 'item'; field: string }
  | {
      kind: 'count';
      source: RepeaterSource;
      where?: { field: string; value: string };
    };

export type BindingCatalogEntry = {
  id: string;
  /** Exact placeholder text to insert, including braces. */
  expression: string;
  /** i18n key suffix under editor.bindings.* */
  labelKey: string;
  /** Optional module gate for UI hint (still enforced on collection fetch). */
  moduleCode: string | null;
  /** Only meaningful inside repeater children. */
  repeaterOnly: boolean;
};

/** Editor insert catalog — keep in sync with parseBindingExpression. */
export const BINDING_CATALOG: readonly BindingCatalogEntry[] = [
  {
    id: 'business.name',
    expression: '{{business.name}}',
    labelKey: 'businessName',
    moduleCode: null,
    repeaterOnly: false,
  },
  {
    id: 'item.title',
    expression: '{{item.title}}',
    labelKey: 'itemTitle',
    moduleCode: null,
    repeaterOnly: true,
  },
  {
    id: 'item.name',
    expression: '{{item.name}}',
    labelKey: 'itemName',
    moduleCode: null,
    repeaterOnly: true,
  },
  {
    id: 'item.description',
    expression: '{{item.description}}',
    labelKey: 'itemDescription',
    moduleCode: null,
    repeaterOnly: true,
  },
  {
    id: 'count.projects',
    expression: '{{count(projects)}}',
    labelKey: 'countProjects',
    moduleCode: 'module.projects',
    repeaterOnly: false,
  },
  {
    id: 'count.projects.published',
    expression: '{{count(projects where status=published)}}',
    labelKey: 'countProjectsPublished',
    moduleCode: 'module.projects',
    repeaterOnly: false,
  },
  {
    id: 'count.teamMembers',
    expression: '{{count(teamMembers)}}',
    labelKey: 'countTeamMembers',
    moduleCode: null,
    repeaterOnly: false,
  },
  {
    id: 'count.branches',
    expression: '{{count(branches)}}',
    labelKey: 'countBranches',
    moduleCode: null,
    repeaterOnly: false,
  },
  {
    id: 'count.services',
    expression: '{{count(services)}}',
    labelKey: 'countServices',
    moduleCode: null,
    repeaterOnly: false,
  },
  {
    id: 'count.clients',
    expression: '{{count(clients)}}',
    labelKey: 'countClients',
    moduleCode: null,
    repeaterOnly: false,
  },
  {
    id: 'count.certificates',
    expression: '{{count(certificates)}}',
    labelKey: 'countCertificates',
    moduleCode: null,
    repeaterOnly: false,
  },
  {
    id: 'count.timelineEvents',
    expression: '{{count(timelineEvents)}}',
    labelKey: 'countTimelineEvents',
    moduleCode: 'module.timeline',
    repeaterOnly: false,
  },
] as const;

const BUSINESS_RE = /^business\.name$/;
const ITEM_RE = /^item\.([a-zA-Z][a-zA-Z0-9_]*)$/;
const COUNT_RE =
  /^count\(\s*([a-zA-Z][a-zA-Z0-9_]*)\s*(?:where\s+([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*(?:'([a-zA-Z0-9_.-]{1,64})'|([a-zA-Z0-9_.-]{1,64})))?\s*\)$/;

/** Parse a single expression body (no braces). Invalid → null. */
export function parseBindingExpression(raw: string): BindingExpression | null {
  const expr = raw.trim().replace(/\s+/g, ' ');
  if (!expr || expr.length > BINDING_EXPR_MAX_LEN) return null;

  if (BUSINESS_RE.test(expr)) {
    return { kind: 'business', field: 'name' };
  }

  const item = ITEM_RE.exec(expr);
  if (item?.[1]) {
    return { kind: 'item', field: item[1] };
  }

  const count = COUNT_RE.exec(expr);
  if (count?.[1]) {
    const source = count[1];
    if (!(REPEATER_SOURCES as readonly string[]).includes(source)) {
      return null;
    }
    const field = count[2];
    const value = count[3] ?? count[4];
    if (field && value) {
      return {
        kind: 'count',
        source: source as RepeaterSource,
        where: { field, value },
      };
    }
    if (field || value) return null;
    return { kind: 'count', source: source as RepeaterSource };
  }

  return null;
}

export function resolveBindingExpression(
  expr: BindingExpression,
  ctx: BindingContext,
): string {
  switch (expr.kind) {
    case 'business':
      return ctx.business.name ?? '';
    case 'item':
      return ctx.item?.[expr.field] ?? '';
    case 'count': {
      const snap = ctx.collections[expr.source];
      if (!snap) return '0';
      if (!expr.where) return String(snap.total);
      const n = snap.items.filter(
        (it) => (it.values[expr.where!.field] ?? '') === expr.where!.value,
      ).length;
      return String(n);
    }
    default: {
      const _exhaustive: never = expr;
      void _exhaustive;
      return '';
    }
  }
}

/**
 * Replace all `{{ … }}` placeholders. Unknown/invalid → empty.
 * Never uses eval.
 */
export function applyBindings(template: string, ctx: BindingContext): string {
  return template.replace(ANY_PLACEHOLDER, (_m, raw: string) => {
    const parsed = parseBindingExpression(String(raw ?? ''));
    if (!parsed) return '';
    return resolveBindingExpression(parsed, ctx);
  });
}

/** Replace `{{item.key}}` placeholders; unknown keys → empty. */
export function bindItemPlaceholders(
  template: string,
  values: Record<string, string>,
): string {
  return applyBindings(template, {
    business: { name: '' },
    collections: {},
    item: values,
  });
}

function isBindingContext(
  value: Record<string, string> | BindingContext,
): value is BindingContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    'business' in value &&
    'collections' in value
  );
}

function toBindingContext(
  valuesOrCtx: Record<string, string> | BindingContext,
): BindingContext {
  if (isBindingContext(valuesOrCtx)) return valuesOrCtx;
  return { business: { name: '' }, collections: {}, item: valuesOrCtx };
}

function bindStringProp(
  props: Record<string, unknown>,
  key: string,
  ctx: BindingContext,
): void {
  if (typeof props[key] === 'string') {
    props[key] = applyBindings(props[key] as string, ctx);
  }
}

function bindProps(
  props: Record<string, unknown>,
  ctx: BindingContext,
): Record<string, unknown> {
  const next = { ...props };
  bindStringProp(next, 'content', ctx);
  bindStringProp(next, 'title', ctx);
  bindStringProp(next, 'alt', ctx);
  bindStringProp(next, 'value', ctx);
  bindStringProp(next, 'caption', ctx);
  bindStringProp(next, 'emptyMessage', ctx);
  return next;
}

/**
 * Deep-clone blocks and apply bindings to string props.
 * Accepts legacy item-value map or full BindingContext.
 * When `bindRepeaterChildren` is false (document-level pass), repeater card
 * templates are left unbound. When true (card expansion), nested repeaters
 * drop children (unsupported).
 */
export function bindBlockTree(
  blocks: BlockNode[],
  valuesOrCtx: Record<string, string> | BindingContext,
  opts?: { bindRepeaterChildren?: boolean },
): BlockNode[] {
  const ctx = toBindingContext(valuesOrCtx);
  const bindRepeaterChildren = opts?.bindRepeaterChildren ?? true;
  return blocks.map((b) => {
    const props = bindProps(b.props, ctx);
    let children: BlockNode[] | undefined;
    if (b.type === 'repeater') {
      children = bindRepeaterChildren
        ? []
        : b.children?.map(cloneBlockShallow);
    } else if (b.children) {
      children = bindBlockTree(b.children, ctx, opts);
    }
    return {
      id: b.id,
      type: b.type,
      props,
      ...(children ? { children } : {}),
      ...(b.when ? { when: { ...b.when } } : {}),
      ...(b.breakRules ? { breakRules: { ...b.breakRules } } : {}),
      ...(b.link ? { link: { ...b.link } } : {}),
    };
  });
}

function cloneBlockShallow(b: BlockNode): BlockNode {
  return {
    id: b.id,
    type: b.type,
    props: { ...b.props },
    ...(b.children ? { children: b.children.map(cloneBlockShallow) } : {}),
    ...(b.when ? { when: { ...b.when } } : {}),
    ...(b.breakRules ? { breakRules: { ...b.breakRules } } : {}),
    ...(b.link ? { link: { ...b.link } } : {}),
  };
}

/**
 * Resolve document-level bindings; leave repeater card templates intact.
 */
export function bindDocumentBlocks(
  blocks: BlockNode[],
  ctx: BindingContext,
): BlockNode[] {
  return bindBlockTree(blocks, ctx, { bindRepeaterChildren: false });
}

function collectBindingSourcesFromString(
  text: string,
  out: Set<RepeaterSource>,
): void {
  let m: RegExpExecArray | null;
  const re = /\{\{\s*([^}]+?)\s*\}\}/g;
  while ((m = re.exec(text))) {
    const parsed = parseBindingExpression(m[1] ?? '');
    if (parsed?.kind === 'count') out.add(parsed.source);
  }
}

function collectBindingSourcesFromBlocks(
  blocks: BlockNode[],
  out: Set<RepeaterSource>,
): void {
  for (const b of blocks) {
    for (const key of [
      'content',
      'title',
      'alt',
      'value',
      'caption',
      'emptyMessage',
    ] as const) {
      const v = b.props[key];
      if (typeof v === 'string') collectBindingSourcesFromString(v, out);
    }
    if (b.type === 'repeater') {
      const props = parseRepeaterBlockProps(b.props);
      out.add(props.source);
    }
    if (b.children?.length) collectBindingSourcesFromBlocks(b.children, out);
  }
}

/** Collection sources needed for count() and/or repeaters in a body. */
export function documentCollectBindingSources(body: {
  pages?: { blocks: BlockNode[] }[];
  masters?: {
    header?: { blocks?: BlockNode[] };
    footer?: { blocks?: BlockNode[] };
  }[];
}): RepeaterSource[] {
  const out = new Set<RepeaterSource>();
  for (const page of body.pages ?? []) {
    collectBindingSourcesFromBlocks(page.blocks ?? [], out);
  }
  for (const master of body.masters ?? []) {
    collectBindingSourcesFromBlocks(master.header?.blocks ?? [], out);
    collectBindingSourcesFromBlocks(master.footer?.blocks ?? [], out);
  }
  return [...out];
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
      const entry = getBlockRegistry().find((e) => e.type === b.type);
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

export function walkDocumentBlocks(
  blocks: BlockNode[],
  visit: (b: BlockNode) => void,
): void {
  walkBlocks(blocks, visit);
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

// ─── Smart pagination (ADR 017) ─────────────────────────────────────────────

export type ResolvedBreakRules = {
  keepTogether: boolean;
  keepWithNext: boolean;
  breakBefore: boolean;
  breakAfter: boolean;
};

/** Type defaults merged under author `breakRules`. */
export function defaultBreakRulesForBlock(
  block: BlockNode,
): ResolvedBreakRules {
  const heading = Number(block.props.headingLevel);
  const isHeading =
    block.type === 'section' ||
    (block.type === 'text' &&
      (heading === 1 || heading === 2 || heading === 3));
  const mediaLike =
    block.type === 'image' ||
    block.type === 'gallery' ||
    block.type === 'map' ||
    block.type === 'orgChart' ||
    block.type === 'timeline' ||
    block.type === 'qr';
  return {
    keepTogether: mediaLike || block.type === 'toc',
    keepWithNext: isHeading,
    breakBefore: false,
    breakAfter: false,
  };
}

export function effectiveBreakRules(block: BlockNode): ResolvedBreakRules {
  const base = defaultBreakRulesForBlock(block);
  const o = block.breakRules ?? {};
  return {
    keepTogether: o.keepTogether ?? base.keepTogether,
    keepWithNext: o.keepWithNext ?? base.keepWithNext,
    breakBefore: o.breakBefore ?? base.breakBefore,
    breakAfter: o.breakAfter ?? base.breakAfter,
  };
}

/** Abstract content capacity for one page body (estimate units). */
export function pageContentCapacity(page: PageConfig): number {
  const pageHMm =
    page.size === 'A3'
      ? page.orientation === 'landscape'
        ? 297
        : 420
      : page.orientation === 'landscape'
        ? 210
        : 297;
  const usable =
    pageHMm - page.marginsMm.top - page.marginsMm.bottom - 28 /* chrome */;
  // ~1 unit ≈ 2.5mm of flow
  return Math.max(40, Math.round(usable / 2.5));
}

export function estimateBlockHeight(block: BlockNode): number {
  switch (block.type) {
    case 'divider':
      return 2;
    case 'headerSlot':
    case 'footerSlot':
      return 0;
    case 'text': {
      const content = String(block.props.content ?? '');
      const lines = Math.max(1, Math.ceil(content.length / 72));
      const heading = Number(block.props.headingLevel);
      if (heading === 1 || heading === 2 || heading === 3) {
        return 5 + Math.min(lines, 3);
      }
      return 3 + lines * 2;
    }
    case 'section': {
      const title = String(block.props.title ?? '').trim() ? 5 : 0;
      const kids = (block.children ?? []).reduce(
        (s, c) => s + estimateBlockHeight(c),
        0,
      );
      return title + kids + 2;
    }
    case 'image':
    case 'gallery':
      return 22;
    case 'map':
    case 'orgChart':
    case 'timeline':
      return Math.min(
        48,
        Math.max(18, Number(block.props.heightPx ?? 320) / 12),
      );
    case 'qr':
      return 14;
    case 'toc':
      return 16;
    case 'repeater': {
      const card = (block.children ?? []).reduce(
        (s, c) => s + estimateBlockHeight(c),
        0,
      );
      return Math.max(8, card + 2);
    }
    default:
      return 8;
  }
}

export type PaginationRepeaterItems = Record<
  string,
  Array<{ id: string; values: Record<string, string> }>
>;

export type PaginateOptions = {
  visibility?: VisibilityContext | null;
  /** Pre-resolved repeater items keyed by block id (export / preview). */
  repeaterItemsByBlockId?: PaginationRepeaterItems;
  binding?: BindingContext;
};

type FlowUnit = {
  blocks: BlockNode[];
  height: number;
  breakBefore: boolean;
  breakAfter: boolean;
  keepWithNext: boolean;
};

function expandTopLevelToUnits(
  blocks: BlockNode[],
  opts: PaginateOptions,
): FlowUnit[] {
  const units: FlowUnit[] = [];
  const visibility = opts.visibility ?? null;
  for (const block of blocks) {
    if (!isBlockVisible(block, visibility)) continue;
    const rules = effectiveBreakRules(block);

    if (block.type === 'repeater') {
      const props = parseRepeaterBlockProps(block.props);
      const items = opts.repeaterItemsByBlockId?.[block.id] ?? [];
      if (items.length === 0) {
        const empty: BlockNode = {
          id: `${block.id}__empty`,
          type: 'text',
          props: {
            content: props.emptyMessage.trim() || '—',
          },
          breakRules: { keepTogether: true },
        };
        units.push({
          blocks: [empty],
          height: estimateBlockHeight(empty),
          breakBefore: rules.breakBefore,
          breakAfter: rules.breakAfter,
          keepWithNext: false,
        });
        continue;
      }
      items.forEach((item, index) => {
        const cardChildren = bindBlockTree(block.children ?? [], {
          ...(opts.binding ?? { business: { name: '' }, collections: {} }),
          item: item.values,
        });
        const card: BlockNode = {
          id: `${block.id}__card_${item.id}`,
          type: 'section',
          props: { title: '', headingLevel: 3 },
          children: cardChildren,
          breakRules: { keepTogether: true },
        };
        const height = Math.max(
          6,
          cardChildren.reduce((s, c) => s + estimateBlockHeight(c), 0) + 2,
        );
        units.push({
          blocks: [card],
          height,
          breakBefore: rules.breakBefore && index === 0,
          breakAfter: rules.breakAfter && index === items.length - 1,
          keepWithNext: false,
        });
      });
      continue;
    }

    units.push({
      blocks: [block],
      height: Math.max(1, estimateBlockHeight(block)),
      breakBefore: rules.breakBefore,
      breakAfter: rules.breakAfter,
      keepWithNext: rules.keepWithNext,
    });
  }
  return units;
}

function packUnits(units: FlowUnit[], capacity: number): BlockNode[][] {
  const pages: BlockNode[][] = [];
  let current: BlockNode[] = [];
  let used = 0;

  const flush = () => {
    if (current.length === 0) return;
    pages.push(current);
    current = [];
    used = 0;
  };

  for (let i = 0; i < units.length; i++) {
    const unit = units[i]!;
    const next = units[i + 1];
    let groupHeight = unit.height;
    let groupBlocks = [...unit.blocks];
    let groupBreakAfter = unit.breakAfter;

    if (unit.keepWithNext && next && !next.breakBefore) {
      groupHeight += next.height;
      groupBlocks = [...groupBlocks, ...next.blocks];
      groupBreakAfter = next.breakAfter;
      i += 1;
    }

    if (unit.breakBefore && current.length > 0) {
      flush();
    }

    const fits = used === 0 || used + groupHeight <= capacity;
    if (!fits) {
      flush();
    }

    if (groupHeight > capacity && current.length > 0) {
      flush();
    }

    current.push(...groupBlocks);
    used += groupHeight;

    if (groupBreakAfter) {
      flush();
    }
  }

  flush();
  if (pages.length === 0) pages.push([]);
  return pages;
}

/**
 * Estimate-based smart pagination (ADR 017).
 * Expands repeaters into card units, packs into logical pages.
 */
export function paginateDocumentBody(
  body: DocumentBody,
  opts: PaginateOptions = {},
): DocumentBody {
  if (body.page.autoPaginate === false) {
    return body;
  }

  const capacity = pageContentCapacity(body.page);
  const defaultMasterId =
    body.pages[0]?.masterId ?? body.masters[0]?.id ?? null;

  const allTop: BlockNode[] = [];
  for (const page of body.pages) {
    allTop.push(...page.blocks);
  }

  const units = expandTopLevelToUnits(allTop, opts);
  const packed = packUnits(units, capacity);

  const pages: DocumentPage[] = packed.map((blocks, index) => ({
    id: body.pages[index]?.id ?? newId('pg'),
    masterId: body.pages[index]?.masterId ?? defaultMasterId,
    blocks,
  }));

  return {
    ...body,
    pages: pages.length > 0 ? pages : body.pages,
  };
}
