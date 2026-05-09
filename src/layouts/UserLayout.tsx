import {
  BookOpen,
  ChevronDown,
  Coins,
  CreditCard,
  Gift,
  Heart,
  HelpCircle,
  LayoutGrid,
  Lock,
  LogOut,
  Mail,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  User as UserIcon,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/firebase';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { label: 'Marketplace',  icon: Search,      path: '/explore' },
  { label: 'My Vault',     icon: LayoutGrid,  path: '/dashboard/vault' },
  { label: 'My Creations', icon: BookOpen,    path: '/dashboard/library' },
  { label: 'Favorites',    icon: Heart,       path: '/dashboard/favorites' },
  { label: 'AI Builder',   icon: Wand2,       path: '/dashboard/builder' },
  { label: 'Partner',      icon: Gift,        path: '/dashboard/affiliate' },
  { label: 'Credits',      icon: Coins,       path: '/dashboard/credits' },
  { label: 'Support',      icon: HelpCircle,  path: '/dashboard/support' },
];

const SETTINGS_ITEMS = [
  { label: 'Profile',       path: '/settings/profile' },
  { label: 'Billing',       path: '/settings/billing' },
  { label: 'Security',      path: '/settings/security' },
  { label: 'Notifications', path: '/settings/notifications' },
];

export default function UserLayout() {
  const { user, profile, isPro, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setMobileOpen] = useState(false);

  // Block suspended users immediately
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
              href="mailto:support@promptly.com"
              className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all"
            >
              <Mail className="w-4 h-4" /> Contact Support
            </a>
            <Button
              onClick={() => auth.signOut().then(() => navigate('/'))}
              variant="secondary"
              size="md"
              leftIcon={LogOut}
              fullWidth
              className="font-semibold"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(
    location.pathname.startsWith('/settings')
  );

  const isActive = (path: string) => location.pathname === path;
  const isSettingsActive = location.pathname.startsWith('/settings');

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/');
  };

  const creditsUsed = profile?.totalUsedCredits || 0;
  const creditsTotal = 10;
  const creditPct = isPro ? 100 : Math.min(100, (creditsUsed / creditsTotal) * 100);

  const navItems = isAdmin
    ? [...NAV_ITEMS, { label: 'Admin', icon: ShieldCheck, path: '/admin' }]
    : NAV_ITEMS;

  return (
    <div className="min-h-screen bg-background flex text-foreground">

      {/* â”€â”€ Desktop Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <aside className="hidden lg:flex flex-col w-60 bg-sidebar border-r border-border fixed inset-y-0 left-0 z-50 overflow-y-auto">

        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shadow-sm shadow-primary/30 group-hover:scale-95 transition-transform">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-base font-bold tracking-tight font-display">promptly</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
            Navigation
          </p>

          {navItems.map((item) => (
            <SidebarLink
              key={item.path}
              to={item.path}
              icon={item.icon}
              active={isActive(item.path)}
            >
              {item.label}
            </SidebarLink>
          ))}

          <div className="pt-4 mt-2 border-t border-border/60">
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
              Account
            </p>

            <Button
              onClick={() => setSettingsOpen(!isSettingsOpen)}
              variant={isSettingsActive ? 'primary' : 'ghost'}
              size="md"
              fullWidth
              leftIcon={Settings}
              rightIcon={ChevronDown}
              iconClassName={cn("transition-transform duration-200", isSettingsOpen && "rotate-180")}
              className={cn(
                "justify-start px-3 font-medium",
                !isSettingsActive && "text-muted-foreground hover:text-foreground"
              )}
            >
              Settings
            </Button>

            <AnimatePresence initial={false}>
              {isSettingsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden pl-3 mt-0.5 space-y-0.5"
                >
                  {SETTINGS_ITEMS.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 pl-6 pr-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isActive(item.path)
                          ? 'text-primary bg-accent'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive(item.path) ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                      {item.label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Bottom: Upgrade Card + User */}
        <div className="p-3 space-y-2 border-t border-border shrink-0">
          {/* Upgrade / Pro Card */}
          <div
            onClick={() => navigate(isPro ? '/settings/billing' : '/pricing')}
            className={`rounded-md p-3.5 cursor-pointer transition-transform hover:scale-[0.98] ${
              isPro
                ? 'bg-foreground text-background'
                : 'gradient-primary text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest opacity-70">
                {isPro ? 'Pro Plan' : 'Free Plan'}
              </span>
              <Zap className={`w-3.5 h-3.5 ${isPro ? 'opacity-60' : 'opacity-80'}`} />
            </div>
            <p className="text-xs font-semibold mb-2.5 leading-snug">
              {isPro ? 'Unlimited access active' : 'Upgrade for unlimited prompts'}
            </p>
            <div className="h-1 rounded-full bg-card/20 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${creditPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-card/80 rounded-full"
              />
            </div>
            <p className="text-xs mt-1.5 opacity-60 font-medium">
              {isPro ? 'Unlimited' : `${creditsUsed} / ${creditsTotal} credits`}
            </p>
          </div>

          {/* User Row */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded hover:bg-muted transition-colors group">
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                className="w-8 h-8 rounded object-cover border border-border shrink-0"
                alt=""
              />
            ) : (
              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 border border-primary/10">
                {profile?.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate leading-tight">
                {profile?.displayName?.split(' ')[0] || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate capitalize">
                {profile?.subscriptionStatus || 'free'}
              </p>
            </div>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="icon"
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* â”€â”€ Main Area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <main className="flex-1 lg:ml-60 flex flex-col min-h-screen">

        {/* Header */}
        <header className="h-16 glass sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 shrink-0">
          {/* Mobile: burger + logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <Button
              onClick={() => setMobileOpen(true)}
              variant="secondary"
              size="icon"
              className="rounded bg-muted text-foreground hover:bg-border transition-colors h-9 w-9"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary fill-primary" />
              <span className="font-bold text-sm font-display">promptly</span>
            </Link>
          </div>

          <div className="hidden lg:flex items-center flex-1 max-w-sm">
            <Input 
              type="text"
              placeholder="Search blueprints..."
              leftIcon={Search}
              variant="filled"
              inputSize="sm"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary/8 text-primary rounded border border-primary/12 text-xs font-semibold">
              <Coins className="w-3.5 h-3.5" />
              <span>{isPro ? 'âˆž' : profile?.credits ?? 0}</span>
            </div>

            <ThemeToggle />

            {/* Avatar + dropdown */}
            <div className="relative">
              <Button
                onClick={() => setUserMenuOpen(!isUserMenuOpen)}
                variant="ghost"
                size="md"
                rightIcon={ChevronDown}
                iconClassName={cn("transition-transform duration-200", isUserMenuOpen && "rotate-180")}
                className="flex items-center gap-2 p-1.5 rounded hover:bg-muted transition-colors h-auto"
              >
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    className="w-8 h-8 rounded object-cover border border-border"
                    alt=""
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center text-xs font-bold">
                    {profile?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </Button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-card rounded-md shadow-lg border border-border p-1 z-50"
                    >
                      <div className="px-3 py-2.5 border-b border-border mb-1">
                        <p className="text-sm font-semibold truncate">{profile?.displayName || 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                      </div>
                      <DropdownItem to="/settings/profile" icon={UserIcon} onClick={() => setUserMenuOpen(false)}>Profile</DropdownItem>
                      <DropdownItem to="/settings/billing" icon={CreditCard} onClick={() => setUserMenuOpen(false)}>Billing</DropdownItem>
                      <div className="h-px bg-border my-1" />
                      <Button
                        onClick={() => { setUserMenuOpen(false); handleSignOut(); }}
                        variant="ghost"
                        size="md"
                        fullWidth
                        leftIcon={LogOut}
                        className="justify-start px-3 py-2 text-destructive hover:bg-destructive/8 font-medium"
                      >
                        Sign out
                      </Button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground/50 font-medium uppercase tracking-widest">
            Promptly Â· Personal Workspace
          </p>
          <div className="flex items-center gap-4">
            <Link to="/dashboard/support" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors uppercase tracking-widest font-medium">
              Help
            </Link>
            <Link to="/privacy" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors uppercase tracking-widest font-medium">
              Privacy
            </Link>
          </div>
        </footer>
      </main>

      {/* â”€â”€ Mobile Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-60"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-72 bg-sidebar border-r border-border z-70 flex flex-col shadow-2xl"
            >
              <div className="h-16 flex items-center justify-between px-5 border-b border-border shrink-0">
                <Link to="/" className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white fill-white" />
                  </div>
                  <span className="font-bold font-display">promptly</span>
                </Link>
                <Button
                  onClick={() => setMobileOpen(false)}
                  variant="secondary"
                  size="icon"
                  className="rounded bg-muted text-muted-foreground hover:text-foreground transition-colors h-9 w-9"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {navItems.map((item) => (
                  <SidebarLink
                    key={item.path}
                    to={item.path}
                    icon={item.icon}
                    active={isActive(item.path)}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </SidebarLink>
                ))}
                <div className="pt-3 mt-2 border-t border-border/60">
                  {SETTINGS_ITEMS.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Settings className="w-4 h-4 shrink-0" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </nav>

              <div className="p-3 border-t border-border shrink-0">
                <Button
                  onClick={() => { setMobileOpen(false); handleSignOut(); }}
                  variant="ghost"
                  size="md"
                  fullWidth
                  leftIcon={LogOut}
                  className="justify-start px-3 py-2.5 text-destructive hover:bg-destructive/8 font-medium"
                >
                  Sign out
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* â”€â”€ Shared sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function SidebarLink({
  to, icon: Icon, active, children, onClick,
}: {
  to: string;
  icon: React.ElementType;
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {children}
    </Link>
  );
}

function DropdownItem({
  to, icon: Icon, children, onClick,
}: {
  to: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}
