import React from 'react';
import { useUI, UIProvider } from '../contexts/UIProvider';

/**
 * Compatibility wrapper for the legacy ThemeProvider.
 * Now uses UIProvider internally.
 */
export function ThemeProvider({ 
  children 
}: { 
  children: React.ReactNode;
  defaultTheme?: string;
  storageKey?: string;
}) {
  return <UIProvider>{children}</UIProvider>;
}

/**
 * Compatibility hook for the legacy useTheme.
 * Maps to the new UIProvider context.
 */
export const useTheme = () => {
  const { config, setConfig } = useUI();

  return {
    theme: config.mode,
    setTheme: (mode: 'light' | 'dark' | 'system') => setConfig({ mode }),
  };
};

