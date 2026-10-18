// ---------------------------------------------------------------------------
// Busca global (Ctrl+P): pesquisa títulos e conteúdo dos blocos
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { FilePlus2, Search, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useUiStore } from '@/store/uiStore';
import { textOf } from '@/lib/richText';
import { norm } from '@/lib/utils';
import type { Page } from '@/types';

interface Result {
  page: Page;
  score: number;
  snippet: string | null;
}

const MAX_RESULTS = 20;

export function SearchModal() {
  const pages = useAppStore((s) => s.pages);
  const blocks = useAppStore((s) => s.blocks);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const createPage = useAppStore((s) => s.createPage);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const results = useMemo<Result[]>(() => {
    const q = norm(query.trim());
    const list: Result[] = [];
    for (const page of Object.values(pages)) {
      const titleN = norm(page.title || 'Sem título');
      let score = 0;
      let snippet: string | null = null;
      if (!q) {
        score = page.updatedAt;
      } else {
        if (titleN === q) score = 300;
        else if (titleN.startsWith(q)) score = 250;
        else if (titleN.includes(q)) score = 200;
        // Busca no conteúdo dos blocos.
        for (const bid of page.blockOrder) {
          const b = blocks[bid];
          if (!b) continue;
          const text = textOf(b.content);
          const idx = norm(text).indexOf(q);
          if (idx >= 0) {
            score = Math.max(score, 100);
            const start = Math.max(0, idx - 30);
            const end = Math.min(text.length, idx + q.length + 60);
            snippet = `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
          }
        }
      }
      if (score > 0) list.push({ page, score, snippet });
    }
    if (q) list.sort((a, b) => b.score - a.score);
    else list.sort((a, b) => b.score - a.score);
    return list.slice(0, MAX_RESULTS);
  }, [pages, blocks, query]);

  const open = (pageId: string) => {
    setSearchOpen(false);
    setCurrentPage(pageId);
  };

  const createFromQuery = () => {
    const title = query.trim();
    const id = createPage({ parentId: null, title });
    setSearchOpen(false);
    setCurrentPage(id);
  };

  const exactExists = results.some((r) => norm(r.page.title).includes(norm(query.trim())));

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[active];
      if (r) open(r.page.id);
      else if (query.trim()) createFromQuery();
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector('.search-result.is-active');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => {
      if (e.target === e.currentTarget) setSearchOpen(false);
    }}>
      <div className="search-modal" onKeyDown={handleKey}>
        <div className="search-input-row">
          <Search size={16} className="search-input-icon" />
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Pesquisar páginas e conteúdo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="search-close" onClick={() => setSearchOpen(false)}>
            <X size={15} />
          </button>
        </div>

        <div className="search-results" ref={listRef}>
          {results.map((r, i) => (
            <button
              key={r.page.id}
              className={`search-result${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => open(r.page.id)}
            >
              <span className="search-result-icon">{r.page.icon ?? '📄'}</span>
              <span className="search-result-body">
                <span className="search-result-title">
                  <Highlight text={r.page.title || 'Sem título'} query={query} />
                </span>
                {r.snippet && <span className="search-result-snippet">{r.snippet}</span>}
              </span>
              <span className="search-result-hint">↵</span>
            </button>
          ))}

          {query.trim() && !exactExists && (
            <button className="search-result is-create" onClick={createFromQuery}>
              <span className="search-result-icon">
                <FilePlus2 size={15} />
              </span>
              <span className="search-result-body">
                <span className="search-result-title">Criar página “{query.trim()}”</span>
              </span>
            </button>
          )}

          {results.length === 0 && !query.trim() && (
            <div className="search-empty">Digite para buscar em suas páginas</div>
          )}
          {results.length === 0 && query.trim() && (
            <div className="search-empty">Nenhum resultado para “{query}”</div>
          )}
        </div>

        <div className="search-footer">
          <span><kbd className="kbd">↑↓</kbd> navegar</span>
          <span><kbd className="kbd">↵</kbd> abrir</span>
          <span><kbd className="kbd">Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = norm(text).indexOf(norm(q));
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="hl">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}
