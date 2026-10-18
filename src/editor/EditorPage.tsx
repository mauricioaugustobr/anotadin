// ---------------------------------------------------------------------------
// Página do editor: cabeçalho (ícone, título, datas) + área de blocos
// ---------------------------------------------------------------------------

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Dices, Plus, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { formatDate } from '@/lib/utils';
import type { Page } from '@/types';
import { BlocksArea } from './BlocksArea';

const EMOJIS = [
  '📝', '📌', '📚', '📅', '📊', '📈', '📋', '🗂', '📁', '📄', '📃', '✏️', '🖊️', '🗒️',
  '💡', '💭', '🧠', '⚡', '✨', '🔥', '⭐', '🌟', '💎', '🎯', '🎨', '🎵', '🎮', '🧩',
  '🚀', '🌱', '🍀', '🌈', '🌍', '🌙', '☀️', '☕', '🍕', '💼', '🏠', '💰', '🛒', '✅',
  '❗', '❓', '🔍', '🔒', '🔓', '🔖', '🏷️', '🧷', '📍', '🚩', '🎁', '🏆', '🥇', '❤️',
  '👍', '👏', '🙌', '💪', '🎉', '🐣', '🦄', '🐙', '🦋', '🌊', '🧭', '🔧', '🛠️', '🗓️',
];

export function EditorPage({ pageId }: { pageId: string }) {
  const page = useAppStore((s) => s.pages[pageId]);

  useEffect(() => {
    document.title = page ? `${page.title || 'Sem título'} · ANOTADIN` : 'ANOTADIN';
  }, [page?.title]);

  if (!page) return null;

  return (
    <div className="page">
      <div className="page-content">
        <PageHeader page={page} />
        <BlocksArea key={pageId} page={page} />
        <div className="page-bottom-spacer" />
      </div>
    </div>
  );
}

const PageHeader = memo(function PageHeader({ page }: { page: Page }) {
  const updatePage = useAppStore((s) => s.updatePage);
  const titleRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Fecha o seletor de emojis ao clicar fora.
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.page-icon-row')) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  const setIcon = useCallback(
    (icon: string | null) => {
      updatePage(page.id, { icon }, 'structural');
      setPickerOpen(false);
    },
    [page.id, updatePage]
  );

  const randomIcon = useCallback(() => {
    const current = page.icon;
    let next = current;
    while (next === current) {
      next = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    }
    setIcon(next);
  }, [page.icon, setIcon]);

  const handleTitleInput = (e: React.FormEvent<HTMLDivElement>) => {
    updatePage(page.id, { title: e.currentTarget.textContent ?? '' });
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
      // Foca o primeiro bloco editável da página.
      const editable = document.querySelector<HTMLElement>('.blocks [data-editable="true"]');
      editable?.focus();
      const sel = window.getSelection();
      if (sel && editable) {
        sel.selectAllChildren(editable);
        sel.collapseToEnd();
      }
    }
  };

  return (
    <header className="page-header">
      <div className="page-icon-row">
        {page.icon ? (
          <button
            className="page-icon has-icon"
            title="Alterar ícone"
            onClick={() => setPickerOpen((v) => !v)}
          >
            <span className="page-icon-emoji">{page.icon}</span>
            <span className="page-icon-edit">Alterar ícone</span>
          </button>
        ) : (
          <button className="page-icon is-empty" title="Adicionar ícone" onClick={() => setPickerOpen((v) => !v)}>
            <Plus size={16} />
            <span>Adicionar ícone</span>
          </button>
        )}
        {pickerOpen && (
          <div className="emoji-picker" onMouseDown={(e) => e.preventDefault()}>
            <div className="emoji-picker-head">
              <span>Ícone da página</span>
              <button
                className="emoji-random"
                title="Ícone aleatório"
                onClick={(e) => {
                  e.stopPropagation();
                  randomIcon();
                }}
              >
                <Dices size={14} /> Aleatório
              </button>
            </div>
            <div className="emoji-grid">
              {EMOJIS.map((em) => (
                <button key={em} className="emoji-cell" onClick={() => setIcon(em)}>
                  {em}
                </button>
              ))}
            </div>
            {page.icon && (
              <button className="emoji-remove" onClick={() => setIcon(null)}>
                <X size={13} /> Remover ícone
              </button>
            )}
          </div>
        )}
      </div>

      <div
        ref={titleRef}
        className="page-title"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-placeholder="Sem título"
        onInput={handleTitleInput}
        onKeyDown={handleTitleKeyDown}
      >
        {page.title}
      </div>

      <div className="page-meta">
        Criado em {formatDate(page.createdAt)}
        {page.updatedAt - page.createdAt > 60_000 && ` · Editado em ${formatDate(page.updatedAt)}`}
      </div>
    </header>
  );
});
