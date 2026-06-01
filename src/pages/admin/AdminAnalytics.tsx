import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import {
  Activity, BarChart3, Eye, Globe, MousePointerClick,
  TrendingDown,
  TrendingUp,
  Users, Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis
} from 'recharts';
import { AdminPageHeader } from '../../components/admin';
import Badge from '../../components/primitives/Badge';
import Card from '../../components/primitives/Card';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function last30Days() {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  return days;
}

function seededRand(seed: number, min: number, max: number) {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

interface StatBoxProps {
  label: string;
  value: string | number;
  trend?: number;
  icon: React.ElementType;
  accent?: string;
}

function StatBox({ label, value, trend, icon: Icon, accent = 'bg-primary/10 text-primary' }: StatBoxProps) {
  const up = trend !== undefined && trend >= 0;
  return (
    <Card padding="sm" className="flex-row items-start gap-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
        {trend !== undefined && (
          <p className={cn('text-xs font-medium flex items-center gap-1 mt-1', up ? 'text-emerald-600' : 'text-rose-500')}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}% vs last month
          </p>
        )}
      </div>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const DAYS = last30Days();

const PAGE_VIEW_DATA = DAYS.map((d, i) => ({
  date: d,
  views: seededRand(i + 1, 800, 3200),
  unique: seededRand(i + 100, 400, 1800),
}));

const TOP_PAGES = [
  { path: '/', label: 'Landing Page',        views: 12480, pct: 100 },
  { path: '/explore', label: 'Explore',      views: 8320,  pct: 67  },
  { path: '/pricing', label: 'Pricing',      views: 5640,  pct: 45  },
  { path: '/blog',    label: 'Blog',          views: 3890,  pct: 31  },
  { path: '/login',   label: 'Login',         views: 2970,  pct: 24  },
  { path: '/register',label: 'Register',     views: 1820,  pct: 15  },
  { path: '/faq',     label: 'FAQ',           views: 1240,  pct: 10  },
  { path: '/contact', label: 'Contact',       views: 960,   pct: 8   },
];

const GEO_DATA = [
  { country: 'United States',  code: 'US', sessions: 5840, pct: 38 },
  { country: 'India',          code: 'IN', sessions: 3210, pct: 21 },
  { country: 'United Kingdom', code: 'GB', sessions: 1890, pct: 12 },
  { country: 'Germany',        code: 'DE', sessions: 1120, pct: 7  },
  { country: 'Canada',         code: 'CA', sessions: 890,  pct: 6  },
  { country: 'Australia',      code: 'AU', sessions: 760,  pct: 5  },
  { country: 'Other',          code: '--', sessions: 1580, pct: 11 },
];

const DEVICE_DATA = [
  { name: 'Desktop', value: 54, color: 'hsl(var(--primary))' },
  { name: 'Mobile',  value: 38, color: 'hsl(var(--primary) / 0.5)' },
  { name: 'Tablet',  value: 8,  color: 'hsl(var(--primary) / 0.25)' },
];

const REFERRAL_DATA = [
  { source: 'Organic Search', sessions: 5820, icon: '🔍' },
  { source: 'Direct',         sessions: 3480, icon: '🔗' },
  { source: 'Social Media',   sessions: 2140, icon: '📱' },
  { source: 'Referral',       sessions: 1960, icon: '🌐' },
  { source: 'Email',          sessions: 840,  icon: '📧' },
  { source: 'Paid Ads',       sessions: 320,  icon: '💰' },
];

const FUNNEL_DATA = [
  { name: 'Visitors',   value: 15290 },
  { name: 'Signups',    value: 4840  },
  { name: 'Activated',  value: 2210  },
  { name: 'Pro Users',  value: 610   },
];

export default function AdminAnalytics() {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [newUsersThisMonth, setNewUsersThisMonth] = useState<number | null>(null);

  useEffect(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(query(
        collection(db, 'users'),
        where('createdAt', '>=', Timestamp.fromDate(startOfMonth)),
        orderBy('createdAt', 'desc'),
      )),
    ]).then(([all, monthly]) => {
      setUserCount(all.size);
      setNewUsersThisMonth(monthly.size);
    }).catch(() => {});
  }, []);

  const totalViews = PAGE_VIEW_DATA.reduce((a, d) => a + d.views, 0);
  const totalUnique = PAGE_VIEW_DATA.reduce((a, d) => a + d.unique, 0);

  return (
    <div>
      <AdminPageHeader
        label="Analytics"
        labelIcon={BarChart3}
        title="Site Analytics"
        subtitle="Page views, user geography, acquisition channels and conversion funnel."
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Total Page Views" value={totalViews.toLocaleString()} trend={14} icon={Eye} accent="bg-blue-500/10 text-blue-600" />
        <StatBox label="Unique Visitors" value={totalUnique.toLocaleString()} trend={9} icon={Users} accent="bg-primary/10 text-primary" />
        <StatBox label="Registered Users" value={userCount ?? '—'} trend={newUsersThisMonth !== null ? Math.round((newUsersThisMonth / (userCount || 1)) * 100) : undefined} icon={Activity} accent="bg-emerald-500/10 text-emerald-600" />
        <StatBox label="Avg. Session" value="3m 24s" trend={5} icon={Zap} accent="bg-amber-500/10 text-amber-600" />
      </div>

      {/* Page views chart */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-foreground">Page Views — Last 30 Days</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Total views vs. unique visitors</p>
          </div>
          <Badge variant="soft" size="sm">Live</Badge>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={PAGE_VIEW_DATA} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="uniqueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: 700 }} tickLine={false} axisLine={false} interval={6} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 700 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="views"  name="Page Views"      stroke="hsl(var(--primary))"      strokeWidth={2} fill="url(#viewsGrad)"  />
            <Area type="monotone" dataKey="unique" name="Unique Visitors"  stroke="hsl(var(--primary)/0.5)" strokeWidth={2} fill="url(#uniqueGrad)" strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Two-col: Top pages + Devices */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top pages */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <MousePointerClick className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-foreground">Top Pages</h3>
          </div>
          <div className="space-y-3">
            {TOP_PAGES.map(p => (
              <div key={p.path} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground/60 w-24 shrink-0 truncate">{p.path}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.pct}%` }} />
                </div>
                <span className="text-xs font-bold text-foreground tabular-nums w-14 text-right shrink-0">
                  {p.views.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Devices */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-foreground">Devices</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={DEVICE_DATA} cx="50%" cy="50%" innerRadius={48} outerRadius={70} dataKey="value" strokeWidth={0}>
                {DEVICE_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {DEVICE_DATA.map(d => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-muted-foreground text-xs font-medium">{d.name}</span>
                </div>
                <span className="font-bold text-foreground text-xs">{d.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Two-col: Geography + Acquisition */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Geography */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-foreground">Top Countries</h3>
          </div>
          <div className="space-y-3">
            {GEO_DATA.map(g => (
              <div key={g.code} className="flex items-center gap-3">
                <span className="text-base w-6 shrink-0">{g.code !== '--' ? '🌍' : '🌐'}</span>
                <span className="text-xs font-medium text-muted-foreground flex-1 truncate">{g.country}</span>
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${g.pct}%` }} />
                </div>
                <span className="text-xs font-bold text-foreground tabular-nums w-10 text-right shrink-0">
                  {g.pct}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Acquisition */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-foreground">Acquisition Channels</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={REFERRAL_DATA} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
              <YAxis type="category" dataKey="source" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 700 }} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="sessions" name="Sessions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Conversion funnel */}
      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground">Conversion Funnel</h3>
          <span className="ml-auto text-xs text-muted-foreground">Last 30 days</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {FUNNEL_DATA.map((step, i) => {
            const convRate = i === 0 ? 100 : Math.round((step.value / FUNNEL_DATA[0].value) * 100);
            const stepRate = i === 0 ? 100 : Math.round((step.value / FUNNEL_DATA[i - 1].value) * 100);
            return (
              <div key={step.name} className="relative">
                {i > 0 && (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-muted-foreground/30 text-lg font-bold hidden sm:block">→</div>
                )}
                <div className={cn(
                  'rounded-xl p-4 text-center border-2 transition-colors',
                  i === FUNNEL_DATA.length - 1
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/20'
                )}>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">{step.name}</p>
                  <p className="text-2xl font-black text-foreground">{step.value.toLocaleString()}</p>
                  <p className={cn('text-xs font-bold mt-1', i === 0 ? 'text-muted-foreground' : stepRate >= 50 ? 'text-emerald-600' : 'text-amber-600')}>
                    {i === 0 ? '100% baseline' : `${stepRate}% from prev`}
                  </p>
                  {i > 0 && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{convRate}% overall</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Note */}
      <p className="text-center text-xs text-muted-foreground/50 pb-4">
        Chart data is illustrative. Connect a real analytics provider (GA4, Plausible, or custom events) for live tracking.
      </p>
    </div>
  );
}
