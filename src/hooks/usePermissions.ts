import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { AccessConfig, PermissionSet, PricingPlan, PermissionGroup } from '../types';

const DEFAULT_PERMISSIONS: PermissionSet = {
  canViewPremium: false,
  canCopyPrompts: true,
  canExportData: false,
  canUseAIBuilder: false,
  canCreateCollections: false,
  canAccessPremiumModels: false,
  canUseAPI: false,
  canRemoveWatermarks: false,
  hasPrioritySupport: false,
  canCustomBrandEmails: false,
  maxDailyPrompts: 5,
  maxFavorites: 10
};

export function usePermissions() {
  const { profile } = useAuth();
  const [config, setConfig] = useState<AccessConfig | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to access levels
    const unsubConfig = onSnapshot(doc(db, 'configs', 'access_levels'), (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as AccessConfig);
      }
    });

    // Listen to plans
    const unsubPlans = onSnapshot(collection(db, 'plans'), (snap) => {
      const pData = snap.docs.map(d => ({ id: d.id, ...d.data() } as PricingPlan));
      setPlans(pData);
      setLoading(false);
    });

    return () => {
      unsubConfig();
      unsubPlans();
    };
  }, []);

  const getPermissions = (): PermissionSet => {
    if (loading || !config || plans.length === 0) return DEFAULT_PERMISSIONS;

    // 1. Identify active plan
    let activePlanId = profile?.activePlanId || 'starter';
    
    // Check for trial expiration
    if (profile?.trialEndsAt) {
      const endsAt = profile.trialEndsAt.toDate ? profile.trialEndsAt.toDate() : new Date(profile.trialEndsAt);
      if (new Date() > endsAt) {
        activePlanId = 'starter'; // Revert to free plan if trial expired
      }
    }

    const activePlan = plans.find(p => p.id === activePlanId);

    if (!activePlan) return DEFAULT_PERMISSIONS;

    // 2. Find linked permission group
    const groupId = activePlan.permissionGroupId;
    const group = config.groups.find(g => g.id === groupId);

    return group?.permissions || DEFAULT_PERMISSIONS;
  };

  const hasPermission = (key: keyof PermissionSet): boolean | number => {
    const perms = getPermissions();
    return perms[key];
  };

  return {
    permissions: getPermissions(),
    hasPermission,
    loading
  };
}
