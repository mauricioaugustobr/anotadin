// ---------------------------------------------------------------------------
// Área de blocos: provider do contexto, lista achatada, drag & drop,
// barra de formatação e popover de links.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { flattenPage, type FlatEntry } from '@/lib/flatten';
import { blockSubtree } from '@/lib/blocks';
import { canHaveChildren, type Page } from '@/types';
import { clamp } from '@/lib/utils';
import type { Caret } from '@/lib/richText';
import { EditorCtx, type DropSlot } from './context';
import type { EditableApi } from './EditableText';
import { BlockItem } from './BlockItem';
import { FormatToolbar } from './FormatToolbar';
import { LinkPopover } from './LinkPopover';

const INDENT = 24;
const INDENT_OFFSET = 12;

export function BlocksArea({ page }: { page: Page }) {
  const blocks = useAppStore((s) => s.blocks);
  const moveBlock = useAppStore((s) => s.moveBlock);

  const flat = useMemo(() => flattenPage(blocks, page.blockOrder), [blocks, page.blockOrder]);
  const flatById = useMemo(() => {
    const m = new Map<string, FlatEntry>();
    flat.forEach((f) => m.set(f.id, f));
    return m;
  }, [flat]);

  const editableRegistry = useRef(new Map<string, EditableApi>());
  const rowRegistry = useRef(new Map<string, HTMLDivElement>());
  const blocksRef = useRef<HTMLDivElement>(null);

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragSubtree, setDragSubtree] = useState<Set<string> | null>(null);
  const [slot, setSlot] = useState<DropSlot | null>(null);
  const [toolbar, setToolbar] = useState<{ blockId: string; x: number; y: number } | null>(null);
  const [linkPop, setLinkPop] = useState<{ blockId: string; x: number; y: number; url: string | null } | null>(null);

  const pageId = page.id;

  const registerEditable = useCallback((id: string, api: EditableApi) => {
    editableRegistry.current.set(id, api);
  }, []);
  const unregisterEditable = useCallback((id: string) => {
    editableRegistry.current.delete(id);
  }, []);
  const registerRow = useCallback((id: string, el: HTMLDivElement) => {
    rowRegistry.current.set(id, el);
  }, []);
  const unregisterRow = useCallback((id: string) => {
    rowRegistry.current.delete(id);
  }, []);

  const flatRef = useRef(flat);
  flatRef.current = flat;

  const focusBlock = useCallback(
    (id: string | null | undefined, pos: 'start' | 'end' | 'at', caret?: Caret) => {
      if (!id) return;
      const doFocus = (api: EditableApi | undefined) => {
        if (!api) return;
        if (pos === 'at' && caret) api.focusAt(caret);
        else if (pos === 'end') api.focusEnd();
        else api.focusStart();
      };
      const tryFocus = (): boolean => {
        const api = editableRegistry.current.get(id);
        if (api) {
          doFocus(api);
          return true;
        }
        return false;
      };
      if (tryFocus()) return;
      // Bloco ainda não montado (recém-criado): tenta no próximo tick.
      const exists = !!useAppStore.getState().blocks[id];
      setTimeout(() => {
        if (tryFocus()) return;
        if (!exists) return;
        // Divisor (sem área editável) ou ainda montando: percorre vizinhos
        // usando a lista achatada mais recente.
        const flatNow = flatRef.current;
        const idx = flatNow.findIndex((f) => f.id === id);
        if (idx < 0) return;
        const dir = pos === 'end' ? -1 : 1;
        let j = idx + dir;
        while (j >= 0 && j < flatNow.length) {
          const api2 = editableRegistry.current.get(flatNow[j].id);
          if (api2) {
            if (pos === 'end') api2.focusEnd();
            else api2.focusStart();
            return;
          }
          j += dir;
        }
      }, 0);
    },
    []
  );

  // -------------------------------------------------------------------------
  // Drag & drop
  // -------------------------------------------------------------------------
  const computeSlot = (
    entry: FlatEntry,
    clientX: number,
    clientY: number,
    before: boolean
  ): DropSlot | null => {
    const container = blocksRef.current;
    if (!container) return null;
    const crect = container.getBoundingClientRect();
    const baseX = crect.left;
    const depth = entry.depth;
    const block = blocks[entry.id];
    if (!block) return null;

    // Níveis mais rasos: permitidos enquanto o bloco for o último filho.
    let min = depth;
    let cur: FlatEntry | undefined = entry;
    while (cur && cur.isLastInParent && cur.depth > 0) {
      min--;
      cur = flatById.get(cur.parentId ?? '');
    }

    // Níveis mais fundos: cadeia de primeiros filhos aninháveis.
    let max = depth;
    if (canHaveChildren(block.type)) {
      max = depth + 1;
      let j = entry.flatIndex + 1;
      let curId = entry.id;
      while (
        j < flat.length &&
        flat[j].parentId === curId &&
        canHaveChildren(blocks[flat[j].id]?.type ?? 'paragraph')
      ) {
        max++;
        curId = flat[j].id;
        j++;
      }
    }

    const level = clamp(Math.round((clientX - baseX - INDENT_OFFSET) / INDENT), min, max);

    let parentId: string | null;
    let index: number;
    if (level <= depth) {
      let anc = entry;
      while (anc.depth > level) anc = flatById.get(anc.parentId ?? '') ?? anc;
      parentId = anc.parentId;
      index = before ? anc.indexInParent : anc.indexInParent + 1;
    } else {
      let target = entry;
      for (let k = 1; k <= level - depth; k++) {
        const fc = flat[target.flatIndex + 1];
        if (!fc || fc.parentId !== target.id) break;
        target = fc;
      }
      parentId = target.id;
      index = 0;
    }

    // Posição vertical.
    let y: number;
    if (level <= depth && before) {
      const el = rowRegistry.current.get(entry.id);
      y = el ? el.getBoundingClientRect().top - 4 : clientY;
    } else if (level <= depth) {
      let j = entry.flatIndex + 1;
      while (j < flat.length && flat[j].depth > depth) j++;
      if (j < flat.length) {
        const el = rowRegistry.current.get(flat[j].id);
        y = el ? el.getBoundingClientRect().top - 4 : clientY;
      } else {
        const lastEl = rowRegistry.current.get(flat[flat.length - 1].id);
        y = lastEl ? lastEl.getBoundingClientRect().bottom + 4 : clientY;
      }
    } else {
      let target = entry;
      for (let k = 1; k <= level - depth; k++) {
        const fc = flat[target.flatIndex + 1];
        if (!fc || fc.parentId !== target.id) break;
        target = fc;
      }
      const fc = flat[target.flatIndex + 1];
      const fcIsChild = !!fc && fc.parentId === target.id;
      const el = rowRegistry.current.get(fcIsChild ? fc!.id : target.id);
      y = el
        ? fcIsChild
          ? el.getBoundingClientRect().top - 4
          : el.getBoundingClientRect().bottom + 4
        : clientY;
    }

    return {
      parentId,
      index,
      level,
      x: baseX + level * INDENT - crect.left,
      y: y - crect.top,
    };
  };

  const onDragOverRow = (e: React.DragEvent, entry: FlatEntry) => {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragSubtree?.has(entry.id)) {
      setSlot(null);
      return;
    }
    const row = rowRegistry.current.get(entry.id);
    const before = row ? e.clientY - row.getBoundingClientRect().top < row.getBoundingClientRect().height / 2 : false;
    setSlot(computeSlot(entry, e.clientX, e.clientY, before));
  };

  const onDragOverContainer = (e: React.DragEvent) => {
    if (!dragId) return;
    if (e.target !== blocksRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const last = flat[flat.length - 1];
    if (last) setSlot(computeSlot(last, e.clientX, e.clientY, false));
  };

  const onDrop = (e: React.DragEvent) => {
    if (!dragId) return;
    e.preventDefault();
    if (slot) {
      moveBlock(dragId, slot.parentId, slot.index);
      const id = dragId;
      setTimeout(() => focusBlock(id, 'start'), 0);
    }
    setDragId(null);
    setDragSubtree(null);
    setSlot(null);
  };

  const beginDrag = (id: string) => {
    setDragId(id);
    setDragSubtree(blockSubtree(blocks, id));
    setSlot(null);
  };
  const endDrag = () => {
    setDragId(null);
    setDragSubtree(null);
    setSlot(null);
  };

  // -------------------------------------------------------------------------
  // Barra de formatação (mostrada ao selecionar texto)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const compute = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setToolbar(null);
        return;
      }
      const node = sel.anchorNode;
      const editable = node?.parentElement?.closest('[data-editable="true"]') as HTMLElement | null;
      if (!editable) {
        setToolbar(null);
        return;
      }
      const bid = editable.dataset.blockId;
      if (!bid || !editableRegistry.current.has(bid)) {
        setToolbar(null);
        return;
      }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (!r.width && !r.height) {
        setToolbar(null);
        return;
      }
      setToolbar({ blockId: bid, x: r.left + r.width / 2, y: r.top });
    };
    document.addEventListener('selectionchange', compute);
    document.addEventListener('mouseup', compute);
    document.addEventListener('keyup', compute);
    const onScroll = () => setToolbar(null);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('selectionchange', compute);
      document.removeEventListener('mouseup', compute);
      document.removeEventListener('keyup', compute);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  const openLinkPopover = useCallback((blockId: string, x: number, y: number, url: string | null) => {
    setLinkPop({ blockId, x, y, url });
  }, []);

  const getEditable = useCallback((id: string) => editableRegistry.current.get(id), []);

  const ctxValue = {
    pageId,
    flat,
    flatById,
    registerEditable,
    unregisterEditable,
    registerRow,
    unregisterRow,
    focusBlock,
    focusedBlockId: focusedId,
    setFocusedBlock: setFocusedId,
    getEditable,
    dragId,
    dragSubtree,
    beginDrag,
    endDrag,
    onDragOverRow,
    onDragOverContainer,
    onDrop,
    openLinkPopover,
  };

  const showToolbar = toolbar && editableRegistry.current.has(toolbar.blockId);

  return (
    <EditorCtx.Provider value={ctxValue}>
      <div
        className={`blocks${dragId ? ' is-dragging' : ''}`}
        ref={blocksRef}
        onDragOver={onDragOverContainer}
        onDrop={onDrop}
        onDragEnd={endDrag}
      >
        {flat.map((entry) => (
          <BlockItem key={entry.id} entry={entry} block={blocks[entry.id]} />
        ))}
        {dragId && slot && <div className="drop-indicator" style={{ top: slot.y, left: slot.x }} />}
      </div>

      {showToolbar && toolbar && (
        <FormatToolbar
          blockId={toolbar.blockId}
          x={toolbar.x}
          y={toolbar.y}
          api={editableRegistry.current.get(toolbar.blockId) ?? null}
          onClose={() => setToolbar(null)}
          onOpenLink={() => {
            setLinkPop({ blockId: toolbar.blockId, x: toolbar.x, y: toolbar.y, url: null });
          }}
        />
      )}

      {linkPop && (
        <LinkPopover
          blockId={linkPop.blockId}
          x={linkPop.x}
          y={linkPop.y}
          initialUrl={linkPop.url}
          api={editableRegistry.current.get(linkPop.blockId) ?? null}
          onClose={() => setLinkPop(null)}
        />
      )}
    </EditorCtx.Provider>
  );
}
