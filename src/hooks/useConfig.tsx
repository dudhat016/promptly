import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { apiService } from '../services/ApiService';
import { db } from '../lib/firebase';
import { AIModel, Category } from '../types';

/**
 * GlobalConfig — The single source of truth for all static/reference data in the app.
 */
interface GlobalConfig {
  // --- Core Branding ---
  siteName: string;
  siteTagline: string;
  siteDescription: string;
  logoLight?: string;
  logoDark?: string;
  favicon?: string;
  projectIcon?: string;
  ogImage?: string;
  
  // --- Contact & Social ---
  supportEmail: string;
  contactPhone?: string;
  whatsapp?: string;
  businessAddress?: string;
  socials?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    github?: string;
    youtube?: string;
    discord?: string;
  };

  // --- Regional & Defaults ---
  defaultLanguage: string;
  currency: string;
  currencySymbol: string;
  currencyFormat: 'before' | 'after';
  timezone: string;
  taxRate: number;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  
  // --- Analytics & Scripts ---
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  customHeadScripts?: string;
  customFooterScripts?: string;

  // --- Authentication ---
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  defaultUserRole: 'user' | 'creator';
  enableSocialLogin: boolean;

  // --- Appearance ---
  appearance?: {
    theme: 'light' | 'dark' | 'system';
    primaryColor: string;
    borderRadius: string;
    layoutMode: 'full' | 'boxed';
  };

  // --- AI & Engine Config ---
  aiDefaults?: {
    defaultModel: string;
    defaultTemperature: number;
    maxTokens: number;
    freeCreditsDaily: number;
  };

  // --- Promotion settings ---
  activePromotion?: string;
  yearlyIncentiveType?: string;
  yearlyIncentiveValue?: number;

  // --- Credit / Vault settings ---
  vaultLimit?: number;

  // --- System Status (shown in footer) ---
  systemStatus?: 'operational' | 'degraded' | 'outage';
  statusText?: string;

  // --- Checkout & Pricing ---
  checkoutBenefits?: string[];
  trustBadges?: { label: string }[];
  moneyBackDays?: number;

  // --- Social Proof ---
  socialProofStats?: { value: string; label: string }[];

  // --- Custom UI messages ---
  msgSignInToUnlock?: string;
  msgOutOfCredits?: string;
  msgPromptUnlocked?: string;
  msgUnlockFailed?: string;

  // --- Nudge thresholds ---
  lowCreditThreshold?: number;

  // --- Storage & Uploads ---
  storage?: {
    maxImageSizeMb: number;
    promptImageRatio: '1:1' | '3:2' | '4:3' | '9:16' | '16:9';
  };

  // --- Reference data (fetched in parallel on startup) ---
  models: AIModel[];
  categories: Category[];
}

// Shared global state for date formatting overrides
export const formatSettings = {
  locale: 'en',
  timezone: 'UTC',
  currency: 'USD',
  currencySymbol: '$',
  currencyFormat: 'before' as 'before' | 'after',
  taxRate: 0,
};

let patched = false;
export function applyFormatPatches() {
  if (patched) return;
  patched = true;

  const originalToLocaleDateString = Date.prototype.toLocaleDateString;
  Date.prototype.toLocaleDateString = function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
    const targetLocales = locales || formatSettings.locale || 'en';
    const targetOptions = { ...options };
    if (!targetOptions.timeZone && formatSettings.timezone) {
      targetOptions.timeZone = formatSettings.timezone;
    }
    return originalToLocaleDateString.call(this, targetLocales, targetOptions);
  };

  const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
  Date.prototype.toLocaleTimeString = function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
    const targetLocales = locales || formatSettings.locale || 'en';
    const targetOptions = { ...options };
    if (!targetOptions.timeZone && formatSettings.timezone) {
      targetOptions.timeZone = formatSettings.timezone;
    }
    return originalToLocaleTimeString.call(this, targetLocales, targetOptions);
  };

  const originalToLocaleString = Date.prototype.toLocaleString;
  Date.prototype.toLocaleString = function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
    const targetLocales = locales || formatSettings.locale || 'en';
    const targetOptions = { ...options };
    if (!targetOptions.timeZone && formatSettings.timezone) {
      targetOptions.timeZone = formatSettings.timezone;
    }
    return originalToLocaleString.call(this, targetLocales, targetOptions);
  };
}

interface ConfigContextType {
  config: GlobalConfig;
  loading: boolean;
  refreshConfig: () => Promise<void>;
  formatPrice: (price: number) => string;
  calculateTax: (price: number) => number;
}

const defaultConfig: GlobalConfig = {
  siteName: 'Promptly',
  siteTagline: 'Professional AI Prompt Marketplace',
  siteDescription: 'The world\'s leading marketplace for high-quality AI prompts and templates.',
  supportEmail: 'support@techworldproduct.com',
  defaultLanguage: 'en',
  currency: 'USD',
  currencySymbol: '$',
  currencyFormat: 'before',
  timezone: 'UTC',
  taxRate: 0,
  maintenanceMode: false,
  maintenanceMessage: 'We are currently performing scheduled maintenance. Please check back soon.',
  allowRegistration: true,
  requireEmailVerification: false,
  defaultUserRole: 'user',
  enableSocialLogin: true,
  appearance: {
    theme: 'system',
    primaryColor: '#8B5CF6',
    borderRadius: '0.75rem',
    layoutMode: 'boxed'
  },
  storage: {
    maxImageSizeMb: 2,
    promptImageRatio: '16:9' as const,
  },
  aiDefaults: {
    defaultModel: 'gpt-4o',
    defaultTemperature: 0.7,
    maxTokens: 2000,
    freeCreditsDaily: 5
  },
  models: [],
  categories: [
    { id: 'marketing', name: 'Marketing', slug: 'marketing' },
    { id: 'coding', name: 'Coding & Dev', slug: 'coding' },
    { id: 'writing', name: 'Writing & Copy', slug: 'writing' },
    { id: 'design', name: 'Art & Design', slug: 'design' },
    { id: 'business', name: 'Business & Strategy', slug: 'business' },
    { id: 'seo', name: 'SEO & Analytics', slug: 'seo' },
    { id: 'education', name: 'Education & Learning', slug: 'education' },
    { id: 'productivity', name: 'Productivity', slug: 'productivity' },
  ]
};

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  loading: true,
  refreshConfig: async () => {},
  formatPrice: (price: number) => `$${price}`,
  calculateTax: () => 0,
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<GlobalConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  const fetchGlobalData = async () => {
    try {
      const [siteConfig, models, categories] = await Promise.all([
        apiService.getDocument<any>('configs', 'global'),
        apiService.getCollection<AIModel>('models'),
        apiService.getCollection<Category>('categories')
      ]);

      let finalCategories = categories || [];
      if (finalCategories.length === 0) {
        try {
          const snap = await getDocs(collection(db, 'categories'));
          finalCategories = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
        } catch {}
      }

      if (finalCategories.length === 0) {
        finalCategories = defaultConfig.categories;
      }

      const mergedConfig = { 
        ...defaultConfig, 
        ...(siteConfig || {}), 
        models: models || [], 
        categories: finalCategories
      };

      setConfig(mergedConfig);

      // Sync settings to global formats closure
      formatSettings.locale = mergedConfig.defaultLanguage || 'en';
      formatSettings.timezone = mergedConfig.timezone || 'UTC';
      formatSettings.currency = mergedConfig.currency || 'USD';
      formatSettings.currencySymbol = mergedConfig.currencySymbol || '$';
      formatSettings.currencyFormat = mergedConfig.currencyFormat || 'before';
      formatSettings.taxRate = mergedConfig.taxRate || 0;
      
      // Apply the transparent prototype patches
      applyFormatPatches();
    } catch (err) {
      console.error('[useConfig] Failed to load global data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const formatPrice = (price: number): string => {
    const symbol = config.currencySymbol || '$';
    const format = config.currencyFormat || 'before';
    const formattedVal = Number(price).toFixed(2).replace(/\.00$/, '');
    
    if (format === 'after') {
      return `${formattedVal} ${symbol}`;
    }
    return `${symbol}${formattedVal}`;
  };

  const calculateTax = (price: number): number => {
    const rate = config.taxRate || 0;
    return parseFloat(((price * rate) / 100).toFixed(2));
  };

  return (
    <ConfigContext.Provider value={{ config, loading, refreshConfig: fetchGlobalData, formatPrice, calculateTax }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
