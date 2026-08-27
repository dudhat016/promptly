import { AnimatePresence, motion } from 'motion/react';
import { Lock, LogOut, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUI } from '../contexts/UIProvider';
import { useConfig } from '../hooks/useConfig';
import { useNotifications } from '../hooks/useNotifications';
import { auth } from '../lib/firebase';
import { usePath } from '../hooks/usePath';
import { cn } from '../lib/utils';
import { buildUserNavItems, DISCOVERY_PATHS, USER_TOUR_STEPS } from '../data/userNavItems';

import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import PageContainer from '../components/layout/PageContainer';
import Button from '../components/primitives/Button';
import GuidedTour from '../components/GuidedTour';

import { NavbarActions } from './header/NavbarActions';
import { UserBreadcrumb } from './header/UserBreadcrumb';
import { SidebarFooter } from './sidebar/SidebarFooter';
import CommandPalette from '../components/overlays/CommandPalette';

export default function DemoLayout({ children }: { children?: React.ReactNode }) {
  const { profile, isAdmin, isPro } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const { prefix } = usePath();
  const { config: globalConfig } = useConfig();
  const { config } = useUI();

  const [isMobileOpen, setMobileOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const isGradient = config.sidebarTheme === 'gradient';

  // Feature discovery
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

  // Suspended account wall
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
            <a
              href={`mailto:${globalConfig.supportEmail}`}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all"
            >
              <Mail className="w-4 h-4" /> Contact Support
            </a>
            <Button
              onClick={() => auth.signOut().then(() => navigate(prefix('/')))}
              variant="secondary" size="md" leftIcon={LogOut} fullWidth
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = buildUserNavItems({
    unreadCount,
    seenPaths,
    profileUid: profile?.uid,
    profileUsername: profile?.username,
  });

  const sidebarFooter = (
    <SidebarFooter collapsed={config.sidebarCollapsed} isGradient={isGradient} />
  );

  const navbarActions = (
    <NavbarActions
      isAdmin={isAdmin}
      isPro={isPro}
      onTourOpen={() => setTourOpen(true)}
      onSearchOpen={() => setSearchOpen(true)}
    />
  );

  return (
    <div className="min-h-screen bg-background flex text-foreground font-sans transition-all duration-300">

      {/* Sidebar */}
      <Sidebar items={navItems} bottomSection={sidebarFooter} />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          navItems={navItems}
          onMenuClick={() => setMobileOpen(true)}
          leftContent={<UserBreadcrumb />}
          rightActions={navbarActions}
        />

        <main className="flex-1">
          <PageContainer className="p-6 md:p-8 animate-fade-in">
            {children || <Outlet />}
          </PageContainer>
        </main>

        <footer className="border-t border-border bg-muted/20 py-4">
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

      {/* Guided Tour */}
      {tourOpen && <GuidedTour steps={USER_TOUR_STEPS} onClose={() => setTourOpen(false)} />}

      {/* Command Palette */}
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile Sidebar Drawer */}
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
              <Sidebar items={navItems} isMobile onClose={() => setMobileOpen(false)} bottomSection={sidebarFooter} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
