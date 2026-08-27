import { HelpCircle, LayoutGrid, MoreHorizontal, Search, Zap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Users, LayoutDashboard, FileText, Tag, BarChart2,
  MessageSquare, Gift, Settings, Shield, BookOpen,
  FilePlus, AlertTriangle, Wallet, Star, Bell
} from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';
import AdminNotificationBell from '../../components/admin/AdminNotificationBell';
import UserDropdown from '../../components/layout/UserDropdown';
import LanguageSwitcher from '../../components/navigation/LanguageSwitcher';
import { MobileActionsSheet } from './MobileActionsSheet';
import { usePath } from '../../hooks/usePath';
import { cn } from '../../lib/utils';

interface AdminNavbarActionsProps {
  onSearchOpen?: () => void;
  onShortcutsOpen?: () => void;
}

// ─── Admin Apps Grid ──────────────────────────────────────────────────────────

const ADMIN_APPS = [
  { icon: LayoutDashboard, label: 'Overview',   path: '/admin' },
  { icon: Users,           label: 'Users',      path: '/admin/users' },
  { icon: BookOpen,        label: 'Prompts',    path: '/admin/prompts' },
  { icon: FileText,        label: 'Blog',       path: '/admin/blog' },
  { icon: Tag,             label: 'Categories', path: '/admin/categories' },
  { icon: Star,            label: 'Reviews',    path: '/admin/reviews' },
  { icon: MessageSquare,   label: 'Tickets',    path: '/admin/tickets' },
  { icon: AlertTriangle,   label: 'Reports',    path: '/admin/reports' },
  { icon: Settings,        label: 'Settings',   path: '/admin/settings' },
];

function AdminAppsDropdown() {
  const { prefix } = usePath();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Admin Apps"
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
          open ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
               : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute right-0 mt-2 w-[240px] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Admin Modules</p>
              <Shield className="w-3 h-3 text-primary" />
            </div>
            <div className="p-2 grid grid-cols-3 gap-0.5">
              {ADMIN_APPS.map(({ icon: Icon, label, path }) => (
                <Link
                  key={label}
                  to={prefix(path)}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-muted transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground group-hover:text-foreground text-center leading-tight">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Admin Quick Actions ──────────────────────────────────────────────────────

const ADMIN_ACTIONS = [
  { icon: FilePlus,      label: 'New Prompt',  path: '/admin/prompts/new',      color: 'text-violet-500 bg-violet-500/10' },
  { icon: Users,         label: 'Add User',    path: '/admin/users',            color: 'text-blue-500   bg-blue-500/10'   },
  { icon: FileText,      label: 'New Post',    path: '/admin/blog/new',         color: 'text-emerald-500 bg-emerald-500/10' },
  { icon: Tag,           label: 'New Tag',     path: '/admin/categories',       color: 'text-amber-500  bg-amber-500/10'  },
  { icon: Bell,          label: 'Broadcast',   path: '/admin/notifications',    color: 'text-cyan-500   bg-cyan-500/10'   },
  { icon: Settings,      label: 'Settings',    path: '/admin/settings',         color: 'text-sky-500    bg-sky-500/10'    },
];

function AdminQuickActionsDropdown() {
  const { prefix } = usePath();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Quick Actions"
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
          open ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
               : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Zap className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute right-0 mt-2 w-[248px] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</p>
            </div>
            <div className="p-2 grid grid-cols-4 gap-1">
              {ADMIN_ACTIONS.map(({ icon: Icon, label, path, color }) => (
                <Link
                  key={label}
                  to={prefix(path)}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground group-hover:text-foreground text-center leading-tight">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminNavbarActions({ onSearchOpen, onShortcutsOpen }: AdminNavbarActionsProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  return (
    <>
      {/* Mobile: "More" button */}
      <button
        onClick={() => setMobileSheetOpen(true)}
        className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="More"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* Desktop: Global search */}
      <button
        onClick={onSearchOpen}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-border rounded-lg border border-border text-xs text-muted-foreground font-medium transition-colors mr-1"
        title="Search (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search</span>
        <kbd className="ml-1 px-1 py-0.5 rounded bg-background border border-border text-[9px] font-bold">⌘K</kbd>
      </button>

      {/* Admin apps */}
      <AdminAppsDropdown />

      {/* Admin quick actions */}
      <AdminQuickActionsDropdown />

      {/* Help / shortcuts */}
      <button
        onClick={onShortcutsOpen}
        className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Keyboard shortcuts (?)"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Notifications */}
      <AdminNotificationBell />

      {/* Language */}
      <LanguageSwitcher className="hidden md:block" />

      {/* Theme toggle */}
      <ThemeToggle />

      {/* User menu */}
      <UserDropdown isAdmin />

      {/* Mobile bottom sheet */}
      <MobileActionsSheet
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        onSearchOpen={onSearchOpen ?? (() => {})}
      />
    </>
  );
}
