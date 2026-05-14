import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { AdminSection, SectionPermission, StaffRoleDefinition, StaffRolesConfig } from '../types';
import { useAuth } from './useAuth';

export function useStaffRoles() {
  const { profile } = useAuth();
  const [config, setConfig] = useState<StaffRolesConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'configs', 'staff_roles'),
      (snap) => {
        setConfig(snap.exists() ? (snap.data() as StaffRolesConfig) : { roles: [], lastUpdated: null });
        setLoading(false);
      },
      () => {
        setConfig({ roles: [], lastUpdated: null });
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const getCurrentRole = (): StaffRoleDefinition | null => {
    if (!profile?.staffRole || !config) return null;
    return config.roles.find(r => r.id === profile.staffRole) ?? null;
  };

  const canAccessSection = (section: AdminSection): boolean => {
    if (profile?.role === 'admin') return true;
    const role = getCurrentRole();
    if (!role) return false;
    return role.sections.includes(section);
  };

  const canPerform = (section: AdminSection, action: keyof SectionPermission): boolean => {
    if (profile?.role === 'admin') return true;
    const role = getCurrentRole();
    if (!role || !role.sections.includes(section)) return false;
    const perms = role.sectionPermissions?.[section];
    // If no granular permissions set, default all to true for backward compat
    if (!perms) return true;
    return perms[action] ?? true;
  };

  const saveRoles = async (roles: StaffRoleDefinition[]) => {
    await setDoc(doc(db, 'configs', 'staff_roles'), {
      roles,
      lastUpdated: new Date().toISOString()
    });
  };

  return {
    staffRoles: config?.roles ?? [],
    currentStaffRole: getCurrentRole(),
    canAccessSection,
    canPerform,
    saveRoles,
    loading
  };
}
