// ---------------------------------------------------------------------------
// Barra superior: navegação (breadcrumb), busca, tema e nova página
// ---------------------------------------------------------------------------

import { memo } from 'react';
import {
  CalendarDays,
  Check,
  ChevronRight,
  Moon,
  PanelLeft,
  Plus,
  Search,
  Star,
  Sun,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useUiStore } from '@/store/uiStore';

export const Topbar = memo(function Topbar() {
  const pages = useAppStore((s) => s.pages);
  const currentPageId = useAppStore((s) => s.currentPageId);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const createPage = useAppStore((s) => s.createPage);
  const updatePage = useAppStore((s) => s.updatePage);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const saveState = useUiStore((s) => s.saveState);
  const showToday = useUiStore((s) => s.showToday);

  const currentPage = currentPageId ? pages[currentPageId] : null;

  // Cadeia de ancestrais da página atual.
  const chain: Array<{ id: string; icon: string | null; iconImage?: string | null; title: string }> = [];
  let cur = currentPage;
  while (cur) {
    chain.unshift({ id: cur.id, icon: cur.icon, iconImage: cur.iconImage, title: cur.title || 'Sem título' });
    cur = cur.parentId ? pages[cur.parentId] : null;
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="icon-btn"
          title={sidebarOpen ? 'Recolher barra lateral' : 'Expandir barra lateral'}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <PanelLeft size={17} />
        </button>
        <nav className="breadcrumb">
          {showToday ? (
            <button className="crumb is-current">
              <CalendarDays size={14} />
              <span className="crumb-text">Hoje</span>
            </button>
          ) : (
            chain.map((p, i) => (
              <span key={p.id} className="crumb-wrap">
                {i > 0 && <ChevronRight size={13} className="crumb-sep" />}
                <button
                  className={`crumb${i === chain.length - 1 ? ' is-current' : ''}`}
                  onClick={() => setCurrentPage(p.id)}
                >
                  {p.iconImage ? (
                    <img src={p.iconImage} alt="" className="crumb-img" />
                  ) : (
                    p.icon && <span className="crumb-icon">{p.icon}</span>
                  )}
                  <span className="crumb-text">{p.title}</span>
                </button>
              </span>
            ))
          )}
        </nav>
      </div>

      <div className="topbar-right">
        <span className={`save-indicator${saveState === 'saved' ? ' is-saved' : ''}`} title="Suas notas são salvas automaticamente">
          {saveState === 'saving' ? 'Salvando…' : saveState === 'saved' ? <><Check size={12} /> Salvo</> : ''}
        </span>
        {!showToday && currentPage && (
          <button
            className={`icon-btn${currentPage.favorite ? ' is-fav' : ''}`}
            title={currentPage.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            onClick={() => updatePage(currentPage.id, { favorite: !currentPage.favorite }, 'structural')}
          >
            <Star size={17} fill={currentPage.favorite ? 'currentColor' : 'none'} />
          </button>
        )}
        <button className="search-btn" onClick={() => setSearchOpen(true)}>
          <Search size={15} />
          <span className="search-label">Pesquisar…</span>
          <kbd className="kbd">Ctrl P</kbd>
        </button>
        <button className="icon-btn" title="Alternar tema (Ctrl+Shift+L)" onClick={toggleTheme}>
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        <button className="btn-primary" onClick={() => createPage({ parentId: null })}>
          <Plus size={15} strokeWidth={2.5} />
          <span>Nova página</span>
        </button>
      </div>
    </header>
  );
});
