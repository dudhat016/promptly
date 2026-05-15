import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, orderBy, query, serverTimestamp
} from 'firebase/firestore';
import {
  MessageSquare, Plus, Star, Trash2, Edit2, ToggleLeft, ToggleRight, X, Save
} from 'lucide-react';
import { AdminPageHeader, useConfirm } from '../../components/admin';
import { DataTable, type DataTableColumn } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import Badge from '../../components/primitives/Badge';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  imageUrl: string;
  featured: boolean;
  order: number;
  createdAt: any;
}

interface TestimonialForm {
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  imageUrl: string;
  featured: boolean;
  order: string;
}

const DEFAULT_FORM: TestimonialForm = {
  name: '',
  role: '',
  company: '',
  content: '',
  rating: 5,
  imageUrl: '',
  featured: true,
  order: '0',
};

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={cn(
            'transition-colors',
            onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'
          )}
        >
          <Star className={cn('w-4 h-4', n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
        </button>
      ))}
    </div>
  );
}

export default function AdminTestimonials() {
  const confirm = useConfirm();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<TestimonialForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'testimonials'), orderBy('order', 'asc')));
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial)));
    } catch {
      toast.error('Failed to load testimonials');
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  }

  function openEdit(t: Testimonial) {
    setEditing(t);
    setForm({
      name: t.name || '',
      role: t.role || '',
      company: t.company || '',
      content: t.content || '',
      rating: t.rating ?? 5,
      imageUrl: t.imageUrl || '',
      featured: t.featured ?? true,
      order: String(t.order ?? 0),
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.content.trim()) {
      toast.error('Name and content are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role.trim(),
        company: form.company.trim(),
        content: form.content.trim(),
        rating: form.rating,
        imageUrl: form.imageUrl.trim(),
        featured: form.featured,
        order: parseInt(form.order) || 0,
      };
      if (editing) {
        await updateDoc(doc(db, 'testimonials', editing.id), payload);
        setItems(prev => prev.map(t => t.id === editing.id ? { ...t, ...payload } : t));
        toast.success('Testimonial updated');
      } else {
        const ref = await addDoc(collection(db, 'testimonials'), { ...payload, createdAt: serverTimestamp() });
        setItems(prev => [...prev, { id: ref.id, ...payload, createdAt: new Date() }]);
        toast.success('Testimonial added');
      }
      closeForm();
    } catch {
      toast.error('Failed to save testimonial');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleFeatured(t: Testimonial) {
    try {
      await updateDoc(doc(db, 'testimonials', t.id), { featured: !t.featured });
      setItems(prev => prev.map(item => item.id === t.id ? { ...item, featured: !item.featured } : item));
    } catch {
      toast.error('Failed to update testimonial');
    }
  }

  async function handleDelete(t: Testimonial) {
    const ok = await confirm({
      title: `Delete testimonial from "${t.name}"?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'testimonials', t.id));
      setItems(prev => prev.filter(item => item.id !== t.id));
      toast.success('Testimonial deleted');
    } catch {
      toast.error('Failed to delete testimonial');
    }
  }

  const columns: DataTableColumn<Testimonial>[] = [
    {
      key: 'author',
      header: 'Author',
      searchValue: t => `${t.name} ${t.company} ${t.role}`,
      sortable: true,
      sortValue: t => t.name,
      render: t => (
        <div className="flex items-center gap-3">
          {t.imageUrl ? (
            <img src={t.imageUrl} alt={t.name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-border" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
              {t.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{t.name}</p>
            <p className="text-xs text-muted-foreground truncate">{[t.role, t.company].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
      ),
      csvValue: t => t.name,
    },
    {
      key: 'content',
      header: 'Content',
      render: t => (
        <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">{t.content}</p>
      ),
      csvValue: t => t.content,
    },
    {
      key: 'rating',
      header: 'Rating',
      sortable: true,
      sortValue: t => t.rating,
      render: t => <StarRating value={t.rating ?? 5} />,
      csvValue: t => t.rating,
    },
    {
      key: 'featured',
      header: 'Featured',
      sortable: true,
      sortValue: t => (t.featured ? 1 : 0),
      render: t => (
        <button onClick={() => handleToggleFeatured(t)} className="flex items-center gap-1.5 group">
          {t.featured
            ? <ToggleRight className="w-5 h-5 text-emerald-500 group-hover:text-emerald-600 transition-colors" />
            : <ToggleLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />}
          <Badge variant={t.featured ? 'success' : 'default'} size="sm">
            {t.featured ? 'Featured' : 'Hidden'}
          </Badge>
        </button>
      ),
      csvValue: t => t.featured ? 'Yes' : 'No',
    },
    {
      key: 'order',
      header: 'Order',
      sortable: true,
      sortValue: t => t.order ?? 0,
      render: t => <span className="text-xs font-mono text-muted-foreground">{t.order ?? 0}</span>,
      csvValue: t => t.order ?? 0,
    },
  ];

  const tableActions = {
    custom: [
      { icon: Edit2, label: 'Edit', onClick: openEdit, className: 'text-primary' },
    ],
    onDelete: handleDelete,
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Content"
        labelIcon={MessageSquare}
        title="Testimonials"
        subtitle="Manage social proof testimonials shown on the landing page."
        actions={
          <Button onClick={openNew} variant="primary" size="sm" leftIcon={Plus}>
            Add Testimonial
          </Button>
        }
      />

      {/* Add / Edit Form */}
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
              <h3 className="font-bold text-foreground">
                {editing ? 'Edit Testimonial' : 'Add Testimonial'}
              </h3>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Name *"
                placeholder="Jane Smith"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
              <Input
                label="Role / Title"
                placeholder="Product Manager"
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              />
              <Input
                label="Company"
                placeholder="Acme Corp"
                value={form.company}
                onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
              />
              <Input
                label="Avatar URL"
                placeholder="https://..."
                value={form.imageUrl}
                onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
              />
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Content *
                </label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  rows={3}
                  placeholder="This tool completely transformed my workflow..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Rating
                </label>
                <StarRating value={form.rating} onChange={v => setForm(p => ({ ...p, rating: v }))} />
              </div>
              <Input
                label="Display Order"
                type="number"
                placeholder="0"
                value={form.order}
                onChange={e => setForm(p => ({ ...p, order: e.target.value }))}
                helperText="Lower numbers appear first"
              />
              <div className="sm:col-span-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, featured: !p.featured }))}
                  className="flex items-center gap-2 text-sm"
                >
                  {form.featured
                    ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                    : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                  <span className={cn('font-semibold', form.featured ? 'text-emerald-600' : 'text-muted-foreground')}>
                    {form.featured ? 'Featured on landing page' : 'Hidden from landing page'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-border">
              <Button onClick={closeForm} variant="ghost" size="sm">Cancel</Button>
              <Button onClick={handleSave} isLoading={saving} variant="primary" size="sm" leftIcon={Save}>
                {editing ? 'Update' : 'Add Testimonial'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: items.length, color: 'text-foreground' },
          { label: 'Featured', value: items.filter(t => t.featured).length, color: 'text-emerald-600' },
          { label: 'Avg Rating', value: items.length ? (items.reduce((s, t) => s + (t.rating ?? 5), 0) / items.length).toFixed(1) : '—', color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={items}
        rowKey={t => t.id}
        loading={loading}
        actions={tableActions}
        searchPlaceholder="Search by name, company, role..."
        exportFilename="testimonials"
        emptyIcon={MessageSquare}
        emptyTitle="No testimonials yet"
        emptyMessage="Add your first testimonial to display social proof on the landing page."
      />
    </div>
  );
}
