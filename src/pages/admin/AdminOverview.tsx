import { collection, onSnapshot } from 'firebase/firestore';
import { ArrowUpRight, BarChart3, Eye, LayoutGrid, Star, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { AdminPageHeader } from '../../components/admin';
import { usePath } from '../../hooks/usePath';
import Button from '../../components/primitives/Button';
import Badge from '../../components/primitives/Badge';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatBoxProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}

function StatBox({ label, value, sub, icon: Icon, accent = 'bg-primary/10 text-primary' }: StatBoxProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
        {sub && (
          <p className="text-xs font-medium text-emerald-600 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildLast7Days(users: any[]) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), day: d.toDateString(), signups: 0 };
  });
  users.forEach(u => {
    try {
      const created = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
      const bucket = days.find(b => b.day === created.toDateString());
      if (bucket) bucket.signups++;
    } catch { /* skip */ }
  });
  return days;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminOverview() {
  const { prefix } = usePath();
  const [stats, setStats] = useState({ totalUsers: 0, totalPrompts: 0, proUsers: 0, totalCopies: 0, totalViews: 0, estimatedRevenue: 0, newUsersWeek: 0 });
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [topPrompts, setTopPrompts] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<{ label: string; signups: number }[]>([]);

  useEffect(() => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      let pro = 0, newWeek = 0;
      const users = snap.docs.map(d => {
        const data = d.data();
        if (data.subscriptionStatus === 'pro') pro++;
        try {
          const created = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          if (created > cutoff) newWeek++;
        } catch { /* skip */ }
        return { id: d.id, ...data };
      });

      setStats(prev => ({ ...prev, totalUsers: snap.size, proUsers: pro, newUsersWeek: newWeek, estimatedRevenue: pro * 15 }));
      setGrowthData(buildLast7Days(users));
      setRecentUsers([...users].sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5));
      setLoading(false);
    });

    const unsubPrompts = onSnapshot(collection(db, 'prompts'), (snap) => {
      let copies = 0, views = 0;
      const prompts = snap.docs.map(d => {
        const data = d.data();
        copies += data.copiesCount || 0;
        views  += data.viewsCount  || 0;
        return { id: d.id, ...data };
      });
      setStats(prev => ({ ...prev, totalPrompts: snap.size, totalCopies: copies, totalViews: views }));
      setTopPrompts([...prompts].sort((a: any, b: any) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 6));
    });

    return () => { unsubUsers(); unsubPrompts(); };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const STATS: StatBoxProps[] = [
    { label: 'Total Users',     value: stats.totalUsers,           sub: `+${stats.newUsersWeek} this week`,  icon: Users,     accent: 'bg-primary/10 text-primary' },
    { label: 'Pro Subscribers', value: stats.proUsers,             sub: `$${stats.estimatedRevenue} MRR`,    icon: Star,      accent: 'bg-amber-500/10 text-amber-600' },
    { label: 'Total Prompts',   value: stats.totalPrompts,                                                    icon: LayoutGrid, accent: 'bg-purple-500/10 text-purple-600' },
    { label: 'Platform Views',  value: stats.totalViews.toLocaleString(), sub: `${stats.totalCopies} copies`, icon: BarChart3, accent: 'bg-emerald-500/10 text-emerald-600' },
  ];

  const topPromptsChart = topPrompts.map(p => ({
    name: p.title?.length > 16 ? p.title.slice(0, 16) + '…' : p.title,
    views: p.viewsCount || 0,
    copies: p.copiesCount || 0,
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Overview"
        labelIcon={BarChart3}
        title="Dashboard"
        subtitle="Platform overview and key metrics."
      />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(stat => <StatBox key={stat.label} {...stat} />)}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* User Growth */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-foreground">User Growth</h3>
              <p className="text-xs text-muted-foreground mt-0.5">New signups — last 7 days</p>
            </div>
            <Badge variant="success" size="sm" dot pulse>
              +{stats.newUsersWeek} this week
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={growthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="signups"
                name="Signups"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#signupGrad)"
                dot={{ fill: 'var(--color-primary)', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Prompts Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-foreground">Top Prompts</h3>
              <p className="text-xs text-muted-foreground mt-0.5">By views and copies</p>
            </div>
            <Button
              as={Link}
              to={prefix("/admin/prompts")}
              variant="ghost"
              size="sm"
              rightIcon={ArrowUpRight}
              className="text-primary hover:underline font-bold"
            >
              Manage
            </Button>
          </div>
          {topPromptsChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topPromptsChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={10} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="views"  name="Views"  fill="var(--color-primary)"  radius={[3,3,0,0]} fillOpacity={0.85} />
                <Bar dataKey="copies" name="Copies" fill="var(--color-primary)"  radius={[3,3,0,0]} fillOpacity={0.35} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
              No prompt data yet.
            </div>
          )}
        </div>
      </div>

      {/* ── Revenue + Plan Distribution + Recent Users ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Revenue + Plan Distribution */}
        <div className="flex flex-col gap-6">

          {/* Revenue snapshot */}
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Revenue</h3>
              <Button
                as={Link}
                to={prefix("/admin/revenue")}
                variant="ghost"
                size="sm"
                rightIcon={ArrowUpRight}
                className="text-primary hover:underline font-bold"
              >
                Details
              </Button>
            </div>
            <div className="space-y-1">
              {[
                { label: 'Estimated MRR',   value: `$${stats.estimatedRevenue.toFixed(2)}`, accent: 'text-emerald-600' },
                { label: 'Pro Subscribers', value: stats.proUsers,                          accent: 'text-primary' },
                { label: 'ARPU',            value: '$15.00',                                accent: 'text-foreground' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground font-medium">{row.label}</span>
                  <span className={`text-sm font-bold ${row.accent}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan Distribution donut */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-bold text-foreground mb-4">Plan Distribution</h3>
            {stats.totalUsers > 0 ? (() => {
              const free = stats.totalUsers - stats.proUsers;
              const pieData = [
                { name: 'Free',  value: free,          color: 'var(--color-muted-foreground)' },
                { name: 'Pro',   value: stats.proUsers, color: 'var(--color-primary)' },
              ].filter(d => d.value > 0);
              return (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={100} height={100}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={44}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {pieData.map(d => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-xs text-muted-foreground font-medium">{d.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-foreground">{d.value}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({Math.round((d.value / stats.totalUsers) * 100)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })() : (
              <div className="h-[100px] flex items-center justify-center text-sm text-muted-foreground">
                No users yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Signups */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-bold text-foreground">Recent Signups</h3>
            <Button
              as={Link}
              to={prefix("/admin/users")}
              variant="ghost"
              size="sm"
              rightIcon={ArrowUpRight}
              className="text-primary hover:underline font-bold"
            >
              View all
            </Button>
          </div>
          <div className="divide-y divide-border">
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase shrink-0">
                      {u.displayName?.charAt(0) || u.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{u.displayName || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>
                <Badge
                  variant={u.subscriptionStatus === 'pro' ? 'soft' : 'outline'}
                  size="sm"
                  className="shrink-0"
                >
                  {u.subscriptionStatus === 'pro' ? 'Pro' : 'Free'}
                </Badge>
              </div>
            ))}
            {recentUsers.length === 0 && (
              <p className="px-5 py-8 text-sm text-muted-foreground">No users yet.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
