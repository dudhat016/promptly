import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Command, ArrowRight, Sparkles,
  LayoutGrid, User, ShieldCheck,
  CreditCard, Clock
} from 'lucide-react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../../hooks/useConfig';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { Prompt } from '../../types';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const promptCacheRef = useRef<Prompt[]>([]);
  const cacheLoadedRef = useRef(false);

  const { config } = useConfig();
  const { isAdmin, user } = useAuth();
  const { prefix } = usePath();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle on Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load prompt cache once when palette opens
  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => inputRef.current?.focus(), 10);
    setSearchQuery('');
    setSelectedIndex(0);
    setResults([]);

    if (cacheLoadedRef.current) return;
    const q = query(
      collection(db, 'prompts'),
      where('status', '==', 'approved'),
      orderBy('viewsCount', 'desc'),
      limit(60)
    );
    getDocs(q).then(snap => {
      promptCacheRef.current = snap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt));
      cacheLoadedRef.current = true;
    }).catch(() => {});
  }, [isOpen]);

  // Client-side filter against cached results
  useEffect(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      const filtered = promptCacheRef.current.filter(p =>
        p.title.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.tags?.some(t => t.toLowerCase().includes(term))
      ).slice(0, 6);
      setResults(filtered);
      setLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelect = (to: string) => {
    navigate(to);
    setIsOpen(false);
  };

  const STATIC_ACTIONS = [
    { id: 'explore', label: 'Explore Prompts', icon: Sparkles, to: prefix('/') },
    { id: 'profile', label: 'Account Settings', icon: User, to: prefix('/settings/profile'), private: true },
    { id: 'admin', label: 'Admin Dashboard', icon: ShieldCheck, to: prefix('/admin'), admin: true },
  ].filter(a => {
    if (a.admin && !isAdmin) return false;
    if (a.private && !user) return false;
    return true;
  });

  const onKeyDown = (e: React.KeyboardEvent) => {
    const total = STATIC_ACTIONS.length + results.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % total);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + total) % total);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < STATIC_ACTIONS.length) {
        handleSelect(STATIC_ACTIONS[selectedIndex].to);
      } else {
        const prompt = results[selectedIndex - STATIC_ACTIONS.length];
        handleSelect(prefix(`/prompt/${prompt.slug || prompt.id}`));
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[300]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-[301] px-4"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden shadow-primary/10">
              {/* Search input */}
              <div className="relative border-b border-border">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search prompts, categories, or actions..."
                  className="w-full h-16 pl-14 pr-16 bg-transparent text-lg font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <kbd className="px-1.5 py-1 rounded-md bg-muted border border-border text-[10px] font-bold text-muted-foreground min-w-[20px] text-center">ESC</kbd>
                </div>
              </div>

              {/* Content */}
              <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
                {/* Initial / Static actions */}
                {!searchQuery && (
                  <div>
                    <h4 className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Quick Access</h4>
                    <div className="space-y-1">
                      {STATIC_ACTIONS.map((action, i) => (
                        <ActionItem 
                          key={action.id}
                          active={selectedIndex === i}
                          onClick={() => handleSelect(action.to)}
                          icon={action.icon}
                          label={action.label}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Results */}
                {searchQuery && (
                  <div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                        {loading ? 'Searching...' : results.length > 0 ? 'Prompt Results' : 'No prompts found'}
                      </h4>
                      {results.length > 0 && <span className="text-[10px] text-muted-foreground/40">{results.length} found</span>}
                    </div>
                    
                    <div className="space-y-1">
                      {results.map((prompt, i) => (
                        <ActionItem 
                          key={prompt.id}
                          active={selectedIndex === STATIC_ACTIONS.length + i}
                          onClick={() => handleSelect(prefix(`/prompt/${prompt.slug || prompt.id}`))}
                          icon={Sparkles}
                          label={prompt.title}
                          subtitle={prompt.description}
                          tag={prompt.model}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer / Categories */}
                {!searchQuery && (
                  <div>
                    <h4 className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Categories</h4>
                    <div className="grid grid-cols-2 gap-1 px-1">
                      {config.categories.slice(0, 6).map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => handleSelect(prefix(`/explore?category=${encodeURIComponent(cat.name)}`))}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all text-left"
                        >
                          <div className="w-2 h-2 rounded-full bg-primary/20 group-hover:bg-primary" />
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom bar */}
              <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-bold">
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1 py-0.5 rounded border border-border bg-card">↑↓</kbd> Navigate
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1 py-0.5 rounded border border-border bg-card">↵</kbd> Select
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                  <Command className="w-3 h-3" />
                  <span>K to Toggle</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ActionItem({ active, onClick, icon: Icon, label, subtitle, tag }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all text-left group",
        active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-muted"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
        active ? "bg-white/20" : "bg-muted group-hover:bg-background border border-border"
      )}>
        <Icon className={cn("w-5 h-5", active ? "text-white" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-sm truncate">{label}</p>
          {tag && (
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
              active ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
            )}>
              {tag}
            </span>
          )}
        </div>
        {subtitle && (
          <p className={cn(
            "text-xs truncate mt-0.5",
            active ? "text-white/70" : "text-muted-foreground"
          )}>
            {subtitle}
          </p>
        )}
      </div>
      <ArrowRight className={cn(
        "w-4 h-4 shrink-0 transition-transform",
        active ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
      )} />
    </button>
  );
}
