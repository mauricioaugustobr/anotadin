// ---------------------------------------------------------------------------
// Store de interface: tema, painéis, estado de salvamento e preferências
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { Theme } from '@/types';
import type { SidebarSort } from '@/lib/tags';

interface UiState {
  theme: Theme;
  sidebarOpen: boolean;
  searchOpen: boolean;
  saveState: 'idle' | 'saving' | 'saved';

  /** Página virtual "Hoje" em exibição. */
  showToday: boolean;
  /** Modo de ordenação da barra lateral. */
  sidebarSort: SidebarSort;
  /** Filtro por etiqueta na barra lateral (null = todas). */
  tagFilter: string | null;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setSaveState: (state: 'idle' | 'saving' | 'saved') => void;
  setShowToday: (show: boolean) => void;
  setSidebarSort: (sort: SidebarSort) => void;
  setTagFilter: (tag: string | null) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  theme: 'light',
  sidebarOpen: true,
  searchOpen: false,
  saveState: 'idle',
  showToday: false,
  sidebarSort: 'manual',
  tagFilter: null,

  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setSaveState: (saveState) => set({ saveState }),
  setShowToday: (show) => set({ showToday: show }),
  setSidebarSort: (sort) => set({ sidebarSort: sort }),
  setTagFilter: (tag) => set({ tagFilter: tag }),
}));
