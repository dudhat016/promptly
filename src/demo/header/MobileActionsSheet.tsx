import { AnimatePresence, motion } from 'motion/react';
import {
  Coins, Search, X,
  Home, Compass, Sparkles, Heart, BookMarked,
  FilePlus, Bell, Settings, MessageSquare, BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import { cn } from '../../lib/utils';

interface MobileActionsSheetProps {
  open: boolean;
  onClose: () => void;
  onSearchOpen: () => void;
  isPro?: boolean;
  credits?: number;
}

const QUICK_LINKS = [
  { icon: Home,         label: 'Dashboard',   path: '/dashboard',              color: 'text-primary   bg-primary/10'      },
  { icon: Compass,      label: 'Explore',     path: '/explore',                color: 'text-blue-500  bg-blue-500/10'     },
  { icon: Sparkles,     label: 'AI Studio',   path: '/dashboard/twin-studio',  color: 'text-violet-500 bg-violet-500/10' },
  { icon: Heart,        label: 'Favorites',   path: '/dashboard/favorites',    color: 'text-rose-500  bg-rose-500/10'    },
  { icon: BookMarked,   label: 'Collections', path: '/dashboard/collections',  color: 'text-amber-500 bg-amber-500/10'   },
  { icon: FilePlus,     label: 'New Prompt',  path: '/dashboard/library',      color: 'text-emerald-500 bg-emerald-500/10'},
  { icon: Bell,         label: 'Alerts',      path: '/dashboard/notifications',color: 'text-cyan-500  bg-cyan-500/10'    },
  { icon: MessageSquare,label: 'Support',     path: '/dashboard/support',      color: 'text-sky-500   bg-sky-500/10'     },
  { icon: BookOpen,     label: 'Docs',        path: '/docs',                   color: 'text-indigo-500 bg-indigo-500/10' },
  { icon: Settings,     label: 'Settings',    path: '/settings',               color: 'text-muted-foreground bg-muted'   },
];

export function MobileActionsSheet({
  open, onClose, onSearchOpen, isPro, credits = 0
}: MobileActionsSheetProps) {
  const { i18n } = useTranslation();
  const { profile } = useAuth();
  const { prefix } = usePath();

  const handleSearch = () => { onClose(); onSearchOpen(); };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85] flex flex-col justify-end lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative z-10 bg-card border-t border-border rounded-t-2xl shadow-2xl overflow-hidden"
          >
            {/* Handle */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="w-10 h-1 rounded-full bg-border mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
              <p className="text-sm font-bold text-foreground">More Actions</p>
              <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pb-safe overflow-y-auto max-h-[75vh]">

              {/* Credit + plan strip */}
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center gap-2 flex-1">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} className="w-8 h-8 rounded-lg object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                      {(profile?.displayName?.charAt(0) || 'U').toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-foreground">{profile?.displayName || 'User'}</p>
                    <p className={cn('text-[10px] font-bold uppercase', isPro ? 'text-amber-500' : 'text-muted-foreground')}>
                      {isPro ? 'Pro Plan' : 'Free Plan'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/8 text-primary rounded-lg border border-primary/15">
                  <Coins className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">{isPro ? '∞' : credits}</span>
                </div>
              </div>

              {/* Primary actions row */}
              <div className="mb-4">
                <button
                  onClick={handleSearch}
                  className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-muted border border-border hover:bg-border transition-colors"
                >
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-foreground">Search</p>
                    <p className="text-[10px] text-muted-foreground">Ctrl+K</p>
                  </div>
                </button>
              </div>

              {/* Quick navigation */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">Quick Navigation</p>
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {QUICK_LINKS.map(({ icon: Icon, label, path, color }) => (
                  <Link
                    key={label}
                    to={prefix(path)}
                    onClick={onClose}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground group-hover:text-foreground text-center leading-tight">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Language */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">Language</p>
              <div className="flex gap-2 flex-wrap mb-4">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { i18n.changeLanguage(lang.code); onClose(); }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-colors',
                      i18n.language === lang.code
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                    )}
                  >
                    <span className="text-base leading-none">{lang.flag}</span>
                    {lang.label}
                  </button>
                ))}
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
