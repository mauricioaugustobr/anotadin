// ---------------------------------------------------------------------------
// Conteúdo inicial (primeira execução)
// ---------------------------------------------------------------------------

import { makeBlock, makeCodeBlock } from './blocks';
import { emptyText } from './richText';
import type { Block, Page, PersistedData, RichSegment, RichText } from '@/types';

function seg(text: string, extra: Partial<RichSegment> = {}): RichSegment {
  return { text, ...extra };
}

function rt(...segments: RichSegment[]): RichText {
  return segments;
}

function buildPage(
  id: string,
  title: string,
  icon: string | null,
  parentId: string | null,
  blocks: Block[]
): Page {
  const now = Date.now();
  return {
    id,
    title,
    icon,
    parentId,
    children: [],
    blockOrder: blocks.map((b) => b.id),
    createdAt: now,
    updatedAt: now,
  };
}

export function seedData(): PersistedData {
  const blocks: Record<string, Block> = {};
  const pages: Record<string, Page> = {};
  const rootPageIds: string[] = [];

  const welcomeId = 'p_welcome';
  const ideasId = 'p_ideas';
  const subId = 'p_sub';

  // -------------------------------------------------------------------------
  // Página de boas-vindas
  // -------------------------------------------------------------------------
  const firstTodo = makeBlock('to_do', welcomeId, rt(seg('Explorar os blocos desta página')));
  firstTodo.checked = true;

  const welcomeBlocks: Block[] = [
    makeBlock(
      'paragraph',
      welcomeId,
      rt(
        seg('O '),
        seg('ANOTADIN', { bold: true }),
        seg(' é um aplicativo de notas '),
        seg('open source', { italic: true }),
        seg(' inspirado no Notion. Esta página mostra tudo o que você pode fazer — fique à vontade para editar, apagar e explorar. 🙂')
      )
    ),
    makeBlock('heading_1', welcomeId, rt(seg('✨ Blocos para tudo'))),
    makeBlock(
      'paragraph',
      welcomeId,
      rt(
        seg('Escreva '),
        seg('negrito', { bold: true }),
        seg(', '),
        seg('itálico', { italic: true }),
        seg(', '),
        seg('riscado', { strikethrough: true }),
        seg(' e '),
        seg('código', { code: true }),
        seg(' inline. Selecione um texto para ver a barra de formatação, ou use '),
        seg('Ctrl+B', { code: true }),
        seg(', '),
        seg('Ctrl+I', { code: true }),
        seg(', '),
        seg('Ctrl+E', { code: true }),
        seg(' e '),
        seg('Ctrl+K', { code: true }),
        seg(' para criar '),
        seg('links', { link: 'https://github.com', underline: true }),
        seg('.')
      )
    ),
    makeBlock('heading_2', welcomeId, rt(seg('💡 Dicas rápidas'))),
    makeBlock('bulleted_list', welcomeId, rt(seg('Digite '), seg('/', { code: true }), seg(' para abrir o menu de comandos'))),
    makeBlock(
      'bulleted_list',
      welcomeId,
      rt(
        seg('Use '),
        seg('#', { code: true }),
        seg(', '),
        seg('-', { code: true }),
        seg(' e '),
        seg('[]', { code: true }),
        seg(' no início da linha para atalhos Markdown')
      )
    ),
    makeBlock('bulleted_list', welcomeId, rt(seg('Arraste o '), seg('⠿', { code: true }), seg(' ao passar o mouse para mover blocos'))),
    makeBlock('bulleted_list', welcomeId, rt(seg('Pressione '), seg('Tab', { code: true }), seg(' e '), seg('Shift+Tab', { code: true }), seg(' para indentar'))),
    makeBlock('bulleted_list', welcomeId, rt(seg('Pressione '), seg('Ctrl+P', { code: true }), seg(' para pesquisar páginas'))),
    makeBlock('heading_2', welcomeId, rt(seg('📋 Listas e tarefas'))),
    firstTodo,
    makeBlock('to_do', welcomeId, rt(seg('Criar minha primeira página'))),
    makeBlock('to_do', welcomeId, rt(seg('Clicar no checkbox para marcar ✓'))),
    makeBlock('heading_2', welcomeId, rt(seg('💬 Citações e chamadas'))),
    makeBlock(
      'quote',
      welcomeId,
      rt(seg('A simplicidade é a sofisticação máxima.', { italic: true }), seg(' — Leonardo da Vinci'))
    ),
    makeBlock(
      'callout',
      welcomeId,
      rt(seg('Dica: pressione '), seg('Ctrl+Shift+L', { code: true }), seg(' para alternar entre o tema claro e o escuro.'))
    ),
    makeBlock('heading_2', welcomeId, rt(seg('🧑‍💻 Código'))),
    makeCodeBlock(
      welcomeId,
      "const anotadin = {\n  nome: 'ANOTADIN',\n  licenca: 'MIT',\n  inspiradoEm: 'Notion'\n};\n\nconsole.log('Olá, mundo!');",
      'javascript'
    ),
    makeBlock('divider', welcomeId, emptyText()),
    makeBlock(
      'paragraph',
      welcomeId,
      rt(
        seg('Cada página pode ter '),
        seg('subpáginas', { bold: true }),
        seg(' — passe o mouse sobre uma página na barra lateral e clique no '),
        seg('+', { code: true }),
        seg('. Esta página de boas-vindas tem uma subpágina de exemplo.')
      )
    ),
  ];

  // -------------------------------------------------------------------------
  // Página de ideias (com alternador)
  // -------------------------------------------------------------------------
  const toggle = makeBlock('toggle', ideasId, rt(seg('Projetos futuros')));
  const childA = makeBlock('bulleted_list', ideasId, rt(seg('Modo colaborativo em tempo real')));
  const childB = makeBlock('bulleted_list', ideasId, rt(seg('Exportação para Markdown')));
  toggle.children = [childA.id, childB.id];

  const ideasBlocks: Block[] = [
    makeBlock('heading_1', ideasId, rt(seg('Minhas ideias 💭'))),
    makeBlock('paragraph', ideasId, rt(seg('Um lugar para capturar pensamentos antes que eles escapem.'))),
    makeBlock('bulleted_list', ideasId, rt(seg('Estudar o código-fonte do ANOTADIN'))),
    makeBlock('bulleted_list', ideasId, rt(seg('Contribuir com o projeto no GitHub'))),
    toggle,
  ];

  // -------------------------------------------------------------------------
  // Subpágina de exemplo
  // -------------------------------------------------------------------------
  const subBlocks: Block[] = [
    makeBlock(
      'paragraph',
      subId,
      rt(
        seg('Esta é uma '),
        seg('subpágina', { bold: true }),
        seg('. Na barra lateral, você pode arrastar páginas para reorganizá-las ou aninhá-las dentro de outras.')
      )
    ),
    makeBlock('to_do', subId, rt(seg('Arrastar esta página para a raiz'))),
  ];

  // -------------------------------------------------------------------------
  // Montagem
  // -------------------------------------------------------------------------
  const welcome = buildPage(welcomeId, 'Bem-vindo ao ANOTADIN 👋', '📝', null, welcomeBlocks);
  const ideas = buildPage(ideasId, 'Minhas ideias', '💭', null, ideasBlocks);
  const sub = buildPage(subId, 'Subpágina de exemplo', '📄', welcomeId, subBlocks);

  welcome.children = [subId];
  ideas.updatedAt = Date.now() - 3600_000;

  pages[welcomeId] = welcome;
  pages[ideasId] = ideas;
  pages[subId] = sub;
  for (const b of [...welcomeBlocks, ...ideasBlocks, childA, childB, ...subBlocks]) {
    blocks[b.id] = b;
  }

  rootPageIds.push(welcomeId, ideasId);

  return { pages, blocks, rootPageIds, currentPageId: welcomeId };
}
