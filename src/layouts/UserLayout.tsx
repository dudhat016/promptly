import {
  BarChart3,
  BookOpen,
  Coins,
  Gift,
  Heart,
  HelpCircle,
  LayoutGrid,
  Lock,
  Mail,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
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

const USER_NAV_ITEMS: NavItem[] = [
  { label: 'Marketplace',  icon: Search,      path: '/explore' },
  { label: 'My Vault',     icon: LayoutGrid,  path: '/dashboard/vault' },
  { label: 'My Creations', icon: BookOpen,    path: '/dashboard/library' },
  { label: 'AI Twin Studio', icon: Sparkles,  path: '/dashboard/twin-studio' },
  { label: 'Favorites',    icon: Heart,       path: '/dashboard/favorites' },
  { label: 'Partner',      icon: Gift,        path: '/dashboard/affiliate' },
  {
    label: 'Credits',
    icon: Coins,
    path: '/dashboard/credits',
    children: [
      { label: 'My Balance', path: '/dashboard/credits' },
      { label: 'Usage Logs', path: '/dashboard/usage' },
    ]
  },
  { label: 'Support',      icon: HelpCircle,  path: '/dashboard/support' },
];

const USER_SETTINGS_ITEMS: NavItem = {
  label: 'Settings',
  icon: Settings,
  path: '/settings',
  children: [
    { label: 'Profile',       path: '/settings/profile' },
    { label: 'AI Integration', path: '/settings/ai' },
    { label: 'Billing',       path: '/settings/billing' },
    { label: 'Security',      path: '/settings/security' },
    { label: 'Notifications', path: '/settings/notifications' },
  ]
};

export default function UserLayout({ children }: { children?: React.ReactNode }) {
  const { profile, isAdmin, isPro } = useAuth();
  const navigate = useNavigate();
  const [isMobileOpen, setMobileOpen] = useState(false);
  const { prefix } = usePath();
  const { config: globalConfig } = useConfig();
  const { config } = useUI();
  
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

  const navItems = isAdmin
    ? [...USER_NAV_ITEMS, USER_SETTINGS_ITEMS, { label: 'Admin Panel', icon: ShieldCheck, path: '/admin' }]
    : [...USER_NAV_ITEMS, USER_SETTINGS_ITEMS];

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
               <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary/8 text-primary rounded border border-primary/12 text-xs font-semibold mr-1">
                <Coins className="w-3.5 h-3.5" />
                <span>{isPro ? '∞' : profile?.credits ?? 0}</span>
              </div>
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
