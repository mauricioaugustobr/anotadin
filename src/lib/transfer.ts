// ---------------------------------------------------------------------------
// Exportar e importar páginas (arquivo .anotadin.json)
//
// O arquivo leva a página, suas subpáginas e todos os blocos, com imagens,
// ícones e capa embutidos como data URL. A ordem vem das listas `blockOrder`
// e `children`, preservadas como estão. Na importação, todos os IDs são
// renovados para não colidir com o que já existe no navegador.
// ---------------------------------------------------------------------------

import { uid } from './id';
import { normalize } from './richText';
import { useAppStore } from '@/store/appStore';
import { BLOCK_LABELS } from '@/types';
import type { Block, BlockType, Page, PageCover, RichSegment, RichText } from '@/types';

export const EXPORT_FORMAT = 'anotadin-page';
export const EXPORT_VERSION = 1;

export interface PageBundle {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  rootPageId: string;
  pages: Record<string, Page>;
  blocks: Record<string, Block>;
}

/** Resultado da importação: páginas e blocos com IDs novos, prontos para o store. */
export interface ImportedPages {
  rootPageId: string;
  pages: Record<string, Page>;
  blocks: Record<string, Block>;
}

// ---------------------------------------------------------------------------
// Exportação
// ---------------------------------------------------------------------------

export function buildPageBundle(
  pages: Record<string, Page>,
  blocks: Record<string, Block>,
  pageId: string
): PageBundle | null {
  if (!pages[pageId]) return null;
  const outPages: Record<string, Page> = {};
  const outBlocks: Record<string, Block> = {};

  const walkBlock = (bid: string) => {
    const b = blocks[bid];
    if (!b || outBlocks[bid]) return;
    outBlocks[bid] = JSON.parse(JSON.stringify(b)) as Block;
    b.children.forEach(walkBlock);
  };
  const walkPage = (pid: string) => {
    const p = pages[pid];
    if (!p || outPages[pid]) return;
    outPages[pid] = JSON.parse(JSON.stringify(p)) as Page;
    p.blockOrder.forEach(walkBlock);
    p.children.forEach(walkPage);
  };
  walkPage(pageId);

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    rootPageId: pageId,
    pages: outPages,
    blocks: outBlocks,
  };
}

export function bundleFileName(title: string): string {
  const base = (title || 'Sem título')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base || 'pagina'}.anotadin.json`;
}

export function downloadBundle(bundle: PageBundle): void {
  const title = bundle.pages[bundle.rootPageId]?.title ?? '';
  const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = bundleFileName(title);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Baixa a página (com subpáginas) do estado atual como arquivo. */
export function exportPageToFile(pageId: string): void {
  const { pages, blocks } = useAppStore.getState();
  const bundle = buildPageBundle(pages, blocks, pageId);
  if (bundle) downloadBundle(bundle);
}

/** Lê um arquivo exportado e adiciona a página na raiz. Retorna a mensagem de erro, se houver. */
export async function importPageFromFile(file: File): Promise<string | null> {
  try {
    const data = parsePageBundle(await file.text());
    useAppStore.getState().importPages(data);
    return null;
  } catch (err) {
    return err instanceof ImportError ? err.message : 'Não foi possível importar o arquivo.';
  }
}

// ---------------------------------------------------------------------------
// Importação (validação + IDs novos)
// ---------------------------------------------------------------------------

export class ImportError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Imagens só como data URL de imagem (o que o próprio app gera). */
function safeImageSrc(v: unknown): string {
  const s = str(v);
  return /^data:image\/[\w.+-]+;base64,[A-Za-z0-9+/=\s]*$/.test(s) ? s : '';
}

function safeLink(v: unknown): string | undefined {
  const s = str(v).trim();
  if (!s) return undefined;
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(s)) return s;
  // Sem protocolo (ex.: "exemplo.com") é aceito; qualquer outro esquema é descartado.
  return /^[a-z][a-z0-9+.-]*:/i.test(s) ? undefined : s;
}

function cleanRich(v: unknown): RichText {
  if (!Array.isArray(v)) return normalize([]);
  const segs: RichSegment[] = [];
  for (const raw of v) {
    if (!isObj(raw)) continue;
    const seg: RichSegment = { text: str(raw.text) };
    for (const k of ['bold', 'italic', 'underline', 'strikethrough', 'code'] as const) {
      if (raw[k] === true) seg[k] = true;
    }
    const link = safeLink(raw.link);
    if (link) seg.link = link;
    if (typeof raw.color === 'string' && /^[a-z]+$/.test(raw.color)) seg.color = raw.color;
    if (typeof raw.bg === 'string' && /^[a-z]+$/.test(raw.bg)) seg.bg = raw.bg;
    segs.push(seg);
  }
  return normalize(segs);
}

function cleanCover(v: unknown): PageCover | null {
  if (!isObj(v)) return null;
  if (v.type === 'image') {
    const src = safeImageSrc(v.value);
    return src ? { type: 'image', value: src } : null;
  }
  if (v.type === 'gradient' && typeof v.value === 'string' && /^[\w-]+$/.test(v.value)) {
    return { type: 'gradient', value: v.value };
  }
  return null;
}

export function parsePageBundle(text: string): ImportedPages {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('O arquivo não é um JSON válido.');
  }
  if (!isObj(data) || data.format !== EXPORT_FORMAT) {
    throw new ImportError('Este arquivo não é uma página exportada do ANOTADIN.');
  }
  if (typeof data.version !== 'number' || data.version > EXPORT_VERSION) {
    throw new ImportError('Este arquivo foi exportado por uma versão mais nova do ANOTADIN. Atualize o app.');
  }
  const srcPages = isObj(data.pages) ? data.pages : {};
  const srcBlocks = isObj(data.blocks) ? data.blocks : {};
  const rootSrcId = str(data.rootPageId);
  if (!isObj(srcPages[rootSrcId])) throw new ImportError('O arquivo não tem a página principal.');

  const pageIdMap = new Map<string, string>();
  const blockIdMap = new Map<string, string>();
  const pages: Record<string, Page> = {};
  const blocks: Record<string, Block> = {};
  const now = Date.now();

  // Blocos: percorre a partir da ordem de cada página, sem repetir e sem ciclos.
  const importBlock = (srcId: string, pageId: string): string | null => {
    if (blockIdMap.has(srcId)) return null;
    const raw = srcBlocks[srcId];
    if (!isObj(raw)) return null;
    const type = str(raw.type) as BlockType;
    if (!(type in BLOCK_LABELS)) return null;
    const id = uid();
    blockIdMap.set(srcId, id);
    const b: Block = {
      id,
      type,
      content: cleanRich(raw.content),
      checked: raw.checked === true,
      collapsed: raw.collapsed === true,
      language: str(raw.language, 'texto simples'),
      children: [],
      pageId,
    };
    if (typeof raw.calloutIcon === 'string') b.calloutIcon = raw.calloutIcon.slice(0, 16);
    if (isObj(raw.table) && Array.isArray(raw.table.cells)) {
      b.table = { cells: raw.table.cells.map((row) => strArr(row)) };
    }
    if (Array.isArray(raw.columns)) {
      b.columns = raw.columns.filter(isObj).map((c) => ({ id: uid(), text: cleanRich(c.text) }));
    }
    if (isObj(raw.image)) {
      b.image = { src: safeImageSrc(raw.image.src), caption: str(raw.image.caption) };
    }
    blocks[id] = b;
    b.children = strArr(raw.children)
      .map((cid) => importBlock(cid, pageId))
      .filter((x): x is string => x !== null);
    return id;
  };

  const importPage = (srcId: string, parentId: string | null): string | null => {
    if (pageIdMap.has(srcId)) return null;
    const raw = srcPages[srcId];
    if (!isObj(raw)) return null;
    const id = uid();
    pageIdMap.set(srcId, id);
    const page: Page = {
      id,
      title: str(raw.title),
      icon: typeof raw.icon === 'string' ? raw.icon.slice(0, 16) : null,
      iconImage: safeImageSrc(raw.iconImage) || null,
      cover: cleanCover(raw.cover),
      tags: strArr(raw.tags),
      favorite: false,
      parentId,
      children: [],
      blockOrder: [],
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
      updatedAt: now,
    };
    pages[id] = page;
    page.blockOrder = strArr(raw.blockOrder)
      .map((bid) => importBlock(bid, id))
      .filter((x): x is string => x !== null);
    page.children = strArr(raw.children)
      .map((cid) => importPage(cid, id))
      .filter((x): x is string => x !== null);
    return id;
  };

  const rootPageId = importPage(rootSrcId, null)!;
  return { rootPageId, pages, blocks };
}
