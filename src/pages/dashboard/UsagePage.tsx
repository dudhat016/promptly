import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import {
  BarChart3,
  Database,
  History,
  TrendingDown,
  TrendingUp,
  Wand2,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis
} from 'recharts';
import Progress from '../../components/feedback/Progress';
import Button from '../../components/primitives/Button';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/useConfig';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';

export default function UsagePage() {
  const { user, profile, isPro } = useAuth();
  const { config } = useConfig();
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchUsageData();
  }, [user]);

  async function fetchUsageData() {
    try {
      // Mock data for charts since we don't have a daily usage collection yet
      // In a real app, you'd fetch this from a 'usage' or 'logs' collection
      const mockUsage = [
        { day: 'Mon', usage: 12, tokens: 450 },
        { day: 'Tue', usage: 18, tokens: 620 },
        { day: 'Wed', usage: 15, tokens: 510 },
        { day: 'Thu', usage: 25, tokens: 890 },
        { day: 'Fri', usage: 22, tokens: 740 },
        { day: 'Sat', usage: 30, tokens: 1200 },
        { day: 'Sun', usage: 28, tokens: 1050 },
      ];
      setUsageData(mockUsage);

      // Category distribution
      const catData = [
        { name: 'Marketing', value: 40, color: 'var(--color-primary)' },
        { name: 'Coding', value: 30, color: '#3b82f6' },
        { name: 'Creative', value: 20, color: '#a855f7' },
        { name: 'Other', value: 10, color: '#64748b' },
      ];
      setCategoryData(catData);

      // Recent Activity
      const q = query(
        collection(db, 'prompts'),
        where('creatorId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snap = await getDocs(q);
      setRecentActivity(snap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Failed to fetch usage data:", err);
    } finally {
      setLoading(false);
    }
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
          {['7 Days', '30 Days', 'All Time'].map(p => (
            <button key={p} className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
              p === '7 Days' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox
          label="Credits Used"
          value={profile?.credits || 0}
          sub="of 2,500 monthly"
          icon={Zap}
          trend="+12% vs last week"
          trendUp
        />
        <StatBox
          label="Prompts Built"
          value={usageData.reduce((acc, curr) => acc + curr.usage, 0)}
          sub="Last 7 days"
          icon={Wand2}
          trend="+8% vs last week"
          trendUp
        />
        <StatBox
          label="Vault Storage"
          value={isPro ? '∞' : (profile?.unlockedPrompts || []).length}
          sub={`${isPro ? 'Unlimited' : '10 slots'} total`}
          icon={Database}
        />
        <StatBox
          label="Avg. Prompt Score"
          value="4.8"
          sub="Quality rating"
          icon={History}
          trend="-2% vs last week"
          trendUp={false}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Usage Area Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-foreground">Token Consumption</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Computational power used across all models</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Tokens</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary/30" />
                <span className="text-muted-foreground">Credits</span>
              </div>
            </div>
          </div>

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
                />
                <YAxis
                  tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  fill="url(#usageGrad)"
                  dot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Pie */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-1">Focus Areas</h3>
          <p className="text-xs text-muted-foreground mb-8">Distribution of prompt categories</p>

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
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-foreground">78%</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Growth</span>
              </div>
            </div>

            <div className="w-full space-y-3 mt-8">
              {categoryData.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Activity Logs */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Recent Activity</h3>
            <Button variant="ghost" size="sm" className="text-primary font-bold">View History</Button>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.map(act => (
              <div key={act.id} className="p-4 flex items-center gap-4 hover:bg-muted/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{act.title}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Built with {act.model}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-bold text-foreground">-{act.tokens || 150} pts</p>
                  <p className="text-[10px] text-muted-foreground">{act.createdAt ? new Date(act.createdAt).toLocaleDateString() : 'Today'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Health / Recommendations */}
        <div className="bg-foreground text-background rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none rotate-12">
            <Zap className="w-64 h-64 text-primary fill-primary" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest mb-6">
              <TrendingUp className="w-3 h-3" />
              Optimization Tip
            </div>
            <h3 className="text-3xl font-bold tracking-tight mb-4">You're hitting your limits!</h3>
            <p className="text-background/60 text-sm leading-relaxed mb-8 font-medium max-w-sm">
              Your usage has increased by 40% this week. Switch to the Pro Plan to unlock unlimited credits and priority model access.
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="bg-background/10 border border-background/20 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Monthly Credits</span>
                <span className="text-xs font-bold text-primary">82% Used</span>
              </div>
              <Progress value={82} size="sm" variant="default" className="bg-background/10" />
            </div>
            <Button variant="primary" size="lg" fullWidth className="h-14 font-black tracking-widest uppercase">Upgrade Now</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, sub, icon: Icon, trend, trendUp }: any) {
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
            "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg",
            trendUp ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
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
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card border border-border p-3 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-xs font-bold text-foreground">
            {entry.value.toLocaleString()} {entry.name === 'tokens' ? 'Tokens' : 'Points'}
          </span>
        </div>
      ))}
    </div>
  );
}
