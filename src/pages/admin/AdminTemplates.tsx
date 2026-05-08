import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { EmailTemplate } from '../../types';
import { Plus, Mail } from 'lucide-react';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import type { DataTableColumn, DataTableActions } from '../../components/admin';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function AdminTemplates() {
  const confirm = useConfirm();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const snap = await getDocs(collection(db, 'templates'));
        setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmailTemplate)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  const handleDelete = async (template: EmailTemplate) => {
    const ok = await confirm({ title: 'Delete this email template?', description: 'This action cannot be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'templates', template.id));
      setTemplates(prev => prev.filter(t => t.id !== template.id));
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const handleBulkDelete = async (rows: EmailTemplate[]) => {
    await Promise.all(rows.map(t => deleteDoc(doc(db, 'templates', t.id))));
    setTemplates(prev => prev.filter(t => !rows.some(r => r.id === t.id)));
    toast.success(`${rows.length} templates deleted`);
  };

  const columns: DataTableColumn<EmailTemplate>[] = [
    {
      key: 'name',
      header: 'Template Name',
      searchValue: t => t.name,
      sortable: true,
      sortValue: t => t.name,
      render: t => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/8 text-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <p className="font-bold text-foreground">{t.name}</p>
        </div>
      ),
      csvValue: t => t.name,
    },
    {
      key: 'subject',
      header: 'Subject Line',
      searchValue: t => t.subject ?? '',
      sortable: true,
      sortValue: t => t.subject ?? '',
      render: t => (
        <p className="text-sm text-muted-foreground font-medium">{t.subject}</p>
      ),
      csvValue: t => t.subject ?? '',
    },
  ];

  const actions: DataTableActions<EmailTemplate> = {
    edit: t => `/admin/templates/edit/${t.id}`,
    onDelete: handleDelete,
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Content"
        labelIcon={Mail}
        title="Email Templates"
        subtitle="Manage automated email structures and marketing copy."
        actions={
          <Link to="/admin/templates/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Template
          </Link>
        }
      />
      <DataTable
        columns={columns}
        data={templates}
        rowKey={t => t.id}
        loading={loading}
        actions={actions}
        searchPlaceholder="Search templates..."
        selectable
        onBulkDelete={handleBulkDelete}
        exportFilename="email-templates"
        emptyIcon={Mail}
        emptyTitle="No templates found"
        emptyMessage="Start by adding your first email template."
      />
    </div>
  );
}
