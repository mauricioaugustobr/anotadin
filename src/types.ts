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
  /** Cor do texto (nome da paleta). */
  color?: string;
  /** Cor de destaque do fundo (nome da paleta). */
  bg?: string;
}

/** Conteúdo rico de um bloco: lista de segmentos com estilos próprios. */
export type RichText = RichSegment[];

export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'toggle_heading_1'
  | 'toggle_heading_2'
  | 'toggle_heading_3'
  | 'bulleted_list'
  | 'numbered_list'
  | 'to_do'
  | 'toggle'
  | 'quote'
  | 'code'
  | 'divider'
  | 'callout'
  | 'image'
  | 'table'
  | 'columns';

/** Coluna de texto lado a lado. */
export interface ColumnData {
  id: string;
  text: RichText;
}

export interface TableData {
  /** Células em texto simples: cells[linha][coluna]. */
  cells: string[][];
}

export interface ImageData {
  /** Data URL da imagem. */
  src: string;
  caption: string;
}

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
  /** Emoji do bloco de chamada. */
  calloutIcon?: string;
  /** Dados de tabela. */
  table?: TableData;
  /** Colunas de texto. */
  columns?: ColumnData[];
  /** Imagem do bloco. */
  image?: ImageData;
}

export interface PageCover {
  type: 'gradient' | 'image';
  /** Nome/id do gradiente ou data URL da imagem. */
  value: string;
}

export interface Page {
  id: string;
  title: string;
  /** Emoji exibido como ícone da página. */
  icon: string | null;
  /** Data URL quando o ícone é uma imagem enviada. */
  iconImage?: string | null;
  /** Capa da página. */
  cover?: PageCover | null;
  /** Etiquetas da página. */
  tags?: string[];
  /** Página favorita (fixada na barra lateral). */
  favorite?: boolean;
  /** null = página na raiz. */
  parentId: string | null;
  /** IDs das subpáginas, na ordem. */
  children: string[];
  /** IDs dos blocos de nível raiz, na ordem. */
  blockOrder: string[];
  createdAt: number;
  updatedAt: number;
}

/** Versão salva de uma página (histórico). */
export interface PageVersion {
  id: string;
  at: number;
  title: string;
  icon: string | null;
  iconImage: string | null;
  cover: PageCover | null;
  tags: string[];
  blockOrder: string[];
  blocks: Record<string, Block>;
}

/** Estado persistido do aplicativo. */
export interface PersistedData {
  pages: Record<string, Page>;
  blocks: Record<string, Block>;
  rootPageIds: string[];
  currentPageId: string | null;
  versions?: Record<string, PageVersion[]>;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: 'Texto',
  heading_1: 'Título 1',
  heading_2: 'Título 2',
  heading_3: 'Título 3',
  toggle_heading_1: 'Título recolhível 1',
  toggle_heading_2: 'Título recolhível 2',
  toggle_heading_3: 'Título recolhível 3',
  bulleted_list: 'Lista com marcadores',
  numbered_list: 'Lista numerada',
  to_do: 'Lista de tarefas',
  toggle: 'Alternador',
  quote: 'Citação',
  code: 'Código',
  divider: 'Divisor',
  callout: 'Chamada',
  image: 'Imagem',
  table: 'Tabela',
  columns: 'Colunas',
};

/** Tipos de bloco que aceitam blocos filhos (indentação). */
export function canHaveChildren(type: BlockType): boolean {
  return (
    type === 'bulleted_list' ||
    type === 'numbered_list' ||
    type === 'to_do' ||
    type === 'toggle' ||
    type === 'toggle_heading_1' ||
    type === 'toggle_heading_2' ||
    type === 'toggle_heading_3' ||
    type === 'quote' ||
    type === 'callout'
  );
}

export function isListType(type: BlockType): boolean {
  return type === 'bulleted_list' || type === 'numbered_list' || type === 'to_do';
}

export function isHeadingType(type: BlockType): boolean {
  return (
    type === 'heading_1' ||
    type === 'heading_2' ||
    type === 'heading_3' ||
    type === 'toggle_heading_1' ||
    type === 'toggle_heading_2' ||
    type === 'toggle_heading_3'
  );
}

export function isToggleHeading(type: BlockType): boolean {
  return (
    type === 'toggle_heading_1' ||
    type === 'toggle_heading_2' ||
    type === 'toggle_heading_3'
  );
}

/** Tons da paleta de cores (texto e destaque). */
export const TEXT_COLORS = [
  'gray',
  'brown',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'red',
] as const;

export type TextColor = (typeof TEXT_COLORS)[number];
