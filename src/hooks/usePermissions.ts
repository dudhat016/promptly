import { PermissionSet } from '../types';

const ALL_PERMISSIONS: PermissionSet = {
  canViewPremium: true,
  canCopyPrompts: true,
  canExportData: true,
  canCreateCollections: true,
  canAccessPremiumModels: true,
  canRemoveWatermarks: true,
  hasPrioritySupport: true,
  canCustomBrandEmails: true,
  maxFavorites: 9999
};

export function usePermissions() {
  const getPermissions = (): PermissionSet => ALL_PERMISSIONS;

  const hasPermission = (key: keyof PermissionSet): boolean | number => {
    const perms = getPermissions();
    return perms[key];
  };

  return {
    permissions: getPermissions(),
    hasPermission,
    loading: false
  };
}
