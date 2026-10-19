// ---------------------------------------------------------------------------
// Operações auxiliares sobre blocos
// ---------------------------------------------------------------------------

import { uid } from './id';
import { emptyText, fromPlainText, textOf } from './richText';
import type { Block, BlockType, RichText } from '@/types';

export function makeBlock(type: BlockType, pageId: string, content?: RichText): Block {
  const block: Block = {
    id: uid(),
    type,
    content: content ?? emptyText(),
    checked: false,
    collapsed: false,
    language: 'texto simples',
    children: [],
    pageId,
  };
  if (type === 'callout') block.calloutIcon = '💡';
  if (type === 'table') {
    block.table = {
      cells: [
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
      ],
    };
  }
  if (type === 'columns') {
    block.columns = [
      { id: uid(), text: emptyText() },
      { id: uid(), text: emptyText() },
    ];
  }
  if (type === 'image') {
    block.image = { src: '', caption: '' };
  }
  return block;
}

export function makeCodeBlock(pageId: string, text: string, language = 'texto simples'): Block {
  const b = makeBlock('code', pageId, fromPlainText(text));
  b.language = language;
  return b;
}

// ---------------------------------------------------------------------------
// Detecção de atalhos Markdown
// ---------------------------------------------------------------------------

export interface MarkdownHit {
  type: BlockType;
  /** Quantos caracteres remover do início do primeiro segmento. */
  strip: number;
}

export function detectMarkdown(content: RichText): MarkdownHit | null {
  if (content.length === 0) return null;
  const t = content[0].text;
  let m = /^(#{1,3})\s/.exec(t);
  if (m) return { type: `heading_${m[1].length}` as BlockType, strip: m[0].length };
  if (/^[-*+]\s/.test(t)) return { type: 'bulleted_list', strip: 2 };
  m = /^\d+[.)]\s/.exec(t);
  if (m) return { type: 'numbered_list', strip: m[0].length };
  if (t.startsWith('[] ')) return { type: 'to_do', strip: 3 };
  if (t.startsWith('[]')) return { type: 'to_do', strip: 2 };
  if (t.startsWith('> ')) return { type: 'quote', strip: 2 };
  if (t.startsWith('>')) return { type: 'quote', strip: 1 };
  if (t.startsWith('```')) return { type: 'code', strip: 3 };
  return null;
}

/** Remove os primeiros `n` caracteres do primeiro segmento. */
export function stripPrefix(content: RichText, n: number): RichText {
  if (content.length === 0) return emptyText();
  const seg = { ...content[0], text: content[0].text.slice(n) };
  return [seg, ...content.slice(1)];
}

// ---------------------------------------------------------------------------
// Árvore de blocos
// ---------------------------------------------------------------------------

/** Coleta todos os IDs do bloco e de seus descendentes. */
export function blockSubtree(blocks: Record<string, Block>, id: string): Set<string> {
  const out = new Set<string>();
  const walk = (bid: string) => {
    out.add(bid);
    const b = blocks[bid];
    if (b) b.children.forEach(walk);
  };
  walk(id);
  return out;
}

export function deleteBlockTree(blocks: Record<string, Block>, id: string): void {
  const b = blocks[id];
  if (!b) return;
  b.children.forEach((cid) => deleteBlockTree(blocks, cid));
  delete blocks[id];
}

/** Remove o bloco do array ordenado do seu pai (não remove o bloco em si). */
export function removeBlockFromParent(
  blocks: Record<string, Block>,
  pages: Record<string, { blockOrder: string[] }>,
  id: string
): void {
  const b = blocks[id];
  if (!b) return;
  const page = pages[b.pageId];
  if (page) {
    const i = page.blockOrder.indexOf(id);
    if (i >= 0) {
      page.blockOrder.splice(i, 1);
      return;
    }
  }
  for (const other of Object.values(blocks)) {
    if (!other.children) continue;
    const i = other.children.indexOf(id);
    if (i >= 0) {
      other.children.splice(i, 1);
      return;
    }
  }
}

/** Encontra o pai (bloco ou página) e a posição de um bloco. */
export function findBlockParent(
  blocks: Record<string, Block>,
  pages: Record<string, { blockOrder: string[] }>,
  id: string
): { parentId: string | null; index: number } | null {
  const b = blocks[id];
  if (!b) return null;
  const page = pages[b.pageId];
  if (page) {
    const i = page.blockOrder.indexOf(id);
    if (i >= 0) return { parentId: null, index: i };
  }
  for (const other of Object.values(blocks)) {
    if (!other.children) continue;
    const i = other.children.indexOf(id);
    if (i >= 0) return { parentId: other.id, index: i };
  }
  return null;
}

/** Clona um bloco e toda a sua subárvore com novos IDs. */
export function cloneBlockTree(
  blocks: Record<string, Block>,
  id: string,
  pageId: string
): { rootId: string; cloned: Record<string, Block> } {
  const cloned: Record<string, Block> = {};
  const walk = (bid: string): string => {
    const src = blocks[bid];
    const nid = uid();
    const copy: Block = {
      ...src,
      id: nid,
      content: src.content.map((s) => ({ ...s })),
      children: [],
      pageId,
    };
    if (src.table) copy.table = { cells: src.table.cells.map((row) => [...row]) };
    if (src.columns) copy.columns = src.columns.map((c) => ({ id: uid(), text: c.text.map((s) => ({ ...s })) }));
    if (src.image) copy.image = { ...src.image };
    copy.children = src.children.map(walk);
    cloned[nid] = copy;
    return nid;
  };
  const rootId = walk(id);
  return { rootId, cloned };
}

export function plainOf(content: RichText): string {
  return textOf(content);
}
