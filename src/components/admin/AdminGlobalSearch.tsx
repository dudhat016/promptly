import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Users, LayoutGrid, FileText, Tag, X, ArrowRight, Loader2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { usePath } from '../../hooks/usePath';
import Input from '../primitives/Input';
import Button from '../primitives/Button';
import { cn } from '../../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type ResultType = 'user' | 'prompt' | 'blog' | 'category';

interface SearchResult {
  id: string;
  type: ResultType;
  label: string;
  sub?: string;
  href: string;
}

interface ResultGroup {
  type: ResultType;
  icon: React.ElementType;
  color: string;
  label: string;
  items: SearchResult[];
}

const TYPE_META: Record<ResultType, { icon: React.ElementType; color: string; label: string }> = {
  user:     { icon: Users,      color: 'text-primary bg-primary/10',          label: 'Users'      },
  prompt:   { icon: LayoutGrid, color: 'text-purple-600 bg-purple-500/10',    label: 'Prompts'    },
  blog:     { icon: FileText,   color: 'text-emerald-600 bg-emerald-500/10',  label: 'Blog Posts' },
  category: { icon: Tag,        color: 'text-amber-600 bg-amber-500/10',      label: 'Categories' },
};

// ─── Component ───────────────────────────────────────────────────────────────

interface AdminGlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function AdminGlobalSearch({ open, onClose }: AdminGlobalSearchProps) {
  const navigate = useNavigate();
  const { prefix } = usePath();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  // ── Fetch all data once on first open ──────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const [usersSnap, promptsSnap, blogSnap, catSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'prompts')),
        getDocs(collection(db, 'blog_posts')),
        getDocs(collection(db, 'categories')),
      ]);

      const results: SearchResult[] = [
        ...usersSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, type: 'user' as ResultType, label: data.displayName || data.email || 'Unknown', sub: data.email, href: `/admin/users/${d.id}` };
        }),
        ...promptsSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, type: 'prompt' as ResultType, label: data.title || 'Untitled', sub: data.model, href: prefix(`/admin/prompts/${d.id}/edit`) };
        }),
        ...blogSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, type: 'blog' as ResultType, label: data.title || 'Untitled', sub: data.status, href: `/admin/blog/${d.id}` };
        }),
        ...catSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, type: 'category' as ResultType, label: data.name || 'Unnamed', sub: data.slug, href: prefix(`/admin/categories/${d.id}/edit`) };
        }),
      ];

      setAllResults(results);
      setFetched(true);
    } catch (err) {
      console.error('Global search fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [fetched]);

  useEffect(() => {
    if (open) {
      fetchAll();
      setTimeout(() => inputRef.current?.focus(), 60);
      setQuery('');
      setActiveIdx(0);
    }
  }, [open, fetchAll]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = query.trim().length < 1
    ? []
    : allResults.filter(r => {
        const q = query.toLowerCase();
        return r.label.toLowerCase().includes(q) || r.sub?.toLowerCase().includes(q);
      }).slice(0, 30);

  const groups: ResultGroup[] = Object.entries(TYPE_META)
    .map(([type, meta]) => ({
      type: type as ResultType,
      ...meta,
      items: filtered.filter(r => r.type === type),
    }))
    .filter(g => g.items.length > 0);

  const flat = groups.flatMap(g => g.items);

  // ── Navigate to result ─────────────────────────────────────────────────────
  function go(result: SearchResult) {
    navigate(result.href);
    onClose();
  }

  // ── Keyboard navigation ────────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flat.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && flat[activeIdx]) { go(flat[activeIdx]); }
  }

  useEffect(() => { setActiveIdx(0); }, [query]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const isEmpty = query.trim().length > 0 && filtered.length === 0 && !loading;
  const showRecent = query.trim().length === 0 && !loading;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Search panel */}
          <motion.div
            key="search-panel"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed left-1/2 -translate-x-1/2 top-[10vh] z-[101] w-full max-w-xl px-4"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-black/25 overflow-hidden">

              <Input 
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search users, prompts, blog, categories..."
                variant="ghost"
                leftIcon={loading ? Loader2 : Search}
                isLoading={loading}
                className="flex-1"
                rightAction={
                  <div className="flex items-center gap-2">
                    {query && (
                      <Button
                        onClick={() => setQuery('')}
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground h-7 w-7"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                      ESC
                    </kbd>
                  </div>
                }
              />

              {/* Results */}
              <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
                {showRecent && (
                  <div className="px-4 py-8 text-center">
                    <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">
                      {fetched ? `${allResults.length} records indexed — start typing` : 'Loading index...'}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Users · Prompts · Blog · Categories</p>
                  </div>
                )}

                {isEmpty && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground font-medium">No results for "<span className="text-foreground">{query}</span>"</p>
                  </div>
                )}

                {groups.map(group => {
                  const GroupIcon = group.icon;
                  return (
                    <div key={group.type}>
                      {/* Group header */}
                      <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-y border-border/50">
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${group.color}`}>
                          <GroupIcon className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          {group.label}
                        </span>
                        <span className="ml-auto text-[10px] font-bold text-muted-foreground">{group.items.length}</span>
                      </div>

                      {/* Items */}
                      {group.items.slice(0, 6).map((item) => {
                        const globalIdx = flat.indexOf(item);
                        const isActive = globalIdx === activeIdx;
                        return (
                          <Button
                            key={item.id}
                            data-active={isActive}
                            onClick={() => go(item)}
                            onMouseEnter={() => setActiveIdx(globalIdx)}
                            variant="ghost"
                            size="md"
                            fullWidth
                            className={cn(
                              "justify-start gap-3 px-4 py-3 h-auto rounded-none border-none",
                              isActive ? 'bg-primary/8' : 'hover:bg-muted/40'
                            )}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${group.color}`}>
                              <GroupIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className={`text-sm font-semibold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                                {item.label}
                              </p>
                              {item.sub && (
                                <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
                              )}
                            </div>
                            {isActive && <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </Button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Footer hints */}
              {flat.length > 0 && (
                <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-muted/20">
                  {[
                    { keys: ['↑', '↓'], label: 'navigate' },
                    { keys: ['↵'], label: 'open' },
                    { keys: ['Esc'], label: 'close' },
                  ].map(hint => (
                    <div key={hint.label} className="flex items-center gap-1.5">
                      {hint.keys.map(k => (
                        <kbd key={k} className="text-[9px] font-bold bg-muted border border-border rounded px-1 py-0.5 text-muted-foreground">{k}</kbd>
                      ))}
                      <span className="text-[10px] text-muted-foreground">{hint.label}</span>
                    </div>
                  ))}
                  <span className="ml-auto text-[10px] text-muted-foreground">{flat.length} result{flat.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
