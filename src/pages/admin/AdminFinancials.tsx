import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { CreditCard, DollarSign, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { AdminPageHeader, DataTable } from '../../components/admin';
import Badge from '../../components/primitives/Badge';
import Card from '../../components/primitives/Card';
import type { DataTableColumn } from '../../components/admin';
import { useConfig } from '../../hooks/useConfig';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

interface Order {
  id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  planName: string;
  amount: number;
  currency: string;
  amountUsd?: number;
  exchangeRateAtOrder?: number;
  billingCycle: string;
  gateway: string;
  status: string;
  createdAt: any;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildRevenueData(orders: Order[]) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    return {
      label: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      revenue: 0,
    };
  });

  orders.forEach(o => {
    try {
      const created = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      const bucket = months.find(b => b.year === created.getFullYear() && b.month === created.getMonth());
      if (!bucket) return;
      // Use amountUsd when available; fall back to raw amount for USD-native orders
      const usd = o.amountUsd ?? (o.currency === 'USD' ? Number(o.amount) : 0);
      bucket.revenue += usd;
    } catch { /* skip */ }
  });

  let cumulative = 0;
  return months.map(m => {
    cumulative += m.revenue;
    return { label: m.label, mrr: parseFloat(cumulative.toFixed(2)), newRevenue: parseFloat(m.revenue.toFixed(2)) };
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

interface MrrByPlan { name: string; mrr: number; count: number; }

const PIE_COLORS = ['var(--color-primary)', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];

export default function AdminFinancials() {
  const { config } = useConfig();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [trueMrr, setTrueMrr] = useState(0);
  const [activeSubs, setActiveSubs] = useState(0);
  const [mrrByPlan, setMrrByPlan] = useState<MrrByPlan[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [orderSnap, proSnap] = await Promise.all([
          getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(200))),
          getDocs(query(collection(db, 'users'), where('subscriptionStatus', '==', 'pro'))),
        ]);
        setOrders(orderSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
        setActiveSubs(proSnap.size);

        // Compute true MRR from active pro subscribers
        let mrr = 0;
        const planBuckets: Record<string, { count: number; mrr: number }> = {};

        proSnap.docs.forEach(d => {
          const user = d.data();
          const planId = user.activePlanId || 'pro';
          const cycle = user.billingCycle || 'monthly';
          const plan = config.plans.find(p => p.id === planId);
          const monthlyEquiv = plan
            ? (cycle === 'yearly' ? (plan.yearlyPrice || plan.monthlyPrice * 12) / 12 : plan.monthlyPrice)
            : 0;
          mrr += monthlyEquiv;
          if (!planBuckets[planId]) planBuckets[planId] = { count: 0, mrr: 0 };
          planBuckets[planId].count++;
          planBuckets[planId].mrr += monthlyEquiv;
        });

        setTrueMrr(Math.round(mrr * 100) / 100);
        setMrrByPlan(
          Object.entries(planBuckets)
            .map(([id, v]) => ({
              name: config.plans.find(p => p.id === id)?.name || id,
              mrr: Math.round(v.mrr * 100) / 100,
              count: v.count,
            }))
            .sort((a, b) => b.mrr - a.mrr)
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Normalize all order amounts to USD.
  // New orders have amountUsd; legacy orders without it fall back:
  //   USD orders → use amount directly
  //   INR orders without amountUsd → excluded from total (can't safely guess historical rate)
  const totalRevenue = orders.reduce((sum, o) => {
    const usd = o.amountUsd ?? (o.currency === 'USD' ? Number(o.amount) : null);
    return sum + (usd ?? 0);
  }, 0);
  const revenueData = buildRevenueData(orders);

  const columns: DataTableColumn<Order>[] = [
    {
      key: 'customer',
      header: 'Customer',
      searchValue: o => `${o.userEmail} ${o.orderId}`,
      sortable: true,
      sortValue: o => o.userEmail,
      render: o => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{o.userEmail}</p>
            <p className="font-mono text-[10px] text-muted-foreground truncate">{o.orderId}</p>
          </div>
        </div>
      ),
      csvValue: o => o.userEmail,
    },
    {
      key: 'plan',
      header: 'Plan',
      render: o => (
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          {o.planName} · {o.billingCycle}
        </p>
      ),
      csvValue: o => o.planName,
    },
    {
      key: 'gateway',
      header: 'Gateway',
      render: o => (
        <Badge variant={o.gateway === 'cashfree' ? 'info' : 'default'} size="sm">
          {o.gateway}
        </Badge>
      ),
      csvValue: o => o.gateway,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      sortValue: o => o.amountUsd ?? (o.currency === 'USD' ? Number(o.amount) : 0),
      render: o => (
        <div>
          <span className="font-bold text-emerald-600">
            ${Number(o.amount).toFixed(2)}
          </span>
        </div>
      ),
      csvValue: o => `$${Number(o.amount).toFixed(2)}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: o => (
        <Badge variant={o.status === 'completed' ? 'success' : 'warning'} size="sm" dot>
          {o.status}
        </Badge>
      ),
      csvValue: o => o.status,
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      sortValue: o => o.createdAt?.toDate?.()?.getTime?.() ?? 0,
      render: o => (
        <span className="text-xs text-muted-foreground">
          {(() => { try { return o.createdAt?.toDate().toLocaleDateString(); } catch { return 'N/A'; } })()}
        </span>
      ),
      csvValue: o => {
        try { return o.createdAt?.toDate().toLocaleDateString(); } catch { return 'N/A'; }
      },
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
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: DollarSign,   color: 'emerald', value: `$${totalRevenue.toFixed(2)}`, label: 'Total Revenue (USD)' },
          { icon: TrendingUp,   color: 'primary',  value: `$${trueMrr.toFixed(2)}`,     label: 'Est. MRR (USD)' },
          { icon: Users,        color: 'sky',      value: activeSubs.toString(),          label: 'Active Pro Subscribers' },
          { icon: CreditCard,   color: 'amber',    value: orders.length > 0 ? `$${(totalRevenue / orders.filter(o => o.amountUsd ?? o.currency === 'USD').length || 1).toFixed(2)}` : '$0', label: 'Avg Order Value (USD)' },
        ].map(card => (
          <div key={card.label} className="bg-card rounded-xl p-6 border border-border shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-5 opacity-[0.04]">
              <card.icon className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                card.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600'
                : card.color === 'sky' ? 'bg-sky-500/10 text-sky-500'
                : card.color === 'amber' ? 'bg-amber-500/10 text-amber-500'
                : 'bg-primary/10 text-primary'
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
        <Card>
          <div className="mb-5">
            <h3 className="font-bold text-foreground">MRR Growth</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Cumulative monthly recurring revenue — last 6 months</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
        </Card>

        {/* Monthly new revenue */}
        <Card>
          <div className="mb-5">
            <h3 className="font-bold text-foreground">New Revenue / Month</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Revenue from new subscriptions each month</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v}`} allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="newRevenue" name="New Revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* MRR by Plan */}
      {mrrByPlan.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-bold text-foreground mb-1">MRR by Plan</h3>
            <p className="text-xs text-muted-foreground mb-5">Monthly recurring revenue split across active plans</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={mrrByPlan} dataKey="mrr" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {mrrByPlan.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [`$${v}`, 'MRR']} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="font-bold text-foreground mb-1">Subscribers by Plan</h3>
            <p className="text-xs text-muted-foreground mb-5">Active Pro subscriber count per plan tier</p>
            <div className="space-y-3 mt-6">
              {mrrByPlan.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-sm font-medium text-foreground flex-1">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.count} user{p.count !== 1 ? 's' : ''}</span>
                  <span className="text-sm font-bold text-emerald-600 min-w-[60px] text-right">${p.mrr.toFixed(0)}/mo</span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Est. MRR</span>
              <span className="text-xl font-bold text-foreground">${trueMrr.toFixed(2)}</span>
            </div>
          </Card>
        </div>
      )}

      {/* Orders table */}
      <DataTable
        columns={columns}
        data={orders}
        rowKey={o => o.id}
        loading={loading}
        searchPlaceholder="Search by email or order ID..."
        exportFilename="orders"
        emptyIcon={ShoppingBag}
        emptyTitle="No orders found"
        emptyMessage="Orders appear here after successful payments."
      />
    </div>
  );
}
