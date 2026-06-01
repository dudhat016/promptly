import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, writeBatch, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Tag, Pencil, Trash2, Check, X, Plus, FileText } from 'lucide-react';
import { AdminPageHeader, useConfirm } from '../../components/admin';
import Badge from '../../components/primitives/Badge';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Input from '../../components/primitives/Input';
import { toast } from 'react-hot-toast';

interface BlogTag {
  name: string;
  count: number;
}

export default function AdminBlogCategories() {
  const confirm = useConfirm();
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newTag, setNewTag] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadTags(); }, []);

  useEffect(() => {
    if (editingTag && editInputRef.current) editInputRef.current.focus();
  }, [editingTag]);

  useEffect(() => {
    if (addingNew && newInputRef.current) newInputRef.current.focus();
  }, [addingNew]);

  async function loadTags() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'blog_posts'), orderBy('createdAt', 'desc')));
      const counts: Record<string, number> = {};
      snap.docs.forEach(d => {
        const postTags: string[] = d.data().tags || [];
        postTags.forEach(t => {
          const normalized = t.trim().toLowerCase();
          if (normalized) counts[normalized] = (counts[normalized] || 0) + 1;
        });
      });
      setTags(
        Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }))
      );
    } catch {
      toast.error('Failed to load blog tags');
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(oldName: string) {
    const newName = editValue.trim().toLowerCase();
    if (!newName || newName === oldName) { setEditingTag(null); return; }
    if (tags.some(t => t.name === newName && t.name !== oldName)) {
      toast.error(`Tag "${newName}" already exists`);
      return;
    }
    setSaving(oldName);
    try {
      const snap = await getDocs(collection(db, 'blog_posts'));
      const affected = snap.docs.filter(d => (d.data().tags || []).includes(oldName));
      if (affected.length > 0) {
        const batch = writeBatch(db);
        affected.forEach(d => {
          const updatedTags = (d.data().tags as string[]).map((t: string) => t === oldName ? newName : t);
          batch.update(doc(db, 'blog_posts', d.id), { tags: updatedTags });
        });
        await batch.commit();
      }
      setTags(prev => prev.map(t => t.name === oldName ? { ...t, name: newName } : t).sort((a, b) => b.count - a.count));
      toast.success(`Renamed "${oldName}" → "${newName}" across ${affected.length} post(s)`);
    } catch {
      toast.error('Failed to rename tag');
    } finally {
      setSaving(null);
      setEditingTag(null);
    }
  }

  async function handleDelete(tagName: string, count: number) {
    const ok = await confirm({
      title: `Delete tag "${tagName}"?`,
      description: count > 0
        ? `This will remove the tag from ${count} blog post${count !== 1 ? 's' : ''}. This cannot be undone.`
        : 'This tag is not used by any posts.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setSaving(tagName);
    try {
      const snap = await getDocs(collection(db, 'blog_posts'));
      const affected = snap.docs.filter(d => (d.data().tags || []).includes(tagName));
      if (affected.length > 0) {
        const batch = writeBatch(db);
        affected.forEach(d => {
          const updatedTags = (d.data().tags as string[]).filter((t: string) => t !== tagName);
          batch.update(doc(db, 'blog_posts', d.id), { tags: updatedTags });
        });
        await batch.commit();
      }
      setTags(prev => prev.filter(t => t.name !== tagName));
      toast.success(`Deleted "${tagName}" from ${affected.length} post(s)`);
    } catch {
      toast.error('Failed to delete tag');
    } finally {
      setSaving(null);
    }
  }

  async function handleAddNew() {
    const name = newTag.trim().toLowerCase();
    if (!name) { setAddingNew(false); return; }
    if (tags.some(t => t.name === name)) {
      toast.error(`Tag "${name}" already exists`);
      return;
    }
    setTags(prev => [{ name, count: 0 }, ...prev]);
    setNewTag('');
    setAddingNew(false);
    toast.success(`Tag "${name}" created — assign it to posts via the blog editor`);
  }

  function startEdit(tag: BlogTag) {
    setEditingTag(tag.name);
    setEditValue(tag.name);
  }

  const totalPosts = tags.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Blog"
        labelIcon={FileText}
        title="Blog Categories & Tags"
        subtitle={`${tags.length} unique tag${tags.length !== 1 ? 's' : ''} across all published posts.`}
        actions={
          <Button
            onClick={() => setAddingNew(true)}
            variant="primary"
            size="sm"
            leftIcon={Plus}
          >
            New Tag
          </Button>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Tags', value: tags.length, color: 'bg-primary/10 text-primary' },
          { label: 'Tagged Posts', value: totalPosts, color: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'Avg Tags / Post', value: totalPosts > 0 ? (totalPosts / Math.max(tags.length, 1)).toFixed(1) : '0', color: 'bg-sky-500/10 text-sky-600' },
        ].map(s => (
          <Card key={s.label} padding="sm" className="flex-row items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-black text-foreground leading-none">{loading ? '…' : s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Tag table */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">All Tags</p>
          {addingNew && (
            <div className="flex items-center gap-2">
              <Input
                ref={newInputRef}
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddNew(); if (e.key === 'Escape') { setAddingNew(false); setNewTag(''); } }}
                placeholder="new-tag-name"
                className="h-8 w-48 text-sm"
              />
              <Button size="sm" variant="primary" onClick={handleAddNew} className="h-8 px-3">
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingNew(false); setNewTag(''); }} className="h-8 px-3">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Loading tags…</div>
        ) : tags.length === 0 ? (
          <div className="p-10 text-center">
            <Tag className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No tags yet</p>
            <p className="text-xs text-muted-foreground mt-1">Tags are added when you publish blog posts.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tags.map(tag => (
              <div key={tag.name} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors group">
                <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

                {editingTag === tag.name ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      ref={editInputRef}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(tag.name); if (e.key === 'Escape') setEditingTag(null); }}
                      className="h-8 w-52 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleRename(tag.name)}
                      isLoading={saving === tag.name}
                      className="h-8 px-3"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingTag(null)} className="h-8 px-3">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <span className="flex-1 text-sm font-medium text-foreground">{tag.name}</span>
                )}

                <Badge variant="outline" size="sm">
                  {tag.count} post{tag.count !== 1 ? 's' : ''}
                </Badge>

                {editingTag !== tag.name && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(tag)}
                      disabled={saving === tag.name}
                      title="Rename"
                      className="w-7 h-7"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(tag.name, tag.count)}
                      disabled={saving === tag.name}
                      title="Delete"
                      className="w-7 h-7 hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
