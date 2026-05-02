import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { AccessConfig, PermissionSet } from '../types';

export function usePermissions() {
  const { profile, isPro } = useAuth();
  const [config, setConfig] = useState<AccessConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'access_levels'), (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as AccessConfig);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const getPermissions = (): PermissionSet => {
    // Default safe permissions
    const fallback: PermissionSet = {
      canViewPremium: false,
      canCopyPrompts: true,
      canExportData: false,
      canUseAIBuilder: false,
      canCreateCollections: false,
      maxDailyPrompts: 5,
      maxFavorites: 10
    };

    if (!config) return fallback;

    const status = profile?.subscriptionStatus || 'free';
    return config[status] || fallback;
  };

  const hasPermission = (key: keyof PermissionSet): boolean | number => {
    const perms = getPermissions();
    return perms[key];
  };

  return {
    permissions: getPermissions(),
    hasPermission,
    loading: loading
  };
}
