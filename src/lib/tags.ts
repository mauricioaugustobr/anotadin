// ---------------------------------------------------------------------------
// Etiquetas e ordenação de páginas
// ---------------------------------------------------------------------------

import type { Page } from '@/types';

export const TAG_COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'] as const;
export type TagColor = (typeof TAG_COLORS)[number];

/** Cor determinística a partir do nome da tag. */
export function tagColor(name: string): TagColor {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return TAG_COLORS[hash % TAG_COLORS.length];
}

/** Coleta todas as tags em uso, com contagem, ordenadas por nome. */
export function collectTags(pages: Record<string, Page>): Array<{ name: string; count: number }> {
  const map = new Map<string, number>();
  for (const page of Object.values(pages)) {
    for (const tag of page.tags ?? []) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export type SidebarSort = 'manual' | 'az' | 'recent';

/** Ordena uma lista de IDs de páginas conforme o modo escolhido. */
export function sortPageIds(
  pages: Record<string, Page>,
  ids: string[],
  mode: SidebarSort
): string[] {
  if (mode === 'manual') return ids;
  const copy = [...ids];
  if (mode === 'az') {
    copy.sort((a, b) =>
      (pages[a]?.title || 'Sem título').localeCompare(pages[b]?.title || 'Sem título', 'pt-BR')
    );
  } else {
    copy.sort((a, b) => (pages[b]?.updatedAt ?? 0) - (pages[a]?.updatedAt ?? 0));
  }
  return copy;
}

/** IDs visíveis quando há filtro por tag (páginas com a tag + ancestrais). */
export function pagesMatchingTag(pages: Record<string, Page>, tag: string | null): Set<string> | null {
  if (!tag) return null;
  const out = new Set<string>();
  for (const page of Object.values(pages)) {
    if (!(page.tags ?? []).includes(tag)) continue;
    let cur: Page | undefined = page;
    while (cur) {
      out.add(cur.id);
      cur = cur.parentId ? pages[cur.parentId] : undefined;
    }
  }
  return out;
}
