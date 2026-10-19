// ---------------------------------------------------------------------------
// ANOTADIN — aplicação principal
// ---------------------------------------------------------------------------

import { useEffect } from 'react';
import { FilePlus2, Plus } from 'lucide-react';
import { useAppStore, performRedo, performUndo, restoreSnapshot } from '@/store/appStore';
import { useUiStore } from '@/store/uiStore';
import { dbGet, dbSet } from '@/lib/db';
import { seedData } from '@/lib/seed';
import type { PersistedData } from '@/types';
import { Topbar } from '@/components/Topbar';
import { Sidebar } from '@/components/Sidebar';
import { SearchModal } from '@/components/SearchModal';
import { TodayPage } from '@/components/TodayPage';
import { EditorPage } from '@/editor/EditorPage';

interface PersistedSnapshot {
  v: number;
  data: PersistedData;
  ui: { theme: 'light' | 'dark'; sidebarSort?: 'manual' | 'az' | 'recent' };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: PersistedSnapshot | null = null;

function buildSnapshot(): PersistedSnapshot {
  const state = useAppStore.getState();
  return {
    v: 1,
    data: {
      pages: state.pages,
      blocks: state.blocks,
      rootPageIds: state.rootPageIds,
      currentPageId: state.currentPageId,
      versions: state.versions,
    },
    ui: {
      theme: useUiStore.getState().theme,
      sidebarSort: useUiStore.getState().sidebarSort,
    },
  };
}

async function flushSave(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!pendingSave) return;
  const snap = pendingSave;
  pendingSave = null;
  try {
    await dbSet('state', snap);
    useUiStore.getState().setSaveState('saved');
  } catch {
    useUiStore.getState().setSaveState('idle');
  }
}

function scheduleSave(): void {
  const snap = buildSnapshot();
  pendingSave = snap;
  useUiStore.getState().setSaveState('saving');
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void flushSave(), 600);
}

let loadPromise: Promise<void> | null = null;

async function doLoadApp(): Promise<void> {
  try {
    const snap = await dbGet<PersistedSnapshot>('state');
    if (snap && snap.v === 1 && snap.data?.pages && Object.keys(snap.data.pages).length > 0) {
      useAppStore.getState().hydrate(snap.data);
      useUiStore.setState({
        theme: snap.ui?.theme ?? 'light',
        sidebarSort: snap.ui?.sidebarSort ?? 'manual',
      });
    } else {
      useAppStore.getState().hydrate(seedData());
    }
  } catch {
    useAppStore.getState().hydrate(seedData());
  }
}

function loadApp(): Promise<void> {
  // Garante um único carregamento (importante sob StrictMode).
  if (!loadPromise) loadPromise = doLoadApp();
  return loadPromise;
}

export default function App() {
  const loaded = useAppStore((s) => s.loaded);
  const currentPageId = useAppStore((s) => s.currentPageId);
  const pages = useAppStore((s) => s.pages);
  const theme = useUiStore((s) => s.theme);
  const searchOpen = useUiStore((s) => s.searchOpen);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const showToday = useUiStore((s) => s.showToday);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const createPage = useAppStore((s) => s.createPage);

  // Carrega os dados uma única vez.
  useEffect(() => {
    if (window.innerWidth < 900) setSidebarOpen(false);
    void loadApp();
  }, []);

  // Salva automaticamente a cada mudança.
  useEffect(() => {
    if (!loaded) return;
    const unsub = useAppStore.subscribe(() => scheduleSave());
    return unsub;
  }, [loaded]);

  // Salva ao sair/ocultar a aba.
  useEffect(() => {
    const onHide = () => void flushSave();
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  // Aplica o tema no documento.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Deep links: #/page/<id> sincroniza a URL com a página aberta.
  useEffect(() => {
    if (!loaded) return;
    const applyHash = () => {
      const m = /^#\/page\/(.+)$/.exec(window.location.hash);
      if (!m) return;
      const id = decodeURIComponent(m[1]);
      const state = useAppStore.getState();
      if (state.pages[id]) state.setCurrentPage(id);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    const expected = currentPageId ? `#/page/${currentPageId}` : '#/';
    if (window.location.hash !== expected) {
      if (!history.state?.anotadinInit) {
        // Primeira sincronização não cria entrada no histórico.
        history.replaceState({ anotadinInit: true }, '', expected);
      } else {
        // As demais criam, permitindo voltar entre páginas com o botão
        // voltar do navegador.
        window.location.hash = expected;
      }
    }
  }, [loaded, currentPageId]);

  // Atalhos globais.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      const inEditable = !!target?.closest?.('[contenteditable="true"]');
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 'p' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (mod && e.key.toLowerCase() === 'k' && !inEditable) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        useUiStore.getState().toggleTheme();
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createPage({ parentId: null });
        return;
      }
      if (mod && !inField && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        const cur = useAppStore.getState();
        if (e.shiftKey || e.key.toLowerCase() === 'y') {
          const snap = performRedo(cur);
          if (snap) restoreSnapshot(snap);
        } else {
          const snap = performUndo(cur);
          if (snap) restoreSnapshot(snap);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [createPage, setSearchOpen]);

  if (!loaded) {
    return (
      <div className="app-loading">
        <span className="logo-mark big">A</span>
        <span className="app-loading-text">ANOTADIN</span>
      </div>
    );
  }

  const pageExists = currentPageId !== null && !!pages[currentPageId];

  return (
    <div className="app">
      <Topbar />
      <div className="app-body">
        <Sidebar />
        <main className="main">
          {showToday ? (
            <TodayPage />
          ) : pageExists ? (
            <EditorPage key={currentPageId} pageId={currentPageId!} />
          ) : (
            <div className="empty-state">
              <FilePlus2 size={40} strokeWidth={1.5} />
              <h2>Nenhuma página aberta</h2>
              <p>Crie uma página para começar a escrever.</p>
              <button className="btn-primary" onClick={() => createPage({ parentId: null })}>
                <Plus size={15} strokeWidth={2.5} />
                <span>Nova página</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Fechar barra lateral"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {searchOpen && <SearchModal />}
    </div>
  );
}
