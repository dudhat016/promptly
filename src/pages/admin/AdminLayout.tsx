import { collection, collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import {
  Activity,
  BarChart2,
  BarChart3,
  BookOpen,
  Cpu,
  Flag,
  GitCommit,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Layout,
  LayoutGrid,
  LifeBuoy,
  Mail,
  Medal,
  MessageCircle,
  Percent,
  Receipt,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  ShoppingBag,
  Star,
  Tag,
  Target,
  TrendingDown,
  Users,
  Wallet,
  Zap
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useUI } from '../../contexts/UIProvider';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';

// Modular Layout Components
import {
  AdminBreadcrumb,
  AdminGlobalSearch,
  AdminNotificationBell,
  AdminShortcutsModal,
  PageContainer
} from '../../components/admin';
import Navbar from '../../components/layout/Navbar';
import Sidebar from '../../components/layout/Sidebar';
import { NavItem } from '../../components/layout/types';
import UserDropdown from '../../components/layout/UserDropdown';
import Button from '../../components/primitives/Button';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/useConfig';
import { useStaffRoles } from '../../hooks/useStaffRoles';

export default function AdminLayout() {
  const { config } = useUI();
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { config: globalConfig } = useConfig();
  const { prefix } = usePath();
  const { profile } = useAuth();
  const { canAccessSection } = useStaffRoles();
  const isAdmin = profile?.role === 'admin';

  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [unreadInquiries, setUnreadInquiries] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingPrompts, setPendingPrompts] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);

  const isHorizontal = config.orientation === 'horizontal';
  const sidebarWidth = config.sidebarWidth;

  // Global shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === '?' && !isInput) {
        setShortcutsOpen(v => !v);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Live badge counts (errors silently ignored for staff users without access)
  useEffect(() => {
    const noop = () => {};
    const unsubW = onSnapshot(query(collection(db, 'payouts'), where('status', '==', 'pending')), snap => setPendingWithdrawals(snap.size), noop);
    const unsubT = onSnapshot(query(collection(db, 'tickets'), where('status', '==', 'open')), snap => setOpenTickets(snap.size), noop);
    const unsubI = onSnapshot(collection(db, 'contact_messages'), snap => setUnreadInquiries(snap.docs.filter(d => !d.data().readAt).length), noop);
    const unsubR = onSnapshot(query(collection(db, 'prompt_reports'), where('status', '==', 'pending')), snap => setPendingReports(snap.size), noop);
    const unsubP = onSnapshot(query(collection(db, 'prompts'), where('status', '==', 'pending')), snap => setPendingPrompts(snap.size), noop);
    const unsubRev = onSnapshot(query(collectionGroup(db, 'reviews'), where('moderationStatus', '==', 'pending')), snap => setPendingReviews(snap.size), noop);
    return () => { unsubW(); unsubT(); unsubI(); unsubR(); unsubP(); unsubRev(); };
  }, []);

  const allNavItems: NavItem[] = [
    // ── Overview ──────────────────────────────
    { sectionTitle: 'Overview' },
    { label: 'Dashboard', icon: BarChart3, path: '/admin', exact: true, section: 'dashboard' },

    // ── Users ─────────────────────────────────
    { sectionTitle: 'Users' },
    { label: 'All Users', icon: Users, path: '/admin/users', section: 'users' },

    // ── Marketplace ───────────────────────────
    { sectionTitle: 'Marketplace' },
    { label: 'Prompts', icon: LayoutGrid, path: '/admin/prompts', section: 'prompts', badge: pendingPrompts, badgeVariant: 'warning' as const },
    { label: 'Reviews', icon: Star, path: '/admin/reviews', section: 'reviews' as const, ...(pendingReviews > 0 ? { badge: pendingReviews, badgeVariant: 'warning' as const } : {}) },
    { label: 'Categories', icon: Tag, path: '/admin/categories', section: 'categories' },
    { label: 'AI Models', icon: Cpu, path: '/admin/models', section: 'ai_models' },
    { label: 'Badges', icon: Medal, path: '/admin/badges', section: 'badges' as const },

    // ── Content ───────────────────────────────
    { sectionTitle: 'Content' },
    {
      label: 'Blog',
      icon: BookOpen,
      path: '/admin/blog',
      section: 'blog',
      children: [
        { label: 'Posts', path: '/admin/blog', exact: true },
        { label: 'Categories & Tags', path: '/admin/blog/categories' },
      ],
    },
    { label: 'Testimonials', icon: Star,      path: '/admin/testimonials', section: 'content' },
    { label: 'Changelog',    icon: GitCommit,  path: '/admin/changelog',    section: 'content' },
    { label: 'Media Manager',icon: ImageIcon,  path: '/admin/media',        section: 'media' },
    { label: 'Site Pages',   icon: Layout,     path: '/admin/site-pages',   section: 'content' },

    // ── Support ───────────────────────────────
    { sectionTitle: 'Support' },
    { label: 'Inquiries', icon: MessageCircle, path: '/admin/inquiries', badge: unreadInquiries, badgeVariant: 'danger', section: 'inquiries' },
    { label: 'Tickets',   icon: LifeBuoy,      path: '/admin/tickets',   badge: openTickets,    badgeVariant: 'danger', section: 'tickets' },
    { label: 'Reports',   icon: Flag,          path: '/admin/reports',   badge: pendingReports, badgeVariant: 'danger', section: 'reports' },

    // ── Revenue ───────────────────────────────
    { sectionTitle: 'Revenue' },
    { label: 'Financials',        icon: BarChart2,    path: '/admin/revenue',        section: 'revenue' },
    { label: 'Plans',             icon: Zap,          path: '/admin/subscriptions',  section: 'subscriptions' },
    { label: 'Churn & Retention', icon: TrendingDown, path: '/admin/churn',          section: 'revenue' },
    { label: 'Orders',            icon: ShoppingBag,  path: '/admin/orders',         section: 'revenue' },
    { label: 'Coupons',           icon: Percent,      path: '/admin/coupons',        section: 'revenue' },
    { label: 'Invoices',          icon: Receipt,      path: '/admin/invoices',       section: 'revenue' },
    { label: 'Affiliates',        icon: Share2,       path: '/admin/referrals',      section: 'affiliates' },
    { label: 'Withdrawals',       icon: Wallet,       path: '/admin/withdrawals',    badge: pendingWithdrawals, badgeVariant: 'danger', section: 'withdrawals' },

    // ── Marketing ─────────────────────────────
    { sectionTitle: 'Marketing' },
    {
      label: 'CRM & Campaigns',
      icon: Send,
      path: '/admin/marketing',
      section: 'marketing',
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
      section: 'emails',
      children: [
        { label: 'Overview',    path: '/admin/emails', exact: true },
        { label: 'Templates',   path: '/admin/emails/templates' },
        { label: 'Email Logs',  path: '/admin/emails/logs' },
        { label: 'Analytics',   path: '/admin/emails/analytics' },
        { label: 'Automation',  path: '/admin/emails/automation' },
        { label: 'Broadcast',   path: '/admin/emails/broadcast' },
      ],
    },
    { label: 'SEO Audit',           icon: Search, path: '/admin/seo',              section: 'seo' },
    { label: 'Marketing Settings',  icon: Target, path: '/admin/settings/marketing', section: 'settings' },

    // ── System ────────────────────────────────
    { sectionTitle: 'System' },
    { label: 'Asset Manager', icon: HardDrive, path: '/admin/assets',      section: 'settings' },
    { label: 'Permissions',   icon: Shield,    path: '/admin/permissions',  section: 'permissions' },
    { label: 'Staff Roles',   icon: Globe,     path: '/admin/roles',        section: 'roles' },
    { label: 'Activity Log',  icon: Activity,  path: '/admin/activity',     section: 'activity' },
    {
      label: 'Settings',
      icon: Settings,
      path: '/admin/settings',
      section: 'settings',
      children: [
        { label: 'General',       path: '/admin/settings',          exact: true },
        { label: 'Branding',      path: '/admin/settings/branding' },
        { label: 'Users & Auth',  path: '/admin/settings/auth' },
        { label: 'Email / SMTP',  path: '/admin/settings/email' },
        { label: 'Payments',      path: '/admin/settings/payments' },
        { label: 'AI Engine',     path: '/admin/settings/ai' },
        { label: 'Content & SEO', path: '/admin/settings/content' },
        { label: 'Security',      path: '/admin/settings/security' },
      ],
    },
  ];

  // For staff users, filter to only their permitted sections
  const filterNavForRole = (items: NavItem[]): NavItem[] => {
    if (isAdmin) return items;
    const result: NavItem[] = [];
    let i = 0;
    while (i < items.length) {
      const item = items[i];
      if (item.sectionTitle) {
        // Check if any visible item follows this section title
        const nextSectionIdx = items.findIndex((it, idx) => idx > i && it.sectionTitle);
        const siblings = items.slice(i + 1, nextSectionIdx === -1 ? undefined : nextSectionIdx);
        const visibleSiblings = siblings.filter(s => !s.section || canAccessSection(s.section));
        if (visibleSiblings.length > 0) result.push(item);
        i++;
      } else {
        if (!item.section || canAccessSection(item.section)) {
          result.push(item);
        }
        i++;
      }
    }
    return result;
  };

  const adminNavItems = filterNavForRole(allNavItems);

  return (
    <div className={cn(
      "min-h-screen bg-background flex text-foreground font-sans transition-all duration-300 mx-auto w-full",
      config.layoutMode === 'boxed' && "max-w-[var(--layout-max-width)] shadow-2xl border-x border-border",
      isHorizontal && "flex-col"
    )}>

      <AdminGlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AdminShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* ── Desktop Sidebar ── */}
      {!isHorizontal && (
        <Sidebar items={adminNavItems} />
      )}

      {/* ── Main Content Column ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Navbar
          navItems={adminNavItems}
          onMenuClick={() => setMobileOpen(true)}
          leftContent={<AdminBreadcrumb />}
          rightActions={
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setSearchOpen(true)}
                variant="outline"
                size="sm"
                leftIcon={Search}
                className="hidden md:inline-flex pr-3 h-10 w-52 bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-primary/30 text-muted-foreground font-medium rounded-xl group [&>span]:flex [&>span]:items-center [&>span]:gap-3 [&>span]:w-full"
              >
                <span className="flex-1 text-left text-xs uppercase tracking-wider">Search...</span>
                <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] font-black bg-muted border border-border rounded-md px-1.5 py-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">⌘K</kbd>
              </Button>
              <div className="flex items-center gap-1.5">
                <AdminNotificationBell />
                <UserDropdown isAdmin />
              </div>
            </div>
          }
          logo={
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                {globalConfig.projectIcon ? (
                  <img src={globalConfig.projectIcon} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Shield className="w-4.5 h-4.5 text-primary-foreground" />
                )}
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-sm font-black text-foreground leading-none tracking-tight uppercase">{globalConfig.siteName}</p>
                <p className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.2em] font-black leading-none mt-1">Admin Panel</p>
              </div>
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto">
          <PageContainer className="px-6 md:px-8 py-8 animate-fade-in">
            <Outlet />
          </PageContainer>
        </main>

        <footer className="shrink-0 border-t border-border bg-sidebar py-4">
          <PageContainer className="flex flex-col sm:flex-row items-center justify-between gap-2 px-6 md:px-8">
            <p className="text-xs text-muted-foreground font-medium">
              &copy; {new Date().getFullYear()} {globalConfig.siteName}. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link to={prefix('/')} className="hover:text-foreground transition-colors flex items-center gap-1">
                <Zap className="w-3 h-3" /> View Site
              </Link>
              <span>Admin Panel v1.0</span>
            </div>
          </PageContainer>
        </footer>
      </div>

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-72 z-[70] shadow-2xl"
            >
              <Sidebar
                items={adminNavItems}
                isMobile
                onClose={() => setMobileOpen(false)}
                logo={
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shadow-sm">
                      {globalConfig.projectIcon ? (
                        <img src={globalConfig.projectIcon} alt="" className="w-full h-full object-cover rounded-md" />
                      ) : (
                        <Shield className="w-4 h-4 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground leading-none uppercase">{globalConfig.siteName}</p>
                      <p className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-medium leading-none mt-0.5">Admin Panel</p>
                    </div>
                  </div>
                }
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
