import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/ApiService';
import { AIModel, Category, PricingPlan } from '../types';

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
  freeTrialDays?: number;
  yearlyIncentiveType?: string;
  yearlyIncentiveValue?: number;

  // --- Credit / Vault settings ---
  vaultLimit?: number;

  // --- Reference data (fetched in parallel on startup) ---
  models: AIModel[];
  categories: Category[];
  plans: PricingPlan[];
}

interface ConfigContextType {
  config: GlobalConfig;
  loading: boolean;
  refreshConfig: () => Promise<void>;
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
  aiDefaults: {
    defaultModel: 'gpt-4o',
    defaultTemperature: 0.7,
    maxTokens: 2000,
    freeCreditsDaily: 5
  },
  models: [],
  categories: [],
  plans: []
};

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  loading: true,
  refreshConfig: async () => {}
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<GlobalConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  const fetchGlobalData = async () => {
    try {
      const [siteConfig, models, categories, plansRaw] = await Promise.all([
        apiService.getDocument<any>('configs', 'global'),
        apiService.getCollection<AIModel>('models'),
        apiService.getCollection<Category>('categories'),
        apiService.getCollection<PricingPlan>('plans')
      ]);

      const plans = Array.isArray(plansRaw) 
        ? [...plansRaw].sort((a, b) => a.monthlyPrice - b.monthlyPrice)
        : [];

      setConfig(prev => ({ 
        ...prev, 
        ...(siteConfig || {}), 
        models: models || [], 
        categories: categories || [], 
        plans 
      }));
    } catch (err) {
      console.error('[useConfig] Failed to load global data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, refreshConfig: fetchGlobalData }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
