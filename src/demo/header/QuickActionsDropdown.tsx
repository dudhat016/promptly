import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Zap, Sparkles, Heart, Coins, Users, BookOpen,
  FilePlus, Compass, MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { cn } from '../../lib/utils';

const ACTIONS = [
  { icon: FilePlus,      label: 'New Prompt',  path: '/dashboard/prompts/create', color: 'text-violet-500 bg-violet-500/10' },
  { icon: Compass,       label: 'Explore',     path: '/explore',                  color: 'text-blue-500   bg-blue-500/10'   },
  { icon: Heart,         label: 'Favorites',   path: '/dashboard/favorites',      color: 'text-rose-500   bg-rose-500/10'   },
  { icon: MessageSquare, label: 'Support',     path: '/dashboard/support',        color: 'text-sky-500    bg-sky-500/10'    },
  { icon: BookOpen,      label: 'Docs',        path: '/docs',                     color: 'text-indigo-500 bg-indigo-500/10' },
];

export function QuickActionsDropdown() {
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
          open
            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
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
              {ACTIONS.map(({ icon: Icon, label, path, color }) => (
                <Link
                  key={label}
                  to={prefix(path)}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color.split(' ').join(' '))}>
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
