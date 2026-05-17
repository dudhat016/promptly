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
  Lock,
  Mail,
  LogOut,
  Search,
  Settings,
  Sparkles,
  User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUI } from '../contexts/UIProvider';
import { auth } from '../lib/firebase';
import Button from '../components/primitives/Button';
import { usePath } from '../hooks/usePath';
import { useConfig } from '../hooks/useConfig';
import { cn } from '../lib/utils';

// Modular Layout Components
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import UserDropdown from '../components/layout/UserDropdown';
import UpgradeCard from '../components/layout/UpgradeCard';
import { ThemeToggle } from '../components/ThemeToggle';
import { NavItem } from '../components/layout/types';
import PageContainer from '../components/layout/PageContainer';
import NotificationBell from '../components/notifications/NotificationBell';
import { useNotifications } from '../hooks/useNotifications';

const USER_NAV_ITEMS: NavItem[] = [
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

const USER_SETTINGS_ITEMS: NavItem = {
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

export default function UserLayout({ children }: { children?: React.ReactNode }) {
  const { profile, isAdmin, isPro } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [isMobileOpen, setMobileOpen] = useState(false);
  const { prefix } = usePath();
  const { config: globalConfig } = useConfig();
  const { config } = useUI();
  const location = useLocation();

  // Feature discovery: track which nav paths the user has visited
  const DISCOVERY_PATHS = [
    '/dashboard/collections',
    '/dashboard/twin-studio',
    '/dashboard/affiliate',
    '/dashboard/usage',
  ];
  const SEEN_KEY = 'promptly_seen_nav';
  const [seenPaths, setSeenPaths] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
    catch { return new Set(); }
  });

  useEffect(() => {
    const current = DISCOVERY_PATHS.find(p => location.pathname.startsWith(p));
    if (current && !seenPaths.has(current)) {
      setSeenPaths(prev => {
        const next = new Set(prev);
        next.add(current);
        localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(next)));
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const isHorizontal = config.orientation === 'horizontal';
  const sidebarWidth = config.sidebarCollapsed ? 80 : config.sidebarWidth;

  // Block suspended users
  if (profile?.suspended) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Account Suspended</h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Your account has been temporarily suspended. Please contact our support team for assistance.
          </p>
          <div className="flex flex-col gap-3">
            <a href={`mailto:${globalConfig.supportEmail}`} className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all">
              <Mail className="w-4 h-4" /> Contact Support
            </a>
            <Button onClick={() => auth.signOut().then(() => navigate(prefix('/')))} variant="secondary" size="md" leftIcon={LogOut} fullWidth>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const profileItem: NavItem | null = profile?.uid
    ? { label: 'My Profile', icon: User, path: `/creator/${profile.username || profile.uid}` }
    : null;

  const navItems: NavItem[] = [
    ...USER_NAV_ITEMS.map(item => {
      const isDiscovery = item.path && DISCOVERY_PATHS.includes(item.path) && !seenPaths.has(item.path);
      if (item.path === '/dashboard/notifications' && unreadCount > 0) {
        return { ...item, badge: unreadCount > 99 ? '99+' : unreadCount, badgeVariant: 'danger' as const };
      }
      return isDiscovery ? { ...item, isNew: true } : item;
    }),
    ...(profileItem ? [profileItem] : []),
    USER_SETTINGS_ITEMS,
  ];

  return (
    <div className={cn(
      "min-h-screen bg-background flex text-foreground font-sans transition-all duration-300",
      isHorizontal && "flex-col"
    )}>
      
      {/* ── Desktop Sidebar ── */}
      {!isHorizontal && (
        <Sidebar 
          items={navItems} 
          bottomSection={<UpgradeCard collapsed={config.sidebarCollapsed} />}
        />
      )}

      {/* ── Main Content Column ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar 
          navItems={navItems}
          onMenuClick={() => setMobileOpen(true)}
          rightActions={
            <>
              {/* Search trigger */}
              <button
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-border rounded-lg border border-border text-xs text-muted-foreground font-medium transition-colors mr-1"
                title="Search (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
                <kbd className="ml-1 px-1 py-0.5 rounded bg-background border border-border text-[9px] font-bold">⌘K</kbd>
              </button>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary/8 text-primary rounded border border-primary/12 text-xs font-semibold mr-1">
                <Coins className="w-3.5 h-3.5" />
                <span>{isPro ? '∞' : profile?.credits ?? 0}</span>
              </div>
              <NotificationBell />
              <ThemeToggle />
              <UserDropdown isAdmin={isAdmin} />
            </>
          }
        />

        <main className="flex-1">
          <PageContainer className="p-6 md:p-8 animate-fade-in">
            {children || <Outlet />}
          </PageContainer>
        </main>

        <footer className="border-t border-border py-4 bg-muted/20">
          <PageContainer className="px-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground/50 font-medium uppercase tracking-widest">
              {globalConfig.siteName} · Personal Workspace
            </p>
            <div className="flex items-center gap-4">
              <Link to={prefix('/dashboard/support')} className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors uppercase tracking-widest font-medium">Help</Link>
              <Link to={prefix('/privacy')} className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors uppercase tracking-widest font-medium">Privacy</Link>
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
                items={navItems} 
                isMobile 
                onClose={() => setMobileOpen(false)} 
                bottomSection={<UpgradeCard />}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
