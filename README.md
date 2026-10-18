# ANOTADIN 📝

**ANOTADIN** é um aplicativo de notas open source com editor de blocos, inspirado no Notion. Feito para ser rápido, bonito e 100% local: seus dados ficam no seu navegador.

![License](https://img.shields.io/badge/licença-MIT-blue)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20Vite-3178c6)

## ✨ Funcionalidades

- **Editor de blocos** — parágrafo, títulos (H1–H3), listas com marcadores, listas numeradas, tarefas com checkbox, alternadores (toggle), citações, chamadas, código e divisores
- **Comandos `/`** — pressione `/` em qualquer lugar para transformar o bloco
- **Atalhos Markdown** — `#`, `##`, `###`, `-`, `1.`, `[]`, `>`, ``` ``` ``` e `---` no início da linha
- **Formatação inline** — negrito, itálico, sublinhado, riscado, código inline e links (barra de formatação ao selecionar texto ou atalhos `Ctrl+B/I/U/E/K`)
- **Arrastar e soltar** — mova blocos pelo indicador `⠿` e indente para aninhar; reorganize páginas na barra lateral
- **Páginas e subpáginas** — árvore ilimitada com ícones (emoji), renomear, duplicar e excluir
- **Busca global** — `Ctrl+P` pesquisa títulos e conteúdo dos blocos
- **Desfazer/refazer** — `Ctrl+Z` / `Ctrl+Shift+Z`
- **Tema claro/escuro** — `Ctrl+Shift+L`
- **Persistência local** — salvo automaticamente no IndexedDB do navegador (funciona offline)

## 🚀 Começando

Experimente online: **[mauricioaugustobr.github.io/anotadin](https://mauricioaugustobr.github.io/anotadin/)**

Para rodar localmente:

```bash
npm install
npm run dev
```

Abra http://localhost:5173 e comece a escrever. Para gerar a versão de produção:

```bash
npm run build   # gera em dist/
npm run preview # serve a versão de produção
```

## 🏗️ Estrutura

```
src/
├── lib/            # modelo de texto rico, blocos, IndexedDB, seed
├── store/          # estado global (zustand + immer) com histórico
├── editor/         # página do editor, blocos, menus e formatação
├── components/     # topbar, sidebar, árvore de páginas, busca
└── styles/         # temas, layout, editor e menus
```

## ⌨️ Atalhos de teclado

| Atalho | Ação |
| --- | --- |
| `/` | Menu de comandos |
| `Enter` | Novo bloco (continua listas; vazio sai da lista) |
| `Backspace` / `Delete` | Mesclar blocos nas bordas |
| `Tab` / `Shift+Tab` | Indentar / remover indentação |
| `↑` `↓` nas bordas | Navegar entre blocos |
| `Ctrl+B` / `I` / `U` / `E` | Negrito / itálico / sublinhado / código |
| `Ctrl+K` | Criar link |
| `Ctrl+P` | Buscar |
| `Ctrl+Shift+L` | Alternar tema |
| `Ctrl+Shift+N` | Nova página |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Desfazer / refazer |

## 🗺️ Roadmap

- Imagens e uploads
- Cores de texto e fundo
- Exportar/importar Markdown
- Sincronização entre dispositivos (backend)
- Colaboração em tempo real
- Atalho de formatação "pendente" (aplicar ao digitar)

## 📄 Licença

MIT — veja [LICENSE](LICENSE).

## ⚠️ Aviso

O ANOTADIN é um projeto independente inspirado na experiência do Notion. Não tem afiliação com a Notion Labs, Inc. Todo o código foi escrito do zero.
