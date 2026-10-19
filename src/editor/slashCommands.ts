// ---------------------------------------------------------------------------
// Comandos do menu "/" (compartilhados entre BlockItem e SlashMenu)
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react';
import { norm } from '@/lib/utils';
import type { BlockType } from '@/types';

export interface SlashCommand {
  type: BlockType;
  label: string;
  hint?: string;
  icon?: ReactNode;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { type: 'paragraph', label: 'Texto' },
  { type: 'heading_1', label: 'Título 1' },
  { type: 'heading_2', label: 'Título 2' },
  { type: 'heading_3', label: 'Título 3' },
  { type: 'toggle_heading_1', label: 'Título recolhível 1' },
  { type: 'toggle_heading_2', label: 'Título recolhível 2' },
  { type: 'toggle_heading_3', label: 'Título recolhível 3' },
  { type: 'bulleted_list', label: 'Lista com marcadores' },
  { type: 'numbered_list', label: 'Lista numerada' },
  { type: 'to_do', label: 'Lista de tarefas' },
  { type: 'toggle', label: 'Alternador' },
  { type: 'quote', label: 'Citação' },
  { type: 'callout', label: 'Chamada' },
  { type: 'code', label: 'Código' },
  { type: 'image', label: 'Imagem' },
  { type: 'table', label: 'Tabela' },
  { type: 'columns', label: 'Colunas' },
  { type: 'divider', label: 'Divisor' },
];

export function filterSlash(query: string): SlashCommand[] {
  const nq = norm(query.trim());
  if (!nq) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((c) => norm(c.label).includes(nq));
}
