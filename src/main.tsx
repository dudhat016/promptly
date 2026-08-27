import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n'; // Must be imported before App so translations are ready
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import { UIProvider } from './contexts/UIProvider';
import './index.css';

// PWA Service Worker Auto-Update & Cache-Busting
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('[PWA] New version available, reloading...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('[PWA] App ready to work offline');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <UIProvider>
        <App />
      </UIProvider>
    </ErrorBoundary>
  </StrictMode>,
);
