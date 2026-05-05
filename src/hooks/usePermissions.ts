import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { AccessConfig, PermissionSet } from '../types';
import { useAuth } from './useAuth';
import { useConfig } from './useConfig';

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
  const { config: globalConfig } = useConfig();
  const [config, setConfig] = useState<AccessConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissionsData() {
      try {
        // Fetch access levels
        const configSnap = await getDoc(doc(db, 'configs', 'access_levels'));
        if (configSnap.exists()) {
          setConfig(configSnap.data() as AccessConfig);
        }
      } catch (err) {
        console.error("Permissions fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPermissionsData();
  }, []);

  const getPermissions = (): PermissionSet => {
    const plans = globalConfig.plans;
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
