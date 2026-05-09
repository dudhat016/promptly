import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { auth, db } from '../../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  BarChart3,
  BarChart2,
  ChevronDown,
  Cpu,
  Edit2,
  ExternalLink,
  FileText,
  History,
  LayoutGrid,
  Link as LinkIcon,
  LogOut,
  Mail,
  MessageSquare,
  Moon,
  Search,
  Send,
  Settings,
  Shield,
  Sun,
  Tag,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AdminBreadcrumb, AdminNotificationBell, AdminGlobalSearch, AdminShortcutsModal } from '../../components/admin';
import Button from '../../components/ui/Button';
import { cn } from '../../lib/utils';

/* ── Types ─────────────────────────────────────────────── */
interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  count?: number;
}

/* ── Sidebar Link ───────────────────────────────────────── */
function SidebarLink({ to, icon: Icon, label, end = false, count }: NavItem) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        }`
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {!!count && (
        <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-bold px-1 shrink-0">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </NavLink>
  );
}

/* ── Sidebar Group ──────────────────────────────────────── */
function SidebarGroup({
  icon: Icon,
  label,
  activePath,
  children,
}: {
  icon: React.ElementType;
  label: string;
  activePath: string;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const isActive = location.pathname.includes(activePath);
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <div>
      <Button
        onClick={() => setOpen(!open)}
        variant="ghost"
        size="md"
        fullWidth
        leftIcon={Icon}
        rightIcon={ChevronDown}
        iconClassName={cn("transition-transform duration-200", open && "rotate-180")}
        className={cn(
          "justify-start px-3 font-medium",
          isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        )}
      >
        {label}
      </Button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-0.5 ml-4 pl-3 border-l border-border space-y-0.5 py-0.5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Sidebar Sub Link ───────────────────────────────────── */
function SidebarSubLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          isActive
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/40'
        }`
      }
    >
      <span className="w-1 h-1 rounded-full bg-current opacity-50" />
      {label}
    </NavLink>
  );
}

/* ── Profile Dropdown ───────────────────────────────────── */
function AdminProfileDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/');
  };

  const initials = (user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'A').toUpperCase();

  return (
    <div ref={ref} className="relative">
      <Button
        onClick={() => setOpen(!open)}
        variant="ghost"
        size="md"
        rightIcon={ChevronDown}
        iconClassName={cn("transition-transform duration-200", open && "rotate-180")}
        className="pl-2 pr-3 py-1.5 hover:bg-muted/60 group"
      >
        {user?.photoURL ? (
          <img src={user.photoURL} className="w-7 h-7 rounded-md object-cover" alt="" />
        ) : (
          <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
            {initials}
          </div>
        )}
        <div className="hidden md:block text-left ml-2.5 mr-1">
          <p className="text-xs font-semibold text-foreground leading-tight max-w-[120px] truncate">
            {user?.displayName || 'Admin'}
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight max-w-[120px] truncate">
            {user?.email}
          </p>
        </div>
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-xl shadow-black/10 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-sm font-semibold text-foreground truncate">{user?.displayName || 'Admin User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>

            <div className="py-1">
              <Link
                to="/admin/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                Settings
              </Link>
              <Link
                to="/"
                target="_blank"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                View Site
              </Link>
            </div>

            <div className="border-t border-border py-1">
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="md"
                fullWidth
                leftIcon={LogOut}
                className="justify-start px-4 py-2.5 text-rose-600 hover:bg-rose-500/10 font-medium"
              >
                Sign Out
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Admin Layout ───────────────────────────────────────── */
export default function AdminLayout() {
  const { theme, setTheme } = useTheme();
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [unreadInquiries, setUnreadInquiries] = useState(0);

  const isDark = theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Ctrl+K and ? global shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === '?' && !isInput) {
        setShortcutsOpen(v => !v);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Live badge counts
  useEffect(() => {
    const unsubW = onSnapshot(
      query(collection(db, 'payouts'), where('status', '==', 'pending')),
      snap => setPendingWithdrawals(snap.size),
    );
    const unsubT = onSnapshot(
      query(collection(db, 'tickets'), where('status', '==', 'open')),
      snap => setOpenTickets(snap.size),
    );
    const unsubI = onSnapshot(
      collection(db, 'contact_messages'),
      snap => setUnreadInquiries(snap.docs.filter(d => !d.data().readAt).length),
    );
    return () => { unsubW(); unsubT(); unsubI(); };
  }, []);

  return (
    <div className="min-h-screen bg-background flex font-sans">

      <AdminGlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AdminShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Mobile FAB */}
      <Button
        onClick={() => setMobileOpen(true)}
        variant="primary"
        size="icon"
        className="lg:hidden fixed bottom-5 right-5 z-50 w-12 h-12 rounded-xl shadow-xl shadow-primary/30"
      >
        <LayoutGrid className="w-5 h-5" />
      </Button>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-60"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside
        className={`w-60 bg-sidebar border-r border-border flex flex-col fixed lg:sticky top-0 h-screen overflow-y-auto z-70 transition-transform duration-300 ease-out shrink-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
          <Link to="/admin" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">Promptly</p>
              <p className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-medium leading-none mt-0.5">Admin Panel</p>
            </div>
          </Link>
          <Button
            onClick={() => setMobileOpen(false)}
            variant="ghost"
            size="icon"
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <NavSection label="Overview">
            <SidebarLink to="/admin" icon={BarChart3} label="Dashboard" end />
            <SidebarLink to="/admin/users" icon={Users} label="Users" />
          </NavSection>

          <NavSection label="Content">
            <SidebarLink to="/admin/prompts" icon={LayoutGrid} label="Prompts" />
            <SidebarLink to="/admin/categories" icon={Tag} label="Categories" />
            <SidebarLink to="/admin/templates" icon={Edit2} label="Templates" />
            <SidebarLink to="/admin/blog" icon={FileText} label="Blog" />
            <SidebarLink to="/admin/seo" icon={Search} label="SEO Audit" />
            <SidebarLink to="/admin/models" icon={Cpu} label="AI Models" />
          </NavSection>

          <NavSection label="Support">
            <SidebarLink to="/admin/inquiries" icon={MessageSquare} label="Inquiries" count={unreadInquiries} />
            <SidebarLink to="/admin/tickets" icon={BarChart2} label="Tickets" count={openTickets} />
          </NavSection>

          <NavSection label="Revenue">
            <SidebarLink to="/admin/subscriptions" icon={Zap} label="Plans" />
            <SidebarLink to="/admin/revenue" icon={BarChart3} label="Financials" />
            <SidebarLink to="/admin/referrals" icon={LinkIcon} label="Affiliates" />
            <SidebarLink to="/admin/withdrawals" icon={Wallet} label="Withdrawals" count={pendingWithdrawals} />
          </NavSection>

          <NavSection label="Comms">
            <SidebarLink to="/admin/emails" icon={Mail} label="Email Logs" />
            <SidebarLink to="/admin/emails/settings" icon={Settings} label="Email Config" />
            <SidebarGroup icon={Send} label="Marketing & CRM" activePath="/admin/marketing">
              <SidebarSubLink to="/admin/marketing/contacts" label="Contacts" />
              <SidebarSubLink to="/admin/marketing/tags" label="Tags" />
              <SidebarSubLink to="/admin/marketing/segments" label="Segments" />
              <SidebarSubLink to="/admin/marketing/automations" label="Automations" />
            </SidebarGroup>
          </NavSection>

          <NavSection label="System">
            <SidebarLink to="/admin/permissions" icon={Shield} label="Permissions" />
            <SidebarLink to="/admin/activity" icon={History} label="Activity Log" />
            <SidebarLink to="/admin/settings" icon={Settings} label="Settings" />
          </NavSection>
        </nav>
      </aside>

      {/* ── Right Column: header + content + footer ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-x-hidden">

        {/* ── Top Header ── */}
        <header className="h-14 shrink-0 sticky top-0 z-40 bg-sidebar border-b border-border flex items-center gap-4 px-6">

          {/* Breadcrumb */}
          <div className="flex-1 min-w-0">
            <AdminBreadcrumb />
          </div>

          {/* Search trigger */}
          <Button
            onClick={() => setSearchOpen(true)}
            variant="ghost"
            size="md"
            leftIcon={Search}
            className="relative hidden md:flex items-center gap-2 pl-9 pr-3 py-1.5 text-sm bg-muted/50 border border-border rounded-md w-48 hover:bg-muted/80 hover:border-border/80 transition-all text-muted-foreground cursor-pointer font-normal"
            aria-label="Open search"
          >
            <span className="flex-1 text-left">Search...</span>
            <kbd className="hidden sm:flex items-center gap-0.5 text-[9px] font-bold bg-muted border border-border rounded px-1 py-0.5 shrink-0">
              ⌘K
            </kbd>
          </Button>

          {/* Dark mode toggle */}
          <Button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-muted/60"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Notifications */}
          <AdminNotificationBell />

          {/* Profile */}
          <AdminProfileDropdown />
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 md:px-8 py-8 max-w-[1400px] mx-auto w-full animate-fade-in">
            <Outlet />
          </div>
        </main>

        {/* ── Footer ── */}
        <footer className="shrink-0 border-t border-border bg-sidebar">
          <div className="px-6 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1400px] mx-auto w-full">
            <p className="text-xs text-muted-foreground font-medium">
              &copy; {new Date().getFullYear()} Promptly. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                View Site
              </Link>
              <span>Admin Panel v1.0</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ── Nav Section Label ──────────────────────────────────── */
function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pb-3">
      <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
