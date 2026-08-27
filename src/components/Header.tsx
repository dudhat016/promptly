import {
  Coins, FileText, Gift, Heart, LayoutGrid,
  LogOut, Mail, Menu, Moon, Search, Settings, ShieldCheck,
  Sparkles, Sun, X, HelpCircle
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../hooks/useConfig';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { usePath } from '../hooks/usePath';
import { auth, db, signInWithGoogle } from '../lib/firebase';
import { cn } from '../lib/utils';
import { HeaderMenuItem } from '../types';
import Button from './primitives/Button';
import NotificationBell from './notifications/NotificationBell';
import AnnouncementBanner from './AnnouncementBanner';
import PageContainer from './layout/PageContainer';
import UserDropdown from './layout/UserDropdown';

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

function LanguageSwitcher() {
  const { lng } = useParams();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === lng) || SUPPORTED_LANGUAGES[0];

  const changeLang = (code: string) => {
    const newPath = location.pathname.replace(`/${lng}`, `/${code}`);
    navigate(newPath + location.search, { replace: true });
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setOpen(!open)}
        variant="ghost"
        size="sm"
        className="gap-2 px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground font-semibold"
      >
        <span className="text-lg">{currentLang.flag}</span>
        <span className="hidden lg:inline uppercase">{currentLang.code}</span>
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
              className="absolute right-0 mt-1.5 w-40 rounded-xl p-1.5 z-50 bg-card border border-border shadow-xl"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <Button
                  key={l.code}
                  onClick={() => changeLang(l.code)}
                  variant={lng === l.code ? 'primary' : 'ghost'}
                  size="sm"
                  fullWidth
                  className="justify-start gap-3 px-2.5 py-1.5 font-semibold"
                >
                  <span className="text-lg">{l.flag}</span>
                  <span>{l.label}</span>
                </Button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Header() {
  const { config } = useConfig();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user, profile, isPro, isAdmin, isStaff, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { prefix, lng } = usePath();

  const handleSignOut = async () => {
    await auth.signOut();
    navigate(prefix('/'));
  };

  const [dynamicMenuItems, setDynamicMenuItems] = useState<HeaderMenuItem[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'navigation'), (snap) => {
      if (snap.exists() && snap.data().menuItems) {
        setDynamicMenuItems(snap.data().menuItems);
      }
    }, () => {});
    return () => unsub();
  }, []);

  const defaultNavLinks = [
    { to: prefix('/'),            label: t('nav.explore')     },
    { to: prefix('/blog'),        label: t('nav.blog')        },
    { to: prefix('/contact'),     label: t('nav.support')     },
  ];

  const NAV_LINKS = dynamicMenuItems.length > 0
    ? dynamicMenuItems.map(item => ({
        to: item.url.startsWith('http') ? item.url : prefix(item.url),
        label: item.label,
        target: item.target,
        isExternal: item.url.startsWith('http'),
      }))
    : defaultNavLinks.map(l => ({ ...l, target: '_self', isExternal: false }));

  return (
    <>
      <AnnouncementBanner />
      <header className="z-50 flex items-center transition-all duration-300 sticky top-0 w-full glass border-b border-border h-16">
        <PageContainer className="px-4 md:px-6 h-16 flex items-center justify-between gap-4" ignoreCustomizer>
  
          {/* Logo */}
          <Link to={prefix('/')} className="flex items-center gap-2.5 shrink-0 group">
            {theme === 'dark' && config.logoLight ? (
              <img src={config.logoLight} alt={config.siteName} className="h-8 w-auto" />
            ) : theme === 'light' && config.logoDark ? (
              <img src={config.logoDark} alt={config.siteName} className="h-8 w-auto" />
            ) : (
              <>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-95 transition-transform gradient-cta shadow-lg shadow-primary/25"
                >
                  {config.projectIcon ? (
                    <img src={config.projectIcon} alt="" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Sparkles className="w-4.5 h-4.5 text-white" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-foreground leading-none tracking-tight uppercase">
                    {config.siteName}
                  </p>
                  <p className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.2em] font-black leading-none mt-1">
                    {config.siteTagline.split(' ')[0] || 'Marketplace'}
                  </p>
                </div>
              </>
            )}
          </Link>
  
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label, target, isExternal }) => {
              const isActive = location.pathname === to;
              if (isExternal) {
                return (
                  <a
                    key={to}
                    href={to}
                    target={target || '_self'}
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    {label}
                  </a>
                );
              }
              return (
                <Link
                  key={to}
                  to={to}
                  target={target || '_self'}
                  className={cn(
                    "px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                    isActive 
                      ? "text-primary bg-primary/8" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        {/* Right actions */}
        <div className="flex items-center gap-1">
          <div className="hidden lg:flex items-center gap-1 pr-2 border-r border-border/50">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          
          <div className="flex items-center gap-1 ml-1">
            {user && <NotificationBell />}

            {!loading && (
              user ? (
                <UserDropdown isAdmin={isAdmin || isStaff} />
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    as={Link}
                    to={prefix('/login')}
                    variant="ghost"
                    size="sm"
                    className="hidden sm:inline-flex px-4 font-bold text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    {t('header.signIn')}
                  </Button>
                  <Button
                    onClick={signInWithGoogle}
                    variant="primary"
                    size="md"
                    className="px-6 font-black text-xs uppercase tracking-[0.1em] shadow-lg shadow-primary/25 gradient-cta"
                  >
                    {t('header.getStarted')}
                  </Button>
                </div>
              )
            )}
          </div>
        </div>

          <Button
            variant="secondary"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden rounded bg-muted text-foreground hover:bg-border transition-colors h-9 w-9"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </PageContainer>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 top-16 bg-background/60 backdrop-blur-sm z-[45] md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="md:hidden absolute top-16 left-0 right-0 z-50 glass border-t border-border shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-6 space-y-1">
                {user && (
                  <div className="mb-6 p-4 rounded-2xl flex items-center gap-4 bg-muted/50 border border-border/50">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shrink-0 shadow-md">
                      {user.photoURL
                        ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-lg font-bold bg-primary text-primary-foreground">
                            {user.displayName?.charAt(0) || 'U'}
                          </div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-foreground truncate uppercase tracking-tight">{user.displayName || 'User'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                          {t('header.mobile.unlimitedAccess')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
  
                <div className="grid grid-cols-1 gap-1">
                  {dynamicMenuItems.length > 0 ? (
                    NAV_LINKS.map(({ to, label, isExternal }) => (
                      isExternal ? (
                        <a
                          key={to}
                          href={to}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                        >
                          <Search className="w-4 h-4 text-primary" />
                          {label}
                        </a>
                      ) : (
                        <MobileLink key={to} to={to} icon={Search} onClick={() => setMobileOpen(false)}>
                          {label}
                        </MobileLink>
                      )
                    ))
                  ) : (
                    <>
                      <MobileLink to={prefix('/')}          icon={Search}    onClick={() => setMobileOpen(false)}>{t('header.mobile.explore')}</MobileLink>
                      <MobileLink to={prefix('/blog')}      icon={FileText}  onClick={() => setMobileOpen(false)}>{t('header.mobile.blog')}</MobileLink>
                      <MobileLink to={prefix('/contact')}   icon={Mail}      onClick={() => setMobileOpen(false)}>{t('header.mobile.contact')}</MobileLink>
                      <MobileLink to={prefix('/faq')}       icon={HelpCircle} onClick={() => setMobileOpen(false)}>{t('header.mobile.faq')}</MobileLink>
                    </>
                  )}
                </div>
  
                {user && (
                  <>
                    <div className="h-px my-4 bg-border/50" />
                    <div className="grid grid-cols-1 gap-1">
                      <MobileLink to={prefix('/dashboard/favorites')} icon={Heart}     onClick={() => setMobileOpen(false)}>{t('header.mobile.favorites')}</MobileLink>
                      <MobileLink to={prefix('/settings/profile')}    icon={Settings}  onClick={() => setMobileOpen(false)}>{t('header.mobile.account')}</MobileLink>
                      {(isAdmin || isStaff) && (
                        <MobileLink to={prefix('/admin')} icon={ShieldCheck} onClick={() => setMobileOpen(false)} accent>
                          {isAdmin ? t('header.mobile.adminPanel') : t('header.mobile.staffPanel')}
                        </MobileLink>
                      )}
                    </div>
                    <div className="h-px my-4 bg-border/50" />
                    <Button
                      onClick={() => { setMobileOpen(false); handleSignOut(); }}
                      variant="ghost"
                      size="lg"
                      fullWidth
                      leftIcon={LogOut}
                      className="justify-start px-3 py-3 text-destructive hover:bg-destructive/10 font-bold text-xs uppercase tracking-[0.2em]"
                    >
                      {t('header.mobile.signOut')}
                    </Button>
                  </>
                )}
  
                {!user && (
                  <div className="mt-6 flex flex-col gap-3">
                    <Button
                      as={Link}
                      to={prefix('/login')}
                      onClick={() => setMobileOpen(false)}
                      variant="outline"
                      size="xl"
                      fullWidth
                      className="font-bold text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted border-border"
                    >
                      {t('header.signIn')}
                    </Button>
                    <Button
                      onClick={() => { setMobileOpen(false); signInWithGoogle(); }}
                      variant="primary"
                      size="xl"
                      fullWidth
                      className="font-black text-xs uppercase tracking-[0.15em] gradient-cta shadow-xl shadow-primary/20"
                    >
                      {t('header.getStarted')}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}



function MobileLink({ to, icon: Icon, children, onClick, accent = false }: {
  to: string; icon: React.ElementType; children: React.ReactNode;
  onClick?: () => void; accent?: boolean;
}) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
        isActive 
          ? "bg-primary/10 text-primary" 
          : accent 
            ? "text-primary hover:bg-primary/10" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground/60")} />
      {children}
    </Link>
  );
}
