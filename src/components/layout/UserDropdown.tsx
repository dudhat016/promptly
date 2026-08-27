import {
  Activity, BookMarked, ChevronDown, Coins, Gift, Heart, HelpCircle,
  LogOut, Moon, Settings, Shield, Star, Sun, User as UserIcon
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { useUI } from '../../contexts/UIProvider';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import Button from '../primitives/Button';

interface UserDropdownProps {
  isAdmin?: boolean;
}

export default function UserDropdown({ isAdmin }: UserDropdownProps) {
  const { profile, isPro } = useAuth();
  const { prefix } = usePath();
  const { config, setConfig } = useUI();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsOpen(false);
    await auth.signOut();
    navigate(prefix('/'));
  };

  const toggleTheme = () => {
    setConfig({ mode: config.mode === 'dark' ? 'light' : 'dark' });
  };

  const initials = (profile?.displayName?.charAt(0) || profile?.email?.charAt(0) || 'U').toUpperCase();
  const planLabel = isPro ? 'Pro' : 'Free';
  const planColor = isPro ? 'text-amber-500 bg-amber-500/10' : 'text-muted-foreground bg-muted';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors"
      >
        {profile?.photoURL ? (
          <img src={profile.photoURL} className="w-8 h-8 rounded-lg object-cover border border-border shadow-sm" alt="" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm">
            {initials}
          </div>
        )}
        <div className="hidden md:block text-left">
          <p className="text-xs font-semibold text-foreground leading-tight max-w-[90px] truncate">
            {profile?.displayName || 'User'}
          </p>
          <p className={cn('text-[9px] font-bold leading-tight uppercase tracking-wide', planColor.split(' ')[0])}>
            {planLabel}
          </p>
        </div>
        <ChevronDown className={cn('hidden md:block w-3.5 h-3.5 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 bg-card rounded-xl shadow-2xl border border-border overflow-hidden z-50"
          >
            {/* Profile card */}
            <div className="p-4 bg-gradient-to-br from-primary/8 to-primary/3 border-b border-border">
              <div className="flex items-center gap-3">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} className="w-11 h-11 rounded-xl object-cover border-2 border-primary/20 shadow" alt="" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-base font-bold shadow">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{profile?.displayName || 'User'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{profile?.email}</p>
                  <span className={cn('inline-flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full', planColor)}>
                    {isPro && <Star className="w-2.5 h-2.5" />}
                    {planLabel} Plan
                  </span>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="p-1.5">
              <MenuSection label="My Content">
                <MenuLink to={prefix('/dashboard/favorites')} icon={Heart} onClick={() => setIsOpen(false)}>Favorites</MenuLink>
                <MenuLink to={prefix('/dashboard/collections')} icon={BookMarked} onClick={() => setIsOpen(false)}>Collections</MenuLink>
              </MenuSection>

              <div className="h-px bg-border/60 my-1" />

              <MenuSection label="Account">
                <MenuLink to={prefix('/dashboard/support')} icon={HelpCircle} onClick={() => setIsOpen(false)}>Support</MenuLink>
              </MenuSection>

              <div className="h-px bg-border/60 my-1" />

              <MenuSection label="Preferences">
                <MenuLink to={prefix('/settings/profile')} icon={UserIcon} onClick={() => setIsOpen(false)}>Profile Settings</MenuLink>
                <MenuLink to={prefix('/settings')} icon={Settings} onClick={() => setIsOpen(false)}>Settings</MenuLink>
                <button
                  onClick={() => { setIsOpen(false); toggleTheme(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {config.mode === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
                  <span>{config.mode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </MenuSection>

              {isAdmin && (
                <>
                  <div className="h-px bg-border/60 my-1" />
                  <MenuLink to={prefix('/admin')} icon={Shield} onClick={() => setIsOpen(false)}>
                    {profile?.role === 'staff' ? 'Staff Panel' : 'Admin Control'}
                  </MenuLink>
                </>
              )}
            </div>

            {/* Sign out */}
            <div className="border-t border-border p-1.5">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/8 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">{label}</p>
      {children}
    </div>
  );
}

function MenuLink({
  to, icon: Icon, children, onClick,
}: {
  to: string; icon: React.ElementType; children: React.ReactNode; onClick: () => void;
}) {
  const { pathname } = useLocation();
  const isActive = pathname === to || pathname.startsWith(to + '/');

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive ? 'bg-primary/8 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-primary')} />
      {typeof children === 'string' ? <span>{children}</span> : children}
    </Link>
  );
}
