import { AnimatePresence, motion } from 'motion/react';
import {
  Activity, ArrowRight, Bell, BookMarked, BookOpen, Bookmark,
  Clock, Coins, Gift, Heart, HelpCircle, LayoutDashboard,
  LayoutGrid, Search, Settings, Sparkles, User, X, Zap
} from 'lucide-react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { cn } from '../../lib/utils';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  path: string;
  icon: React.ElementType;
  category: string;
  keywords?: string;
}

const ALL_ITEMS: CommandItem[] = [
  { id: 'home',         label: 'Home',            description: 'Your main dashboard',       path: '/dashboard',                  icon: LayoutDashboard, category: 'Navigation' },
  { id: 'vault',        label: 'My Vault',         description: 'Browse saved prompts',       path: '/dashboard/vault',            icon: LayoutGrid,      category: 'Navigation' },
  { id: 'library',      label: 'My Creations',     description: 'Prompts you have created',   path: '/dashboard/library',          icon: BookOpen,        category: 'Navigation' },
  { id: 'twin',         label: 'AI Twin Studio',   description: 'AI-powered prompt building', path: '/dashboard/twin-studio',      icon: Sparkles,        category: 'Navigation', keywords: 'ai studio generate' },
  { id: 'favorites',    label: 'Favorites',        description: 'Your liked prompts',         path: '/dashboard/favorites',        icon: Heart,           category: 'Navigation' },
  { id: 'saved',        label: 'Unlock Queue',     description: 'Saved for later',            path: '/dashboard/saved',            icon: Bookmark,        category: 'Navigation' },
  { id: 'collections',  label: 'Collections',      description: 'Organize your prompts',      path: '/dashboard/collections',      icon: BookMarked,      category: 'Navigation', keywords: 'organize group' },
  { id: 'credits',      label: 'Credits',          description: 'View your credit balance',   path: '/dashboard/credits',          icon: Coins,           category: 'Navigation', keywords: 'coins balance' },
  { id: 'usage',        label: 'Usage',            description: 'API & prompt usage stats',   path: '/dashboard/usage',            icon: Activity,        category: 'Navigation' },
  { id: 'affiliate',    label: 'Partner Program',  description: 'Earn by referring users',    path: '/dashboard/affiliate',        icon: Gift,            category: 'Navigation', keywords: 'refer earn affiliate' },
  { id: 'notif',        label: 'Notifications',    description: 'Your notification inbox',    path: '/dashboard/notifications',    icon: Bell,            category: 'Navigation' },
  { id: 'support',      label: 'Support',          description: 'Get help',                   path: '/dashboard/support',          icon: HelpCircle,      category: 'Navigation' },
  { id: 'profile',      label: 'Profile Settings', description: 'Edit your profile',          path: '/settings/profile',           icon: User,            category: 'Settings' },
  { id: 'settings',     label: 'Settings',         description: 'App preferences',            path: '/settings',                   icon: Settings,        category: 'Settings' },
  { id: 'explore',      label: 'Explore Prompts',  description: 'Discover public prompts',    path: '/explore',                    icon: Zap,             category: 'Pages', keywords: 'browse discover' },
];

const RECENT_KEY = 'promptly_cmd_recent';

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function addRecent(id: string) {
  const prev = getRecent().filter(x => x !== id).slice(0, 4);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev])); } catch { /* ignore */ }
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { prefix } = usePath();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [recent, setRecent] = useState<string[]>(getRecent);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return ALL_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords?.includes(q)
    );
  }, [query]);

  const recentItems = useMemo(
    () => recent.map(id => ALL_ITEMS.find(i => i.id === id)).filter(Boolean) as CommandItem[],
    [recent]
  );

  const displayItems = query.trim() ? results : recentItems;
  const showEmpty = query.trim().length > 0 && results.length === 0;

  const handleSelect = (item: CommandItem) => {
    addRecent(item.id);
    setRecent(getRecent());
    navigate(prefix(item.path));
    onClose();
  };

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, displayItems.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && displayItems[activeIdx]) { handleSelect(displayItems[activeIdx]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, displayItems, activeIdx]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  // Categorise results for display
  const grouped = useMemo(() => {
    if (!query.trim()) return null;
    return Object.entries(
      results.reduce<Record<string, CommandItem[]>>((acc, item) => {
        (acc[item.category] ??= []).push(item);
        return acc;
      }, {})
    );
  }, [results, query]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh] px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="relative z-10 w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search pages, features, settings…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="hidden sm:flex items-center px-1.5 py-0.5 rounded border border-border text-[10px] text-muted-foreground font-bold bg-muted">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[380px] overflow-y-auto">
              {showEmpty ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No results for "{query}"</p>
                </div>
              ) : query.trim() && grouped ? (
                <div className="py-2">
                  {grouped.map(([category, items]) => (
                    <div key={category}>
                      <div className="px-4 py-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{category}</span>
                      </div>
                      {items.map(item => {
                        const globalIdx = displayItems.indexOf(item);
                        return (
                          <ResultRow
                            key={item.id}
                            item={item}
                            active={globalIdx === activeIdx}
                            onSelect={() => handleSelect(item)}
                            onHover={() => setActiveIdx(globalIdx)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : recentItems.length > 0 ? (
                <div className="py-2">
                  <div className="px-4 py-1.5 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent</span>
                  </div>
                  {recentItems.map((item, i) => (
                    <ResultRow
                      key={item.id}
                      item={item}
                      active={i === activeIdx}
                      onSelect={() => handleSelect(item)}
                      onHover={() => setActiveIdx(i)}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-2">
                  <div className="px-4 py-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick Navigation</span>
                  </div>
                  {ALL_ITEMS.slice(0, 6).map((item, i) => (
                    <ResultRow
                      key={item.id}
                      item={item}
                      active={i === activeIdx}
                      onSelect={() => handleSelect(item)}
                      onHover={() => setActiveIdx(i)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground bg-muted/20">
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border bg-background font-bold">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border bg-background font-bold">↵</kbd> Open</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border bg-background font-bold">ESC</kbd> Close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ResultRow({
  item, active, onSelect, onHover,
}: {
  item: CommandItem; active: boolean; onSelect: () => void; onHover: () => void;
}) {
  return (
    <button
      data-active={active}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left',
        active ? 'bg-primary/8 text-foreground' : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
        active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
      )}>
        <item.icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold truncate leading-tight', active && 'text-foreground')}>{item.label}</p>
        {item.description && (
          <p className="text-[11px] text-muted-foreground truncate leading-tight">{item.description}</p>
        )}
      </div>
      {active && <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />}
    </button>
  );
}
