// ---------------------------------------------------------------------------
// Item da árvore de páginas: navegação, renomear, subpáginas, arrastar
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, FilePlus2, MoreHorizontal, Plus, Star } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useUiStore } from '@/store/uiStore';
import { sortPageIds } from '@/lib/tags';
import type { Page } from '@/types';
import { Menu } from './Menu';
import type { MenuItemSpec } from './Menu';

const PAGE_MIME = 'text/x-anotadin-page';

interface PageTreeItemProps {
  pageId: string;
  depth: number;
  visibleIds?: Set<string> | null;
}

type DropZone = 'before' | 'inside' | 'after' | null;

export function PageTreeItem({ pageId, depth, visibleIds }: PageTreeItemProps) {
  const page = useAppStore((s) => s.pages[pageId]);
  const children = useAppStore((s) => s.pages[pageId]?.children ?? []);
  const pages = useAppStore((s) => s.pages);
  const currentPageId = useAppStore((s) => s.currentPageId);
  const setCurrentPage = useAppStore((s) => s.setCurrentPage);
  const createPage = useAppStore((s) => s.createPage);
  const deletePage = useAppStore((s) => s.deletePage);
  const duplicatePage = useAppStore((s) => s.duplicatePage);
  const movePage = useAppStore((s) => s.movePage);
  const updatePage = useAppStore((s) => s.updatePage);
  const sidebarSort = useUiStore((s) => s.sidebarSort);

  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [dropZone, setDropZone] = useState<DropZone>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  const manualSort = sidebarSort === 'manual';

  const visibleChildren = useMemo(
    () =>
      sortPageIds(pages, children, sidebarSort).filter(
        (id) => !visibleIds || visibleIds.has(id)
      ),
    [pages, children, sidebarSort, visibleIds]
  );

  if (!page) return null;

  const isActive = currentPageId === pageId;
  const hasChildren = visibleChildren.length > 0;

  const commitRename = () => {
    setRenaming(false);
    const value = inputRef.current?.value.trim();
    if (value && value !== page.title) {
      updatePage(pageId, { title: value }, 'structural');
    }
  };

  const handleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const items: MenuItemSpec[] = [
    { label: 'Renomear', icon: <PencilIcon />, onClick: () => setRenaming(true) },
    {
      label: 'Nova subpágina',
      icon: <FilePlus2 size={14} />,
      onClick: () => createPage({ parentId: pageId }),
    },
    {
      label: page.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
      icon: <Star size={14} />,
      onClick: () => updatePage(pageId, { favorite: !page.favorite }, 'structural'),
    },
    { label: 'Duplicar', icon: <CopyIcon />, onClick: () => duplicatePage(pageId) },
    { label: 'Excluir', icon: <TrashIcon />, danger: true, onClick: () => deletePage(pageId) },
  ];

  const onDragStart = (e: React.DragEvent) => {
    if (!manualSort) return;
    e.dataTransfer.setData(PAGE_MIME, pageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const isDescendantOfDragged = (dragId: string): boolean => {
    let cur: Page | null | undefined = pages[pageId];
    while (cur) {
      if (cur.id === dragId) return true;
      cur = cur.parentId ? pages[cur.parentId] : null;
    }
    return false;
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!manualSort) return;
    const dragId = e.dataTransfer.getData(PAGE_MIME);
    if (!dragId || dragId === pageId) return;
    // Impede soltar dentro da própria subárvore.
    if (isDescendantOfDragged(dragId)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    const h = rect.height;
    if (y < h * 0.25) setDropZone('before');
    else if (y > h * 0.75) setDropZone('after');
    else setDropZone('inside');
  };

  const onDragLeave = () => setDropZone(null);

  const onDrop = (e: React.DragEvent) => {
    if (!manualSort) return;
    e.preventDefault();
    e.stopPropagation();
    const dragId = e.dataTransfer.getData(PAGE_MIME);
    const zone = dropZone;
    setDropZone(null);
    if (!dragId || dragId === pageId) return;
    if (isDescendantOfDragged(dragId)) return;
    if (zone === 'inside') {
      movePage(dragId, pageId, children.length);
      setOpen(true);
      return;
    }
    if (page.parentId === null) {
      const rootIds = useAppStore.getState().rootPageIds;
      const i = rootIds.indexOf(pageId);
      movePage(dragId, null, zone === 'before' ? i : i + 1);
    } else {
      const sib = pages[page.parentId]?.children ?? [];
      const i = sib.indexOf(pageId);
      movePage(dragId, page.parentId, zone === 'before' ? i : i + 1);
    }
  };

  return (
    <>
      <div
        ref={rowRef}
        className={`tree-item${isActive ? ' is-active' : ''}${dropZone === 'inside' ? ' drop-inside' : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable={manualSort && !renaming}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={(e) => {
          if (renaming) return;
          if ((e.target as HTMLElement).closest('button')) return;
          setCurrentPage(pageId);
          if (window.innerWidth < 900) useUiStore.getState().setSidebarOpen(false);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {dropZone === 'before' && <div className="drop-line" style={{ top: -1 }} />}
        {dropZone === 'after' && <div className="drop-line" style={{ bottom: -1 }} />}

        <button
          className={`tree-chevron${hasChildren ? '' : ' is-hidden'}`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <ChevronRight size={13} className={open ? 'is-open' : ''} />
        </button>

        <span className="tree-icon">
          {page.iconImage ? <img src={page.iconImage} alt="" className="tree-icon-img" /> : page.icon ?? '📄'}
        </span>

        {renaming ? (
          <input
            ref={inputRef}
            className="tree-rename"
            defaultValue={page.title}
            onClick={(e) => e.stopPropagation()}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setRenaming(false);
              e.stopPropagation();
            }}
          />
        ) : (
          <span className="tree-label">
            {page.title || 'Sem título'}
            {page.favorite && <Star size={10} fill="currentColor" className="tree-fav-star" />}
          </span>
        )}

        <span className="tree-actions">
          <button
            className="tree-action"
            title="Nova subpágina"
            onClick={(e) => {
              e.stopPropagation();
              createPage({ parentId: pageId });
              setOpen(true);
            }}
          >
            <Plus size={13} />
          </button>
          <button className="tree-action" title="Mais opções" onClick={handleMenu}>
            <MoreHorizontal size={13} />
          </button>
        </span>
      </div>

      {hasChildren && open && (
        <div className="tree-children">
          {visibleChildren.map((cid) => (
            <PageTreeItem key={cid} pageId={cid} depth={depth + 1} visibleIds={visibleIds} />
          ))}
        </div>
      )}

      {menu && <Menu x={menu.x} y={menu.y} items={items} onClose={() => setMenu(null)} />}
    </>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
