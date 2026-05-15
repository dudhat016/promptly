import { collection, documentId, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import {
  BarChart3, Coins, Database, TrendingDown, TrendingUp, Wand2, Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import Progress from '../../components/feedback/Progress';
import Skeleton from '../../components/feedback/Skeleton';
import Button from '../../components/primitives/Button';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';

type Period = '7d' | '30d' | 'all';

interface Transaction {
  id: string;
  type: 'unlock' | 'topup' | 'reward' | 'admin_grant' | 'admin_deduct';
  amount: number;
  promptTitle?: string;
  reason?: string;
  balanceAfter?: number;
  createdAt: any;
}

interface CategoryItem { name: string; value: number; color: string; }

const CAT_COLORS = ['var(--color-primary)', '#3b82f6', '#a855f7', '#f97316', '#10b981', '#64748b'];
const PERIOD_LABELS: Record<Period, string> = { '7d': '7 Days', '30d': '30 Days', 'all': 'All Time' };

function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (typeof ts.toDate === 'function') return ts.toDate();
  return new Date(ts);
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function periodCutoff(period: Period): Date {
  if (period === 'all') return new Date(0);
  const d = new Date();
  d.setDate(d.getDate() - (period === '7d' ? 7 : 30));
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildDailyData(transactions: Transaction[], period: Period) {
  const unlocks = transactions.filter(t => t.type === 'unlock');

  if (period === 'all') {
    const map: Record<string, { day: string; credits: number; unlocks: number; order: number }> = {};
    unlocks.forEach(tx => {
      const d = toDate(tx.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map[key]) {
        map[key] = {
          day: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          credits: 0, unlocks: 0,
          order: d.getFullYear() * 12 + d.getMonth()
        };
      }
      map[key].credits += tx.amount;
      map[key].unlocks += 1;
    });
    return Object.values(map).sort((a, b) => a.order - b.order);
  }

  const days = period === '7d' ? 7 : 30;
  const now = new Date();
  const entries: { key: string; day: string; credits: number; unlocks: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    entries.push({
      key: localDateKey(d),
      day: period === '7d'
        ? d.toLocaleDateString('en-US', { weekday: 'short' })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      credits: 0,
      unlocks: 0,
    });
  }

  const keyMap: Record<string, number> = {};
  entries.forEach((e, i) => { keyMap[e.key] = i; });

  const cutoff = periodCutoff(period);
  unlocks.forEach(tx => {
    const d = toDate(tx.createdAt);
    if (d < cutoff) return;
    const k = localDateKey(d);
    if (keyMap[k] !== undefined) {
      entries[keyMap[k]].credits += tx.amount;
      entries[keyMap[k]].unlocks += 1;
    }
  });

  return entries.map(({ key: _k, ...rest }) => rest);
}

function computeStats(transactions: Transaction[], period: Period) {
  const cutoff = periodCutoff(period);

  let prevCutoff = new Date(0);
  if (period !== 'all') {
    prevCutoff = new Date(cutoff);
    prevCutoff.setDate(prevCutoff.getDate() - (period === '7d' ? 7 : 30));
  }

  const unlocks = transactions.filter(t => t.type === 'unlock');
  const current = unlocks.filter(t => toDate(t.createdAt) >= cutoff);
  const previous = period !== 'all'
    ? unlocks.filter(t => { const d = toDate(t.createdAt); return d >= prevCutoff && d < cutoff; })
    : [];

  const creditsUsed = current.reduce((s, t) => s + t.amount, 0);
  const promptsUnlocked = current.length;
  const prevCredits = previous.reduce((s, t) => s + t.amount, 0);
  const prevPrompts = previous.length;

  const trend = (curr: number, prev: number) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;

  return {
    creditsUsed,
    promptsUnlocked,
    creditsTrend: trend(creditsUsed, prevCredits),
    promptsTrend: trend(promptsUnlocked, prevPrompts),
  };
}

function monthlyUsed(transactions: Transaction[]): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return transactions
    .filter(t => t.type === 'unlock' && toDate(t.createdAt) >= startOfMonth)
    .reduce((s, t) => s + t.amount, 0);
}

export default function UsagePage() {
  const { user, profile, isPro } = useAuth();
  const { prefix } = usePath();
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryItem[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  async function fetchData() {
    try {
      const q = query(
        collection(db, 'credits_history'),
        where('userId', '==', user!.uid),
        orderBy('createdAt', 'desc'),
        limit(500)
      );
      const snap = await getDocs(q);
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      setTransactions(txs);

      // Build category distribution from unlocked prompts
      const unlockedIds = profile?.unlockedPrompts || [];
      if (unlockedIds.length > 0) {
        const catCounts: Record<string, number> = {};
        const limited = unlockedIds.slice(0, 90);

        for (let i = 0; i < limited.length; i += 30) {
          const chunk = limited.slice(i, i + 30);
          const pq = query(collection(db, 'prompts'), where(documentId(), 'in', chunk));
          const psnap = await getDocs(pq);
          psnap.docs.forEach(d => {
            const catId = d.data().categoryId;
            if (catId) catCounts[catId] = (catCounts[catId] || 0) + 1;
          });
        }

        if (Object.keys(catCounts).length) {
          const catIds = Object.keys(catCounts);
          const catNameMap: Record<string, string> = {};
          for (let i = 0; i < catIds.length; i += 30) {
            const chunk = catIds.slice(i, i + 30);
            const cq = query(collection(db, 'categories'), where(documentId(), 'in', chunk));
            const csnap = await getDocs(cq);
            csnap.docs.forEach(d => { catNameMap[d.id] = d.data().name || d.id; });
          }

          const total = Object.values(catCounts).reduce((a, b) => a + b, 0);
          setCategoryData(
            Object.entries(catCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([id, count], i) => ({
                name: catNameMap[id] || id,
                value: Math.round((count / total) * 100),
                color: CAT_COLORS[i % CAT_COLORS.length],
              }))
          );
        }
      }
    } catch (err) {
      console.error('Failed to fetch usage data:', err);
    } finally {
      setLoading(false);
    }
  }

  const usageData = useMemo(() => buildDailyData(transactions, period), [transactions, period]);
  const stats = useMemo(() => computeStats(transactions, period), [transactions, period]);
  const usedThisMonth = useMemo(() => monthlyUsed(transactions), [transactions]);
  const monthlyLimit = profile?.monthlyLimit || 50;
  const usagePercent = isPro ? 0 : Math.min(100, Math.round((usedThisMonth / monthlyLimit) * 100));
  const recentActivity = transactions.slice(0, 5);
  const vaultCount = profile?.unlockedPrompts?.length || 0;
  const hasActivity = usageData.some(d => d.credits > 0);

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-56" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs">
            <BarChart3 className="w-4 h-4" />
            Performance Metrics
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Usage Analytics</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Detailed breakdown of your AI interactions, credit consumption, and productivity trends.
          </p>
        </div>
        <div className="flex bg-muted p-1 rounded-xl border border-border">
          {(['7d', '30d', 'all'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox
          label="Credits Used"
          value={stats.creditsUsed}
          sub={`Last ${PERIOD_LABELS[period].toLowerCase()}`}
          icon={Zap}
          trend={period !== 'all' ? `${stats.creditsTrend > 0 ? '+' : ''}${stats.creditsTrend}% vs prev` : undefined}
          trendUp={stats.creditsTrend >= 0}
        />
        <StatBox
          label="Prompts Unlocked"
          value={stats.promptsUnlocked}
          sub={`Last ${PERIOD_LABELS[period].toLowerCase()}`}
          icon={Wand2}
          trend={period !== 'all' ? `${stats.promptsTrend > 0 ? '+' : ''}${stats.promptsTrend}% vs prev` : undefined}
          trendUp={stats.promptsTrend >= 0}
        />
        <StatBox
          label="Vault Storage"
          value={vaultCount}
          sub={isPro ? 'Unlimited' : 'Prompts saved'}
          icon={Database}
        />
        <StatBox
          label="All-Time Used"
          value={profile?.totalUsedCredits ?? 0}
          sub="Total credits spent"
          icon={Coins}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Usage Area Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-foreground">Credit Consumption</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Credits spent per {period === 'all' ? 'month' : 'day'}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Credits</span>
              </div>
            </div>
          </div>

          {!hasActivity ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <p className="text-sm font-bold text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Start unlocking prompts to see your usage here
              </p>
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                    interval={period === '30d' ? 4 : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="credits"
                    stroke="var(--color-primary)"
                    strokeWidth={3}
                    fill="url(#usageGrad)"
                    dot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category Pie Chart */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-1">Focus Areas</h3>
          <p className="text-xs text-muted-foreground mb-8">Distribution of unlocked prompt categories</p>

          {categoryData.length === 0 ? (
            <div className="h-[180px] flex flex-col items-center justify-center text-center">
              <Database className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <p className="text-xs font-bold text-muted-foreground">No unlocked prompts yet</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Unlock prompts to see category breakdown</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="h-[180px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={categoryData[i].color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-foreground">{categoryData[0]?.value ?? 0}%</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[80px] text-center">
                    {categoryData[0]?.name || 'Top'}
                  </span>
                </div>
              </div>

              <div className="w-full space-y-3 mt-8">
                {categoryData.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-foreground shrink-0 ml-2">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Recent Activity</h3>
            <Button as={Link} to={prefix('/dashboard/credits')} variant="ghost" size="sm" className="text-primary font-bold">
              View History
            </Button>
          </div>
          {recentActivity.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-muted-foreground">No activity yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Unlock a prompt to get started!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.map(tx => <ActivityRow key={tx.id} tx={tx} />)}
            </div>
          )}
        </div>

        {/* Plan Health */}
        <div className="bg-foreground text-background rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none rotate-12">
            <Zap className="w-64 h-64 text-primary fill-primary" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest mb-6">
              <TrendingUp className="w-3 h-3" />
              {isPro ? 'Pro Plan Active' : 'Plan Health'}
            </div>

            {isPro ? (
              <>
                <h3 className="text-3xl font-bold tracking-tight mb-4">Unlimited Access</h3>
                <p className="text-background/60 text-sm leading-relaxed font-medium max-w-sm">
                  You're on the Pro plan with unlimited credits. Keep creating and unlocking prompts without limits.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-3xl font-bold tracking-tight mb-4">
                  {usagePercent >= 80
                    ? "You're hitting your limits!"
                    : usagePercent >= 50
                    ? 'Halfway through this month'
                    : 'Track your usage'}
                </h3>
                <p className="text-background/60 text-sm leading-relaxed mb-8 font-medium max-w-sm">
                  {usagePercent >= 80
                    ? 'Your credit usage is high this month. Upgrade to Pro for unlimited access and advanced features.'
                    : `You've used ${usedThisMonth} of ${monthlyLimit} credits this month. Upgrade to never run out.`}
                </p>
              </>
            )}
          </div>

          <div className="relative z-10 space-y-4">
            {!isPro && (
              <div className="bg-background/10 border border-background/20 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">Monthly Credits</span>
                  <span className="text-xs font-bold text-primary">{usagePercent}% Used</span>
                </div>
                <Progress value={usagePercent} size="sm" variant="default" className="bg-background/10" />
                <p className="text-[10px] text-background/40 mt-2">
                  {usedThisMonth} / {monthlyLimit} credits used this month
                </p>
              </div>
            )}
            {!isPro && (
              <Button
                as={Link}
                to={prefix('/pricing')}
                variant="primary"
                size="lg"
                fullWidth
                className="h-14 font-black tracking-widest uppercase"
              >
                Upgrade Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const TX_ICONS: Record<string, React.ElementType> = {
  unlock: Zap, topup: Coins, reward: TrendingUp, admin_grant: Database, admin_deduct: Database,
};
const TX_SIGN: Record<string, '+' | '-'> = {
  unlock: '-', topup: '+', reward: '+', admin_grant: '+', admin_deduct: '-',
};
const TX_LABEL: Record<string, (tx: Transaction) => string> = {
  unlock: tx => `Unlocked: ${tx.promptTitle || 'Prompt'}`,
  topup: () => 'Credit Top-up',
  reward: () => 'Reward Credits',
  admin_grant: tx => `Admin Grant${tx.reason ? `: ${tx.reason}` : ''}`,
  admin_deduct: tx => `Admin Deduct${tx.reason ? `: ${tx.reason}` : ''}`,
};

function ActivityRow({ tx }: { tx: Transaction }) {
  const Icon = TX_ICONS[tx.type] ?? Zap;
  const sign = TX_SIGN[tx.type] ?? '+';
  const label = (TX_LABEL[tx.type] ?? TX_LABEL.topup)(tx);
  const date = toDate(tx.createdAt);
  const dateStr = date.getTime() === 0
    ? 'Recent'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="p-4 flex items-center gap-4 hover:bg-muted/20 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{dateStr}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn(
          'text-[11px] font-bold',
          sign === '-' ? 'text-rose-500' : 'text-emerald-500'
        )}>
          {sign}{tx.amount} cr
        </p>
        {tx.balanceAfter !== undefined && (
          <p className="text-[10px] text-muted-foreground">Bal: {tx.balanceAfter}</p>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, icon: Icon, trend, trendUp }: {
  label: string; value: number | string; sub: string; icon: React.ElementType;
  trend?: string; trendUp?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-6 shadow-sm group hover:border-primary/30 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-primary/5 border border-border flex items-center justify-center transition-colors">
          <Icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg',
            trendUp ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
          )}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <div>
        <h4 className="text-3xl font-black text-foreground mb-1 tracking-tight">{value}</h4>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</span>
          <span className="text-[10px] font-medium text-muted-foreground/40 mt-0.5">{sub}</span>
        </div>
      </div>
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border p-3 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-xs font-bold text-foreground">
            {entry.value} {entry.name === 'credits' ? 'Credits' : 'Unlocks'}
          </span>
        </div>
      ))}
    </div>
  );
}
