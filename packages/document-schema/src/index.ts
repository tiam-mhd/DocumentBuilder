import { z } from 'zod';

/**
 * Bump when Document / Template JSON shape changes incompatibly.
 * v2: Core flow blocks.
 * v3: Master pages (header/footer/page numbers) + pages[].masterId.
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
] as const;

export const CoreBlockTypeSchema = z.enum(CORE_BLOCK_TYPES);
export type CoreBlockType = z.infer<typeof CoreBlockTypeSchema>;

/** @deprecated alias — prefer CoreBlockType */
export type BlockType = CoreBlockType;
export const BlockTypeSchema = CoreBlockTypeSchema;

export type BlockRegistryEntry = {
  type: CoreBlockType;
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
] as const;

export type BlockNode = {
  id: string;
  type: CoreBlockType;
  props: Record<string, unknown>;
  children?: BlockNode[];
};

export const BlockNodeSchema: z.ZodType<BlockNode> = z.lazy(() =>
  z
    .object({
      id: z.string().min(1),
      type: CoreBlockTypeSchema,
      props: z.record(z.string(), z.unknown()).default({}),
      children: z.array(BlockNodeSchema).optional(),
    })
    .superRefine((node, ctx) => {
      const entry = CORE_BLOCK_REGISTRY.find((e) => e.type === node.type);
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

export function isKnownBlockType(type: string): type is CoreBlockType {
  return (CORE_BLOCK_TYPES as readonly string[]).includes(type);
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
