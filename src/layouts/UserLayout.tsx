import {
  BookOpen,
  ChevronRight,
  Coins,
  CreditCard,
  Gift,
  Heart,
  HelpCircle,
  LayoutGrid,
  LogOut, Menu,
  MessageSquare,
  SearchIcon,
  Settings,
  User as UserIcon,
  Wand2,
  X,
  Zap
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/firebase';

export default function UserLayout() {
  const { user, profile, isPro, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: 'Marketplace', icon: SearchIcon, path: '/explore' },
    { label: 'My Vault', icon: LayoutGrid, path: '/vault' },
    { label: 'My Creations', icon: BookOpen, path: '/dashboard/library' },
    { label: 'Favorites', icon: Heart, path: '/dashboard/favorites' },
    { label: 'AI Builder', icon: Wand2, path: '/builder' },
    { label: 'Partner Program', icon: Gift, path: '/affiliate/dashboard' },
    { label: 'Credit Ledger', icon: Coins, path: '/credits' },
    { label: 'Neural Support', icon: HelpCircle, path: '/support' },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Admin Terminal', icon: BookOpen, path: '/admin' });
  }

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-card border-r border-border fixed inset-y-0 left-0 z-50">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform">
              <Zap className="w-6 h-6 text-primary-foreground fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tighter">promptly</span>
          </Link>
        </div>

        <nav className="flex-grow px-4 space-y-2 mt-4 overflow-y-auto">
          <p className="px-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 opacity-50">Main Deck</p>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-sm transition-all group ${
                isActive(item.path)
                  ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
              {item.label}
              {isActive(item.path) && (
                <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 bg-primary-foreground rounded-full" />
              )}
            </Link>
          ))}

          <p className="px-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-10 mb-4 opacity-50">Control Center</p>
          <div className="space-y-1">
            <Link
              to="/settings/profile"
              className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-sm transition-all group ${
                location.pathname.startsWith('/settings')
                  ? 'bg-foreground text-background shadow-xl'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Settings className={`w-5 h-5 ${location.pathname.startsWith('/settings') ? 'text-background' : 'text-muted-foreground group-hover:text-foreground'}`} />
              Account Settings
            </Link>

            <AnimatePresence initial={false}>
              {location.pathname.startsWith('/settings') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden pl-4 space-y-1 mt-2"
                >
                  <SubNavLink to="/settings/profile" label="Profile" />
                  <SubNavLink to="/settings/billing" label="Financials" />
                  <SubNavLink to="/settings/security" label="Security" />
                  <SubNavLink to="/settings/notifications" label="Alerts" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        <div className="p-4 mt-auto border-t border-border/50">
          <div
            className={`rounded-3xl p-6 text-white relative overflow-hidden group cursor-pointer ${isPro ? 'bg-foreground text-background' : 'bg-primary text-primary-foreground'}`}
            onClick={() => navigate(isPro ? '/settings/billing' : '/pricing')}
          >
            <Zap className="w-20 h-20 absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500" />
            <div className="relative z-10">
              <h4 className="font-black mb-1">
                {isPro ? 'Pro Workspace' : 'Go Unlimited'}
              </h4>
              <p className="opacity-60 text-[10px] font-bold mb-4 uppercase tracking-[0.1em]">
                {isPro
                  ? `${profile?.totalUsedCredits || 0} / Unlimited Usage`
                  : 'Unlock your true potential.'}
              </p>
              <div className={`${isPro ? 'bg-background/20' : 'bg-primary-foreground/20'} h-1.5 rounded-full overflow-hidden`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: isPro ? '100%' : `${Math.min(100, ((profile?.totalUsedCredits || 0) / 10) * 100)}%` }}
                  className={`${isPro ? 'bg-background' : 'bg-primary-foreground'} h-full`}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 px-4 py-4 rounded-3xl border border-border bg-muted/30">
            {profile?.photoURL ? (
              <img src={profile.photoURL} className="w-10 h-10 rounded-2xl bg-card object-cover border border-border" alt="" />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs border border-primary/20">
                {profile?.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="flex-grow min-w-0">
              <p className="text-sm font-black truncate leading-tight">{profile?.displayName?.split(' ')[0]}</p>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">{profile?.subscriptionStatus || 'Free'}</p>
            </div>
            <button onClick={handleSignOut} className="p-2.5 bg-background text-muted-foreground hover:text-destructive rounded-xl transition-all border border-border">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow lg:ml-72 min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="h-20 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 md:px-10 sticky top-0 z-40">
          <div className="flex items-center gap-4 lg:hidden">
            <button onClick={() => setSidebarOpen(true)} className="p-2.5 bg-muted text-foreground rounded-xl border border-border">
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <Zap className="w-8 h-8 text-primary" />
            </Link>
          </div>

          <div className="hidden md:flex items-center flex-grow max-w-xl">
            <div className="relative w-full group">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search blueprints..."
                className="w-full bg-muted/50 border-transparent focus:bg-background focus:border-primary/20 focus:ring-0 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold transition-all placeholder:text-muted-foreground/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl border border-primary/20">
               <Coins className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">
                 {isPro ? 'Unlimited' : `${profile?.credits || 0} Credits`}
               </span>
            </div>

            <ThemeToggle />

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 p-1.5 bg-muted/50 hover:bg-muted rounded-2xl transition-all border border-transparent hover:border-border"
              >
                {profile?.photoURL ? (
                  <img src={profile.photoURL} className="w-9 h-9 rounded-xl bg-card shadow-sm border border-border object-cover" alt="" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xs">
                    {profile?.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isUserMenuOpen ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-64 bg-card rounded-[2rem] shadow-2xl border border-border p-3 z-50 overflow-hidden"
                    >
                      <div className="px-5 py-5 border-b border-border mb-3">
                        <p className="text-sm font-black text-foreground truncate leading-tight">{profile?.displayName}</p>
                        <p className="text-[10px] font-black text-muted-foreground truncate uppercase tracking-widest opacity-60">{profile?.email}</p>
                      </div>
                      <Link to="/settings/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                        <UserIcon className="w-4 h-4" />
                        Public Profile
                      </Link>
                      <Link to="/settings/billing" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                        <CreditCard className="w-4 h-4" />
                        Billing & Plans
                      </Link>
                      <div className="h-[1px] bg-border my-2" />
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black text-destructive hover:bg-destructive/5 transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="flex-grow container mx-auto px-6 py-8 min-h-screen">
          <Outlet />
        </div>

        {/* Footer info for users */}
        <footer className="p-10 text-center bg-card border-t border-border">
           <div className="flex flex-wrap justify-center gap-10 mb-8">
             <FooterLink icon={HelpCircle} label="Documentation" />
             <FooterLink icon={BookOpen} label="Blueprint Guide" />
             <FooterLink icon={MessageSquare} label="Lab Feedback" />
           </div>
           <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">Promptly OS v2.5.0 • Authorized Personal Workspace</p>
        </footer>
      </main>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-md z-[60]"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 bg-card z-[70] p-10 shadow-2xl flex flex-col"
            >
               <div className="flex items-center justify-between mb-12">
                 <Link to="/" className="flex items-center gap-3">
                   <Zap className="w-8 h-8 text-primary fill-current" />
                   <span className="text-2xl font-black tracking-tighter">promptly</span>
                 </Link>
                 <button onClick={() => setSidebarOpen(false)} className="p-3 bg-muted text-muted-foreground hover:text-foreground rounded-2xl transition-all border border-border">
                   <X className="w-6 h-6" />
                 </button>
               </div>

               <nav className="flex-grow space-y-3">
                 <p className="px-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 opacity-50">Main Deck</p>
                 {navItems.map((item) => (
                   <Link
                     key={item.path}
                     to={item.path}
                     onClick={() => setSidebarOpen(false)}
                     className={`flex items-center gap-4 px-6 py-5 rounded-[2rem] font-black text-lg transition-all ${
                       isActive(item.path) ? 'bg-primary text-primary-foreground shadow-xl' : 'text-muted-foreground hover:bg-muted'
                     }`}
                   >
                     <item.icon className="w-6 h-6" />
                     {item.label}
                   </Link>
                 ))}
                 <div className="h-[1px] bg-border my-10" />
                 <p className="px-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 opacity-50">Control</p>
                 <Link
                   to="/settings/profile"
                   onClick={() => setSidebarOpen(false)}
                   className={`flex items-center gap-4 px-6 py-5 rounded-[2rem] font-black text-lg transition-all ${
                     location.pathname.startsWith('/settings') ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
                   }`}
                 >
                   <Settings className="w-6 h-6" />
                   Settings
                 </Link>
               </nav>

               <button
                 onClick={handleSignOut}
                 className="mt-auto flex items-center justify-center gap-4 px-6 py-6 text-destructive font-black border-t border-border text-lg uppercase tracking-widest"
               >
                 <LogOut className="w-6 h-6" />
                 Sign Out
               </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FooterLink({ icon: Icon, label }: any) {
  return (
    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all">
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function SubNavLink({ to, label }: { to: string; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
        isActive
          ? 'text-foreground bg-muted border border-border'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-primary' : 'bg-transparent'}`} />
      {label}
    </Link>
  );
}
