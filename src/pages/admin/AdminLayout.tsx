import { collection, collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import { Shield, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useUI } from '../../contexts/UIProvider';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';

import {
  AdminBreadcrumb,
  AdminGlobalSearch,
  AdminShortcutsModal,
  PageContainer
} from '../../components/admin';
import Navbar from '../../components/layout/Navbar';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { AdminNavbarActions } from '../../demo/header/AdminNavbarActions';
import { AdminSidebarFooter } from '../../demo/sidebar/AdminSidebarFooter';
import { useConfig } from '../../hooks/useConfig';
import { useStaffRoles } from '../../hooks/useStaffRoles';
import { buildAdminNavItems, filterNavForRole } from '../../data/adminNavItems';
import { AdminSection } from '../../types';

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

  const [openTickets, setOpenTickets] = useState(0);
  const [unreadInquiries, setUnreadInquiries] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingPrompts, setPendingPrompts] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);

  const isGradient = config.sidebarTheme === 'gradient';

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === '?' && !isInput) setShortcutsOpen(v => !v);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const noop = () => {};
    const unsubT   = onSnapshot(query(collection(db, 'tickets'),        where('status', '==', 'open')),             snap => setOpenTickets(snap.size), noop);
    const unsubI   = onSnapshot(collection(db, 'contact_messages'),     snap => setUnreadInquiries(snap.docs.filter(d => !d.data().readAt).length), noop);
    const unsubR   = onSnapshot(query(collection(db, 'prompt_reports'), where('status', '==', 'pending')),          snap => setPendingReports(snap.size), noop);
    const unsubP   = onSnapshot(query(collection(db, 'prompts'),        where('status', '==', 'pending')),          snap => setPendingPrompts(snap.size), noop);
    const unsubRev = onSnapshot(query(collectionGroup(db, 'reviews'),   where('moderationStatus', '==', 'pending')), snap => setPendingReviews(snap.size), noop);
    return () => { unsubT(); unsubI(); unsubR(); unsubP(); unsubRev(); };
  }, []);

  const adminNavItems = filterNavForRole(
    buildAdminNavItems({ openTickets, unreadInquiries, pendingReports, pendingPrompts, pendingReviews }),
    isAdmin ? () => true : (sec) => canAccessSection(sec as AdminSection)
  );

  const adminFooter = (
    <AdminSidebarFooter collapsed={config.sidebarCollapsed} isGradient={isGradient} />
  );

  const mobileLogo = (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shadow-sm">
        {globalConfig.projectIcon
          ? <img src={globalConfig.projectIcon} alt="" className="w-full h-full object-cover rounded-md" />
          : <Shield className="w-4 h-4 text-primary-foreground" />}
      </div>
      <div>
        <p className="text-sm font-bold text-foreground leading-none uppercase">{globalConfig.siteName}</p>
        <p className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-medium leading-none mt-0.5">Admin Panel</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex text-foreground font-sans transition-all duration-300">

      <AdminGlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AdminShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Sidebar */}
      <Sidebar items={adminNavItems} bottomSection={adminFooter} />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Navbar
          navItems={adminNavItems}
          onMenuClick={() => setMobileOpen(true)}
          leftContent={<AdminBreadcrumb />}
          rightActions={
            <AdminNavbarActions
              onSearchOpen={() => setSearchOpen(true)}
              onShortcutsOpen={() => setShortcutsOpen(true)}
            />
          }
          logo={
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                {globalConfig.projectIcon
                  ? <img src={globalConfig.projectIcon} alt="" className="w-full h-full object-cover rounded-xl" />
                  : <Shield className="w-4.5 h-4.5 text-primary-foreground" />}
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

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-72 z-[70] shadow-2xl"
            >
              <Sidebar
                items={adminNavItems}
                isMobile
                onClose={() => setMobileOpen(false)}
                bottomSection={<AdminSidebarFooter collapsed={false} isGradient={isGradient} />}
                logo={mobileLogo}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
