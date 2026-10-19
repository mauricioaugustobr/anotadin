import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useAppStore } from './store/appStore';
import { useUiStore } from './store/uiStore';
import './styles/global.css';
import './styles/layout.css';
import './styles/editor.css';
import './styles/menus.css';
import './styles/features.css';

// Acesso à store para depuração (console do navegador).
(window as unknown as { __anotadin?: unknown }).__anotadin = {
  store: useAppStore,
  ui: useUiStore,
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA: registra o service worker apenas em produção.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(new URL('./sw.js', window.location.href))
      .catch(() => {
        /* ambiente sem suporte — segue sem PWA */
      });
  });
}
