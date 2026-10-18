// ---------------------------------------------------------------------------
// Store principal: páginas, blocos, histórico (undo/redo)
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { uid } from '@/lib/id';
import { fromPlainText, normalize, textOf } from '@/lib/richText';
import {
  blockSubtree,
  cloneBlockTree,
  deleteBlockTree,
  findBlockParent,
  makeBlock,
  removeBlockFromParent,
} from '@/lib/blocks';
import type { Block, BlockType, Page, PersistedData, RichText } from '@/types';

interface Snapshot {
  pages: Record<string, Page>;
  blocks: Record<string, Block>;
  rootPageIds: string[];
}

interface AppState {
  loaded: boolean;
  pages: Record<string, Page>;
  blocks: Record<string, Block>;
  rootPageIds: string[];
  currentPageId: string | null;

  // Inicialização
  hydrate: (data: PersistedData) => void;

  // Páginas
  setCurrentPage: (id: string) => void;
  createPage: (opts?: { parentId?: string | null; title?: string; icon?: string | null; open?: boolean }) => string;
  deletePage: (id: string) => void;
  updatePage: (id: string, patch: Partial<Page>, kind?: 'content' | 'structural') => void;
  movePage: (id: string, parentId: string | null, index: number) => void;
  duplicatePage: (id: string) => string | null;

  // Blocos
  createBlock: (
    pageId: string,
    parentBlockId: string | null,
    index: number,
    type: BlockType,
    content?: RichText
  ) => string;
  updateBlock: (id: string, patch: Partial<Block>, kind?: 'content' | 'structural') => void;
  setBlockContent: (id: string, content: RichText) => void;
  deleteBlock: (id: string) => void;
  moveBlock: (id: string, parentBlockId: string | null, index: number) => void;
  duplicateBlock: (id: string) => string | null;
  indentBlock: (id: string) => boolean;
  outdentBlock: (id: string) => boolean;
  toggleChecked: (id: string) => void;
  toggleCollapsed: (id: string) => void;
  /** Junta o bloco `nextId` no fim de `prevId` e apaga `nextId`. Retorna o caret na fronteira. */
  mergeBlocks: (prevId: string, nextId: string) => number | null;
}

// ---------------------------------------------------------------------------
// Histórico (não persistido)
// ---------------------------------------------------------------------------

const MAX_HISTORY = 100;
const CONTENT_COOLDOWN = 1000; // ms — digitação vira um único passo de undo

let undoStack: Snapshot[] = [];
let redoStack: Snapshot[] = [];
let lastContentPush = 0;

function capture(state: AppState): Snapshot {
  return JSON.parse(
    JSON.stringify({ pages: state.pages, blocks: state.blocks, rootPageIds: state.rootPageIds })
  ) as Snapshot;
}

function pushHistory(state: AppState, kind: 'content' | 'structural'): void {
  const now = Date.now();
  if (kind === 'content' && now - lastContentPush < CONTENT_COOLDOWN) return;
  lastContentPush = now;
  undoStack.push(capture(state));
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
}

export function performUndo(current: AppState): Snapshot | null {
  const snap = undoStack.pop();
  if (!snap) return null;
  redoStack.push(capture(current));
  return snap;
}

export function performRedo(current: AppState): Snapshot | null {
  const snap = redoStack.pop();
  if (!snap) return null;
  undoStack.push(capture(current));
  return snap;
}

export function restoreSnapshot(snap: Snapshot): void {
  const cur = useAppStore.getState();
  useAppStore.setState({
    pages: snap.pages,
    blocks: snap.blocks,
    rootPageIds: snap.rootPageIds,
  });
  if (cur.currentPageId && !snap.pages[cur.currentPageId]) {
    useAppStore.setState({ currentPageId: snap.rootPageIds[0] ?? null });
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

function touch(s: { pages: Record<string, Page> }, pageId: string): void {
  const page = s.pages[pageId];
  if (page) page.updatedAt = Date.now();
}

export const useAppStore = create<AppState>()(
  immer((set, get) => ({
    loaded: false,
    pages: {},
    blocks: {},
    rootPageIds: [],
    currentPageId: null,

    hydrate: (data) =>
      set((s) => {
        s.pages = data.pages;
        s.blocks = data.blocks;
        s.rootPageIds = data.rootPageIds;
        s.currentPageId = data.currentPageId && data.pages[data.currentPageId] ? data.currentPageId : data.rootPageIds[0] ?? null;
        s.loaded = true;
      }),

    setCurrentPage: (id) => set((s) => {
      if (s.pages[id]) s.currentPageId = id;
    }),

    createPage: (opts = {}) => {
      pushHistory(get(), 'structural');
      const id = uid();
      set((s) => {
        const now = Date.now();
        const page: Page = {
          id,
          title: opts.title ?? '',
          icon: opts.icon ?? null,
          parentId: opts.parentId ?? null,
          children: [],
          blockOrder: [],
          createdAt: now,
          updatedAt: now,
        };
        s.pages[id] = page;
        if (opts.parentId && s.pages[opts.parentId]) {
          s.pages[opts.parentId].children.push(id);
        } else {
          s.rootPageIds.push(id);
        }
        const block = makeBlock('paragraph', id);
        s.blocks[block.id] = block;
        page.blockOrder = [block.id];
        if (opts.open !== false) s.currentPageId = id;
      });
      return id;
    },

    deletePage: (id) => {
      pushHistory(get(), 'structural');
      set((s) => {
        const page = s.pages[id];
        if (!page) return;
        const toDelete = new Set<string>();
        const collect = (pid: string) => {
          toDelete.add(pid);
          const p = s.pages[pid];
          if (p) p.children.forEach(collect);
        };
        collect(id);
        for (const pid of toDelete) {
          const p = s.pages[pid];
          if (p) {
            p.blockOrder.forEach((bid) => deleteBlockTree(s.blocks, bid));
            delete s.pages[pid];
          }
        }
        s.rootPageIds = s.rootPageIds.filter((pid) => !toDelete.has(pid));
        for (const other of Object.values(s.pages)) {
          other.children = other.children.filter((pid) => !toDelete.has(pid));
        }
        if (s.currentPageId && toDelete.has(s.currentPageId)) {
          s.currentPageId = page.parentId && s.pages[page.parentId] ? page.parentId : s.rootPageIds[0] ?? null;
        }
      });
    },

    updatePage: (id, patch, kind = 'content') => {
      pushHistory(get(), kind);
      set((s) => {
        const page = s.pages[id];
        if (!page) return;
        Object.assign(page, patch);
        page.updatedAt = Date.now();
      });
    },

    movePage: (id, parentId, index) => {
      const state = get();
      if (parentId === id) return;
      if (parentId !== null && pageSubtreeIds(state.pages, id).has(parentId)) return;
      pushHistory(state, 'structural');
      set((s) => {
        const page = s.pages[id];
        if (!page) return;
        const oldParentId = page.parentId;
        let oldIndex = -1;
        if (oldParentId !== null) {
          const oldParent = s.pages[oldParentId];
          if (oldParent) {
            oldIndex = oldParent.children.indexOf(id);
            if (oldIndex >= 0) oldParent.children.splice(oldIndex, 1);
          }
        } else {
          oldIndex = s.rootPageIds.indexOf(id);
          if (oldIndex >= 0) s.rootPageIds.splice(oldIndex, 1);
        }
        page.parentId = parentId;
        let target = index;
        // Ajuste quando o movimento ocorre dentro do mesmo pai.
        if (parentId === oldParentId && oldIndex >= 0 && oldIndex < index) target = index - 1;
        if (parentId === null) {
          s.rootPageIds.splice(Math.min(target, s.rootPageIds.length), 0, id);
        } else {
          const newParent = s.pages[parentId];
          if (newParent) newParent.children.splice(Math.min(target, newParent.children.length), 0, id);
        }
      });
    },

    duplicatePage: (id) => {
      const state = get();
      const source = state.pages[id];
      if (!source) return null;
      pushHistory(state, 'structural');
      const newId = uid();
      const now = Date.now();
      const idMap = new Map<string, string>();
      set((s) => {
        // Clona todas as páginas da subárvore.
        const queue: Array<{ srcId: string; parentId: string | null }> = [{ srcId: id, parentId: source.parentId }];
        while (queue.length > 0) {
          const { srcId, parentId } = queue.shift()!;
          const src = s.pages[srcId];
          if (!src) continue;
          const copyId = srcId === id ? newId : uid();
          idMap.set(srcId, copyId);
          const copy: Page = {
            id: copyId,
            title: srcId === id ? `${src.title || 'Sem título'} (cópia)` : src.title,
            icon: src.icon,
            parentId,
            children: [],
            blockOrder: [],
            createdAt: now,
            updatedAt: now,
          };
          s.pages[copyId] = copy;
          src.children.forEach((cid) => queue.push({ srcId: cid, parentId: copyId }));
        }
        // Liga a árvore de páginas e clona blocos.
        for (const [srcId, copyId] of idMap) {
          const src = s.pages[srcId];
          const copy = s.pages[copyId];
          copy.children = src.children.map((cid) => idMap.get(cid) ?? cid);
          for (const bid of src.blockOrder) {
            const { rootId, cloned } = cloneBlockTree(s.blocks, bid, copyId);
            Object.assign(s.blocks, cloned);
            copy.blockOrder.push(rootId);
          }
        }
        // Insere a cópia após a original.
        if (source.parentId === null) {
          s.rootPageIds.splice(s.rootPageIds.indexOf(id) + 1, 0, newId);
        } else {
          const parent = s.pages[source.parentId];
          if (parent) {
            parent.children.splice(parent.children.indexOf(id) + 1, 0, newId);
          } else {
            s.rootPageIds.splice(0, 0, newId);
          }
        }
        s.currentPageId = newId;
      });
      return newId;
    },

    createBlock: (pageId, parentBlockId, index, type, content) => {
      pushHistory(get(), 'structural');
      const block = makeBlock(type, pageId, content);
      set((s) => {
        s.blocks[block.id] = block;
        if (parentBlockId === null) {
          const page = s.pages[pageId];
          if (page) page.blockOrder.splice(Math.min(index, page.blockOrder.length), 0, block.id);
        } else {
          const parent = s.blocks[parentBlockId];
          if (parent) {
            parent.children.splice(Math.min(index, parent.children.length), 0, block.id);
            if (parent.type === 'toggle' && parent.collapsed) parent.collapsed = false;
          }
        }
        touch(s, pageId);
      });
      return block.id;
    },

    updateBlock: (id, patch, kind = 'content') => {
      pushHistory(get(), kind);
      set((s) => {
        const b = s.blocks[id];
        if (!b) return;
        Object.assign(b, patch);
        touch(s, b.pageId);
      });
    },

    setBlockContent: (id, content) => {
      pushHistory(get(), 'content');
      set((s) => {
        const b = s.blocks[id];
        if (!b) return;
        b.content = normalize(content);
        touch(s, b.pageId);
      });
    },

    deleteBlock: (id) => {
      pushHistory(get(), 'structural');
      set((s) => {
        const b = s.blocks[id];
        if (!b) return;
        const pageId = b.pageId;
        removeBlockFromParent(s.blocks, s.pages, id);
        deleteBlockTree(s.blocks, id);
        const page = s.pages[pageId];
        if (page && page.blockOrder.length === 0) {
          const fresh = makeBlock('paragraph', pageId);
          s.blocks[fresh.id] = fresh;
          page.blockOrder = [fresh.id];
        }
        touch(s, pageId);
      });
    },

    moveBlock: (id, parentBlockId, index) => {
      const state = get();
      const b = state.blocks[id];
      if (!b) return;
      if (parentBlockId !== null && blockSubtree(state.blocks, id).has(parentBlockId)) return;
      pushHistory(state, 'structural');
      set((s) => {
        const block = s.blocks[id];
        if (!block) return;
        const oldParent = findBlockParent(s.blocks, s.pages, id);
        const oldParentId = oldParent?.parentId ?? null;
        const oldIndex = oldParent?.index ?? -1;
        removeBlockFromParent(s.blocks, s.pages, id);
        let target = index;
        // Ajuste quando o movimento ocorre dentro do mesmo pai.
        if (parentBlockId === oldParentId && oldIndex >= 0 && oldIndex < index) target = index - 1;
        if (parentBlockId === null) {
          const page = s.pages[block.pageId];
          if (page) page.blockOrder.splice(Math.min(target, page.blockOrder.length), 0, id);
        } else {
          const parent = s.blocks[parentBlockId];
          if (parent) {
            parent.children.splice(Math.min(target, parent.children.length), 0, id);
            if (parent.type === 'toggle' && parent.collapsed) parent.collapsed = false;
          }
        }
        touch(s, block.pageId);
      });
    },

    duplicateBlock: (id) => {
      const state = get();
      const b = state.blocks[id];
      if (!b) return null;
      const parent = findBlockParent(state.blocks, state.pages, id);
      if (!parent) return null;
      pushHistory(state, 'structural');
      let newId = '';
      set((s) => {
        const { rootId, cloned } = cloneBlockTree(s.blocks, id, b.pageId);
        newId = rootId;
        Object.assign(s.blocks, cloned);
        const clone = s.blocks[rootId];
        if (parent.parentId === null) {
          const page = s.pages[b.pageId];
          if (page) page.blockOrder.splice(parent.index + 1, 0, rootId);
        } else {
          const p = s.blocks[parent.parentId];
          if (p) p.children.splice(parent.index + 1, 0, rootId);
        }
        void clone;
        touch(s, b.pageId);
      });
      return newId;
    },

    indentBlock: (id) => {
      const state = get();
      const b = state.blocks[id];
      if (!b) return false;
      const parent = findBlockParent(state.blocks, state.pages, id);
      if (!parent || parent.index === 0) return false;
      const siblings = parent.parentId === null
        ? state.pages[b.pageId]?.blockOrder ?? []
        : state.blocks[parent.parentId]?.children ?? [];
      const prevId = siblings[parent.index - 1];
      const prev = state.blocks[prevId];
      if (!prev || !(prev.type === 'bulleted_list' || prev.type === 'numbered_list' || prev.type === 'to_do' || prev.type === 'toggle' || prev.type === 'quote' || prev.type === 'callout')) {
        return false;
      }
      get().moveBlock(id, prevId, prev.children.length);
      return true;
    },

    outdentBlock: (id) => {
      const state = get();
      const b = state.blocks[id];
      if (!b) return false;
      const parent = findBlockParent(state.blocks, state.pages, id);
      if (!parent || parent.parentId === null) return false;
      const gp = findBlockParent(state.blocks, state.pages, parent.parentId);
      if (!gp) return false;
      get().moveBlock(id, gp.parentId, gp.index + 1);
      return true;
    },

    toggleChecked: (id) => {
      pushHistory(get(), 'structural');
      set((s) => {
        const b = s.blocks[id];
        if (!b) return;
        b.checked = !b.checked;
        touch(s, b.pageId);
      });
    },

    toggleCollapsed: (id) => {
      pushHistory(get(), 'structural');
      set((s) => {
        const b = s.blocks[id];
        if (!b) return;
        b.collapsed = !b.collapsed;
        touch(s, b.pageId);
      });
    },

    mergeBlocks: (prevId, nextId) => {
      const state = get();
      const prev = state.blocks[prevId];
      const next = state.blocks[nextId];
      if (!prev || !next) return null;
      const boundary = textOf(prev.content).length;
      pushHistory(state, 'content');
      set((s) => {
        const p = s.blocks[prevId];
        const n = s.blocks[nextId];
        if (!p || !n) return;
        if (p.type === 'code') {
          p.content = fromPlainText(textOf(p.content) + textOf(n.content));
        } else {
          p.content = normalize([...p.content, ...n.content]);
        }
        p.children.push(...n.children);
        removeBlockFromParent(s.blocks, s.pages, nextId);
        deleteBlockTree(s.blocks, nextId);
        touch(s, p.pageId);
      });
      return boundary;
    },
  }))
);

/** IDs de todas as páginas da subárvore de uma página. */
function pageSubtreeIds(pages: Record<string, Page>, id: string): Set<string> {
  const out = new Set<string>();
  const walk = (pid: string) => {
    out.add(pid);
    const p = pages[pid];
    if (p) p.children.forEach(walk);
  };
  walk(id);
  return out;
}

/** Bloco atualmente "em foco" do histórico — usado para desfazer com segurança. */
export function currentPageExists(): boolean {
  const s = useAppStore.getState();
  return s.currentPageId !== null && !!s.pages[s.currentPageId];
}
