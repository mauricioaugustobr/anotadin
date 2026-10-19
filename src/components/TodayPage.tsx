// ---------------------------------------------------------------------------
// Página "Hoje": recentes, tarefas pendentes e favoritos
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { ArrowRight, CalendarDays, Check, ListTodo, Star } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { textOf } from '@/lib/richText';
import { formatDateTime } from '@/lib/utils';
import type { Block, Page } from '@/types';

interface TaskRef {
  page: Page;
  block: Block;
}

export function TodayPage() {
  const pages = useAppStore((s) => s.pages);
  const blocks = useAppStore((s) => s.blocks);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const toggleChecked = useAppStore((s) => s.toggleChecked);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
    []
  );

  const recent = useMemo(
    () =>
      Object.values(pages)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 8),
    [pages]
  );

  const tasks = useMemo(() => {
    const out: TaskRef[] = [];
    const walk = (page: Page, b: Block) => {
      if (b.type === 'to_do' && !b.checked) out.push({ page, block: b });
      b.children.forEach((cid) => {
        const child = blocks[cid];
        if (child) walk(page, child);
      });
    };
    for (const page of Object.values(pages)) {
      page.blockOrder.forEach((bid) => {
        const b = blocks[bid];
        if (b) walk(page, b);
      });
    }
    return out.slice(0, 30);
  }, [pages, blocks]);

  const favorites = useMemo(
    () => Object.values(pages).filter((p) => p.favorite).sort((a, b) => b.updatedAt - a.updatedAt),
    [pages]
  );

  const open = (id: string) => setCurrentPage(id);

  return (
    <div className="today-page">
      <div className="today-inner">
        <header className="today-head">
          <div className="today-kicker">
            <CalendarDays size={15} /> Hoje
          </div>
          <h1 className="today-title">{today}</h1>
          <p className="today-sub">Um panorama rápido do que você tem no ANOTADIN.</p>
        </header>

        <div className="today-grid">
          <section className="today-card">
            <h2 className="today-card-title">
              <ArrowRight size={15} /> Recentes
            </h2>
            <div className="today-list">
              {recent.map((p) => (
                <button key={p.id} className="today-item" onClick={() => open(p.id)}>
                  <span className="today-item-icon">
                    {p.iconImage ? <img src={p.iconImage} alt="" /> : p.icon ?? '📄'}
                  </span>
                  <span className="today-item-body">
                    <span className="today-item-title">{p.title || 'Sem título'}</span>
                    <span className="today-item-sub">{formatDateTime(p.updatedAt)}</span>
                  </span>
                </button>
              ))}
              {recent.length === 0 && <div className="today-empty">Nenhuma página ainda.</div>}
            </div>
          </section>

          <section className="today-card">
            <h2 className="today-card-title">
              <ListTodo size={15} /> Tarefas pendentes
            </h2>
            <div className="today-list">
              {tasks.map(({ page, block }) => (
                <div key={block.id} className="today-task">
                  <button
                    className="checkbox today-check"
                    title="Concluir tarefa"
                    onClick={() => toggleChecked(block.id)}
                  >
                    <Check size={12} strokeWidth={3} className="today-check-mark" />
                  </button>
                  <span className="today-task-text">{textOf(block.content) || 'Tarefa'}</span>
                  <button className="today-task-page" onClick={() => open(page.id)} title="Abrir página">
                    {page.iconImage ? <img src={page.iconImage} alt="" /> : page.icon ?? '📄'}
                  </button>
                </div>
              ))}
              {tasks.length === 0 && <div className="today-empty">Nenhuma tarefa pendente. 🎉</div>}
            </div>
          </section>

          <section className="today-card today-card-wide">
            <h2 className="today-card-title">
              <Star size={15} /> Favoritos
            </h2>
            <div className="today-favs">
              {favorites.map((p) => (
                <button key={p.id} className="today-fav" onClick={() => open(p.id)}>
                  <span className="today-item-icon">
                    {p.iconImage ? <img src={p.iconImage} alt="" /> : p.icon ?? '📄'}
                  </span>
                  <span className="today-item-title">{p.title || 'Sem título'}</span>
                </button>
              ))}
              {favorites.length === 0 && (
                <div className="today-empty">
                  Marque páginas com ⭐ no menu da página para vê-las aqui.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
