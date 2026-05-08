import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { AIModel } from '../../types';
import { Plus, Cpu } from 'lucide-react';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import type { DataTableColumn, DataTableActions } from '../../components/admin';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function AdminModels() {
  const confirm = useConfirm();
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadModels() {
      try {
        const snap = await getDocs(collection(db, 'models'));
        setModels(snap.docs.map(d => ({ id: d.id, ...d.data() } as AIModel)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadModels();
  }, []);

  const handleDelete = async (model: AIModel) => {
    const ok = await confirm({ title: 'Delete this AI model?', description: 'This action cannot be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'models', model.id));
      setModels(prev => prev.filter(m => m.id !== model.id));
      toast.success('AI Model deleted');
    } catch {
      toast.error('Failed to delete model');
    }
  };

  const columns: DataTableColumn<AIModel>[] = [
    {
      key: 'name',
      header: 'AI Model',
      searchValue: m => `${m.name} ${m.id}`,
      sortable: true,
      sortValue: m => m.name,
      render: m => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/8 text-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{m.name}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">{m.id}</p>
          </div>
        </div>
      ),
      csvValue: m => m.name,
    },
    {
      key: 'provider',
      header: 'Provider',
      searchValue: m => m.provider ?? '',
      sortable: true,
      sortValue: m => m.provider ?? '',
      render: m => (
        <span className="text-xs font-bold text-primary uppercase tracking-widest">{m.provider}</span>
      ),
      csvValue: m => m.provider ?? '',
    },
    {
      key: 'version',
      header: 'Version',
      sortable: true,
      sortValue: m => m.version ?? '',
      render: m => (
        <span className="text-xs font-bold text-muted-foreground">{m.version}</span>
      ),
      csvValue: m => m.version ?? '',
    },
    {
      key: 'status',
      header: 'Status',
      render: () => (
        <span className="px-2.5 py-1 bg-muted rounded-lg text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Realtime
        </span>
      ),
      csvValue: () => 'Realtime',
    },
  ];

  const actions: DataTableActions<AIModel> = {
    edit: m => `/admin/models/edit/${m.id}`,
    onDelete: handleDelete,
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Content"
        labelIcon={Cpu}
        title="AI Models"
        subtitle="Manage the AI engines that power your prompts."
        actions={
          <Link to="/admin/models/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Add AI Model
          </Link>
        }
      />
      <DataTable
        columns={columns}
        data={models}
        rowKey={m => m.id}
        loading={loading}
        actions={actions}
        searchPlaceholder="Search by name or provider..."
        exportFilename="ai-models"
        emptyIcon={Cpu}
        emptyTitle="No AI Models Found"
        emptyMessage="Start by adding your first AI model engine."
      />
    </div>
  );
}
