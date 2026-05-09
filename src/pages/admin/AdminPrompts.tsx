import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { Prompt } from '../../types';
import { Plus, Heart, Eye, LayoutGrid } from 'lucide-react';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import type { DataTableColumn, DataTableActions } from '../../components/admin';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { logAuditEvent } from '../../lib/auditLog';
import Button from '../../components/ui/Button';

export default function AdminPrompts() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPrompts(); }, []);

  async function fetchPrompts() {
    try {
      const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setPrompts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Prompt)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (prompt: Prompt) => {
    const ok = await confirm({ title: 'Delete this prompt?', description: 'This action cannot be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'prompts', prompt.id));
      setPrompts(prev => prev.filter(p => p.id !== prompt.id));
      logAuditEvent({ action: 'prompt.deleted', entityType: 'prompt', entityId: prompt.id, actorId: user?.uid, actorEmail: user?.email ?? undefined, details: { title: prompt.title } });
      toast.success('Prompt deleted');
    } catch {
      toast.error('Failed to delete prompt');
    }
  };

  const handleBulkDelete = async (rows: Prompt[]) => {
    await Promise.all(rows.map(p => deleteDoc(doc(db, 'prompts', p.id))));
    setPrompts(prev => prev.filter(p => !rows.some(r => r.id === p.id)));
    logAuditEvent({ action: 'prompt.bulk_deleted', entityType: 'prompt', actorId: user?.uid, actorEmail: user?.email ?? undefined, details: { count: rows.length, ids: rows.map(r => r.id) } });
    toast.success(`${rows.length} prompts deleted`);
  };

  const columns: DataTableColumn<Prompt>[] = [
    {
      key: 'prompt',
      header: 'Prompt',
      searchValue: p => `${p.title} ${p.description ?? ''} ${p.model}`,
      render: p => (
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isPaid ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{p.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{p.description}</p>
          </div>
        </div>
      ),
      csvValue: p => p.title,
    },
    {
      key: 'model',
      header: 'Model',
      searchValue: p => p.model,
      sortable: true,
      sortValue: p => p.model,
      render: p => (
        <span className="badge-primary">{p.model}</span>
      ),
      csvValue: p => p.model,
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      sortValue: p => p.isPaid ? 'paid' : 'free',
      render: p => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
          p.isPaid
            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
        }`}>
          {p.isPaid ? 'Paid' : 'Free'}
        </span>
      ),
      csvValue: p => p.isPaid ? 'Paid' : 'Free',
    },
    {
      key: 'stats',
      header: 'Stats',
      sortable: true,
      sortValue: p => p.likesCount ?? 0,
      render: p => (
        <div className="flex items-center gap-4 text-muted-foreground text-xs font-bold">
          <span className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            {p.likesCount ?? 0}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-primary/60" />
            {p.viewsCount ?? 0}
          </span>
        </div>
      ),
      csvValue: p => `${p.likesCount ?? 0} likes, ${p.viewsCount ?? 0} views`,
    },
  ];

  const actions: DataTableActions<Prompt> = {
    edit: p => `/admin/prompts/edit/${p.id}`,
    onDelete: handleDelete,
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Content"
        labelIcon={LayoutGrid}
        title="Prompts Library"
        subtitle="Manage all system prompts and templates."
        actions={
          <Button 
            as={Link} 
            to="/admin/prompts/new" 
            variant="primary"
            leftIcon={Plus}
            size="sm"
          >
            Add Prompt
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={prompts}
        rowKey={p => p.id}
        loading={loading}
        actions={actions}
        searchPlaceholder="Search by title, model..."
        selectable
        onBulkDelete={handleBulkDelete}
        exportFilename="prompts"
        emptyIcon={LayoutGrid}
        emptyTitle="No prompts found"
        emptyMessage="Start by adding your first prompt."
      />
    </div>
  );
}
