// ---------------------------------------------------------------------------
// Achatamento da árvore de blocos para renderização e navegação
// ---------------------------------------------------------------------------

import type { Block } from '@/types';

export interface FlatEntry {
  id: string;
  depth: number;
  parentId: string | null;
  indexInParent: number;
  /** Índice na lista achatada (visível). */
  flatIndex: number;
  isLastInParent: boolean;
  /** Número exibido (apenas listas numeradas). */
  number?: number;
}

/**
 * Percorre a árvore em pré-ordem, ignorando filhos de alternadores
 * recolhidos. Numeração de listas numeradas reinicia quando interrompida
 * por outro tipo de bloco.
 */
export function flattenPage(blocks: Record<string, Block>, blockOrder: string[]): FlatEntry[] {
  const out: FlatEntry[] = [];
  const walk = (parentId: string | null, ids: string[], depth: number) => {
    let numCount = 0;
    let lastWasNumbered = false;
    ids.forEach((id, i) => {
      const b = blocks[id];
      if (!b) return;
      if (b.type === 'numbered_list') {
        if (!lastWasNumbered) numCount = 0;
        numCount++;
        lastWasNumbered = true;
      } else {
        lastWasNumbered = false;
      }
      out.push({
        id,
        depth,
        parentId,
        indexInParent: i,
        flatIndex: out.length,
        isLastInParent: i === ids.length - 1,
        number: b.type === 'numbered_list' ? numCount : undefined,
      });
      if (!b.collapsed && b.children.length > 0) {
        walk(id, b.children, depth + 1);
      }
    });
  };
  walk(null, blockOrder, 0);
  return out;
}
