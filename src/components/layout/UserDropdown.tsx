import { ChevronDown, Coins, Gift, Heart, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import Button from '../primitives/Button';

interface UserDropdownProps {
  isAdmin?: boolean;
}

export default function UserDropdown({ isAdmin }: UserDropdownProps) {
  const { profile } = useAuth();
  const { prefix, lng } = usePath();
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
    await auth.signOut();
    navigate(prefix('/'));
  };

  const initials = (profile?.displayName?.charAt(0) || profile?.email?.charAt(0) || 'U').toUpperCase();

  return (
    <div ref={ref} className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="md"
        rightIcon={ChevronDown}
        iconClassName={cn("transition-transform duration-200", isOpen && "rotate-180")}
        className="flex items-center p-1.5 rounded hover:bg-muted transition-colors h-auto [&>span]:flex [&>span]:items-center [&>span]:gap-2"
      >
        {profile?.photoURL ? (
          <img
            src={profile.photoURL}
            className="w-8 h-8 rounded object-cover border border-border shadow-sm"
            alt=""
          />
        ) : (
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm">
            {initials}
          </div>
        )}
        <div className="hidden md:block text-left ml-1 mr-1">
          <p className="text-xs font-semibold text-foreground leading-tight max-w-[100px] truncate">
            {profile?.displayName || 'User'}
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight max-w-[100px] truncate">
            {profile?.subscriptionStatus || 'Free'}
          </p>
        </div>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-56 bg-card rounded-md shadow-lg border border-border p-1 z-50 overflow-hidden"
            >
              <div className="px-3 py-2.5 border-b border-border mb-1 bg-muted/30">
                <p className="text-sm font-semibold truncate">{profile?.displayName || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>

              <div className="py-1">
                <DropdownLink to={prefix('/dashboard/favorites')} icon={Heart} onClick={() => setIsOpen(false)}>Favorites</DropdownLink>
                <DropdownLink to={prefix('/dashboard/credits')} icon={Coins} onClick={() => setIsOpen(false)}>Credits</DropdownLink>
                <DropdownLink to={prefix('/dashboard/affiliate')} icon={Gift} onClick={() => setIsOpen(false)}>Partner Program</DropdownLink>

                <div className="h-px my-1 bg-border/50" />

                <DropdownLink to={prefix('/settings/profile')} icon={UserIcon} onClick={() => setIsOpen(false)}>Profile Settings</DropdownLink>

                {isAdmin && (
                  <DropdownLink to={prefix('/admin')} icon={Shield} onClick={() => setIsOpen(false)}>
                    {profile?.role === 'staff' ? 'Staff Panel' : 'Admin Control'}
                  </DropdownLink>
                )}
              </div>

              <div className="border-t border-border py-1 mt-1">
                <Button
                  onClick={() => { setIsOpen(false); handleSignOut(); }}
                  variant="ghost"
                  size="md"
                  fullWidth
                  leftIcon={LogOut}
                  className="justify-start px-3 py-2 text-destructive hover:bg-destructive/8 font-medium"
                >
                  Sign out
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownLink({ to, icon: Icon, children, onClick }: { to: string; icon: React.ElementType; children: React.ReactNode; onClick: () => void }) {
  const { pathname } = useLocation();
  const isActive = pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors",
        isActive 
          ? "bg-primary/8 text-primary font-bold" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "")} />
      {children}
    </Link>
  );
}
