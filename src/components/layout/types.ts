import React from 'react';
import { AdminSection } from '../../types';

export interface NavItem {
  label?: string;
  icon?: React.ElementType;
  path?: string;
  children?: NavItem[];
  badge?: string | number;
  badgeVariant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  adminOnly?: boolean;
  divider?: boolean;
  sectionTitle?: string;
  section?: AdminSection;
}

export interface LayoutConfig {
  logo?: React.ReactNode;
  navItems: NavItem[];
  userMenu?: React.ReactNode;
  rightActions?: React.ReactNode;
  footer?: React.ReactNode;
  sidebarWidth?: number;
  collapsedSidebarWidth?: number;
}
