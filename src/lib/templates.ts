// ---------------------------------------------------------------------------
// Modelos de página prontos
// ---------------------------------------------------------------------------

import { emptyText } from './richText';
import type { BlockType, RichText, RichSegment } from '@/types';

export interface TemplateBlockSpec {
  type: BlockType;
  content: RichText;
  checked?: boolean;
}

export interface PageTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  blocks: TemplateBlockSpec[];
}

function seg(text: string, extra: Partial<RichSegment> = {}): RichSegment {
  return { text, ...extra };
}

function rt(...segments: RichSegment[]): RichText {
  return segments;
}

function h1(text: string): TemplateBlockSpec {
  return { type: 'heading_1', content: rt(seg(text)) };
}

function h2(text: string): TemplateBlockSpec {
  return { type: 'heading_2', content: rt(seg(text)) };
}

function p(...segments: RichSegment[]): TemplateBlockSpec {
  return { type: 'paragraph', content: segments.length ? rt(...segments) : emptyText() };
}

function bullet(text: string): TemplateBlockSpec {
  return { type: 'bulleted_list', content: rt(seg(text)) };
}

function todo(text: string, checked = false): TemplateBlockSpec {
  return { type: 'to_do', content: rt(seg(text)), checked };
}

const today = () =>
  new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date()
  );

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'blank',
    name: 'Página em branco',
    icon: '📄',
    description: 'Começar do zero',
    blocks: [],
  },
  {
    id: 'daily',
    name: 'Diário',
    icon: '🌙',
    description: 'Reflexões e tarefas do dia',
    blocks: [
      h1(`Diário — ${today()}`),
      p(seg('Como foi o dia? O que merece ser lembrado?', { italic: true })),
      h2('🙏 Gratidão'),
      bullet('Algo bom que aconteceu hoje'),
      h2('✅ Tarefas'),
      todo('Revisar as prioridades de amanhã'),
      h2('💭 Pensamentos'),
      p(),
    ],
  },
  {
    id: 'meeting',
    name: 'Reunião',
    icon: '👥',
    description: 'Pauta, decisões e ações',
    blocks: [
      h1('Reunião de equipe'),
      p(seg('Data: '), seg(today(), { bold: true }), seg('  ·  Participantes: ')),
      h2('📋 Pauta'),
      bullet('Tópico 1'),
      bullet('Tópico 2'),
      h2('✅ Decisões'),
      p(),
      h2('🚀 Ações'),
      todo('Responsável — tarefa (prazo)'),
    ],
  },
  {
    id: 'project',
    name: 'Projeto',
    icon: '🚀',
    description: 'Objetivo, escopo e marcos',
    blocks: [
      h1('Nome do projeto'),
      p(seg('Objetivo: ', { bold: true }), seg('descreva em uma frase o que é sucesso.')),
      h2('🎯 Escopo'),
      bullet('O que está dentro'),
      bullet('O que está fora'),
      h2('🗓️ Marcos'),
      todo('Marco 1 — data'),
      todo('Marco 2 — data'),
      h2('⚠️ Riscos'),
      p(),
      h2('🔗 Links úteis'),
      bullet('Referências e documentos'),
    ],
  },
  {
    id: 'tasks',
    name: 'Lista de tarefas',
    icon: '✅',
    description: 'Checklist simples e direto',
    blocks: [
      h1('Tarefas'),
      todo('Primeira tarefa'),
      todo('Segunda tarefa'),
      todo('Terceira tarefa'),
    ],
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    icon: '💡',
    description: 'Chuva de ideias sem julgamento',
    blocks: [
      h1('Brainstorm'),
      p(
        seg('Regra de ouro: ', { bold: true }),
        seg('quantidade primeiro, qualidade depois. Não julgue as ideias — escreva todas.', { italic: true })
      ),
      bullet('Ideia 1'),
      bullet('Ideia 2'),
      bullet('Ideia 3'),
      h2('⭐ Favoritas'),
      p(),
    ],
  },
  {
    id: 'study',
    name: 'Anotações de estudo',
    icon: '📚',
    description: 'Aula, resumo e revisão',
    blocks: [
      h1('Anotações de estudo'),
      p(seg('Tema: '), seg('assunto da aula', { italic: true })),
      h2('📝 Conceitos-chave'),
      bullet('Conceito 1'),
      bullet('Conceito 2'),
      h2('❓ Dúvidas'),
      p(),
      h2('🔁 Revisão'),
      todo('Revisar em 3 dias'),
      todo('Fazer resumo com minhas palavras'),
    ],
  },
];
