import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { GitBranch } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';
import { AutomationFlow } from '../../types';
import DataTable, { DataTableColumn } from '../admin/DataTable';
import Badge from '../primitives/Badge';

export default function AutomationManager() {
  const { prefix } = usePath();
  const [automations, setAutomations] = useState<AutomationFlow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAutomations() {
      try {
        const snap = await getDocs(collection(db, 'marketing_automations'));
        setAutomations(snap.docs.map(d => ({ id: d.id, ...d.data() } as AutomationFlow)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAutomations();
  }, []);

  const handleDelete = async (flow: AutomationFlow) => {
    if (!confirm('Delete this automation?')) return;
    try {
      await deleteDoc(doc(db, 'marketing_automations', flow.id));
      setAutomations(prev => prev.filter(f => f.id !== flow.id));
      toast.success('Automation deleted');
    } catch (err) {
      toast.error('Failed to delete automation');
    }
  };

  const columns: DataTableColumn<AutomationFlow>[] = [
    {
      key: 'name',
      header: 'Automation Identity',
      sortable: true,
      sortValue: f => f.name,
      searchValue: f => f.name,
      render: f => (
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all group-hover:scale-105 shadow-sm ${
            f.active
              ? 'bg-primary/5 text-primary border-primary/10 shadow-primary/10'
              : 'bg-muted/50 text-muted-foreground border-border'
          }`}>
            <GitBranch className="w-5 h-5" />
          </div>
          <span className="font-semibold text-foreground text-md">{f.name}</span>
        </div>
      ),
      csvValue: f => f.name,
    },
    {
      key: 'steps',
      header: 'Structure',
      sortable: true,
      sortValue: f => f.steps?.length || 0,
      render: f => (
        <Badge variant="outline" size="sm" className="bg-muted/10">
          {f.steps?.length || 0} Stages
        </Badge>
      ),
      csvValue: f => f.steps?.length || 0,
    },
    {
      key: 'status',
      header: 'Operating State',
      sortable: true,
      sortValue: f => f.active ? 1 : 0,
      render: f => (
        <Badge 
          variant={f.active ? 'success' : 'outline'} 
          dot 
          pulse={f.active}
          className={!f.active ? "bg-muted text-muted-foreground opacity-60" : ""}
        >
          {f.active ? 'Running' : 'Inactive'}
        </Badge>
      ),
      csvValue: f => f.active ? 'Active' : 'Inactive',
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={automations}
      rowKey={f => f.id}
      loading={loading}
      emptyIcon={GitBranch}
      emptyTitle="No Active Workflows"
      emptyMessage="Create your first campaign flow to get started."
      actions={{
        edit: f => prefix(`/admin/marketing/automations/${f.id}/edit`),
        onDelete: handleDelete,
      }}
      searchPlaceholder="Search automations..."
      exportFilename="marketing_automations"
    />
  );
}
