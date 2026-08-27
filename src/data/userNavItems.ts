import {
  Bell,
  BookMarked,
  BookOpen,
  Heart,
  HelpCircle,
  LayoutDashboard,
  Settings
} from 'lucide-react';
import type { TourStep } from '../components/GuidedTour';
import { NavItem } from '../components/layout/types';

// ─── Base nav items (static) ─────────────────────────────────────────────────
// Dynamic values (unreadCount, seenPaths, profileUid) injected via buildUserNavItems().

export const USER_NAV_ITEMS: NavItem[] = [
  { label: 'Home',            icon: LayoutDashboard, path: '/dashboard', exact: true },
  { divider: true },
  { label: 'My Creations',    icon: BookOpen,        path: '/dashboard/library' },
  { label: 'Favorites',       icon: Heart,           path: '/dashboard/favorites' },
  { label: 'Collections',     icon: BookMarked,      path: '/dashboard/collections' },
  { divider: true },
  { label: 'Notifications',   icon: Bell,            path: '/dashboard/notifications' },
  { label: 'Support',         icon: HelpCircle,      path: '/dashboard/support' },
];

export const USER_SETTINGS_ITEM: NavItem = {
  label: 'Settings',
  icon: Settings,
  path: '/settings',
  children: [
    { label: 'Profile',        path: '/settings/profile' },
    { label: 'Security',       path: '/settings/security' },
    { label: 'Notifications',  path: '/settings/notifications' },
  ],
};

// Paths that show a pulsing "New" dot until visited
export const DISCOVERY_PATHS = [
  '/dashboard/collections',
];

// ─── Dynamic builder ──────────────────────────────────────────────────────────

interface BuildUserNavOptions {
  unreadCount: number;
  seenPaths: Set<string>;
  profileUid?: string;
  profileUsername?: string;
}

export function buildUserNavItems({
  unreadCount,
  seenPaths,
  profileUid,
  profileUsername,
}: BuildUserNavOptions): NavItem[] {
  const items: NavItem[] = USER_NAV_ITEMS.map(item => {
    if (item.path === '/dashboard/notifications' && unreadCount > 0) {
      return { ...item, badge: unreadCount > 99 ? '99+' : unreadCount, badgeVariant: 'danger' as const };
    }
    const isDiscovery = item.path && DISCOVERY_PATHS.includes(item.path) && !seenPaths.has(item.path);
    return isDiscovery ? { ...item, isNew: true } : item;
  });

  items.push(USER_SETTINGS_ITEM);
  return items;
}

// ─── Guided tour steps ────────────────────────────────────────────────────────

export const USER_TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="profile"]',
    title: 'Your Account',
    description: 'Manage your profile, billing, and security settings from here.',
    placement: 'bottom',
  },
];
