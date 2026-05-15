import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, orderBy, query, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { History, Plus, Save, X, Rocket, Wrench, Bug, Sparkles } from 'lucide-react';
import { AdminPageHeader, useConfirm } from '../../components/admin';
import { DataTable, type DataTableColumn } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import Badge from '../../components/primitives/Badge';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';

type ItemType = 'new' | 'improved' | 'fixed';

interface ChangelogItem { type: ItemType; text: string; }
interface ChangelogEntry {
  id: string;
  version: string;
  date: any;
  title: string;
  items: ChangelogItem[];
}

interface EntryForm {
  version: string;
  date: string;
  title: string;
  rawItems: string;
}

const DEFAULT_FORM: EntryForm = { version: '', date: '', title: '', rawItems: '' };

const TYPE_ICONS: Record<ItemType, { icon: React.ElementType; color: string; label: string }> = {
  new:      { icon: Rocket,   color: 'text-emerald-500', label: 'New' },
  improved: { icon: Sparkles, color: 'text-primary',     label: 'Improved' },
  fixed:    { icon: Bug,      color: 'text-amber-500',   label: 'Fixed' },
};

function parseItems(raw: string): ChangelogItem[] {
  return raw.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    if (line.startsWith('new:'))      return { type: 'new'      as ItemType, text: line.slice(4).trim() };
    if (line.startsWith('improved:')) return { type: 'improved' as ItemType, text: line.slice(9).trim() };
    if (line.startsWith('fixed:'))    return { type: 'fixed'    as ItemType, text: line.slice(6).trim() };
    return { type: 'new' as ItemType, text: line };
  });
}

function serializeItems(items: ChangelogItem[]): string {
  return items.map(i => `${i.type}: ${i.text}`).join('\n');
}

function formatDate(date: any): string {
  if (!date) return 'N/A';
  try {
    const d = date instanceof Timestamp ? date.toDate() : new Date(date?.seconds ? date.seconds * 1000 : date);
    return d.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return 'N/A'; }
}

export default function AdminChangelog() {
  const confirm = useConfirm();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ChangelogEntry | null>(null);
  const [form, setForm] = useState<EntryForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'changelogs'), orderBy('date', 'desc')));
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChangelogEntry)));
    } catch { toast.error('Failed to load changelog'); }
    finally { setLoading(false); }
  }

  function openNew() {
    setEditing(null);
    const today = new Date().toISOString().split('T')[0];
    setForm({ ...DEFAULT_FORM, date: today });
    setShowForm(true);
  }

  function openEdit(entry: ChangelogEntry) {
    setEditing(entry);
    let dateStr = '';
    try {
      const d = entry.date instanceof Timestamp ? entry.date.toDate() : new Date(entry.date?.seconds ? entry.date.seconds * 1000 : entry.date);
      dateStr = d.toISOString().split('T')[0];
    } catch { dateStr = ''; }
    setForm({
      version: entry.version || '',
      date: dateStr,
      title: entry.title || '',
      rawItems: serializeItems(entry.items || []),
    });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditing(null); }

  async function handleSave() {
    if (!form.version.trim() || !form.title.trim()) {
      toast.error('Version and title are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        version: form.version.trim(),
        date: form.date ? new Date(form.date) : new Date(),
        title: form.title.trim(),
        items: parseItems(form.rawItems),
      };
      if (editing) {
        await updateDoc(doc(db, 'changelogs', editing.id), payload);
        setEntries(prev => prev.map(e => e.id === editing.id ? { ...e, ...payload } : e));
        toast.success('Entry updated');
      } else {
        const ref = await addDoc(collection(db, 'changelogs'), { ...payload, createdAt: serverTimestamp() });
        setEntries(prev => [{ id: ref.id, ...payload }, ...prev]);
        toast.success('Entry added');
      }
      closeForm();
    } catch { toast.error('Failed to save entry'); }
    finally { setSaving(false); }
  }

  async function handleDelete(entry: ChangelogEntry) {
    const ok = await confirm({ title: `Delete v${entry.version}?`, description: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'changelogs', entry.id));
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      toast.success('Entry deleted');
    } catch { toast.error('Failed to delete'); }
  }

  const columns: DataTableColumn<ChangelogEntry>[] = [
    {
      key: 'version',
      header: 'Version',
      searchValue: e => `v${e.version} ${e.title}`,
      sortable: true,
      sortValue: e => e.version,
      render: e => (
        <div>
          <span className="font-mono font-bold text-primary text-sm">v{e.version}</span>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">{e.title}</p>
        </div>
      ),
      csvValue: e => `v${e.version}`,
    },
    {
      key: 'date',
      header: 'Release Date',
      sortable: true,
      sortValue: e => {
        try {
          const d = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date?.seconds ? e.date.seconds * 1000 : e.date);
          return d.getTime();
        } catch { return 0; }
      },
      render: e => <span className="text-sm text-muted-foreground font-medium">{formatDate(e.date)}</span>,
      csvValue: e => formatDate(e.date),
    },
    {
      key: 'changes',
      header: 'Changes',
      render: e => {
        const counts = (e.items || []).reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; }, {} as Record<string, number>);
        return (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(counts).map(([type, count]) => {
              const { color, label } = TYPE_ICONS[type as ItemType] || { color: 'text-foreground', label: type };
              return (
                <Badge key={type} variant="outline" size="sm" className={cn('font-semibold', color)}>
                  {count} {label}
                </Badge>
              );
            })}
            {!e.items?.length && <span className="text-xs text-muted-foreground/40">No items</span>}
          </div>
        );
      },
      csvValue: e => (e.items || []).map(i => `${i.type}: ${i.text}`).join('; '),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Content"
        labelIcon={History}
        title="Changelog"
        subtitle="Manage public release notes and platform updates."
        actions={
          <Button onClick={openNew} variant="primary" size="sm" leftIcon={Plus}>
            New Release
          </Button>
        }
      />

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-card border border-border rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-foreground">{editing ? 'Edit Release' : 'New Release'}</h3>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <Input
                label="Version *"
                placeholder="1.4.2"
                value={form.version}
                onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
              />
              <Input
                label="Release Date"
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              />
              <Input
                label="Title *"
                placeholder="Performance & UX improvements"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Changes
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                One item per line. Prefix with <code className="bg-muted px-1 rounded">new:</code>, <code className="bg-muted px-1 rounded">improved:</code>, or <code className="bg-muted px-1 rounded">fixed:</code>
              </p>
              <textarea
                value={form.rawItems}
                onChange={e => setForm(p => ({ ...p, rawItems: e.target.value }))}
                rows={6}
                placeholder={"new: Added testimonials management page\nimproved: Faster prompt loading with pagination\nfixed: Billing settings auto-renew toggle"}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono"
              />
            </div>

            {/* Preview */}
            {form.rawItems.trim() && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
                <ul className="space-y-1.5">
                  {parseItems(form.rawItems).map((item, i) => {
                    const { icon: Icon, color, label } = TYPE_ICONS[item.type] || TYPE_ICONS.new;
                    return (
                      <li key={i} className="flex items-start gap-2">
                        <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${color}`} />
                        <span className="text-xs text-foreground">{item.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-border">
              <Button onClick={closeForm} variant="ghost" size="sm">Cancel</Button>
              <Button onClick={handleSave} isLoading={saving} variant="primary" size="sm" leftIcon={Save}>
                {editing ? 'Update' : 'Publish Release'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable
        columns={columns}
        data={entries}
        rowKey={e => e.id}
        loading={loading}
        actions={{
          custom: [{ icon: Wrench, label: 'Edit', onClick: openEdit, className: 'text-primary' }],
          onDelete: handleDelete,
        }}
        searchPlaceholder="Search by version or title..."
        exportFilename="changelog"
        emptyIcon={History}
        emptyTitle="No changelog entries"
        emptyMessage="Add your first release entry to show on the public changelog page."
      />
    </div>
  );
}
