// ---------------------------------------------------------------------------
// Barra lateral: logo, nova página, Hoje, favoritos, filtros e árvore
// ---------------------------------------------------------------------------

import { useCallback, useMemo, useState } from 'react';
import { ArrowUpDown, ChevronDown, Filter, Plus, Star, Sun, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useUiStore } from '@/store/uiStore';
import { collectTags, pagesMatchingTag, sortPageIds, tagColor } from '@/lib/tags';
import { countAllWords } from '@/lib/words';
import { PAGE_TEMPLATES, type PageTemplate } from '@/lib/templates';
import { PageTreeItem } from './PageTreeItem';
import { Menu, type MenuItemSpec } from './Menu';

export function Sidebar() {
  const rootPageIds = useAppStore((s) => s.rootPageIds);
  const pages = useAppStore((s) => s.pages);
  const blocks = useAppStore((s) => s.blocks);
  const currentPageId = useAppStore((s) => s.currentPageId);
  const createPage = useAppStore((s) => s.createPage);
  const createBlock = useAppStore((s) => s.createBlock);
  const updateBlock = useAppStore((s) => s.updateBlock);
  const deleteBlock = useAppStore((s) => s.deleteBlock);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const showToday = useUiStore((s) => s.showToday);
  const setShowToday = useUiStore((s) => s.setShowToday);
  const sidebarSort = useUiStore((s) => s.sidebarSort);
  const setSidebarSort = useUiStore((s) => s.setSidebarSort);
  const tagFilter = useUiStore((s) => s.tagFilter);
  const setTagFilter = useUiStore((s) => s.setTagFilter);
  const [over, setOver] = useState(false);
  const [templatesMenu, setTemplatesMenu] = useState<{ x: number; y: number } | null>(null);
  const [sortMenu, setSortMenu] = useState<{ x: number; y: number } | null>(null);
  const [filterMenu, setFilterMenu] = useState<{ x: number; y: number } | null>(null);

  const moveToRoot = useAppStore((s) => s.movePage);

  const tags = useMemo(() => collectTags(pages), [pages]);
  const visibleIds = useMemo(() => pagesMatchingTag(pages, tagFilter), [pages, tagFilter]);
  const favorites = useMemo(
    () => Object.values(pages).filter((p) => p.favorite).sort((a, b) => b.updatedAt - a.updatedAt),
    [pages]
  );
  const totalWords = useMemo(() => countAllWords(pages, blocks), [pages, blocks]);
  const visibleRoots = useMemo(
    () =>
      (visibleIds
        ? sortPageIds(pages, rootPageIds, sidebarSort).filter((id) => visibleIds.has(id))
        : sortPageIds(pages, rootPageIds, sidebarSort)),
    [pages, rootPageIds, sidebarSort, visibleIds]
  );

  const handleNewPage = useCallback(() => {
    createPage({ parentId: null });
  }, [createPage]);

  const createFromTemplate = (template: PageTemplate) => {
    setTemplatesMenu(null);
    const state = useAppStore.getState();
    const pageId = state.createPage({
      parentId: null,
      title: template.id === 'blank' ? '' : template.name,
      icon: template.id === 'blank' ? null : template.icon,
      open: true,
    });
    const initial = useAppStore.getState().pages[pageId]?.blockOrder[0];
    template.blocks.forEach((spec, i) => {
      const bid = createBlock(pageId, null, i, spec.type, spec.content);
      if (spec.checked) updateBlock(bid, { checked: true }, 'structural');
    });
    if (template.blocks.length > 0 && initial) deleteBlock(initial);
  };

  const openTemplates = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTemplatesMenu({ x: rect.left, y: rect.bottom + 4 });
  };

  const openSort = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setSortMenu({ x: rect.left - 140, y: rect.bottom + 4 });
  };

  const openFilter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFilterMenu({ x: rect.left - 160, y: rect.bottom + 4 });
  };

  const templateItems: MenuItemSpec[] = PAGE_TEMPLATES.map((t) => ({
    label: t.name,
    icon: <span className="menu-emoji">{t.icon}</span>,
    onClick: () => createFromTemplate(t),
  }));

  const sortItems: MenuItemSpec[] = [
    { label: 'Manual (arrastar)', onClick: () => setSidebarSort('manual') },
    { label: 'A → Z', onClick: () => setSidebarSort('az') },
    { label: 'Mais recentes', onClick: () => setSidebarSort('recent') },
  ].map((item, i) => ({
    ...item,
    icon: sidebarSort === (['manual', 'az', 'recent'] as const)[i] ? <span className="menu-check">✓</span> : undefined,
  }));

  const filterItems: MenuItemSpec[] = [
    {
      label: 'Todas as páginas',
      onClick: () => setTagFilter(null),
      icon: tagFilter === null ? <span className="menu-check">✓</span> : undefined,
    },
    ...tags.map((t) => ({
      label: `${t.name} (${t.count})`,
      icon: <span className={`tag-dot tag-${tagColor(t.name)}`} />,
      onClick: () => setTagFilter(t.name),
    })),
  ];

  return (
    <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`}>
      <div className="sidebar-head">
        <span className="logo">
          <span className="logo-mark">A</span>
          <span className="logo-text">ANOTADIN</span>
        </span>
      </div>

      <div className="new-page-row">
        <button className="new-page-btn" onClick={handleNewPage}>
          <Plus size={15} strokeWidth={2.5} />
          <span>Nova página</span>
        </button>
        <button className="new-page-caret" title="Modelos de página" onClick={openTemplates}>
          <ChevronDown size={14} />
        </button>
      </div>

      <button
        className={`today-btn${showToday ? ' is-active' : ''}`}
        onClick={() => setShowToday(true)}
      >
        <Sun size={15} />
        <span>Hoje</span>
      </button>

      {favorites.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <Star size={11} fill="currentColor" /> Favoritos
          </div>
          {favorites.map((p) => (
            <button
              key={p.id}
              className={`fav-item${p.id === currentPageId && !showToday ? ' is-active' : ''}`}
              onClick={() => setCurrentPage(p.id)}
            >
              <span className="tree-icon">
                {p.iconImage ? <img src={p.iconImage} alt="" className="tree-icon-img" /> : p.icon ?? '📄'}
              </span>
              <span className="tree-label">{p.title || 'Sem título'}</span>
            </button>
          ))}
        </div>
      )}

      <div className="tree-controls">
        <span className="sidebar-section-title">Páginas</span>
        <span className="tree-controls-actions">
          <button
            className={`tree-ctrl${tagFilter ? ' is-active' : ''}`}
            title="Filtrar por etiqueta"
            onClick={openFilter}
          >
            <Filter size={13} />
          </button>
          <button className="tree-ctrl" title="Ordenar páginas" onClick={openSort}>
            <ArrowUpDown size={13} />
          </button>
        </span>
      </div>

      {tagFilter && (
        <div className="filter-pill-wrap">
          <span className={`filter-pill tag-${tagColor(tagFilter)}`}>
            {tagFilter}
            <button title="Limpar filtro" onClick={() => setTagFilter(null)}>
              <X size={11} />
            </button>
          </span>
        </div>
      )}

      <div
        className={`page-tree${over ? ' is-over-root' : ''}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('text/x-anotadin-page')) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
        }}
        onDrop={(e) => {
          const id = e.dataTransfer.getData('text/x-anotadin-page');
          if (id) {
            e.preventDefault();
            moveToRoot(id, null, rootPageIds.length);
          }
          setOver(false);
        }}
      >
        {visibleRoots.map((id) => (
          <PageTreeItem key={id} pageId={id} depth={0} visibleIds={visibleIds} />
        ))}
        {visibleRoots.length === 0 && (
          <div className="tree-empty">
            {tagFilter ? 'Nenhuma página com esta etiqueta' : 'Nenhuma página ainda'}
          </div>
        )}
      </div>

      <div className="sidebar-foot">
        <span className="sidebar-foot-text">
          {Object.keys(pages).length} páginas · {totalWords.toLocaleString('pt-BR')} palavras
        </span>
      </div>

      {templatesMenu && (
        <Menu x={templatesMenu.x} y={templatesMenu.y} items={templateItems} onClose={() => setTemplatesMenu(null)} minWidth={220} />
      )}
      {sortMenu && <Menu x={sortMenu.x} y={sortMenu.y} items={sortItems} onClose={() => setSortMenu(null)} />}
      {filterMenu && <Menu x={filterMenu.x} y={filterMenu.y} items={filterItems} onClose={() => setFilterMenu(null)} />}
    </aside>
  );
}
