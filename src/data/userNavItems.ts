import {
  Activity,
  Bell,
  BookMarked,
  BookOpen,
  Bookmark,
  Coins,
  Gift,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LayoutGrid,
  Settings,
  Sparkles,
  User,
} from 'lucide-react';
import { NavItem } from '../components/layout/types';
import type { TourStep } from '../components/GuidedTour';

// ─── Base nav items (static) ─────────────────────────────────────────────────
// Dynamic values (unreadCount, seenPaths, profileUid) injected via buildUserNavItems().

export const USER_NAV_ITEMS: NavItem[] = [
  { label: 'Home',            icon: LayoutDashboard, path: '/dashboard', exact: true },
  { divider: true },
  { label: 'My Vault',        icon: LayoutGrid,      path: '/dashboard/vault' },
  { label: 'My Creations',    icon: BookOpen,        path: '/dashboard/library' },
  { label: 'AI Twin Studio',  icon: Sparkles,        path: '/dashboard/twin-studio' },
  { label: 'Favorites',       icon: Heart,           path: '/dashboard/favorites' },
  { label: 'Unlock Queue',    icon: Bookmark,        path: '/dashboard/saved' },
  { label: 'Collections',     icon: BookMarked,      path: '/dashboard/collections', badge: 'PRO', badgeVariant: 'warning' },
  { divider: true },
  { label: 'Credits',         icon: Coins,           path: '/dashboard/credits' },
  { label: 'Usage',           icon: Activity,        path: '/dashboard/usage' },
  { label: 'Partner Program', icon: Gift,            path: '/dashboard/affiliate' },
  { label: 'Notifications',   icon: Bell,            path: '/dashboard/notifications' },
  { label: 'Support',         icon: HelpCircle,      path: '/dashboard/support' },
];

export const USER_SETTINGS_ITEM: NavItem = {
  label: 'Settings',
  icon: Settings,
  path: '/settings',
  children: [
    { label: 'Profile',        path: '/settings/profile' },
    { label: 'AI Integration', path: '/settings/ai' },
    { label: 'Billing',        path: '/settings/billing' },
    { label: 'Security',       path: '/settings/security' },
    { label: 'Notifications',  path: '/settings/notifications' },
  ],
};

// Paths that show a pulsing "New" dot until visited
export const DISCOVERY_PATHS = [
  '/dashboard/collections',
  '/dashboard/twin-studio',
  '/dashboard/affiliate',
  '/dashboard/usage',
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

  if (profileUid) {
    items.push({ label: 'My Profile', icon: User, path: `/creator/${profileUsername || profileUid}` });
  }

  items.push(USER_SETTINGS_ITEM);
  return items;
}

// ─── Guided tour steps ────────────────────────────────────────────────────────

export const USER_TOUR_STEPS: TourStep[] = [
  {
    selector: 'a[href*="/dashboard/vault"]',
    title: 'Your Vault',
    description: "All prompts you've unlocked live here — find them anytime, organized and searchable.",
    placement: 'right',
  },
  {
    selector: 'a[href*="/dashboard/twin-studio"]',
    title: 'AI Twin Studio',
    description: 'Use the AI Builder to generate custom prompts instantly. Describe what you need and let AI do the rest.',
    placement: 'right',
  },
  {
    selector: '[data-tour="credits"]',
    title: 'Credit Balance',
    description: 'Credits are your currency — use them to unlock prompts and generate new ones with AI.',
    placement: 'bottom',
  },
  {
    selector: 'a[href*="/dashboard/affiliate"]',
    title: 'Partner Program',
    description: 'Refer friends and earn commissions on every subscription they start. Share your unique link to get started.',
    placement: 'right',
  },
  {
    selector: '[data-tour="profile"]',
    title: 'Your Account',
    description: 'Manage your profile, billing, security settings, and referral links from here.',
    placement: 'bottom',
  },
];
