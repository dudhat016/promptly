import React, { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────
export type PrimaryColor = 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'indigo' | 'purple' | 'orange' | 'teal';

export interface UIConfig {
  mode:           'light' | 'dark' | 'system';
  primaryColor:   PrimaryColor;
  customColor?:   string;
  radius:         number;
  sidebarCollapsed: boolean;
  cardShadow:     boolean;
  sidebarTheme:   'default' | 'dark' | 'light' | 'gradient';
  sidebarBgPreset?: string;
  language:       string;
}

interface UIContextValue {
  config: UIConfig;
  setConfig: (updates: Partial<UIConfig>) => void;
  resetConfig: () => void;
  isReferralModalOpen: boolean;
  setReferralModalOpen: (open: boolean) => void;
}

// ─── Defaults ───────────────────────────────────────────────
const defaultConfig: UIConfig = {
  mode:             'dark',
  primaryColor:     'violet',
  customColor:      undefined,
  radius:           8,
  sidebarCollapsed: false,
  cardShadow:       true,
  sidebarTheme:     'default',
  language:         'en',
};

// ─── Color Tokens ───────────────────────────────────────────
const colorTokens: Record<PrimaryColor, { h: number; s: number; l: number }> = {
  violet:  { h: 263, s: 70,  l: 50 },
  blue:    { h: 217, s: 91,  l: 60 },
  emerald: { h: 160, s: 84,  l: 39 },
  rose:    { h: 347, s: 77,  l: 50 },
  amber:   { h: 38,  s: 92,  l: 50 },
  cyan:    { h: 188, s: 86,  l: 45 },
  indigo:  { h: 239, s: 84,  l: 67 },
  purple:  { h: 280, s: 87,  l: 55 },
  orange:  { h: 25,  s: 95,  l: 53 },
  teal:    { h: 174, s: 72,  l: 40 },
};

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslRelativeLuminance(h: number, s: number, l: number): number {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const lin = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(f(0)) + 0.7152 * lin(f(8)) + 0.0722 * lin(f(4));
}

function contrastForeground(h: number, s: number, l: number): string {
  const lum = hslRelativeLuminance(h, s, l);
  const whiteContrast = 1.05 / (lum + 0.05);
  const darkContrast  = (lum + 0.05) / 0.1;
  return whiteContrast >= darkContrast ? '0 0% 100%' : '240 10% 8%';
}

function gradientEnd(h: number, s: number, l: number): string {
  return `${(h + 22) % 360} ${Math.min(s + 4, 100)}% ${Math.min(l + 7, 85)}%`;
}

const STORAGE_KEY = 'promptly-ui-config';

// ─── Token application ───────────────────────────────────────
function applyTokens(config: UIConfig) {
  const root = document.documentElement;

  const hsl = config.customColor
    ? (hexToHsl(config.customColor) ?? colorTokens[config.primaryColor])
    : colorTokens[config.primaryColor];
  const { h, s, l } = hsl;

  root.style.setProperty('--radius', `${config.radius}px`);
  root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
  root.style.setProperty('--primary-foreground', contrastForeground(h, s, l));
  root.style.setProperty('--primary-end', gradientEnd(h, s, l));
  root.style.setProperty('--ring', `${h} ${s}% ${l}%`);
  root.style.setProperty('--card-shadow', config.cardShadow ? '0 1px 3px 0 rgb(0 0 0 / 0.1)' : 'none');

  root.dataset.sidebarTheme = config.sidebarTheme ?? 'default';

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = config.mode === 'dark' || (config.mode === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);
}

// ─── Context ────────────────────────────────────────────────
const UIContext = createContext<UIContextValue | undefined>(undefined);

function loadConfig(): UIConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultConfig, ...JSON.parse(saved) };
  } catch {}
  return defaultConfig;
}

// ─── Provider ───────────────────────────────────────────────
export function UIProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<UIConfig>(loadConfig);
  const [isReferralModalOpen, setReferralModalOpen] = useState(false);

  const setConfig = useCallback((updates: Partial<UIConfig>) => {
    setConfigState(prev => {
      const next = { ...prev, ...updates };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setConfigState(defaultConfig);
  }, []);

  useLayoutEffect(() => { applyTokens(config); }, [config]);

  useEffect(() => {
    if (config.mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTokens(config);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [config]);

  return (
    <UIContext.Provider value={{ config, setConfig, resetConfig, isReferralModalOpen, setReferralModalOpen }}>
      {children}
    </UIContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────
export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within <UIProvider>');
  return ctx;
}
