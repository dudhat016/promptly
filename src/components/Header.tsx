import {
  ChevronDown, Coins, FileText, Gift, Heart, LayoutGrid,
  LogOut, Mail, Menu, Moon, Search, Settings, ShieldCheck,
  Sparkles, Sun, User, X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useConfig } from '../hooks/useConfig';
import { auth, signInWithGoogle } from '../lib/firebase';
import { useCurrency } from '../context/CurrencyContext';
import Button from './ui/Button';
import { cn } from '../lib/utils';

function CurrencyDropdown() {
  const { currency, setCurrency, symbol } = useCurrency();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        onClick={() => setOpen(!open)}
        variant="ghost"
        size="sm"
        rightIcon={ChevronDown}
        className="gap-1.5 px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground font-semibold"
      >
        <span className="text-primary font-bold">{symbol}</span>
        {currency}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 mt-1.5 w-28 rounded-xl p-1.5 z-50 bg-card border border-border shadow-xl"
            >
              {(['USD', 'INR'] as const).map((c) => (
                <Button
                  key={c}
                  onClick={() => { setCurrency(c); setOpen(false); }}
                  variant={currency === c ? 'primary' : 'ghost'}
                  size="sm"
                  fullWidth
                  className="justify-between px-2.5 py-1.5 font-semibold"
                >
                  <span>{c}</span>
                  <span className="opacity-60">{c === 'USD' ? '$' : '₹'}</span>
                </Button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:bg-muted hover:text-foreground relative"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute top-2 left-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

export default function Header() {
  const { config } = useConfig();
  const { user, profile, isPro, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/');
  };

  const NAV_LINKS = [
    { to: '/explore', label: 'Explore' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/blog',    label: 'Blog'    },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/90 border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))', boxShadow: '0 0 14px rgba(139,92,246,0.35)' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-base font-display text-foreground">{config.siteName}</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="px-3 py-1.5 text-sm font-medium rounded-md transition-all text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          <CurrencyDropdown />
          <ThemeToggle />

          {!loading && (
            user ? (
              <div className="relative">
                <Button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  variant="ghost"
                  size="md"
                  rightIcon={ChevronDown}
                  className={cn(
                    "pl-2 pr-2.5 py-1.5 border border-transparent hover:bg-muted hover:border-border",
                    userMenuOpen && "bg-muted border-border"
                  )}
                  iconClassName={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", userMenuOpen && "rotate-180")}
                >
                  <div className="w-7 h-7 rounded-lg overflow-hidden border border-border shrink-0">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))' }}>
                        {user.displayName?.charAt(0)?.toUpperCase() || <User className="w-3.5 h-3.5" />}
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:block text-left ml-2 mr-1">
                    <p className="text-xs font-semibold text-foreground leading-none">{user.displayName?.split(' ')[0] || 'User'}</p>
                    <p className="text-xs text-muted-foreground leading-none mt-0.5 flex items-center gap-1">
                      <Coins className="w-2.5 h-2.5" />
                      {isPro ? '∞' : profile?.credits ?? 0}
                    </p>
                  </div>
                </Button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 mt-2 w-56 rounded-xl p-1.5 z-50 bg-card border border-border shadow-2xl"
                      >
                        <div className="px-3 py-2.5 mb-1 border-b border-border">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-sm font-semibold text-foreground truncate">{user.displayName || 'User'}</p>
                            {isPro && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 bg-primary/20 text-primary">Pro</span>}
                            {isAdmin && <span className="text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Admin</span>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>

                        <DMenuItem to="/dashboard/vault"     icon={LayoutGrid} onClick={() => setUserMenuOpen(false)}>My Vault</DMenuItem>
                        <DMenuItem to="/dashboard/favorites"  icon={Heart}      onClick={() => setUserMenuOpen(false)}>Favorites</DMenuItem>
                        <DMenuItem to="/dashboard/credits"    icon={Coins}      onClick={() => setUserMenuOpen(false)}>Credits</DMenuItem>
                        <DMenuItem to="/dashboard/affiliate"  icon={Gift}       onClick={() => setUserMenuOpen(false)}>Partner Program</DMenuItem>
                        {isAdmin && (
                          <DMenuItem to="/admin" icon={ShieldCheck} onClick={() => setUserMenuOpen(false)} accent>Admin Panel</DMenuItem>
                        )}
                        <DMenuItem to="/settings/profile" icon={Settings} onClick={() => setUserMenuOpen(false)}>Settings</DMenuItem>

                        <div className="h-px my-1 bg-border" />
                        <Button
                          onClick={() => { setUserMenuOpen(false); handleSignOut(); }}
                          variant="ghost"
                          size="md"
                          fullWidth
                          leftIcon={LogOut}
                          className="justify-start px-3 py-2 text-destructive hover:bg-destructive/10 font-medium"
                        >
                          Sign out
                        </Button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  as={Link}
                  to="/login"
                  variant="ghost"
                  size="sm"
                  className="hidden sm:block px-3 font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  Sign in
                </Button>
                <Button
                  onClick={signInWithGoogle}
                  variant="primary"
                  size="md"
                  className="px-6 font-semibold shadow-xl shadow-primary/30"
                  style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))' }}
                >
                  Get started
                </Button>
              </div>
            )
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-background border-t border-border"
          >
            <div className="px-4 py-5 space-y-1">
              {user && (
                <div className="mb-4 p-3 rounded-xl flex items-center gap-3 bg-muted border border-border">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-border shrink-0">
                    {user.photoURL
                      ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))' }}>
                          {user.displayName?.charAt(0) || 'U'}
                        </div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{user.displayName || 'User'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        {isPro ? 'Unlimited' : `${profile?.credits ?? 0} credits`}
                      </span>
                      {isPro && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-primary/20 text-primary">Pro</span>}
                    </div>
                  </div>
                </div>
              )}

              <MobileLink to="/explore"   icon={Search}    onClick={() => setMobileOpen(false)}>Explore</MobileLink>
              <MobileLink to="/pricing"   icon={Sparkles}  onClick={() => setMobileOpen(false)}>Pricing</MobileLink>
              <MobileLink to="/blog"      icon={FileText}  onClick={() => setMobileOpen(false)}>Blog</MobileLink>
              <MobileLink to="/contact"   icon={Mail}      onClick={() => setMobileOpen(false)}>Contact</MobileLink>
              <MobileLink to="/affiliate" icon={Gift}      onClick={() => setMobileOpen(false)}>Partner Program</MobileLink>

              {user && (
                <>
                  <div className="h-px my-3 bg-border" />
                  <MobileLink to="/dashboard/vault"     icon={LayoutGrid} onClick={() => setMobileOpen(false)}>My Vault</MobileLink>
                  <MobileLink to="/dashboard/favorites" icon={Heart}     onClick={() => setMobileOpen(false)}>Favorites</MobileLink>
                  <MobileLink to="/settings/profile"    icon={Settings}  onClick={() => setMobileOpen(false)}>Settings</MobileLink>
                  {isAdmin && (
                    <MobileLink to="/admin" icon={ShieldCheck} onClick={() => setMobileOpen(false)} accent>Admin Panel</MobileLink>
                  )}
                  <div className="h-px my-3 bg-border" />
                  <Button
                    onClick={() => { setMobileOpen(false); handleSignOut(); }}
                    variant="ghost"
                    size="md"
                    fullWidth
                    leftIcon={LogOut}
                    className="justify-start px-3 py-2.5 text-destructive hover:bg-destructive/10 font-medium"
                  >
                    Sign out
                  </Button>
                </>
              )}

              {!user && (
                <div className="mt-4 flex gap-2">
                  <Button
                    as={Link}
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    variant="outline"
                    size="lg"
                    fullWidth
                    className="font-medium text-muted-foreground hover:text-foreground hover:bg-muted border-border"
                  >
                    Sign in
                  </Button>
                  <Button
                    onClick={() => { setMobileOpen(false); signInWithGoogle(); }}
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="font-semibold"
                    style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))' }}
                  >
                    Get started
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function DMenuItem({ to, icon: Icon, children, onClick, accent = false }: {
  to: string; icon: React.ElementType; children: React.ReactNode;
  onClick?: () => void; accent?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        accent ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {children}
    </Link>
  );
}

function MobileLink({ to, icon: Icon, children, onClick, accent = false }: {
  to: string; icon: React.ElementType; children: React.ReactNode;
  onClick?: () => void; accent?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        accent ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0 text-muted-foreground/60" />
      {children}
    </Link>
  );
}
