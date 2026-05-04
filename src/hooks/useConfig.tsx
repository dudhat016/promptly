import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface GlobalConfig {
  siteName: string;
  siteTagline: string;
  supportEmail: string;
  currency: string;
  taxRate: number;
  maintenanceMode: boolean;
  logoUrl?: string;
}

interface ConfigContextType {
  config: GlobalConfig;
  loading: boolean;
}

const defaultTarget: GlobalConfig = {
  siteName: 'Promptly',
  siteTagline: 'Professional AI Prompt Marketplace',
  supportEmail: 'support@techworldproduct.com',
  currency: 'USD',
  taxRate: 0,
  maintenanceMode: false
};

const ConfigContext = createContext<ConfigContextType>({
  config: defaultTarget,
  loading: true
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<GlobalConfig>(defaultTarget);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use onSnapshot for real-time updates!
    const unsub = onSnapshot(doc(db, 'configs', 'global'), (doc) => {
      if (doc.exists()) {
        setConfig(prev => ({ ...prev, ...doc.data() }));
      }
      setLoading(false);
    }, (err) => {
      console.error("Config fetch error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
