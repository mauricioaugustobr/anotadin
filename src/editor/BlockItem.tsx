// ---------------------------------------------------------------------------
// BlockItem — renderização e comportamento de um bloco individual
// ---------------------------------------------------------------------------

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, GripVertical, ImagePlus, Plus } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import {
  absoluteToCaret,
  caretToAbsolute,
  deleteRange,
  emptyText,
  fromPlainText,
  isEmptyContent,
  splitContent,
  textOf,
  type Caret,
} from '@/lib/richText';
import { detectMarkdown, stripPrefix } from '@/lib/blocks';
import { uid } from '@/lib/id';
import { isImageFile, readFileAsDataURL } from '@/lib/files';
import {
  BLOCK_LABELS,
  isHeadingType,
  isToggleHeading,
  type Block,
  type BlockType,
} from '@/types';
import type { FlatEntry } from '@/lib/flatten';
import { useEditorCtx } from './context';
import { EditableText, type EditableApi } from './EditableText';
import { SlashMenu } from './SlashMenu';
import { filterSlash, type SlashCommand } from './slashCommands';
import { Menu, type MenuItemSpec } from '@/components/Menu';
import { EmojiPicker } from '@/components/EmojiPicker';
import { TableBlock, tableOps } from './TableBlock';
import { ColumnsBlock } from './ColumnsBlock';
import { ImageBlock } from './ImageBlock';

const PLACEHOLDERS: Record<BlockType, string> = {
  paragraph: "Digite '/' para comandos…",
  heading_1: 'Título 1',
  heading_2: 'Título 2',
  heading_3: 'Título 3',
  toggle_heading_1: 'Título recolhível 1',
  toggle_heading_2: 'Título recolhível 2',
  toggle_heading_3: 'Título recolhível 3',
  bulleted_list: 'Item da lista',
  numbered_list: 'Item da lista',
  to_do: 'Tarefa',
  toggle: 'Alternador',
  quote: 'Citação',
  code: '',
  divider: '',
  callout: 'Digite algo…',
  image: '',
  table: '',
  columns: '',
};

const CODE_LANGUAGES = [
  'texto simples',
  'javascript',
  'typescript',
  'python',
  'html',
  'css',
  'json',
  'bash',
  'sql',
  'java',
  'markdown',
];

interface SlashState {
  query: string;
  x: number;
  y: number;
  active: number;
}

interface TableCellPos {
  r: number;
  c: number;
}

/** Patch para converter um bloco em outro tipo, criando dados padrão quando preciso. */
function patchForType(type: BlockType, block: Block): Partial<Block> {
  const patch: Partial<Block> = { type };
  if (type === 'table' && !block.table) {
    patch.table = {
      cells: [
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
      ],
    };
  }
  if (type === 'columns' && !block.columns) {
    patch.columns = [
      { id: uid(), text: emptyText() },
      { id: uid(), text: emptyText() },
    ];
  }
  if (type === 'image' && !block.image) {
    patch.image = { src: '', caption: '' };
  }
  if (type === 'callout' && !block.calloutIcon) {
    patch.calloutIcon = '💡';
  }
  return patch;
}

export const BlockItem = memo(function BlockItem({
  entry,
  block,
}: {
  entry: FlatEntry;
  block: Block;
}) {
  const ctx = useEditorCtx();
  const edRef = useRef<EditableApi | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const lastCaretRef = useRef<Caret>({ idx: 0, offset: 0 });
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState(false);
  const [focusCode, setFocusCode] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tableCell, setTableCell] = useState<TableCellPos | null>(null);
  const [calloutOpen, setCalloutOpen] = useState(false);

  const pageId = ctx.pageId;

  // Estado "ao vivo" do bloco — sempre mais recente que as props durante
  // sequências rápidas de eventos (input seguido de keydown no mesmo ciclo).
  const live = () => useAppStore.getState().blocks[block.id] ?? block;

  // Registro da linha (para cálculo de posições no drag & drop).
  useEffect(() => {
    ctx.registerRow(block.id, rowRef.current as HTMLDivElement);
    return () => ctx.unregisterRow(block.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  // Registro da área editável. Para blocos de texto usamos ref callback
  // (disponível já no commit, permitindo foco imediato em blocos novos).
  useEffect(() => {
    if (block.type !== 'code') return;
    const api: EditableApi = {
      get el() {
        return textareaRef.current as unknown as HTMLDivElement;
      },
      focusStart() {
        const t = textareaRef.current;
        if (!t) return;
        t.focus();
        t.setSelectionRange(0, 0);
      },
      focusEnd() {
        const t = textareaRef.current;
        if (!t) return;
        t.focus();
        const n = t.value.length;
        t.setSelectionRange(n, n);
      },
      focusAt() {
        this.focusStart();
      },
      applyFormat() {},
      clearFormat() {},
      getCaret() {
        return null;
      },
      getSelection() {
        return null;
      },
      getCaretRect() {
        return null;
      },
      insertPlainText() {},
      setPendingCaret() {},
    };
    ctx.registerEditable(block.id, api);
    return () => ctx.unregisterEditable(block.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id, block.type]);

  const edCallback = useCallback(
    (api: EditableApi | null) => {
      edRef.current = api;
      if (api) ctx.registerEditable(block.id, api);
      else ctx.unregisterEditable(block.id);
    },
    [block.id, ctx]
  );

  // Fecha o menu de bloco ao clicar fora.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menu]);

  useEffect(() => {
    if (!selected) return;
    const onDown = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) setSelected(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [selected]);

  // Fecha o seletor de emoji do callout ao clicar fora.
  useEffect(() => {
    if (!calloutOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.querySelector('.callout-picker-wrap')?.contains(e.target as Node)) {
        setCalloutOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [calloutOpen]);

  // -------------------------------------------------------------------------
  // Edição de conteúdo
  // -------------------------------------------------------------------------
  const handleInput = useCallback(
    (value: typeof block.content, caret: Caret) => {
      lastCaretRef.current = caret;
      const first = value[0]?.text ?? '';

      // Menu de comandos.
      if (first.startsWith('/') && caret.idx === 0) {
        const rect = edRef.current?.getCaretRect();
        if (rect) {
          const query = first.slice(1, Math.min(caret.offset, first.length));
          setSlash({ query, x: rect.left, y: rect.bottom + 8, active: 0 });
        }
      } else {
        setSlash(null);
      }

      // Atalhos Markdown.
      if (live().type === 'paragraph') {
        const hit = detectMarkdown(value);
        if (hit) {
          const caretAbs = caretToAbsolute(value, caret);
          const stripped = stripPrefix(value, hit.strip);
          useAppStore.getState().setBlockContent(block.id, stripped);
          useAppStore.getState().updateBlock(block.id, { type: hit.type }, 'structural');
          const newCaret = absoluteToCaret(stripped, Math.max(0, caretAbs - hit.strip));
          edRef.current?.setPendingCaret(newCaret);
          if (hit.type === 'code') setFocusCode(true);
          return;
        }
        if (textOf(value) === '---') {
          useAppStore.getState().setBlockContent(block.id, emptyText());
          useAppStore.getState().updateBlock(block.id, { type: 'divider' }, 'structural');
          const newId = useAppStore
            .getState()
            .createBlock(pageId, entry.parentId, entry.indexInParent + 1, 'paragraph');
          ctx.focusBlock(newId, 'start');
          return;
        }
      }

      useAppStore.getState().setBlockContent(block.id, value);
    },
    [block.id, entry.parentId, entry.indexInParent, pageId, ctx]
  );

  // -------------------------------------------------------------------------
  // Colagem de imagens
  // -------------------------------------------------------------------------
  const handlePasteFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter(isImageFile);
      if (images.length === 0) return;
      let index = entry.indexInParent + 1;
      for (const file of images) {
        const url = await readFileAsDataURL(file);
        const newId = useAppStore.getState().createBlock(pageId, entry.parentId, index, 'image');
        useAppStore.getState().updateBlock(newId, { image: { src: url, caption: '' } });
        index += 1;
      }
    },
    [pageId, entry.parentId, entry.indexInParent]
  );

  // -------------------------------------------------------------------------
  // Comandos "/"
  // -------------------------------------------------------------------------
  const executeSlash = useCallback(
    (cmd: SlashCommand) => {
      const cur = live();
      const caret = lastCaretRef.current;
      const first = cur.content[0]?.text ?? '';
      const end = caret.idx === 0 ? Math.min(caret.offset, first.length) : first.length;
      const stripLen = first.slice(0, end).startsWith('/') ? end : 0;
      const stripped = stripPrefix(cur.content, stripLen);
      useAppStore.getState().setBlockContent(block.id, stripped);
      setSlash(null);

      if (cmd.type === 'divider') {
        useAppStore.getState().updateBlock(block.id, { type: 'divider' }, 'structural');
        const newId = useAppStore
          .getState()
          .createBlock(pageId, entry.parentId, entry.indexInParent + 1, 'paragraph');
        ctx.focusBlock(newId, 'start');
        return;
      }
      if (cmd.type === 'code') {
        useAppStore
          .getState()
          .updateBlock(block.id, { type: 'code', language: 'texto simples' }, 'structural');
        setFocusCode(true);
        return;
      }
      if (cmd.type === 'image') {
        useAppStore.getState().updateBlock(block.id, patchForType('image', cur), 'structural');
        requestAnimationFrame(() => imageFileRef.current?.click());
        return;
      }
      useAppStore.getState().updateBlock(block.id, patchForType(cmd.type, cur), 'structural');
      if (isHeadingType(cmd.type)) {
        edRef.current?.setPendingCaret({ idx: 0, offset: 0 });
      }
    },
    [block.id, entry.parentId, entry.indexInParent, pageId, ctx]
  );

  const closeSlashAndClear = useCallback(() => {
    const cur = live();
    const caret = lastCaretRef.current;
    const first = cur.content[0]?.text ?? '';
    const end = caret.idx === 0 ? Math.min(caret.offset, first.length) : first.length;
    const stripLen = first.slice(0, end).startsWith('/') ? end : 0;
    setSlash(null);
    useAppStore.getState().setBlockContent(block.id, stripPrefix(cur.content, stripLen));
    edRef.current?.setPendingCaret({ idx: 0, offset: 0 });
  }, [block.id]);

  // -------------------------------------------------------------------------
  // Enter / Backspace / Delete / Tab / setas
  // -------------------------------------------------------------------------
  const handleEnter = useCallback(
    (caret: Caret) => {
      const cur = live();
      let content = cur.content;
      const sel = edRef.current?.getSelection();
      if (sel && !(sel.anchor.idx === sel.focus.idx && sel.anchor.offset === sel.focus.offset)) {
        content = deleteRange(content, sel.anchor, sel.focus);
        useAppStore.getState().setBlockContent(block.id, content);
        const fwd =
          sel.anchor.idx < sel.focus.idx ||
          (sel.anchor.idx === sel.focus.idx && sel.anchor.offset < sel.focus.offset);
        caret = fwd ? sel.anchor : sel.focus;
      }

      const { left, right } = splitContent(content, caret);
      const emptyLeft = isEmptyContent(left);
      const headingLike = isHeadingType(cur.type);
      const toggleHeading = isToggleHeading(cur.type);

      if (
        emptyLeft &&
        (cur.type === 'bulleted_list' ||
          cur.type === 'numbered_list' ||
          cur.type === 'to_do' ||
          cur.type === 'quote' ||
          cur.type === 'toggle' ||
          toggleHeading ||
          cur.type === 'callout')
      ) {
        useAppStore.getState().setBlockContent(block.id, emptyText());
        useAppStore.getState().updateBlock(block.id, { type: 'paragraph' }, 'structural');
        return;
      }

      if (headingLike && caret.idx === 0 && caret.offset === 0 && !emptyLeft) {
        const newId = useAppStore
          .getState()
          .createBlock(pageId, entry.parentId, entry.indexInParent, 'paragraph');
        ctx.focusBlock(newId, 'start');
        return;
      }

      if (cur.type === 'toggle' || toggleHeading) {
        if (cur.collapsed) {
          const newId = useAppStore
            .getState()
            .createBlock(pageId, entry.parentId, entry.indexInParent + 1, 'paragraph');
          useAppStore.getState().setBlockContent(block.id, left);
          ctx.focusBlock(newId, 'start');
          return;
        }
        const newId = useAppStore.getState().createBlock(pageId, block.id, 0, 'paragraph');
        useAppStore.getState().setBlockContent(block.id, left);
        ctx.focusBlock(newId, 'start');
        return;
      }

      const newType: BlockType =
        headingLike || cur.type === 'callout' ? 'paragraph' : cur.type;
      const newId = useAppStore
        .getState()
        .createBlock(pageId, entry.parentId, entry.indexInParent + 1, newType, right);
      useAppStore.getState().setBlockContent(block.id, left);
      ctx.focusBlock(newId, 'start');
    },
    [block.id, entry.parentId, entry.indexInParent, pageId, ctx]
  );

  const handleBackspaceAtStart = useCallback(() => {
    const idx = entry.flatIndex;
    const prevEntry = idx > 0 ? ctx.flat[idx - 1] : null;
    if (!prevEntry) return; // primeiro bloco: nada a fazer
    const prev = useAppStore.getState().blocks[prevEntry.id];
    if (!prev) return;
    if (prev.type === 'divider') {
      useAppStore.getState().deleteBlock(prev.id);
      return;
    }
    const boundary = useAppStore.getState().mergeBlocks(prev.id, block.id);
    if (boundary !== null) {
      const prevBlock = useAppStore.getState().blocks[prev.id];
      if (prevBlock) {
        ctx.focusBlock(prev.id, 'at', absoluteToCaret(prevBlock.content, boundary));
      }
    }
  }, [block.id, entry.flatIndex, ctx]);

  const handleDeleteAtEnd = useCallback(() => {
    const idx = entry.flatIndex;
    const nextEntry = idx + 1 < ctx.flat.length ? ctx.flat[idx + 1] : null;
    if (!nextEntry) return;
    const next = useAppStore.getState().blocks[nextEntry.id];
    if (!next) return;
    if (next.type === 'divider') {
      useAppStore.getState().deleteBlock(next.id);
      return;
    }
    const boundary = useAppStore.getState().mergeBlocks(block.id, next.id);
    if (boundary !== null) {
      const cur = useAppStore.getState().blocks[block.id];
      if (cur) ctx.focusBlock(block.id, 'at', absoluteToCaret(cur.content, boundary));
    }
  }, [block.id, entry.flatIndex, ctx]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, caret: Caret | null) => {
      const mod = e.ctrlKey || e.metaKey;

      // Menu de comandos aberto: navegação própria.
      if (slash) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          setSlash((s) => (s ? { ...s, active: s.active + 1 } : s));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setSlash((s) => (s ? { ...s, active: Math.max(0, s.active - 1) } : s));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const cmds = filterSlash(slash.query);
          const cmd = cmds[Math.min(slash.active, cmds.length - 1)];
          if (cmd) executeSlash(cmd);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closeSlashAndClear();
          return;
        }
        if (mod) return; // deixa atalhos globais funcionarem
      }

      if (!caret) return;
      const sel = edRef.current?.getSelection();
      const collapsed =
        !sel || (sel.anchor.idx === sel.focus.idx && sel.anchor.offset === sel.focus.offset);

      if (e.key === 'Enter' && !mod && !e.shiftKey) {
        e.preventDefault();
        handleEnter(caret);
        return;
      }

      const curContent = live().content;
      const atStart = caret.idx === 0 && caret.offset === 0;
      const atEnd = caretToAbsolute(curContent, caret) >= textOf(curContent).length;

      if (e.key === 'Backspace' && !mod && collapsed && atStart) {
        e.preventDefault();
        handleBackspaceAtStart();
        return;
      }
      if (e.key === 'Delete' && !mod && collapsed && atEnd) {
        e.preventDefault();
        handleDeleteAtEnd();
        return;
      }

      if (e.key === 'Tab' && !mod) {
        e.preventDefault();
        if (e.shiftKey) {
          useAppStore.getState().outdentBlock(block.id);
        } else {
          useAppStore.getState().indentBlock(block.id);
        }
        return;
      }

      if (e.key === 'Escape' && !mod) {
        (document.activeElement as HTMLElement | null)?.blur();
        return;
      }

      if (!mod && !e.shiftKey && collapsed) {
        if (e.key === 'ArrowUp' && atStart) {
          e.preventDefault();
          ctx.focusBlock(ctx.flat[entry.flatIndex - 1]?.id, 'end');
          return;
        }
        if (e.key === 'ArrowDown' && atEnd) {
          e.preventDefault();
          ctx.focusBlock(ctx.flat[entry.flatIndex + 1]?.id, 'start');
          return;
        }
        if (e.key === 'ArrowLeft' && atStart && entry.depth > 0) {
          e.preventDefault();
          ctx.focusBlock(entry.parentId, 'end');
          return;
        }
        if (e.key === 'ArrowRight' && atEnd && live().children.length > 0) {
          e.preventDefault();
          ctx.focusBlock(live().children[0], 'start');
          return;
        }
      }
    },
    [
      slash,
      block.id,
      entry,
      ctx,
      executeSlash,
      closeSlashAndClear,
      handleEnter,
      handleBackspaceAtStart,
      handleDeleteAtEnd,
    ]
  );

  // -------------------------------------------------------------------------
  // Colagem multi-linha: vira múltiplos blocos
  // -------------------------------------------------------------------------
  const handlePasteMultiline = useCallback(
    (text: string) => {
      const lines = text.split('\n');
      const first = lines.shift() ?? '';
      if (first) edRef.current?.insertPlainText(first);
      let parentId = entry.parentId;
      let index = entry.indexInParent + 1;
      let lastId = block.id;
      for (const line of lines) {
        const newId = useAppStore
          .getState()
          .createBlock(pageId, parentId, index, 'paragraph', fromPlainText(line));
        parentId = null;
        lastId = newId;
        index += 1;
      }
      if (lastId !== block.id) ctx.focusBlock(lastId, 'end');
    },
    [block.id, entry.parentId, entry.indexInParent, pageId, ctx]
  );

  // -------------------------------------------------------------------------
  // Menu de bloco (botão +)
  // -------------------------------------------------------------------------
  const openMenu = () => {
    const btn = rowRef.current?.querySelector('.block-plus') as HTMLElement | null;
    const rect = btn?.getBoundingClientRect();
    if (rect) setMenu({ x: rect.left, y: rect.bottom + 4 });
  };

  const deleteBlock = () => {
    const neighbor = ctx.flat[entry.flatIndex - 1]?.id ?? ctx.flat[entry.flatIndex + 1]?.id;
    useAppStore.getState().deleteBlock(block.id);
    setMenu(null);
    ctx.focusBlock(neighbor, 'end');
  };

  const duplicateBlock = () => {
    const newId = useAppStore.getState().duplicateBlock(block.id);
    setMenu(null);
    if (newId) ctx.focusBlock(newId, 'start');
  };

  const transformTo = (type: BlockType) => {
    setMenu(null);
    if (type === 'divider') {
      useAppStore.getState().updateBlock(block.id, { type: 'divider' }, 'structural');
      const newId = useAppStore
        .getState()
        .createBlock(pageId, entry.parentId, entry.indexInParent + 1, 'paragraph');
      ctx.focusBlock(newId, 'start');
      return;
    }
    useAppStore.getState().updateBlock(block.id, patchForType(type, live()), 'structural');
    if (type === 'code') setFocusCode(true);
    else if (isHeadingType(type)) edRef.current?.setPendingCaret({ idx: 0, offset: 0 });
  };

  const menuItems = useMemo<MenuItemSpec[]>(() => {
    const items: MenuItemSpec[] = [
      {
        label: 'Duplicar',
        icon: <CopyIcon />,
        onClick: duplicateBlock,
      },
      {
        label: 'Transformar em',
        icon: <TransformIcon />,
        children: (Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => ({
          label: BLOCK_LABELS[t],
          onClick: () => transformTo(t),
        })),
      },
    ];

    if (block.type === 'table' && tableCell) {
      const ops = tableOps(live());
      items.push(
        {
          label: 'Inserir linha abaixo',
          icon: <RowIcon />,
          onClick: () => {
            useAppStore
              .getState()
              .updateBlock(block.id, { table: { cells: ops.addRowAt(tableCell.r) } }, 'structural');
            setMenu(null);
          },
        },
        {
          label: 'Inserir coluna à direita',
          icon: <ColIcon />,
          onClick: () => {
            useAppStore
              .getState()
              .updateBlock(block.id, { table: { cells: ops.addColAt(tableCell.c) } }, 'structural');
            setMenu(null);
          },
        },
        {
          label: 'Excluir linha',
          icon: <TrashIcon />,
          danger: true,
          disabled: ops.rows <= 1,
          onClick: () => {
            useAppStore
              .getState()
              .updateBlock(block.id, { table: { cells: ops.removeRowAt(tableCell.r) } }, 'structural');
            setMenu(null);
          },
        },
        {
          label: 'Excluir coluna',
          icon: <TrashIcon />,
          danger: true,
          disabled: ops.cols <= 1,
          onClick: () => {
            useAppStore
              .getState()
              .updateBlock(block.id, { table: { cells: ops.removeColAt(tableCell.c) } }, 'structural');
            setMenu(null);
          },
        }
      );
    }

    if (block.type === 'columns' && (live().columns?.length ?? 0) < 4) {
      items.push({
        label: 'Adicionar coluna',
        icon: <ColIcon />,
        onClick: () => {
          const cur = live();
          const cols = cur.columns ?? [];
          useAppStore
            .getState()
            .updateBlock(
              block.id,
              { columns: [...cols, { id: uid(), text: emptyText() }] },
              'structural'
            );
          setMenu(null);
        },
      });
    }

    items.push({
      label: 'Excluir',
      icon: <TrashIcon />,
      danger: true,
      onClick: deleteBlock,
    });

    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id, block.type, tableCell, entry]);

  // -------------------------------------------------------------------------
  // Bloco de código
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (block.type === 'code' && focusCode) {
      const t = textareaRef.current;
      if (t) {
        t.focus();
        const n = t.value.length;
        t.setSelectionRange(n, n);
      }
      setFocusCode(false);
    }
  }, [block.type, focusCode]);

  useEffect(() => {
    const t = textareaRef.current;
    if (t) {
      t.style.height = 'auto';
      t.style.height = `${t.scrollHeight}px`;
    }
  }, [block.type, block.content]);

  // -------------------------------------------------------------------------
  // Renderização
  // -------------------------------------------------------------------------
  if (block.type === 'divider') {
    return (
      <div
        ref={rowRef}
        className={`block-row block-divider-row${selected ? ' is-selected' : ''}`}
        style={{ marginLeft: entry.depth * 24 }}
        onClick={() => setSelected(true)}
        onDragOver={(e) => ctx.onDragOverRow(e, entry)}
      >
        <div className="block-controls">
          <button
            className="block-grip"
            draggable
            title="Arrastar bloco"
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', block.id);
              ctx.beginDrag(block.id);
            }}
          >
            <GripVertical size={14} />
          </button>
          <button className="block-plus" title="Menu do bloco" onClick={openMenu}>
            <Plus size={14} />
          </button>
        </div>
        <hr className="divider" />
        {menu && <Menu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
      </div>
    );
  }

  const isChecked = block.type === 'to_do' && block.checked;
  const isCode = block.type === 'code';
  const isImage = block.type === 'image';
  const isTable = block.type === 'table';
  const isColumns = block.type === 'columns';
  const isTextual = !isCode && !isImage && !isTable && !isColumns;
  const isToggle = block.type === 'toggle' || isToggleHeading(block.type);
  const isEmpty = isEmptyContent(block.content);
  const headingLevel = block.type === 'heading_1' || block.type === 'toggle_heading_1'
    ? 'h1'
    : block.type === 'heading_2' || block.type === 'toggle_heading_2'
      ? 'h2'
      : block.type === 'heading_3' || block.type === 'toggle_heading_3'
        ? 'h3'
        : '';
  const rowClass = [
    'block-row',
    `block-${block.type.replace(/_/g, '-')}`,
    entry.depth > 0 ? 'is-nested' : '',
    isChecked ? 'is-checked' : '',
    focused ? 'is-focused' : '',
    ctx.dragId === block.id ? 'is-dragging-row' : '',
    selected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={rowRef}
      className={rowClass}
      style={{ marginLeft: entry.depth * 24 }}
      onDragOver={(e) => ctx.onDragOverRow(e, entry)}
      onClick={(e) => {
        if (e.target === rowRef.current && isTextual) edRef.current?.focusEnd();
      }}
    >
      <div className="block-controls">
        <button
          className="block-grip"
          draggable
          title="Arrastar bloco"
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', block.id);
            ctx.beginDrag(block.id);
          }}
        >
          <GripVertical size={14} />
        </button>
        <button className="block-plus" title="Menu do bloco" onClick={openMenu}>
          <Plus size={14} />
        </button>
      </div>

      <div className="block-inner">
        {block.type === 'to_do' && (
          <button
            className={`checkbox${isChecked ? ' is-checked' : ''}`}
            aria-label="Marcar tarefa"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              useAppStore.getState().toggleChecked(block.id);
            }}
          >
            {isChecked && <Check size={12} strokeWidth={3} />}
          </button>
        )}
        {isToggle && (
          <button
            className={`toggle-tri${block.collapsed ? '' : ' is-open'}${headingLevel ? ' is-heading' : ''}`}
            aria-label="Expandir/recolher"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              useAppStore.getState().toggleCollapsed(block.id);
            }}
          >
            <ChevronRight size={16} />
          </button>
        )}
        {block.type === 'bulleted_list' && <span className="glyph-bullet">•</span>}
        {block.type === 'numbered_list' && <span className="glyph-number">{entry.number}.</span>}
        {block.type === 'callout' && (
          <div className="callout-picker-wrap">
            <button
              className="callout-icon-btn"
              title="Alterar ícone da chamada"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                setCalloutOpen((v) => !v);
              }}
            >
              {block.calloutIcon ?? '💡'}
            </button>
            {calloutOpen && (
              <EmojiPicker
                onSelect={(emoji) => {
                  useAppStore.getState().updateBlock(block.id, { calloutIcon: emoji }, 'structural');
                  setCalloutOpen(false);
                }}
                onRandom={() => {
                  const pool = ['💡', '🔥', '⭐', '📌', '⚠️', '✅', '🎯', '🚀', '🧠', '❤️'];
                  useAppStore
                    .getState()
                    .updateBlock(block.id, { calloutIcon: pool[Math.floor(Math.random() * pool.length)] }, 'structural');
                  setCalloutOpen(false);
                }}
              />
            )}
          </div>
        )}

        {isCode ? (
          <div className="code-wrap">
            <select
              className="code-lang"
              value={block.language ?? 'texto simples'}
              title="Linguagem"
              onChange={(e) =>
                useAppStore.getState().updateBlock(block.id, { language: e.target.value })
              }
            >
              {CODE_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <textarea
              ref={textareaRef}
              className="code-editor"
              value={textOf(block.content)}
              spellCheck={false}
              placeholder="// escreva seu código aqui…"
              onChange={(e) =>
                useAppStore.getState().setBlockContent(block.id, fromPlainText(e.target.value))
              }
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const t = e.currentTarget;
                  const start = t.selectionStart;
                  const end = t.selectionEnd;
                  const next = t.value.slice(0, start) + '  ' + t.value.slice(end);
                  useAppStore.getState().setBlockContent(block.id, fromPlainText(next));
                  requestAnimationFrame(() => {
                    t.selectionStart = t.selectionEnd = start + 2;
                  });
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.currentTarget.blur();
                  return;
                }
                if (!e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                  const t = e.currentTarget;
                  const before = t.value.slice(0, t.selectionStart);
                  const after = t.value.slice(t.selectionEnd);
                  const atFirstLine = !before.includes('\n');
                  const atLastLine = !after.includes('\n');
                  if (e.key === 'ArrowUp' && atFirstLine) {
                    e.preventDefault();
                    ctx.focusBlock(ctx.flat[entry.flatIndex - 1]?.id, 'end');
                    return;
                  }
                  if (e.key === 'ArrowDown' && atLastLine) {
                    e.preventDefault();
                    ctx.focusBlock(ctx.flat[entry.flatIndex + 1]?.id, 'start');
                    return;
                  }
                }
              }}
              onFocus={() => ctx.setFocusedBlock(block.id)}
            />
          </div>
        ) : isImage ? (
          <ImageBlock block={block} />
        ) : isTable ? (
          <TableBlock block={block} onCellFocus={setTableCell} />
        ) : isColumns ? (
          <ColumnsBlock block={block} />
        ) : (
          <EditableText
            ref={edCallback}
            blockId={block.id}
            value={block.content}
            className={[
              'block-editable',
              isEmpty ? 'is-empty' : '',
              headingLevel,
            ]
              .filter(Boolean)
              .join(' ')}
            placeholder={PLACEHOLDERS[block.type]}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPasteMultiline={handlePasteMultiline}
            onPasteFiles={handlePasteFiles}
            onLinkClick={(url, x, y) => ctx.openLinkPopover(block.id, x, y, url)}
            onLinkShortcut={() => {
              const rect = edRef.current?.getCaretRect();
              if (rect) ctx.openLinkPopover(block.id, rect.left, rect.bottom + 8, null);
            }}
            onFocusChanged={(f) => {
              setFocused(f);
              if (f) ctx.setFocusedBlock(block.id);
            }}
          />
        )}
      </div>

      {menu && <Menu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
      {slash && (
        <SlashMenu
          x={slash.x}
          y={slash.y}
          query={slash.query}
          active={slash.active}
          onActiveChange={(active) => setSlash((s) => (s ? { ...s, active } : s))}
          onSelect={executeSlash}
          onClose={() => setSlash(null)}
        />
      )}
      <input
        ref={imageFileRef}
        type="file"
        accept="image/*"
        className="hidden-file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const url = await readFileAsDataURL(file);
            useAppStore.getState().updateBlock(block.id, { image: { src: url, caption: '' } });
          }
          e.target.value = '';
        }}
      />
      {block.type === 'image' && !block.image?.src && (
        <span className="image-hint">
          <ImagePlus size={12} /> Dica: também é possível colar imagens com Ctrl+V
        </span>
      )}
    </div>
  );
});

// Ícones do menu de bloco.
function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}
function TransformIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" />
      <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}
function RowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 12h18" />
    </svg>
  );
}
function ColIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M12 3v18" />
    </svg>
  );
}
