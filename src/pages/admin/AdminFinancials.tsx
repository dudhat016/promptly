import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { UserProfile } from '../../types';
import { CreditCard, TrendingUp, DollarSign } from 'lucide-react';
import { AdminPageHeader, DataTable } from '../../components/admin';
import type { DataTableColumn } from '../../components/admin';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SimulatedPayment {
  id: string;
  customer: string;
  email: string;
  description: string;
  amount: number;
  status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMRRData(proUsers: UserProfile[]) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    return {
      label: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      newSubs: 0,
    };
  });

  proUsers.forEach(u => {
    try {
      const created = typeof (u.createdAt as any)?.toDate === 'function'
        ? (u.createdAt as any).toDate()
        : new Date(u.createdAt as any);
      const bucket = months.find(b => b.year === created.getFullYear() && b.month === created.getMonth());
      if (bucket) bucket.newSubs++;
    } catch { /* skip */ }
  });

  let cumulative = 0;
  return months.map(m => {
    cumulative += m.newSubs * 15;
    return { label: m.label, mrr: cumulative, newRevenue: m.newSubs * 15 };
  });
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: ${p.value}
        </p>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminFinancials() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const uSnap = await getDocs(collection(db, 'users'));
        setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const proUsers = users.filter(u => u.subscriptionStatus === 'pro');
  const estimatedMRR = proUsers.length * 15;
  const mrrData = buildMRRData(proUsers);

  const payments: SimulatedPayment[] = proUsers.slice(0, 50).map(u => ({
    id: u.uid,
    customer: u.displayName || u.email || 'Unknown',
    email: u.email || '',
    description: 'Pro Plan Subscription',
    amount: 15,
    status: 'Success',
  }));

  const columns: DataTableColumn<SimulatedPayment>[] = [
    {
      key: 'customer',
      header: 'Customer',
      searchValue: p => `${p.customer} ${p.email}`,
      sortable: true,
      sortValue: p => p.customer,
      render: p => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{p.customer}</p>
            <p className="text-xs text-muted-foreground truncate">{p.email}</p>
          </div>
        </div>
      ),
      csvValue: p => p.customer,
    },
    {
      key: 'description',
      header: 'Description',
      render: p => (
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{p.description}</p>
      ),
      csvValue: p => p.description,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      sortValue: p => p.amount,
      render: p => (
        <span className="font-bold text-emerald-600">+${p.amount.toFixed(2)}</span>
      ),
      csvValue: p => p.amount,
    },
    {
      key: 'status',
      header: 'Status',
      render: p => (
        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest">
          {p.status}
        </span>
      ),
      csvValue: p => p.status,
    },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Revenue"
        labelIcon={CreditCard}
        title="Financials"
        subtitle="Revenue analytics and platform payment history."
      />

      {/* Stat cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { icon: DollarSign,  color: 'emerald', value: `$${estimatedMRR.toFixed(2)}`, label: 'Estimated MRR' },
          { icon: TrendingUp,  color: 'primary',  value: proUsers.length.toString(),     label: 'Pro Subscribers' },
          { icon: CreditCard,  color: 'primary',  value: '$15.00',                        label: 'ARPU' },
        ].map(card => (
          <div key={card.label} className="bg-card rounded-xl p-6 border border-border shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-5 opacity-[0.04]">
              <card.icon className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                card.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'
              }`}>
                <card.icon className="w-5 h-5" />
              </div>
              <h4 className="text-2xl font-bold text-foreground">{card.value}</h4>
              <p className="text-muted-foreground text-xs mt-2 font-bold uppercase tracking-widest">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* MRR Trend Charts */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Cumulative MRR */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="mb-5">
            <h3 className="font-bold text-foreground">MRR Growth</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Cumulative monthly recurring revenue — last 6 months</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mrrData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v}`} allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="mrr"
                name="MRR"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#mrrGrad)"
                dot={{ fill: 'var(--color-primary)', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly new revenue */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="mb-5">
            <h3 className="font-bold text-foreground">New Revenue / Month</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Revenue from new subscriptions each month</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mrrData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v}`} allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="newRevenue" name="New Revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payments table */}
      <DataTable
        columns={columns}
        data={payments}
        rowKey={p => p.id}
        loading={loading}
        searchPlaceholder="Search by customer or email..."
        exportFilename="payments"
        emptyIcon={CreditCard}
        emptyTitle="No payments found"
        emptyMessage="No active paid subscriptions yet."
      />
    </div>
  );
}
