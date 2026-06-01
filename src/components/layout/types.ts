import React from 'react';
import { AdminSection } from '../../types';

export interface NavItem {
  label?: string;
  icon?: React.ElementType;
  path?: string;
  exact?: boolean;           // force exact pathname match for isActive (no startsWith)
  children?: NavItem[];
  badge?: string | number;
  badgeVariant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  adminOnly?: boolean;
  isNew?: boolean;
  divider?: boolean;
  sectionTitle?: string;
  section?: AdminSection;
}

