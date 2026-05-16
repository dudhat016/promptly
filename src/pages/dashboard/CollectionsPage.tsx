import {
  addDoc, collection, deleteDoc, doc, getDocs,
  orderBy, query, updateDoc, where,
} from 'firebase/firestore';
import {
  BookMarked, FolderOpen, FolderPlus, Globe, Lock,
  MoreHorizontal, Pencil, Plus, Trash2, Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProGate } from '../../components/ProGate';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { PromptCollection } from '../../types';

// ── Create / Edit Modal ────────────────────────────────────────────────
interface CollectionModalProps {
  initial?: PromptCollection;
  onSave: (name: string, description: string, isPublic: boolean) => Promise<void>;
  onClose: () => void;
}
function CollectionModal({ initial, onSave, onClose }: CollectionModalProps) {
  const [name, setName]             = useState(initial?.name        || '');
  const [description, setDesc]      = useState(initial?.description || '');
  const [isPublic, setPublic]       = useState(initial?.isPublic    ?? false);
  const [saving, setSaving]         = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave(name.trim(), description.trim(), isPublic);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <h2 className="text-lg font-bold text-foreground mb-5">
          {initial ? 'Edit Collection' : 'New Collection'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Writing Prompts"
            maxLength={60}
            required
            autoFocus
          />
          <Input
            label="Description (optional)"
            value={description}
            onChange={e => setDesc(e.target.value)}
            placeholder="What's this collection about?"
            maxLength={200}
          />
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setPublic(v => !v)}
              className={cn(
                'w-9 h-5 rounded-full transition-colors relative',
                isPublic ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            >
              <div className={cn(
                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                isPublic ? 'translate-x-4' : 'translate-x-0'
              )} />
            </div>
            <span className="text-sm font-medium text-foreground">Make public</span>
            <span className="text-xs text-muted-foreground">(visible on your profile)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving} className="flex-1">
              {initial ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Collection Card ────────────────────────────────────────────────────
interface CollectionCardProps {
  col: PromptCollection;
  onEdit: () => void;
  onDelete: () => void;
}
function CollectionCard({ col, onEdit, onDelete }: CollectionCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { prefix } = usePath();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="group bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <FolderOpen className="w-5 h-5 text-primary" />
        </div>
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 bg-card border border-border rounded-xl shadow-lg w-36 py-1">
              <button
                onClick={() => { onEdit(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => { onDelete(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-500/5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="font-bold text-foreground text-sm truncate">{col.name}</h3>
          {col.isPublic
            ? <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
            : <Lock  className="w-3 h-3 text-muted-foreground shrink-0" />
          }
        </div>
        {col.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{col.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">
          {col.promptIds.length} {col.promptIds.length === 1 ? 'prompt' : 'prompts'}
        </span>
        <Link
          to={prefix(`/dashboard/collections/${col.id}`)}
          className="text-xs font-bold text-primary hover:underline"
        >
          View →
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function CollectionsPage() {
  const { user, isPro, isAdmin } = useAuth();
  const [cols, setCols]           = useState<PromptCollection[]>([]);
  const [loading, setLoading]     = useState(true);
  const [createOpen, setCreate]   = useState(false);
  const [editing, setEditing]     = useState<PromptCollection | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const q = query(
          collection(db, 'collections'),
          where('userId', '==', user.uid),
          orderBy('updatedAt', 'desc')
        );
        const snap = await getDocs(q);
        setCols(snap.docs.map(d => ({ ...d.data(), id: d.id } as PromptCollection)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function handleCreate(name: string, description: string, isPublic: boolean) {
    if (!user) return;
    const now = new Date().toISOString();
    const ref = await addDoc(collection(db, 'collections'), {
      userId: user.uid, name, description, isPublic,
      promptIds: [], createdAt: now, updatedAt: now,
    });
    setCols(prev => [{
      id: ref.id, userId: user.uid, name, description, isPublic,
      promptIds: [], createdAt: now, updatedAt: now,
    }, ...prev]);
    setCreate(false);
  }

  async function handleEdit(name: string, description: string, isPublic: boolean) {
    if (!editing?.id) return;
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'collections', editing.id), { name, description, isPublic, updatedAt: now });
    setCols(prev => prev.map(c => c.id === editing.id ? { ...c, name, description, isPublic, updatedAt: now } : c));
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this collection? Prompts are not removed.')) return;
    await deleteDoc(doc(db, 'collections', id));
    setCols(prev => prev.filter(c => c.id !== id));
  }

  const hasAccess = isPro || isAdmin;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs mb-2">
            <BookMarked className="w-4 h-4" />
            Organize
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">My Collections</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Curate and organize your favourite prompts into named lists.
          </p>
        </div>
        {hasAccess && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={FolderPlus}
            onClick={() => setCreate(true)}
            className="shrink-0 shadow-sm shadow-primary/20"
          >
            New Collection
          </Button>
        )}
      </div>

      <ProGate
        feature="Prompt Collections"
        description="Upgrade to Pro to create unlimited collections and organise your favourite prompts."
      >
        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : cols.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            <AnimatePresence mode="popLayout">
              {cols.map(col => (
                <motion.div
                  key={col.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <CollectionCard
                    col={col}
                    onEdit={() => setEditing(col)}
                    onDelete={() => handleDelete(col.id!)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="py-24 bg-muted/30 rounded-2xl border border-dashed border-border text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">No collections yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              Create your first collection to save and organise prompts you love.
            </p>
            <Button variant="primary" leftIcon={Plus} onClick={() => setCreate(true)}>
              Create Collection
            </Button>
          </div>
        )}
      </ProGate>

      {/* Modals */}
      <AnimatePresence>
        {createOpen && (
          <CollectionModal onSave={handleCreate} onClose={() => setCreate(false)} />
        )}
        {editing && (
          <CollectionModal initial={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
