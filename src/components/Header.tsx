import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth, signInWithGoogle } from '../lib/firebase';
import { LogOut, User, Zap, Sparkles, Search, ShieldCheck, Settings, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

export default function Header() {
  const { user, isPro, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Promptly</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link to="/explore" className="hover:text-indigo-600 transition-colors">Explore</Link>
          <Link to="/pricing" className="hover:text-indigo-600 transition-colors">Pricing</Link>
          <Link to="/affiliate" className="hover:text-indigo-600 transition-colors">Affiliate</Link>
          {user && (
            <>
              <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">My Library</Link>
              <Link to="/profile" className="p-1.5 hover:bg-slate-100 rounded-full transition-all group" title="Account Settings">
                <Settings className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
              </Link>
            </>
          )}
          {isAdmin && <Link to="/admin" className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Admin
          </Link>}
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          {!loading && (
            user ? (
              <div className="flex items-center gap-2 md:gap-4">
                {isPro && (
                  <span className="hidden sm:flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-indigo-200">
                    <Zap className="w-3 h-3" />
                    PRO
                  </span>
                )}
                <div className="flex items-center gap-1 md:gap-2">
                  <button 
                    onClick={handleSignOut}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors hidden sm:block"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                  <Link to="/profile" className="p-2 text-slate-400 hover:text-slate-600 transition-colors md:hidden">
                    <Settings className="w-5 h-5" />
                  </Link>
                  <Link to="/dashboard" className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-indigo-500 transition-all">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-5 h-5 text-slate-400" />
                    )}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 md:gap-3">
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 px-2 md:px-4 py-2">
                  Log in
                </Link>
                <button
                  onClick={signInWithGoogle}
                  className="bg-indigo-600 text-white text-xs md:text-sm font-semibold px-3 md:px-5 py-2 rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-95"
                >
                  Join Now
                </button>
              </div>
            )
          )}
          <button 
            className="md:hidden p-2 text-slate-600"
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
            className="md:hidden border-t border-slate-100 bg-white overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              <MobileNavLink to="/explore" onClick={() => setMobileMenuOpen(false)}>Explore</MobileNavLink>
              <MobileNavLink to="/pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</MobileNavLink>
              <MobileNavLink to="/affiliate" onClick={() => setMobileMenuOpen(false)}>Affiliate</MobileNavLink>
              {user && (
                <>
                  <MobileNavLink to="/dashboard" onClick={() => setMobileMenuOpen(false)}>My Library</MobileNavLink>
                  <MobileNavLink to="/profile" onClick={() => setMobileMenuOpen(false)}>Account</MobileNavLink>
                </>
              )}
              {isAdmin && (
                <MobileNavLink to="/admin" onClick={() => setMobileMenuOpen(false)} className="text-indigo-600 font-bold">
                  Admin Panel
                </MobileNavLink>
              )}
              {user && (
                <button 
                  onClick={handleSignOut}
                  className="w-full text-left font-bold text-red-500 py-2 border-t border-slate-50 pt-4"
                >
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

function MobileNavLink({ to, children, onClick, className = "" }: any) {
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`block text-lg font-black text-slate-900 border-b border-slate-50 pb-2 ${className}`}
    >
      {children}
    </Link>
  );
}
