import { collection, getDocs, limit, orderBy, query, startAfter, where, QueryDocumentSnapshot } from 'firebase/firestore';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Mail, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPageHeader } from '../../components/admin';
import Badge from '../../components/primitives/Badge';
import Button from '../../components/primitives/Button';
import { db } from '../../lib/firebase';
import { usePath } from '../../hooks/usePath';

interface EmailLog {
  id: string;
  recipientEmail: string;
  type: string;
  subject: string;
  status: 'sent' | 'failed';
  error?: string;
  sentAt: any;
}

const TYPE_GROUP: Record<string, 'auth'|'onboarding'|'billing'|'dunning'|'affiliate'|'nudge'|'newsletter'|'moderation'> = {
  welcome: 'onboarding', login_alert: 'auth', password_reset: 'auth',
  onboarding_complete: 'onboarding', onboarding_d1_nudge: 'onboarding',
  onboarding_d3_prompt: 'onboarding', onboarding_d7_expiry: 'onboarding',
  purchase_confirmation: 'billing', subscription_renewed: 'billing',
  trial_started: 'billing', dunning_attempt_1: 'dunning', dunning_attempt_2: 'dunning',
  dunning_attempt_3: 'dunning', dunning_recovered: 'dunning', subscription_ended: 'billing',
  low_credits: 'nudge', trial_expiry: 'nudge', renewal_reminder: 'nudge',
  affiliate_join: 'affiliate', affiliate_commission_unlocked: 'affiliate',
  affiliate_withdrawal_approved: 'affiliate', affiliate_withdrawal_rejected: 'affiliate',
  affiliate_first_conversion: 'affiliate', newsletter_confirm: 'newsletter',
  newsletter_welcome: 'newsletter', new_prompt: 'newsletter',
  prompt_approved: 'moderation', prompt_rejected: 'moderation', prompt_submitted: 'moderation',
  prompt_warning: 'moderation', prompt_hidden: 'moderation', badge_earned: 'moderation',
};
const GROUP_VARIANT: Record<string, 'soft'|'success'|'warning'|'error'|'info'> = {
  auth: 'soft', onboarding: 'success', billing: 'info',
  dunning: 'error', affiliate: 'warning', nudge: 'soft', newsletter: 'info',
  moderation: 'warning',
};

const PAGE_SIZE = 50;

function fmtDate(ts: any): string {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return d.toLocaleString();
  } catch { return '—'; }
}

export default function AdminEmailLogs() {
  const { prefix } = usePath();
  const [logs, setLogs]         = useState<EmailLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState<'all'|'sent'|'failed'>('all');
  const [filterType, setFilterType]     = useState('');
  const [lastDoc, setLastDoc]   = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore]   = useState(false);

  async function fetchLogs(replace = true) {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'email_logs'),
        orderBy('sentAt', 'desc'),
        limit(PAGE_SIZE + 1),
      );
      if (!replace && lastDoc) q = query(q, startAfter(lastDoc));

      const snap = await getDocs(q);
      const docs = snap.docs.slice(0, PAGE_SIZE).map(d => ({ id: d.id, ...d.data() } as EmailLog));
      if (replace) setLogs(docs);
      else setLogs(p => [...p, ...docs]);
      setLastDoc(snap.docs[PAGE_SIZE - 1] ?? null);
      setHasMore(snap.docs.length > PAGE_SIZE);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    if (filterType && l.type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      return l.recipientEmail?.toLowerCase().includes(s) ||
             l.type?.toLowerCase().includes(s) ||
             l.subject?.toLowerCase().includes(s);
    }
    return true;
  });

  const typeCounts = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1; return acc;
  }, {});

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Emails"
        labelIcon={Mail}
        title="Email Logs"
        subtitle="All outgoing transactional and marketing emails. Auto-expire after 90 days."
        actions={
          <div className="flex items-center gap-2">
            <Button as={Link} to={prefix('/admin/emails/automation')} variant="secondary" size="md">
              Automation Instances
            </Button>
            <Button onClick={() => fetchLogs()} isLoading={loading} variant="ghost" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: logs.length, icon: Mail, accent: 'bg-primary/10 text-primary' },
          { label: 'Sent', value: typeCounts['sent'] || 0, icon: CheckCircle2, accent: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'Failed', value: typeCounts['failed'] || 0, icon: AlertCircle, accent: 'bg-destructive/10 text-destructive' },
          { label: 'Showing', value: filtered.length, icon: Search, accent: 'bg-muted text-muted-foreground' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.accent}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <p className="text-lg font-black text-foreground leading-none">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-grow max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            placeholder="Search email, type, subject…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(['all', 'sent', 'failed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                filterStatus === s ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select
          className="px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:border-primary text-muted-foreground"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All types</option>
          {[...new Set(logs.map(l => l.type))].sort().map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recipient</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && logs.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-muted-foreground text-sm">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-muted-foreground text-sm font-semibold">No logs match your filters.</td></tr>
              ) : filtered.map(log => {
                const group = TYPE_GROUP[log.type];
                return (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-foreground text-sm">{log.recipientEmail}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{log.type}</code>
                        {group && <Badge variant={GROUP_VARIANT[group]} size="sm">{group}</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      <p className="text-sm text-muted-foreground truncate" title={log.subject}>{log.subject || '—'}</p>
                    </td>
                    <td className="px-5 py-3">
                      {log.status === 'sent' ? (
                        <Badge variant="success" size="sm" dot>Sent</Badge>
                      ) : (
                        <div>
                          <Badge variant="error" size="sm" dot>Failed</Badge>
                          {log.error && (
                            <p className="text-[10px] text-destructive/70 mt-1 max-w-[160px] truncate" title={log.error}>{log.error}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(log.sentAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Showing {filtered.length} of {logs.length}+ logs</p>
            <Button onClick={() => fetchLogs(false)} isLoading={loading} variant="secondary" size="sm" rightIcon={ChevronRight}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
