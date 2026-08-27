import { PermissionSet } from '../types';

/**
 * Defines the RBAC permission rules per role.
 * Integrated with usePermissions hook for UI-level guarding.
 */

export type Action = 'create' | 'read' | 'update' | 'delete' | 'export' | 'manage';
export type Subject = 'prompt' | 'collection' | 'admin' | 'export';

export interface Ability {
  can: (action: Action, subject: Subject) => boolean;
}

export function defineAbilitiesFor(role: string, permissions: PermissionSet): Ability {
  const can = (action: Action, subject: Subject): boolean => {
    // Admin has full access
    if (role === 'admin') return true;

    switch (subject) {
      case 'prompt':
        if (action === 'read') return true;
        if (action === 'create') return true;
        return false;

      case 'collection':
        return permissions.canCreateCollections;

      case 'export':
        return permissions.canExportData;

      case 'admin':
        return role === 'admin';

      default:
        return false;
    }
  };

  return { can };
}
