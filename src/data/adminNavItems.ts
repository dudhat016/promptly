import {
  Activity,
  BarChart2,
  BarChart3,
  Bell,
  BookOpen,
  Cpu,
  Flag,
  Globe,
  Image as ImageIcon,
  LayoutGrid,
  LifeBuoy,
  Mail,
  Medal,
  MessageCircle,
  Percent,
  Receipt,
  Search,
  Send,
  Server,
  Settings,
  Share2,
  Shield,
  ShoppingBag,
  Star,
  Tag,
  TrendingDown,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { AdminSection } from '../types';
import { NavItem } from '../components/layout/types';

// ─── Badge counts passed in from live Firestore listeners ────────────────────

export interface AdminBadgeCounts {
  openTickets: number;
  unreadInquiries: number;
  pendingReports: number;
  pendingPrompts: number;
  pendingReviews: number;
}

export const EMPTY_BADGE_COUNTS: AdminBadgeCounts = {
  openTickets: 0,
  unreadInquiries: 0,
  pendingReports: 0,
  pendingPrompts: 0,
  pendingReviews: 0,
};

// ─── Nav factory ─────────────────────────────────────────────────────────────

export function buildAdminNavItems(counts: AdminBadgeCounts): NavItem[] {
  const { openTickets, unreadInquiries, pendingReports, pendingPrompts, pendingReviews } = counts;

  return [
    // ── Overview ──────────────────────────────
    { sectionTitle: 'Overview' },
    { label: 'Dashboard', icon: BarChart3, path: '/admin', exact: true, section: 'dashboard' as AdminSection },

    // ── Users ─────────────────────────────────
    { sectionTitle: 'Users' },
    { label: 'All Users', icon: Users, path: '/admin/users', section: 'users' as AdminSection },

    // ── Marketplace ───────────────────────────
    { sectionTitle: 'Marketplace' },
    { label: 'Prompts',    icon: LayoutGrid, path: '/admin/prompts',    section: 'prompts' as AdminSection,    badge: pendingPrompts || undefined, badgeVariant: 'warning' as const },
    { label: 'Reviews',    icon: Star,       path: '/admin/reviews',    section: 'reviews' as AdminSection,    ...(pendingReviews > 0 ? { badge: pendingReviews, badgeVariant: 'warning' as const } : {}) },
    { label: 'Categories', icon: Tag,        path: '/admin/categories', section: 'categories' as AdminSection },
    { label: 'AI Models',  icon: Cpu,        path: '/admin/models',     section: 'ai_models' as AdminSection },

    // ── Content ───────────────────────────────
    { sectionTitle: 'Content' },
    {
      label: 'Blog',
      icon: BookOpen,
      path: '/admin/blog',
      section: 'blog' as AdminSection,
      children: [
        { label: 'Posts',            path: '/admin/blog',            exact: true },
        { label: 'Categories & Tags', path: '/admin/blog/categories' },
      ],
    },
    { label: 'Testimonials',  icon: Star,      path: '/admin/testimonials', section: 'content' as AdminSection },
    { label: 'Media Manager', icon: ImageIcon, path: '/admin/media',        section: 'media' as AdminSection },

    // ── Support ───────────────────────────────
    { sectionTitle: 'Support' },
    { label: 'Inquiries', icon: MessageCircle, path: '/admin/inquiries', badge: unreadInquiries || undefined, badgeVariant: 'danger' as const, section: 'inquiries' as AdminSection },
    { label: 'Tickets',   icon: LifeBuoy,      path: '/admin/tickets',   badge: openTickets    || undefined, badgeVariant: 'danger' as const, section: 'tickets' as AdminSection },
    { label: 'Reports',   icon: Flag,          path: '/admin/reports',   badge: pendingReports || undefined, badgeVariant: 'danger' as const, section: 'reports' as AdminSection },

    // ── Marketing ─────────────────────────────
    { sectionTitle: 'Marketing' },
    {
      label: 'CRM & Campaigns',
      icon: Send,
      path: '/admin/marketing',
      section: 'marketing' as AdminSection,
      children: [
        { label: 'Contacts',    path: '/admin/marketing/contacts' },
        { label: 'Tags',        path: '/admin/marketing/tags' },
        { label: 'Segments',    path: '/admin/marketing/segments' },
        { label: 'Automations', path: '/admin/marketing/automations' },
      ],
    },
    {
      label: 'Emails',
      icon: Mail,
      path: '/admin/emails',
      section: 'emails' as AdminSection,
      children: [
        { label: 'Overview',    path: '/admin/emails', exact: true },
        { label: 'Templates',   path: '/admin/emails/templates' },
        { label: 'Email Logs',  path: '/admin/emails/logs' },
        { label: 'Analytics',   path: '/admin/emails/analytics' },
        { label: 'Automation',  path: '/admin/emails/automation' },
        { label: 'Broadcast',   path: '/admin/emails/broadcast' },
      ],
    },

    { label: 'SEO Audit',          icon: Search, path: '/admin/seo',  section: 'seo' as AdminSection },

    // ── System ────────────────────────────────
    { sectionTitle: 'System' },
    { label: 'Permissions',    icon: Shield,    path: '/admin/permissions', section: 'permissions' as AdminSection },
    { label: 'Staff Roles',    icon: Globe,     path: '/admin/roles',       section: 'roles' as AdminSection },
    { label: 'Activity Log',   icon: Activity,  path: '/admin/activity',    section: 'activity' as AdminSection },


    {
      label: 'Settings',
      icon: Settings,
      path: '/admin/settings',
      section: 'settings' as AdminSection,
      children: [
        { label: 'General',       path: '/admin/settings',           exact: true },
        { label: 'Header Menu',   path: '/admin/settings/menu' },
        { label: 'Branding',      path: '/admin/settings/branding' },
        { label: 'Users & Auth',  path: '/admin/settings/auth' },
        { label: 'Email / SMTP',  path: '/admin/settings/email' },
        { label: 'Content & SEO', path: '/admin/settings/content' },
        { label: 'Security',      path: '/admin/settings/security' },
      ],
    },
  ];
}

// ─── Role-based filter ────────────────────────────────────────────────────────
// Removes items (and orphaned section titles) the current staff user can't access.
// Pass canAccessSection from useStaffRoles(); for full admins pass () => true.

export function filterNavForRole(
  items: NavItem[],
  canAccess: (section: AdminSection) => boolean,
): NavItem[] {
  const result: NavItem[] = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (item.sectionTitle) {
      const nextSectionIdx = items.findIndex((it, idx) => idx > i && it.sectionTitle);
      const siblings = items.slice(i + 1, nextSectionIdx === -1 ? undefined : nextSectionIdx);
      const visibleSiblings = siblings.filter(s => !s.section || canAccess(s.section as AdminSection));
      if (visibleSiblings.length > 0) result.push(item);
      i++;
    } else {
      if (!item.section || canAccess(item.section as AdminSection)) result.push(item);
      i++;
    }
  }
  return result;
}
