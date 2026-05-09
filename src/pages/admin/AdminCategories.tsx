import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { Category } from '../../types';
import { Plus, Tag } from 'lucide-react';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import Button from '../../components/ui/Button';
import type { DataTableColumn, DataTableActions } from '../../components/admin';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function AdminCategories() {
  const confirm = useConfirm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCategories(); }, []);

  async function fetchCategories() {
    try {
      const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (category: Category) => {
    const ok = await confirm({ title: 'Delete this category?', description: 'This action cannot be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'categories', category.id));
      setCategories(prev => prev.filter(c => c.id !== category.id));
      toast.success('Category deleted');
    } catch {
      toast.error('Failed to delete category');
    }
  };

  const handleBulkDelete = async (rows: Category[]) => {
    await Promise.all(rows.map(c => deleteDoc(doc(db, 'categories', c.id))));
    setCategories(prev => prev.filter(c => !rows.some(r => r.id === c.id)));
    toast.success(`${rows.length} categories deleted`);
  };

  const columns: DataTableColumn<Category>[] = [
    {
      key: 'name',
      header: 'Category Name',
      searchValue: c => c.name,
      sortable: true,
      sortValue: c => c.name,
      render: c => <p className="font-bold text-foreground">{c.name}</p>,
      csvValue: c => c.name,
    },
    {
      key: 'slug',
      header: 'Slug',
      searchValue: c => c.slug ?? '',
      render: c => (
        <span className="bg-muted text-muted-foreground px-3 py-1 rounded-lg text-xs font-bold font-mono">
          {c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
        </span>
      ),
      csvValue: c => c.slug ?? c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    },
  ];

  const actions: DataTableActions<Category> = {
    edit: c => `/admin/categories/edit/${c.id}`,
    onDelete: handleDelete,
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Content"
        labelIcon={Tag}
        title="Categories"
        subtitle="Manage the organizational structure of prompts."
        actions={
          <Button
            as={Link}
            to="/admin/categories/new"
            variant="primary"
            size="md"
            leftIcon={Plus}
            className="font-bold shadow-sm shadow-primary/20"
          >
            Add Category
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={categories}
        rowKey={c => c.id}
        loading={loading}
        actions={actions}
        searchPlaceholder="Search categories..."
        selectable
        onBulkDelete={handleBulkDelete}
        exportFilename="categories"
        emptyIcon={Tag}
        emptyTitle="No categories found"
        emptyMessage="Start by adding your first category."
      />
    </div>
  );
}
