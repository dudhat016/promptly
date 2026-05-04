import { Coins, FileText, Gift, Heart, LayoutGrid, LogOut, Mail, Menu, Moon, Search, Settings, ShieldCheck, Sparkles, Sun, User, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useConfig } from '../hooks/useConfig';
import { auth, signInWithGoogle } from '../lib/firebase';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground relative flex items-center justify-center"
      aria-label="Toggle theme"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  );
}

export default function Header() {
  const { config } = useConfig();
  const { user, profile, isPro, isAdmin, loading } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-primary p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">{config.siteName}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link to="/explore" className="hover:text-primary transition-colors">Explore</Link>
          <Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
          <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
          <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
        </nav>

        <div className="flex items-center gap-2 md:gap-4 relative">
          <ThemeToggle />

          {!loading && (
            user ? (
              <div className="flex items-center gap-2 md:gap-4">
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-3 p-1.5 bg-muted border border-border rounded-full hover:ring-2 hover:ring-primary transition-all focus:outline-none"
                  >
                    <div className="hidden sm:flex flex-col items-end px-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-0.5">Credits</span>
                      <span className="text-xs font-black text-primary leading-none">{profile?.credits || 0}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-background border border-border overflow-hidden flex items-center justify-center">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setUserMenuOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-3 w-56 bg-card rounded-2xl shadow-2xl border border-border p-2 z-50 overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-border mb-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-bold text-foreground truncate">{user.displayName || 'User'}</p>
                              {isPro && (
                                <span className="text-[8px] font-black bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md uppercase tracking-widest shadow-sm">Pro</span>
                              )}
                              {isAdmin && (
                                <span className="text-[8px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-widest shadow-sm">Admin</span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground truncate uppercase tracking-tighter">{user.email}</p>
                          </div>

                          <Link
                            to="/dashboard"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted hover:text-primary transition-all"
                          >
                            <LayoutGrid className="w-4 h-4" />
                            My Vault
                          </Link>

                          <Link
                            to="/dashboard/favorites"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted hover:text-primary transition-all"
                          >
                            <Heart className="w-4 h-4" />
                            My Favorites
                          </Link>

                          <Link
                            to="/credits"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted hover:text-primary transition-all"
                          >
                            <Coins className="w-4 h-4" />
                            Credit History
                          </Link>

                          {isAdmin && (
                            <Link
                              to="/admin"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-primary hover:bg-muted transition-all"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              Admin Portal
                            </Link>
                          )}

                          <Link
                            to="/affiliate/dashboard"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted hover:text-primary transition-all"
                          >
                            <Gift className="w-4 h-4" />
                            Partner Program
                          </Link>

                          <Link
                            to="/settings/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted hover:text-primary transition-all"
                          >
                            <Settings className="w-4 h-4" />
                            Account Settings
                          </Link>

                          <div className="h-[1px] bg-border my-1" />

                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              handleSignOut();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all"
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
            ) : (
              <div className="flex items-center gap-2 md:gap-3">
                <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-primary px-2 md:px-4 py-2">
                  Log in
                </Link>
                <button
                  onClick={signInWithGoogle}
                  className="bg-primary text-primary-foreground text-xs md:text-sm font-semibold px-3 md:px-5 py-2 rounded-lg hover:opacity-90 shadow-md shadow-primary/20 transition-all active:scale-95"
                >
                  Join Now
                </button>
              </div>
            )
          )}
          <button
            className="md:hidden p-2 text-muted-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background overflow-hidden"
          >
            <div className="px-4 py-6 space-y-2">
              {user && (
                <div className="mb-8 p-4 bg-muted rounded-[2rem] border border-border flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-card border border-border overflow-hidden shrink-0">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-black text-foreground truncate leading-tight">{user.displayName || 'Creator'}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] font-black text-primary bg-background px-2 py-0.5 rounded-lg border border-border">{profile?.credits || 0} Credits</span>
                       {isPro && <span className="text-[10px] font-black bg-primary text-primary-foreground px-2 py-0.5 rounded-lg uppercase tracking-wider">Pro</span>}
                    </div>
                  </div>
                </div>
              )}

              <MobileNavLink to="/explore" onClick={() => setMobileMenuOpen(false)} icon={Search}>Explore</MobileNavLink>
              <MobileNavLink to="/pricing" onClick={() => setMobileMenuOpen(false)} icon={Sparkles}>Pricing</MobileNavLink>
              <MobileNavLink to="/blog" onClick={() => setMobileMenuOpen(false)} icon={FileText}>Blog</MobileNavLink>
              <MobileNavLink to="/contact" onClick={() => setMobileMenuOpen(false)} icon={Mail}>Contact</MobileNavLink>
              <MobileNavLink to="/affiliate" onClick={() => setMobileMenuOpen(false)} icon={Gift}>Partner Program</MobileNavLink>

              <div className="h-[1px] bg-border my-4" />

              {user && (
                <>
                  <MobileNavLink to="/dashboard" onClick={() => setMobileMenuOpen(false)} icon={LayoutGrid}>My Vault</MobileNavLink>
                  <MobileNavLink to="/dashboard/favorites" onClick={() => setMobileMenuOpen(false)} icon={Heart}>My Favorites</MobileNavLink>
                  <MobileNavLink to="/credits" onClick={() => setMobileMenuOpen(false)} icon={Coins}>Credit History</MobileNavLink>
                  <MobileNavLink to="/settings/profile" onClick={() => setMobileMenuOpen(false)} icon={Settings}>Account Settings</MobileNavLink>
                </>
              )}
              {isAdmin && (
                <MobileNavLink to="/admin" onClick={() => setMobileMenuOpen(false)} className="text-primary" icon={ShieldCheck}>
                  Admin Panel
                </MobileNavLink>
              )}

              {user && (
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-4 font-black text-red-500 py-4 px-2 hover:bg-red-500/10 rounded-2xl transition-all mt-4"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MobileNavLink({ to, children, onClick, icon: Icon, className = "" }: any) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-4 text-lg font-black text-foreground py-4 px-2 hover:bg-muted rounded-2xl transition-all ${className}`}
    >
      {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
      {children}
    </Link>
  );
}
