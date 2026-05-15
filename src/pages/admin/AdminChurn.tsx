import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { TrendingUp, UserMinus, UserCheck, Clock, AlertTriangle, RefreshCw, Send, CreditCard } from 'lucide-react';
import { AdminPageHeader, DataTable, type DataTableColumn } from '../../components/admin';
import Badge from '../../components/primitives/Badge';
import Button from '../../components/primitives/Button';
import { api } from '../../lib/api';
import { usePath } from '../../hooks/usePath';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface CancellationRecord {
  id: string;
  userId: string;
  userEmail: string;
  reason: string;
  plan: string;
  createdAt: any;
}

interface TrialUser {
  uid: string;
  displayName: string;
  email: string;
  trialEndsAt: any;
  daysLeft: number;
}

interface DunningUser {
  uid: string;
  displayName: string;
  email: string;
  dunningStatus: 'failing' | 'recovered' | 'downgraded';
  dunningAttempt?: number;
  dunningStartedAt?: any;
  dunningNextRetryAt?: any;
}

function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate();
  if (typeof val === 'object' && val.seconds) return new Date(val.seconds * 1000);
  try { return new Date(val); } catch { return null; }
}

function formatDate(val: any): string {
  const d = parseDate(val);
  return d ? d.toLocaleDateString() : 'N/A';
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

const REASON_LABELS: Record<string, string> = {
  too_expensive: 'Too expensive',
  not_using: 'Not using enough',
  missing_feature: 'Missing feature',
  switching: 'Switching tools',
  other: 'Other',
};

export default function AdminChurn() {
  const [cancellations, setCancellations] = useState<CancellationRecord[]>([]);
  const [trialUsers, setTrialUsers] = useState<TrialUser[]>([]);
  const [dunningUsers, setDunningUsers] = useState<DunningUser[]>([]);
  const [stats, setStats] = useState({ totalCancelled: 0, thisMonth: 0, trialCount: 0, trialConverted: 0, dunningCount: 0 });
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function runNudges() {
    setNudging(true);
    try {
      const result: any = await api.post('/nudges/run-all');
      if (result.error) { toast.error(result.error); return; }
      toast.success(`Nudges sent: ${result.total?.sent ?? 0} emails dispatched, ${result.total?.skipped ?? 0} skipped`);
    } catch {
      toast.error('Failed to run nudges');
    } finally {
      setNudging(false);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const now = Date.now();
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

      const [cancelSnap, userSnap, dunningSnap] = await Promise.all([
        getDocs(query(collection(db, 'cancellation_feedback'), orderBy('createdAt', 'desc'), limit(200))),
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'users'), where('dunningStatus', 'in', ['failing', 'downgraded']))),
      ]);

      const cancelList: CancellationRecord[] = cancelSnap.docs.map(d => ({ id: d.id, ...d.data() } as CancellationRecord));
      setCancellations(cancelList);

      // Count this-month cancellations
      const thisMonth = cancelList.filter(c => {
        const d = parseDate(c.createdAt);
        return d && d >= monthStart;
      }).length;

      // Find active trial users + track conversions
      const trials: TrialUser[] = [];
      let converted = 0;
      userSnap.docs.forEach(d => {
        const data = d.data();
        if (data.trialEndsAt) {
          const endsAt = parseDate(data.trialEndsAt);
          if (endsAt) {
            const daysLeft = Math.ceil((endsAt.getTime() - now) / 86400000);
            if (daysLeft >= 0 && data.subscriptionStatus !== 'pro') {
              trials.push({ uid: d.id, displayName: data.displayName || 'Unknown', email: data.email || '', trialEndsAt: data.trialEndsAt, daysLeft });
            }
            if (data.trialUsed && data.subscriptionStatus === 'pro') converted++;
          }
        }
      });
      setTrialUsers(trials.sort((a, b) => a.daysLeft - b.daysLeft));

      const dunningList: DunningUser[] = dunningSnap.docs.map(d => {
        const data = d.data();
        return {
          uid: d.id,
          displayName: data.displayName || 'Unknown',
          email: data.email || '',
          dunningStatus: data.dunningStatus,
          dunningAttempt: data.dunningAttempt,
          dunningStartedAt: data.dunningStartedAt,
          dunningNextRetryAt: data.dunningNextRetryAt,
        };
      });
      setDunningUsers(dunningList);

      setStats({ totalCancelled: cancelList.length, thisMonth, trialCount: trials.length, trialConverted: converted, dunningCount: dunningList.length });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Build reason breakdown chart
  const reasonCounts = cancellations.reduce((acc, c) => {
    const key = c.reason || 'other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const reasonChart = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({ name: REASON_LABELS[key] || key, value }));

  // Build monthly churn chart (last 6 months)
  const monthlyChurn = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i));
    return { label: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth(), count: 0 };
  });
  cancellations.forEach(c => {
    const d = parseDate(c.createdAt);
    if (!d) return;
    const bucket = monthlyChurn.find(b => b.year === d.getFullYear() && b.month === d.getMonth());
    if (bucket) bucket.count++;
  });

  const cancellationColumns: DataTableColumn<CancellationRecord>[] = [
    {
      key: 'user',
      header: 'User',
      searchValue: c => `${c.userEmail}`,
      render: c => (
        <div>
          <p className="font-medium text-foreground text-sm truncate max-w-[180px]">{c.userEmail || '—'}</p>
          <p className="text-xs text-muted-foreground font-mono truncate">{c.userId?.slice(0, 12)}…</p>
        </div>
      ),
      csvValue: c => c.userEmail,
    },
    {
      key: 'reason',
      header: 'Reason',
      sortable: true,
      sortValue: c => c.reason,
      render: c => (
        <Badge variant="outline" size="sm">{REASON_LABELS[c.reason] || c.reason || 'Unknown'}</Badge>
      ),
      csvValue: c => c.reason,
    },
    {
      key: 'plan',
      header: 'Plan',
      render: c => <span className="text-xs font-medium text-muted-foreground">{c.plan || '—'}</span>,
      csvValue: c => c.plan,
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      sortValue: c => parseDate(c.createdAt)?.getTime() ?? 0,
      render: c => <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>,
      csvValue: c => formatDate(c.createdAt),
    },
  ];

  const DUNNING_STATUS_LABELS: Record<string, { label: string; variant: 'error' | 'warning' | 'outline' }> = {
    failing:    { label: 'Failing',    variant: 'error' },
    downgraded: { label: 'Downgraded', variant: 'warning' },
    recovered:  { label: 'Recovered',  variant: 'outline' },
  };

  const dunningColumns: DataTableColumn<DunningUser>[] = [
    {
      key: 'user',
      header: 'User',
      searchValue: u => `${u.displayName} ${u.email}`,
      render: u => (
        <div>
          <Link to={`/admin/users?q=${encodeURIComponent(u.email)}`} className="font-medium text-foreground text-sm hover:text-primary transition-colors">
            {u.displayName}
          </Link>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
      csvValue: u => u.email,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: u => u.dunningStatus,
      render: u => {
        const s = DUNNING_STATUS_LABELS[u.dunningStatus] ?? { label: u.dunningStatus, variant: 'outline' as const };
        return <Badge variant={s.variant} size="sm">{s.label}</Badge>;
      },
      csvValue: u => u.dunningStatus,
    },
    {
      key: 'attempt',
      header: 'Attempt',
      sortable: true,
      sortValue: u => u.dunningAttempt ?? 0,
      render: u => (
        <span className={`text-sm font-bold ${(u.dunningAttempt ?? 0) >= 3 ? 'text-destructive' : 'text-amber-600'}`}>
          {u.dunningAttempt != null ? `#${u.dunningAttempt}` : '—'}
        </span>
      ),
      csvValue: u => u.dunningAttempt ?? '',
    },
    {
      key: 'started',
      header: 'Started',
      sortable: true,
      sortValue: u => parseDate(u.dunningStartedAt)?.getTime() ?? 0,
      render: u => <span className="text-xs text-muted-foreground">{formatDate(u.dunningStartedAt)}</span>,
      csvValue: u => formatDate(u.dunningStartedAt),
    },
    {
      key: 'nextRetry',
      header: 'Next Retry',
      render: u => <span className="text-xs text-muted-foreground">{u.dunningNextRetryAt ? formatDate(u.dunningNextRetryAt) : '—'}</span>,
      csvValue: u => u.dunningNextRetryAt ? formatDate(u.dunningNextRetryAt) : '',
    },
  ];

  const trialColumns: DataTableColumn<TrialUser>[] = [
    {
      key: 'user',
      header: 'User',
      searchValue: u => `${u.displayName} ${u.email}`,
      render: u => (
        <div>
          <p className="font-medium text-foreground text-sm">{u.displayName}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
      csvValue: u => u.email,
    },
    {
      key: 'daysLeft',
      header: 'Days Left',
      sortable: true,
      sortValue: u => u.daysLeft,
      render: u => (
        <div className="flex items-center gap-1.5">
          <Clock className={`w-3.5 h-3.5 ${u.daysLeft <= 1 ? 'text-rose-500' : u.daysLeft <= 3 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          <span className={`text-sm font-bold ${u.daysLeft <= 1 ? 'text-rose-600' : u.daysLeft <= 3 ? 'text-amber-600' : 'text-foreground'}`}>
            {u.daysLeft === 0 ? 'Ends today' : `${u.daysLeft}d`}
          </span>
        </div>
      ),
      csvValue: u => u.daysLeft,
    },
    {
      key: 'ends',
      header: 'Trial Ends',
      render: u => <span className="text-xs text-muted-foreground">{formatDate(u.trialEndsAt)}</span>,
      csvValue: u => formatDate(u.trialEndsAt),
    },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Revenue"
        labelIcon={TrendingUp}
        title="Churn & Retention"
        subtitle="Cancellation analytics, churn reasons, and active trial users."
        actions={
          <Button
            onClick={runNudges}
            isLoading={nudging}
            variant="outline"
            size="sm"
            leftIcon={Send}
          >
            Send Nudge Emails
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { icon: UserMinus,     label: 'Total Cancellations',  value: stats.totalCancelled,  color: 'bg-rose-500/10 text-rose-500' },
          { icon: AlertTriangle, label: 'Cancelled This Month', value: stats.thisMonth,        color: 'bg-amber-500/10 text-amber-500' },
          { icon: Clock,         label: 'Active Trial Users',   value: stats.trialCount,       color: 'bg-sky-500/10 text-sky-500' },
          { icon: UserCheck,     label: 'Trial Conversions',    value: stats.trialConverted,   color: 'bg-emerald-500/10 text-emerald-500' },
          { icon: CreditCard,    label: 'In Dunning',           value: stats.dunningCount,     color: 'bg-destructive/10 text-destructive' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-5 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
              <s.icon className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-bold text-foreground mb-1">Monthly Churn</h3>
          <p className="text-xs text-muted-foreground mb-5">Cancellations per month — last 6 months</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyChurn} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Cancellations" radius={[4,4,0,0]}>
                {monthlyChurn.map((_, i) => (
                  <Cell key={i} fill={i === 5 ? 'var(--color-primary)' : 'var(--color-muted-foreground)'} fillOpacity={i === 5 ? 0.85 : 0.3} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-bold text-foreground mb-1">Cancellation Reasons</h3>
          <p className="text-xs text-muted-foreground mb-5">Why users cancel — all time</p>
          {reasonChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={reasonChart} layout="vertical" margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Count" fill="var(--color-primary)" radius={[0,4,4,0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">No cancellation data yet.</div>
          )}
        </div>
      </div>

      {/* Active trial users */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-sky-500" />
          <h3 className="font-bold text-foreground">Active Trial Users</h3>
          {stats.trialCount > 0 && (
            <Badge variant="info" size="sm">{stats.trialCount} at risk</Badge>
          )}
        </div>
        <DataTable
          columns={trialColumns}
          data={trialUsers}
          rowKey={u => u.uid}
          loading={loading}
          searchPlaceholder="Search trial users..."
          exportFilename="trial-users"
          emptyIcon={UserCheck}
          emptyTitle="No active trials"
          emptyMessage="No users are currently in a trial period."
        />
      </div>

      {/* Dunning users */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-destructive" />
          <h3 className="font-bold text-foreground">Dunning Users</h3>
          {stats.dunningCount > 0 && (
            <Badge variant="error" size="sm">{stats.dunningCount} at risk</Badge>
          )}
          <Link
            to="/admin/users?filter=dunning"
            className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
          >
            View in Users
          </Link>
        </div>
        <DataTable
          columns={dunningColumns}
          data={dunningUsers}
          rowKey={u => u.uid}
          loading={loading}
          searchPlaceholder="Search dunning users..."
          exportFilename="dunning-users"
          emptyIcon={CreditCard}
          emptyTitle="No dunning users"
          emptyMessage="Users with failed payment retries will appear here."
        />
      </div>

      {/* Cancellation log */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <UserMinus className="w-4 h-4 text-rose-500" />
          <h3 className="font-bold text-foreground">Cancellation Log</h3>
        </div>
        <DataTable
          columns={cancellationColumns}
          data={cancellations}
          rowKey={c => c.id}
          loading={loading}
          searchPlaceholder="Search by email..."
          exportFilename="cancellations"
          emptyIcon={RefreshCw}
          emptyTitle="No cancellations recorded"
          emptyMessage="Cancellation feedback will appear here when users cancel."
        />
      </div>
    </div>
  );
}
