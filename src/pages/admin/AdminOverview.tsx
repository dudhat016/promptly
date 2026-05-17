import { collection, onSnapshot, getDocs, query, orderBy, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowUpRight, BarChart3, Flame, LayoutGrid, Star, TrendingUp, Users, DollarSign, Activity, UserMinus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
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
  const [stats, setStats] = useState({
    totalUsers: 0, totalPrompts: 0, proUsers: 0,
    totalCopies: 0, totalViews: 0, newUsersWeek: 0,
    cancellingUsers: 0,
  });
  const [revenue, setRevenue] = useState({ mrr: 0, arr: 0, totalOrders: 0, arpu: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [topPrompts, setTopPrompts] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<{ label: string; signups: number }[]>([]);

  // Featured prompt
  const [featuredForm, setFeaturedForm] = useState({ promptSlug: '', promptTitle: '', description: '', hours: '24' });
  const [savingFeatured, setSavingFeatured] = useState(false);
  const [currentFeatured, setCurrentFeatured] = useState<any>(null);

  useEffect(() => {
    getDoc(doc(db, 'configs', 'featured_prompt')).then(snap => {
      if (snap.exists()) setCurrentFeatured(snap.data());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const noop = () => {};

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      let pro = 0, newWeek = 0, cancelling = 0;
      const users = snap.docs.map(d => {
        const data = d.data();
        if (data.subscriptionStatus === 'pro' || data.subscriptionStatus === 'enterprise') pro++;
        if (data.cancelAtPeriodEnd) cancelling++;
        try {
          const created = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          if (created > cutoff) newWeek++;
        } catch { /* skip */ }
        return { id: d.id, ...data };
      });

      setStats(prev => ({ ...prev, totalUsers: snap.size, proUsers: pro, newUsersWeek: newWeek, cancellingUsers: cancelling }));
      setGrowthData(buildLast7Days(users));
      setRecentUsers([...users].sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5));
      setLoading(false);
    }, noop);

    // Real revenue from orders
    getDocs(collection(db, 'orders')).then(snap => {
      let total = 0, count = 0;
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'paid' || data.status === 'completed') {
          total += Number(data.amount) || 0;
          count++;
        }
      });
      const arpu = count > 0 ? parseFloat((total / count).toFixed(2)) : 0;
      // Estimate MRR from active pro users × average order value
      // Use real data from orders if available, else estimate
      setRevenue(prev => ({ ...prev, totalRevenue: total, totalOrders: count, arpu }));
    }).catch(() => {});

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
    }, noop);

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

  const churnRate = stats.proUsers > 0
    ? ((stats.cancellingUsers / stats.proUsers) * 100).toFixed(1)
    : '0.0';
  const convRate = stats.totalUsers > 0
    ? ((stats.proUsers / stats.totalUsers) * 100).toFixed(1)
    : '0.0';

  const STATS: StatBoxProps[] = [
    { label: 'Total Users',     value: stats.totalUsers.toLocaleString(),  sub: `+${stats.newUsersWeek} this week`,  icon: Users,      accent: 'bg-primary/10 text-primary' },
    { label: 'Paid Subscribers', value: stats.proUsers,                    sub: `${convRate}% conversion`,           icon: Star,       accent: 'bg-amber-500/10 text-amber-600' },
    { label: 'Total Revenue',   value: `₹${revenue.totalRevenue.toLocaleString()}`, sub: `${revenue.totalOrders} orders`, icon: DollarSign, accent: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'Churn Risk',      value: stats.cancellingUsers,              sub: `${churnRate}% of paid`,              icon: UserMinus,  accent: stats.cancellingUsers > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-muted text-muted-foreground' },
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

      {/* ── Platform Health Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Conversion Rate', value: `${convRate}%`, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Churn Rate',      value: `${churnRate}%`, icon: UserMinus, color: stats.cancellingUsers > 0 ? 'text-rose-500' : 'text-muted-foreground', bg: stats.cancellingUsers > 0 ? 'bg-rose-500/10' : 'bg-muted' },
          { label: 'Total Copies',    value: stats.totalCopies.toLocaleString(), icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Avg Order Value', value: revenue.arpu > 0 ? `₹${revenue.arpu}` : '—', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map(m => (
          <div key={m.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.bg}`}>
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{m.value}</p>
              <p className="text-[11px] text-muted-foreground font-medium">{m.label}</p>
            </div>
          </div>
        ))}
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
                { label: 'Total Revenue',    value: `₹${revenue.totalRevenue.toLocaleString()}`, accent: 'text-emerald-600' },
                { label: 'Paid Subscribers', value: stats.proUsers,                               accent: 'text-primary' },
                { label: 'Avg Order Value',  value: revenue.arpu > 0 ? `₹${revenue.arpu}` : '—', accent: 'text-foreground' },
                { label: 'Churn Risk',       value: `${stats.cancellingUsers} cancelling`,        accent: stats.cancellingUsers > 0 ? 'text-rose-500' : 'text-muted-foreground' },
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
              const free = Math.max(0, stats.totalUsers - stats.proUsers);
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

      {/* ── Featured Prompt Setter ── */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Set Today's Featured Prompt</h3>
            <p className="text-xs text-muted-foreground">Pinned on every user's dashboard with a countdown timer.</p>
          </div>
        </div>
        {currentFeatured && (
          <div className="text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-amber-700 dark:text-amber-300 font-medium">
            Currently featured: <span className="font-bold">{currentFeatured.promptTitle}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Prompt Title</label>
            <input
              value={featuredForm.promptTitle}
              onChange={e => setFeaturedForm(p => ({ ...p, promptTitle: e.target.value }))}
              placeholder="e.g. The Perfect Cold Email"
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Prompt Slug</label>
            <input
              value={featuredForm.promptSlug}
              onChange={e => setFeaturedForm(p => ({ ...p, promptSlug: e.target.value }))}
              placeholder="e.g. the-perfect-cold-email"
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Tagline (optional)</label>
            <input
              value={featuredForm.description}
              onChange={e => setFeaturedForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Short description shown on the banner"
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Duration (hours)</label>
            <input
              type="number"
              value={featuredForm.hours}
              onChange={e => setFeaturedForm(p => ({ ...p, hours: e.target.value }))}
              min={1}
              max={168}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <Button
          size="sm"
          isLoading={savingFeatured}
          leftIcon={Flame}
          onClick={async () => {
            if (!featuredForm.promptTitle || !featuredForm.promptSlug) {
              toast.error('Title and slug are required');
              return;
            }
            setSavingFeatured(true);
            try {
              const hours = Math.max(1, parseInt(featuredForm.hours) || 24);
              await setDoc(doc(db, 'configs', 'featured_prompt'), {
                promptId: featuredForm.promptSlug,
                promptTitle: featuredForm.promptTitle,
                promptSlug: featuredForm.promptSlug,
                description: featuredForm.description,
                expiresAt: new Date(Date.now() + hours * 3600000).toISOString(),
                updatedAt: serverTimestamp(),
              });
              setCurrentFeatured({ promptTitle: featuredForm.promptTitle });
              toast.success('Featured prompt updated!');
            } catch {
              toast.error('Failed to update featured prompt');
            } finally {
              setSavingFeatured(false);
            }
          }}
        >
          Set as Featured
        </Button>
      </div>

    </div>
  );
}
