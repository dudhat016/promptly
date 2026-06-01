import { AlertCircle, CheckCircle2, Clock, RefreshCw, RotateCcw, Search, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AdminPageHeader, useConfirm } from '../../components/admin';
import Tabs from '../../components/navigation/Tabs';
import Badge from '../../components/primitives/Badge';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Input from '../../components/primitives/Input';
import { usePath } from '../../hooks/usePath';
import { api } from '../../lib/api';

interface FlowInstance {
  id: string;
  flowId: string;
  flowName: string;
  userId: string;
  userEmail: string;
  userName: string;
  currentStepIndex: number;
  status: 'pending' | 'completed' | 'failed';
  scheduledAt: any;
  createdAt: any;
  updatedAt: any;
  triggerData: Record<string, any>;
  completedSteps: number[];
  error?: string;
}

const STATUS_VARIANT: Record<string, 'soft'|'success'|'warning'|'error'> = {
  pending: 'warning', completed: 'success', failed: 'error',
};

function fmtDate(ts: any): string {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return d.toLocaleString();
  } catch { return '—'; }
}

export default function AdminAutomationInstances() {
  const { prefix } = usePath();
  const confirm = useConfirm();
  const [instances, setInstances] = useState<FlowInstance[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all'|'pending'|'completed'|'failed'>('all');
  const [search, setSearch]       = useState('');
  const [ticking, setTicking]     = useState(false);

  async function fetchInstances() {
    setLoading(true);
    try {
      const data = await api.get('/automation/instances') as any;
      const list: FlowInstance[] = Array.isArray(data) ? data : (data?.data ?? []);
      setInstances(list.map(d => ({
        ...d,
        scheduledAt: d.scheduledAt?._seconds ? { seconds: d.scheduledAt._seconds, toDate: () => new Date(d.scheduledAt._seconds * 1000) } : d.scheduledAt,
        createdAt:   d.createdAt?._seconds   ? { seconds: d.createdAt._seconds,   toDate: () => new Date(d.createdAt._seconds * 1000)   } : d.createdAt,
      })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchInstances(); }, []);

  const handleTick = async () => {
    setTicking(true);
    const toastId = toast.loading('Running automation tick…');
    try {
      const r = await api.post('/automation/tick');
      const { processed = 0, errors = 0 } = (r as any);
      toast.success(`Tick done — ${processed} processed, ${errors} errors`, { id: toastId });
      await fetchInstances();
    } catch {
      toast.error('Tick failed — check console', { id: toastId });
    } finally { setTicking(false); }
  };

  const handleCancel = async (instance: FlowInstance) => {
    const ok = await confirm({
      title: 'Cancel this flow instance?',
      description: `Flow "${instance.flowName}" for ${instance.userEmail} will be marked completed.`,
      confirmLabel: 'Cancel flow', destructive: true,
    });
    if (!ok) return;
    try {
      await api.patch(`/automation/instances/${instance.id}/cancel`);
      setInstances(p => p.map(i => i.id === instance.id ? { ...i, status: 'completed' } : i));
      toast.success('Flow cancelled');
    } catch { toast.error('Failed to cancel'); }
  };

  const handleRetry = async (instance: FlowInstance) => {
    try {
      await api.patch(`/automation/instances/${instance.id}/retry`);
      setInstances(p => p.map(i => i.id === instance.id ? { ...i, status: 'pending', error: undefined } : i));
      toast.success('Instance re-queued for next tick');
    } catch { toast.error('Retry failed'); }
  };

  const filtered = instances.filter(i => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return i.userEmail?.toLowerCase().includes(s) ||
             i.flowName?.toLowerCase().includes(s) ||
             i.userId?.toLowerCase().includes(s);
    }
    return true;
  });

  const counts = instances.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1; return acc;
  }, {});

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Emails"
        labelIcon={Zap}
        title="Automation Instances"
        subtitle="Active, completed and failed automation flow runs. Instances expire after 60 days."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={handleTick} isLoading={ticking} variant="primary" size="md" leftIcon={Zap}>
              Run Tick Now
            </Button>
            <Button onClick={fetchInstances} isLoading={loading} variant="ghost" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: instances.length, icon: Zap, accent: 'bg-primary/10 text-primary' },
          { label: 'Pending', value: counts['pending'] || 0, icon: Clock, accent: 'bg-amber-500/10 text-amber-600' },
          { label: 'Completed', value: counts['completed'] || 0, icon: CheckCircle2, accent: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'Failed', value: counts['failed'] || 0, icon: AlertCircle, accent: 'bg-destructive/10 text-destructive' },
        ].map(s => (
          <Card key={s.label} padding="sm" className="flex-row items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.accent}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <p className="text-lg font-black text-foreground leading-none">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-grow max-w-xs">
          <Input
            placeholder="Search email, flow name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={Search}
            variant="outline"
          />
        </div>
        <Tabs
          tabs={(['all', 'pending', 'completed', 'failed'] as const).map(s => ({
            id: s,
            label: s.charAt(0).toUpperCase() + s.slice(1),
          }))}
          activeTab={filterStatus}
          onChange={id => setFilterStatus(id as typeof filterStatus)}
          variant="pill"
        />
      </div>

      {/* Table */}
      <Card padding="none" className="shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Flow</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">User</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Progress</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scheduled</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && instances.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-muted-foreground text-sm">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-muted-foreground text-sm font-semibold">No instances match your filters.</td></tr>
              ) : filtered.map(inst => (
                <tr key={inst.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-bold text-foreground text-sm">{inst.flowName}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/60">{inst.flowId}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-semibold text-foreground">{inst.userName}</p>
                    <p className="text-xs text-muted-foreground">{inst.userEmail}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">
                        Step {inst.currentStepIndex + 1}
                      </div>
                      {inst.completedSteps?.length > 0 && (
                        <span className="text-[10px] text-muted-foreground/60">({inst.completedSteps.length} done)</span>
                      )}
                    </div>
                    {inst.error && (
                      <p className="text-[10px] text-destructive mt-0.5 max-w-[180px] truncate" title={inst.error}>{inst.error}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={STATUS_VARIANT[inst.status] ?? 'soft'} size="sm" dot>
                      {inst.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDate(inst.scheduledAt)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      {inst.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(inst)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Retry — re-queue for next tick"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {inst.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(inst)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Cancel this flow instance"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border bg-muted/20">
          <p className="text-[10px] text-muted-foreground">
            Showing {filtered.length} of {instances.length} instances (last 200). Instances auto-expire after 60 days.
          </p>
        </div>
      </Card>
    </div>
  );
}
