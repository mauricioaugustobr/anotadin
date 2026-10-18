// ---------------------------------------------------------------------------
// Barra lateral: logo, botão de nova página e árvore de páginas
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useUiStore } from '@/store/uiStore';
import { PageTreeItem } from './PageTreeItem';

export function Sidebar() {
  const rootPageIds = useAppStore((s) => s.rootPageIds);
  const createPage = useAppStore((s) => s.createPage);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const [over, setOver] = useState(false);

  const handleNewPage = useCallback(() => {
    createPage({ parentId: null });
  }, [createPage]);

  const moveToRoot = useAppStore((s) => s.movePage);

  return (
    <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`}>
      <div className="sidebar-head">
        <span className="logo">
          <span className="logo-mark">A</span>
          <span className="logo-text">ANOTADIN</span>
        </span>
      </div>

      <button className="new-page-btn" onClick={handleNewPage}>
        <Plus size={15} strokeWidth={2.5} />
        <span>Nova página</span>
      </button>

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
        {rootPageIds.map((id) => (
          <PageTreeItem key={id} pageId={id} depth={0} />
        ))}
        {rootPageIds.length === 0 && <div className="tree-empty">Nenhuma página ainda</div>}
      </div>

      <div className="sidebar-foot">
        <span className="sidebar-foot-text">ANOTADIN · open source</span>
      </div>
    </aside>
  );
}
