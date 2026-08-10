import { create } from 'zustand';
import {
  DOCUMENT_SCHEMA_VERSION,
  getPrimaryPage,
  parseDocumentBody,
  type BlockNode,
  type BlockType,
  type BlockVisibilityCondition,
  type DocumentBody,
  type MasterPage,
  type PageNumberFormat,
  type PageNumberPosition,
} from '@vdb/document-schema';

const HISTORY_LIMIT = 50;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'readonly';

type EditorStore = {
  businessId: string | null;
  documentId: string | null;
  title: string;
  /** PG document status — non-draft locks body edits (ADR 020/021). */
  status: 'draft' | 'review' | 'approved' | 'published';
  body: DocumentBody | null;
  selectedBlockId: string | null;
  dirty: boolean;
  saveStatus: SaveStatus;
  past: DocumentBody[];
  future: DocumentBody[];
  loadDocument: (input: {
    businessId: string;
    documentId: string;
    title: string;
    body: unknown;
    status?: 'draft' | 'review' | 'approved' | 'published';
  }) => void;
  setStatus: (status: 'draft' | 'review' | 'approved' | 'published') => void;
  selectBlock: (id: string | null) => void;
  setTitle: (title: string) => void;
  setDocumentLocale: (locale: 'fa' | 'en') => void;
  reorderTopLevel: (activeId: string, overId: string) => void;
  addBlock: (type: BlockType) => void;
  appendChildBlock: (parentId: string, type: BlockType) => void;
  removeBlock: (id: string) => void;
  updateBlockProps: (id: string, props: Record<string, unknown>) => void;
  updateBlockWhen: (
    id: string,
    when: BlockVisibilityCondition | null,
  ) => void;
  updateBlockBreakRules: (
    id: string,
    breakRules: import('@vdb/document-schema').BlockBreakRules | null,
  ) => void;
  updateBlockLink: (
    id: string,
    link: import('@vdb/document-schema').BlockLink | null,
  ) => void;
  updateTextContent: (id: string, content: string) => void;
  setPageMasterId: (masterId: string | null) => void;
  updateMaster: (
    masterId: string,
    patch: {
      name?: string;
      headerEnabled?: boolean;
      footerEnabled?: boolean;
      headerText?: string;
      footerText?: string;
      pageNumberEnabled?: boolean;
      pageNumberPosition?: PageNumberPosition;
      pageNumberFormat?: PageNumberFormat;
    },
  ) => void;
  undo: () => void;
  redo: () => void;
  markSaving: () => void;
  markSaved: () => void;
  markSaveError: () => void;
  markSaveIdle: () => void;
  markReadonly: () => void;
  clearDirty: () => void;
  reset: () => void;
};

function newBlockId(type: BlockType): string {
  return `${type.slice(0, 3)}_${Math.random().toString(36).slice(2, 10)}`;
}

function createBlock(type: BlockType): BlockNode {
  switch (type) {
    case 'text':
      return { id: newBlockId(type), type, props: { content: '' } };
    case 'image':
      return {
        id: newBlockId(type),
        type,
        props: { mediaAssetId: null, alt: '' },
      };
    case 'gallery':
      return {
        id: newBlockId(type),
        type,
        props: { galleryId: null },
      };
    case 'map':
      return {
        id: newBlockId(type),
        type,
        props: {
          centerLat: 35.6892,
          centerLng: 51.389,
          zoom: 10,
          markersSource: 'locations',
          countryRestriction: null,
          showMarkers: true,
          heightPx: 280,
        },
      };
    case 'orgChart':
      return {
        id: newBlockId(type),
        type,
        props: {
          layout: 'tree-vertical',
          rootMemberId: null,
          showPhotos: false,
          heightPx: 360,
        },
      };
    case 'timeline':
      return {
        id: newBlockId(type),
        type,
        props: {
          layout: 'vertical',
          limit: 20,
          heightPx: 420,
        },
      };
    case 'qr':
      return {
        id: newBlockId(type),
        type,
        props: {
          targetType: 'url',
          value: '',
          sizePx: 128,
          caption: '',
        },
      };
    case 'toc':
      return {
        id: newBlockId(type),
        type,
        props: {
          maxLevel: 3,
          showPageNumbers: true,
          title: '',
        },
      };
    case 'repeater':
      return {
        id: newBlockId(type),
        type,
        props: {
          source: 'projects',
          limit: 50,
          emptyMessage: '',
        },
        children: [
          {
            id: newBlockId('text'),
            type: 'text',
            props: { content: '{{item.title}}' },
          },
        ],
      };
    case 'section':
      return {
        id: newBlockId(type),
        type,
        props: { title: '' },
        children: [
          { id: newBlockId('text'), type: 'text', props: { content: '' } },
        ],
      };
    case 'divider':
      return { id: newBlockId(type), type, props: {} };
    case 'headerSlot':
      return { id: newBlockId(type), type, props: { slot: 'header' } };
    case 'footerSlot':
      return { id: newBlockId(type), type, props: { slot: 'footer' } };
    case 'plugin.notice':
      return {
        id: newBlockId(type),
        type,
        props: { title: '', body: '' },
      };
    default:
      if (type.startsWith('plugin.')) {
        return { id: newBlockId(type), type, props: {} };
      }
      return { id: newBlockId('text'), type: 'text', props: { content: '' } };
  }
}

function mapBlocks(
  blocks: BlockNode[],
  id: string,
  map: (b: BlockNode) => BlockNode,
): BlockNode[] {
  return blocks.map((b) => {
    if (b.id === id) return map(b);
    if (b.children?.length) {
      return { ...b, children: mapBlocks(b.children, id, map) };
    }
    return b;
  });
}

function filterBlocks(blocks: BlockNode[], id: string): BlockNode[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) =>
      b.children ? { ...b, children: filterBlocks(b.children, id) } : b,
    );
}

function cloneBody(body: DocumentBody): DocumentBody {
  return structuredClone(body);
}

function withPrimaryBlocks(
  body: DocumentBody,
  blocks: BlockNode[],
): DocumentBody {
  const pages = [...body.pages];
  const primary = { ...getPrimaryPage(body), blocks };
  pages[0] = primary;
  return { ...body, pages };
}

function firstTextContent(blocks: BlockNode[]): string {
  const text = blocks.find((b) => b.type === 'text');
  return String(text?.props.content ?? '');
}

function setFirstTextContent(blocks: BlockNode[], content: string): BlockNode[] {
  if (blocks.length === 0) {
    return [{ id: newBlockId('text'), type: 'text', props: { content } }];
  }
  let done = false;
  return blocks.map((b) => {
    if (!done && b.type === 'text') {
      done = true;
      return { ...b, props: { ...b.props, content } };
    }
    return b;
  });
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  businessId: null,
  documentId: null,
  title: '',
  status: 'draft',
  body: null,
  selectedBlockId: null,
  dirty: false,
  saveStatus: 'idle',
  past: [],
  future: [],

  loadDocument: ({ businessId, documentId, title, body, status }) => {
    const parsed = parseDocumentBody({
      ...(body as object),
      businessId,
      documentId,
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      title:
        typeof (body as { title?: string })?.title === 'string'
          ? (body as { title: string }).title
          : title,
    });
    set({
      businessId,
      documentId,
      title,
      status:
        status === 'review' ||
        status === 'approved' ||
        status === 'published'
          ? status
          : 'draft',
      body: parsed,
      selectedBlockId: null,
      dirty: false,
      saveStatus: 'idle',
      past: [],
      future: [],
    });
  },

  setStatus: (status) => set({ status }),

  selectBlock: (id) => set({ selectedBlockId: id }),

  setTitle: (title) => {
    const state = get();
    if (!state.body) return;
    commit(set, get, { ...state.body, title }, { title });
  },

  setDocumentLocale: (locale) => {
    const state = get();
    if (!state.body) return;
    if (state.body.locale === locale) return;
    commit(set, get, { ...state.body, locale });
  },

  reorderTopLevel: (activeId, overId) => {
    const state = get();
    if (!state.body || activeId === overId) return;
    const blocks = [...getPrimaryPage(state.body).blocks];
    const from = blocks.findIndex((b) => b.id === activeId);
    const to = blocks.findIndex((b) => b.id === overId);
    if (from < 0 || to < 0) return;
    const [item] = blocks.splice(from, 1);
    blocks.splice(to, 0, item);
    commit(set, get, withPrimaryBlocks(state.body, blocks));
  },

  addBlock: (type) => {
    const state = get();
    if (!state.body) return;
    const block = createBlock(type);
    const blocks = [...getPrimaryPage(state.body).blocks, block];
    commit(set, get, withPrimaryBlocks(state.body, blocks), {
      selectedBlockId: block.id,
    });
  },

  appendChildBlock: (parentId, type) => {
    const state = get();
    if (!state.body) return;
    const child = createBlock(type);
    const blocks = mapBlocks(getPrimaryPage(state.body).blocks, parentId, (b) => ({
      ...b,
      children: [...(b.children ?? []), child],
    }));
    commit(set, get, withPrimaryBlocks(state.body, blocks));
  },

  removeBlock: (id) => {
    const state = get();
    if (!state.body) return;
    const blocks = filterBlocks(getPrimaryPage(state.body).blocks, id);
    commit(set, get, withPrimaryBlocks(state.body, blocks), {
      selectedBlockId:
        state.selectedBlockId === id ? null : state.selectedBlockId,
    });
  },

  updateBlockProps: (id, props) => {
    const state = get();
    if (!state.body) return;
    const blocks = mapBlocks(getPrimaryPage(state.body).blocks, id, (b) => ({
      ...b,
      props: { ...b.props, ...props },
    }));
    commit(set, get, withPrimaryBlocks(state.body, blocks));
  },

  updateBlockWhen: (id, when) => {
    const state = get();
    if (!state.body) return;
    const blocks = mapBlocks(getPrimaryPage(state.body).blocks, id, (b) => {
      if (when === null) {
        const { when: _removed, ...rest } = b;
        void _removed;
        return { ...rest, when: null };
      }
      return { ...b, when };
    });
    commit(set, get, withPrimaryBlocks(state.body, blocks));
  },

  updateBlockBreakRules: (id, breakRules) => {
    const state = get();
    if (!state.body) return;
    const blocks = mapBlocks(getPrimaryPage(state.body).blocks, id, (b) => {
      if (breakRules === null) {
        const { breakRules: _removed, ...rest } = b;
        void _removed;
        return { ...rest, breakRules: null };
      }
      return { ...b, breakRules: { ...breakRules } };
    });
    commit(set, get, withPrimaryBlocks(state.body, blocks));
  },

  updateBlockLink: (id, link) => {
    const state = get();
    if (!state.body) return;
    const blocks = mapBlocks(getPrimaryPage(state.body).blocks, id, (b) => {
      if (link === null) {
        const { link: _removed, ...rest } = b;
        void _removed;
        return { ...rest, link: null };
      }
      return { ...b, link: { ...link } };
    });
    commit(set, get, withPrimaryBlocks(state.body, blocks));
  },

  updateTextContent: (id, content) => {
    get().updateBlockProps(id, { content });
  },

  setPageMasterId: (masterId) => {
    const state = get();
    if (!state.body) return;
    const pages = [...state.body.pages];
    pages[0] = { ...getPrimaryPage(state.body), masterId };
    commit(set, get, { ...state.body, pages });
  },

  updateMaster: (masterId, patch) => {
    const state = get();
    if (!state.body) return;
    const masters = state.body.masters.map((m) => {
      if (m.id !== masterId) return m;
      let next: MasterPage = { ...m };
      if (patch.name !== undefined) next = { ...next, name: patch.name };
      if (patch.headerEnabled !== undefined) {
        next = {
          ...next,
          header: { ...next.header, enabled: patch.headerEnabled },
        };
      }
      if (patch.footerEnabled !== undefined) {
        next = {
          ...next,
          footer: { ...next.footer, enabled: patch.footerEnabled },
        };
      }
      if (patch.headerText !== undefined) {
        next = {
          ...next,
          header: {
            ...next.header,
            blocks: setFirstTextContent(next.header.blocks, patch.headerText),
          },
        };
      }
      if (patch.footerText !== undefined) {
        next = {
          ...next,
          footer: {
            ...next.footer,
            blocks: setFirstTextContent(next.footer.blocks, patch.footerText),
          },
        };
      }
      if (
        patch.pageNumberEnabled !== undefined ||
        patch.pageNumberPosition !== undefined ||
        patch.pageNumberFormat !== undefined
      ) {
        next = {
          ...next,
          pageNumber: {
            ...next.pageNumber,
            enabled: patch.pageNumberEnabled ?? next.pageNumber.enabled,
            position: patch.pageNumberPosition ?? next.pageNumber.position,
            format: patch.pageNumberFormat ?? next.pageNumber.format,
          },
        };
      }
      return next;
    });
    commit(set, get, { ...state.body, masters });
  },

  undo: () => {
    const { past, body, future } = get();
    if (!body || past.length === 0) return;
    const previous = past[past.length - 1]!;
    set({
      body: previous,
      past: past.slice(0, -1),
      future: [cloneBody(body), ...future].slice(0, HISTORY_LIMIT),
      dirty: true,
      saveStatus: 'idle',
    });
  },

  redo: () => {
    const { past, body, future } = get();
    if (!body || future.length === 0) return;
    const next = future[0]!;
    set({
      body: next,
      past: [...past, cloneBody(body)].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      dirty: true,
      saveStatus: 'idle',
    });
  },

  markSaving: () => set({ saveStatus: 'saving' }),
  markSaved: () => set({ saveStatus: 'saved', dirty: false }),
  markSaveError: () => set({ saveStatus: 'error' }),
  markSaveIdle: () => set({ saveStatus: 'idle' }),
  markReadonly: () => set({ saveStatus: 'readonly', dirty: false }),
  clearDirty: () => set({ dirty: false }),
  reset: () =>
    set({
      businessId: null,
      documentId: null,
      title: '',
      status: 'draft',
      body: null,
      selectedBlockId: null,
      dirty: false,
      saveStatus: 'idle',
      past: [],
      future: [],
    }),
}));

function commit(
  set: (partial: Partial<EditorStore>) => void,
  get: () => EditorStore,
  nextBody: DocumentBody,
  extra?: Partial<EditorStore>,
) {
  const { body, past } = get();
  if (!body) return;
  set({
    body: nextBody,
    title: nextBody.title,
    past: [...past, cloneBody(body)].slice(-HISTORY_LIMIT),
    future: [],
    dirty: true,
    saveStatus: 'idle',
    ...extra,
  });
}

export function findBlock(
  blocks: BlockNode[],
  id: string,
): BlockNode | null {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.children) {
      const found = findBlock(b.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** True when `targetId` is nested under a `repeater` card template. */
export function isUnderRepeater(
  blocks: BlockNode[],
  targetId: string,
): boolean {
  const walk = (list: BlockNode[], under: boolean): boolean | null => {
    for (const b of list) {
      if (b.id === targetId) return under;
      if (b.children?.length) {
        const found = walk(b.children, under || b.type === 'repeater');
        if (found !== null) return found;
      }
    }
    return null;
  };
  return walk(blocks, false) === true;
}

export function masterHeaderText(master: MasterPage): string {
  return firstTextContent(master.header.blocks);
}

export function masterFooterText(master: MasterPage): string {
  return firstTextContent(master.footer.blocks);
}
