import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutGrid, Home, Compass, Wand2, Star, Bell,
  Settings, BarChart2, Tag, MessageSquare, Newspaper, Folder
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { cn } from '../../lib/utils';

const APPS = [
  { icon: Home,          label: 'Dashboard',    path: '/dashboard' },
  { icon: Compass,       label: 'Explore',      path: '/explore' },
  { icon: Wand2,         label: 'AI Studio',    path: '/dashboard/ai-twin' },
  { icon: Star,          label: 'Favorites',    path: '/dashboard/favorites' },
  { icon: Folder,        label: 'Collections',  path: '/dashboard/collections' },
  { icon: BarChart2,     label: 'Analytics',    path: '/dashboard' },
  { icon: Tag,           label: 'Tags',         path: '/explore' },
  { icon: Bell,          label: 'Alerts',       path: '/dashboard/notifications' },
  { icon: MessageSquare, label: 'Support',      path: '/dashboard/support' },
  { icon: Newspaper,     label: 'Blog',         path: '/blog' },
  { icon: Settings,      label: 'Settings',     path: '/settings/profile' },
];

export function AppsDropdown() {
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
        title="Apps"
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
          open
            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute right-0 mt-2 w-[220px] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">All Apps</p>
              <span className="text-[9px] text-muted-foreground/50">{APPS.length} apps</span>
            </div>
            <div className="p-2 grid grid-cols-3 gap-0.5">
              {APPS.map(({ icon: Icon, label, path }) => (
                <Link
                  key={label}
                  to={prefix(path)}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-muted transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
