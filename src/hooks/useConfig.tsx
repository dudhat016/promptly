import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { AIModel, Category, PricingPlan } from '../types';

/**
 * GlobalConfig — The single source of truth for all static/reference data in the app.
 * 
 * Fetched ONCE on app startup. Every page pulls from this context instead of
 * making its own Firestore queries for models, categories, plans, or site config.
 * 
 * This replaces ~15 redundant getDocs() calls across the codebase.
 */
interface GlobalConfig {
  // Site settings (from configs/global)
  siteName: string;
  siteTagline: string;
  supportEmail: string;
  currency: string;
  taxRate: number;
  maintenanceMode: boolean;
  logoUrl?: string;
  vaultLimit?: number;
  
  // Promotion settings
  activePromotion?: string;
  freeTrialDays?: number;
  yearlyIncentiveType?: string;
  yearlyIncentiveValue?: number;

  // Reference data (fetched in parallel on startup)
  models: AIModel[];
  categories: Category[];
  plans: PricingPlan[];
}

interface ConfigContextType {
  config: GlobalConfig;
  loading: boolean;
}

const defaultConfig: GlobalConfig = {
  siteName: 'Promptly',
  siteTagline: 'Professional AI Prompt Marketplace',
  supportEmail: 'support@techworldproduct.com',
  currency: 'USD',
  taxRate: 0,
  maintenanceMode: false,
  models: [],
  categories: [],
  plans: []
};

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  loading: true
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<GlobalConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGlobalData() {
      try {
        // Single parallel fetch for ALL static data — replaces 15+ individual calls
        const [configSnap, modelsSnap, categoriesSnap, plansSnap] = await Promise.all([
          getDoc(doc(db, 'configs', 'global')),
          getDocs(collection(db, 'models')),
          getDocs(collection(db, 'categories')),
          getDocs(collection(db, 'plans'))
        ]);

        const models = modelsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AIModel));
        const categories = categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
        const plans = plansSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as PricingPlan))
          .sort((a, b) => a.monthlyPrice - b.monthlyPrice);

        const siteConfig = configSnap.exists() ? configSnap.data() : {};

        setConfig(prev => ({ ...prev, ...siteConfig, models, categories, plans }));
      } catch (err) {
        console.error('[useConfig] Failed to load global data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchGlobalData();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
