// ---------------------------------------------------------------------------
// Contexto compartilhado do editor de blocos
// ---------------------------------------------------------------------------

import { createContext, useContext } from 'react';
import type { EditableApi } from './EditableText';
import type { FlatEntry } from '@/lib/flatten';
import type { Caret } from '@/lib/richText';

export interface DropSlot {
  parentId: string | null;
  index: number;
  level: number;
  /** Coordenadas relativas ao contêiner de blocos. */
  x: number;
  y: number;
}

export interface EditorCtxValue {
  pageId: string;
  flat: FlatEntry[];
  flatById: Map<string, FlatEntry>;
  registerEditable: (id: string, api: EditableApi) => void;
  unregisterEditable: (id: string) => void;
  registerRow: (id: string, el: HTMLDivElement) => void;
  unregisterRow: (id: string) => void;
  focusBlock: (id: string | null | undefined, pos: 'start' | 'end' | 'at', caret?: Caret) => void;
  focusedBlockId: string | null;
  setFocusedBlock: (id: string | null) => void;
  getEditable: (id: string) => EditableApi | undefined;

  // Arrastar e soltar blocos
  dragId: string | null;
  dragSubtree: Set<string> | null;
  beginDrag: (id: string) => void;
  endDrag: () => void;
  onDragOverRow: (e: React.DragEvent, entry: FlatEntry) => void;
  onDragOverContainer: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;

  // Popover de link
  openLinkPopover: (blockId: string, x: number, y: number, url: string | null) => void;
}

export const EditorCtx = createContext<EditorCtxValue | null>(null);

export function useEditorCtx(): EditorCtxValue {
  const v = useContext(EditorCtx);
  if (!v) throw new Error('useEditorCtx deve ser usado dentro do provider');
  return v;
}
