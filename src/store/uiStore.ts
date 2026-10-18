// ---------------------------------------------------------------------------
// Store de interface: tema, painéis e estado de salvamento
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { Theme } from '@/types';

interface UiState {
  theme: Theme;
  sidebarOpen: boolean;
  searchOpen: boolean;
  saveState: 'idle' | 'saving' | 'saved';

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setSaveState: (state: 'idle' | 'saving' | 'saved') => void;
}

export const useUiStore = create<UiState>()((set) => ({
  theme: 'light',
  sidebarOpen: true,
  searchOpen: false,
  saveState: 'idle',

  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setSaveState: (saveState) => set({ saveState }),
}));
