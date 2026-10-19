// ---------------------------------------------------------------------------
// Contagem de palavras (conteúdo, tabelas, legendas e colunas)
// ---------------------------------------------------------------------------

import { textOf } from './richText';
import type { Block, Page } from '@/types';

export function countWordsInText(text: string): number {
  const clean = text.replace(/\u200B/g, '').trim();
  if (!clean) return 0;
  return clean.split(/\s+/).length;
}

export function countWordsInBlocks(blocks: Record<string, Block>, page: Page): number {
  let total = 0;
  const seen = new Set<string>();

  const countBlock = (b: Block) => {
    if (!b || seen.has(b.id)) return;
    seen.add(b.id);
    const parts: string[] = [textOf(b.content)];
    if (b.table) {
      for (const row of b.table.cells) parts.push(...row);
    }
    if (b.columns) {
      for (const col of b.columns) parts.push(textOf(col.text));
    }
    if (b.image?.caption) parts.push(b.image.caption);
    total += countWordsInText(parts.join(' '));
    b.children.forEach((cid) => {
      const child = blocks[cid];
      if (child) countBlock(child);
    });
  };

  page.blockOrder.forEach((bid) => {
    const b = blocks[bid];
    if (b) countBlock(b);
  });
  return total;
}

export function countAllWords(pages: Record<string, Page>, blocks: Record<string, Block>): number {
  let total = 0;
  for (const page of Object.values(pages)) {
    total += countWordsInBlocks(blocks, page);
  }
  return total;
}
