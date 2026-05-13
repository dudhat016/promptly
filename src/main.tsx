import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './i18n'; // Must be imported before App so translations are ready
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import { UIProvider } from './contexts/UIProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <UIProvider>
        <App />
      </UIProvider>
    </ErrorBoundary>
  </StrictMode>,
);
