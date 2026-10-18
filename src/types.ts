// ---------------------------------------------------------------------------
// ANOTADIN — tipos centrais do modelo de dados
// ---------------------------------------------------------------------------

export type Theme = 'light' | 'dark';

/** Um segmento de texto rico dentro de um bloco. */
export interface RichSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  link?: string;
}

/** Conteúdo rico de um bloco: lista de segmentos com estilos próprios. */
export type RichText = RichSegment[];

export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list'
  | 'numbered_list'
  | 'to_do'
  | 'toggle'
  | 'quote'
  | 'code'
  | 'divider'
  | 'callout';

export interface Block {
  id: string;
  type: BlockType;
  content: RichText;
  checked?: boolean;
  collapsed?: boolean;
  language?: string;
  /** Blocos filhos (listas aninhadas, conteúdo de alternadores etc.). */
  children: string[];
  /** Página à qual o bloco pertence (para busca). */
  pageId: string;
}

export interface Page {
  id: string;
  title: string;
  /** Emoji exibido como ícone da página. */
  icon: string | null;
  /** null = página na raiz. */
  parentId: string | null;
  /** IDs das subpáginas, na ordem. */
  children: string[];
  /** IDs dos blocos de nível raiz, na ordem. */
  blockOrder: string[];
  createdAt: number;
  updatedAt: number;
}

/** Estado persistido do aplicativo. */
export interface PersistedData {
  pages: Record<string, Page>;
  blocks: Record<string, Block>;
  rootPageIds: string[];
  currentPageId: string | null;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: 'Texto',
  heading_1: 'Título 1',
  heading_2: 'Título 2',
  heading_3: 'Título 3',
  bulleted_list: 'Lista com marcadores',
  numbered_list: 'Lista numerada',
  to_do: 'Lista de tarefas',
  toggle: 'Alternador',
  quote: 'Citação',
  code: 'Código',
  divider: 'Divisor',
  callout: 'Chamada',
};

/** Tipos de bloco que aceitam blocos filhos (indentação). */
export function canHaveChildren(type: BlockType): boolean {
  return (
    type === 'bulleted_list' ||
    type === 'numbered_list' ||
    type === 'to_do' ||
    type === 'toggle' ||
    type === 'quote' ||
    type === 'callout'
  );
}

export function isListType(type: BlockType): boolean {
  return type === 'bulleted_list' || type === 'numbered_list' || type === 'to_do';
}
