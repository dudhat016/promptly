import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { AlertCircle, BarChart3, CheckCircle2, Link2, Mail, MousePointer2, RefreshCw, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from '../../components/admin';
import Badge from '../../components/primitives/Badge';
import Button from '../../components/primitives/Button';
import { db } from '../../lib/firebase';

interface LogRow {
  id: string;
  recipientEmail: string;
  type: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  opens: number;
  clicks: number;
  openedAt?: string | null;
  clickedAt?: string | null;
  sentAt: any;
  error?: string;
}

const GROUP_MAP: Record<string, string> = {
  welcome: 'onboarding', onboarding_complete: 'onboarding', onboarding_d1_nudge: 'onboarding',
  onboarding_d3_prompt: 'onboarding', onboarding_d7_expiry: 'onboarding',
  login_alert: 'auth', password_reset: 'auth',
  purchase_confirmation: 'billing', subscription_renewed: 'billing', trial_started: 'billing',
  subscription_ended: 'billing',
  dunning_attempt_1: 'dunning', dunning_attempt_2: 'dunning', dunning_attempt_3: 'dunning',
  dunning_recovered: 'dunning',
  low_credits: 'nudge', trial_expiry: 'nudge', renewal_reminder: 'nudge',
  affiliate_join: 'affiliate', affiliate_commission_unlocked: 'affiliate',
  affiliate_withdrawal_approved: 'affiliate', affiliate_withdrawal_rejected: 'affiliate',
  newsletter_confirm: 'newsletter', newsletter_welcome: 'newsletter', new_prompt: 'newsletter',
};

const GROUP_COLORS: Record<string, string> = {
  onboarding: 'bg-emerald-500/10 text-emerald-700',
  auth:       'bg-slate-500/10 text-slate-600',
  billing:    'bg-blue-500/10 text-blue-700',
  dunning:    'bg-destructive/10 text-destructive',
  nudge:      'bg-amber-500/10 text-amber-700',
  affiliate:  'bg-violet-500/10 text-violet-700',
  newsletter: 'bg-primary/10 text-primary',
};

function fmtDate(ts: any): string {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return d.toLocaleString();
  } catch { return '—'; }
}

export default function AdminEmailAnalytics() {
  const [logs, setLogs]       = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'email_logs'), orderBy('sentAt', 'desc'), limit(500)));
      setLogs(snap.docs.map(d => ({ id: d.id, opens: 0, clicks: 0, ...d.data() } as LogRow)));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const sent    = logs.filter(l => l.status === 'sent').length;
  const failed  = logs.filter(l => l.status === 'failed').length;
  const opened  = logs.filter(l => (l.opens || 0) > 0).length;
  const clicked = logs.filter(l => (l.clicks || 0) > 0).length;
  const openRate  = sent > 0 ? Math.round((opened / sent) * 100) : 0;
  const clickRate = sent > 0 ? Math.round((clicked / sent) * 100) : 0;
  const failRate  = logs.length > 0 ? Math.round((failed / logs.length) * 100) : 0;

  // Per-group breakdown
  const byGroup = logs.reduce<Record<string, { sent: number; opens: number; clicks: number; failed: number }>>((acc, l) => {
    const g = GROUP_MAP[l.type] || 'other';
    if (!acc[g]) acc[g] = { sent: 0, opens: 0, clicks: 0, failed: 0 };
    if (l.status === 'sent')   { acc[g].sent++;   if ((l.opens || 0) > 0) acc[g].opens++; if ((l.clicks || 0) > 0) acc[g].clicks++; }
    if (l.status === 'failed') acc[g].failed++;
    return acc;
  }, {});

  const recentFailed = logs.filter(l => l.status === 'failed').slice(0, 10);

  const stats = [
    { label: 'Total Sent',  value: sent,      icon: Mail,          accent: 'bg-primary/10 text-primary' },
    { label: 'Open Rate',   value: `${openRate}%`,  icon: TrendingUp,    accent: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'Click Rate',  value: `${clickRate}%`, icon: MousePointer2, accent: 'bg-blue-500/10 text-blue-700' },
    { label: 'Fail Rate',   value: `${failRate}%`,  icon: AlertCircle,   accent: 'bg-destructive/10 text-destructive' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Emails"
        labelIcon={BarChart3}
        title="Email Analytics"
        subtitle={`Delivery, open, and click metrics across the last ${logs.length} emails.`}
        actions={
          <Button onClick={load} isLoading={loading} variant="ghost" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.accent}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <p className="text-lg font-black text-foreground leading-none">{loading ? '…' : s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Per-group breakdown */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-bold text-foreground">Breakdown by Group</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Group', 'Sent', 'Opens', 'Open %', 'Clicks', 'Click %', 'Failed'].map(h => (
                  <th key={h} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(byGroup).sort((a, b) => b[1].sent - a[1].sent).map(([group, g]) => (
                <tr key={group} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${GROUP_COLORS[group] ?? 'bg-muted text-muted-foreground'}`}>
                      {group}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-foreground">{g.sent}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{g.opens}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[80px] bg-muted rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${g.sent > 0 ? Math.round((g.opens / g.sent) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {g.sent > 0 ? Math.round((g.opens / g.sent) * 100) : 0}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{g.clicks}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[80px] bg-muted rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${g.sent > 0 ? Math.round((g.clicks / g.sent) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {g.sent > 0 ? Math.round((g.clicks / g.sent) * 100) : 0}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {g.failed > 0
                      ? <Badge variant="error" size="sm">{g.failed}</Badge>
                      : <span className="text-xs text-muted-foreground">—</span>
                    }
                  </td>
                </tr>
              ))}
              {!loading && Object.keys(byGroup).length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent failures */}
      {recentFailed.length > 0 && (
        <div className="bg-card border border-destructive/20 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-sm font-bold text-foreground">Recent Failures</p>
          </div>
          <div className="divide-y divide-border">
            {recentFailed.map(l => (
              <div key={l.id} className="px-5 py-3 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{l.recipientEmail}</p>
                  <p className="text-xs text-muted-foreground">{l.type} · {fmtDate(l.sentAt)}</p>
                </div>
                {l.error && (
                  <p className="text-xs text-destructive/80 max-w-xs truncate shrink-0">{l.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
