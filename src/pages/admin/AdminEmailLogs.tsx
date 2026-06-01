import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { AlertCircle, CheckCircle2, Mail, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminPageHeader, DataTable } from '../../components/admin';
import type { DataTableColumn } from '../../components/admin';
import Tabs from '../../components/navigation/Tabs';
import Badge from '../../components/primitives/Badge';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Select from '../../components/primitives/Select';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';

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
  const [filterStatus, setFilterStatus] = useState<'all'|'sent'|'failed'>('all');
  const [filterType, setFilterType]     = useState('');

  async function fetchLogs() {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'email_logs'),
        orderBy('sentAt', 'desc'),
      );
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmailLog)));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    if (filterType && l.type !== filterType) return false;
    return true;
  });

  const typeCounts = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1; return acc;
  }, {});

  const columns: DataTableColumn<EmailLog>[] = [
    {
      key: 'recipientEmail',
      header: 'Recipient',
      searchValue: l => l.recipientEmail || '',
      sortable: true,
      sortValue: l => l.recipientEmail || '',
      render: l => (
        <p className="font-semibold text-foreground text-sm">{l.recipientEmail}</p>
      ),
      csvValue: l => l.recipientEmail || '',
    },
    {
      key: 'type',
      header: 'Type',
      searchValue: l => {
        const group = TYPE_GROUP[l.type];
        return `${l.type} ${group ?? ''}`;
      },
      sortable: true,
      sortValue: l => l.type || '',
      render: l => {
        const group = TYPE_GROUP[l.type];
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{l.type}</code>
            {group && <Badge variant={GROUP_VARIANT[group]} size="sm">{group}</Badge>}
          </div>
        );
      },
      csvValue: l => l.type || '',
    },
    {
      key: 'subject',
      header: 'Subject',
      searchValue: l => l.subject || '',
      sortable: true,
      sortValue: l => l.subject || '',
      render: l => (
        <p className="text-sm text-muted-foreground truncate max-w-xs" title={l.subject}>
          {l.subject || '—'}
        </p>
      ),
      csvValue: l => l.subject || '',
    },
    {
      key: 'status',
      header: 'Status',
      searchValue: l => l.status || '',
      sortable: true,
      sortValue: l => l.status || '',
      render: l => l.status === 'sent' ? (
        <Badge variant="success" size="sm" dot>Sent</Badge>
      ) : (
        <div>
          <Badge variant="error" size="sm" dot>Failed</Badge>
          {l.error && (
            <p className="text-[10px] text-destructive/70 mt-1 max-w-[160px] truncate" title={l.error}>{l.error}</p>
          )}
        </div>
      ),
      csvValue: l => l.status || '',
    },
    {
      key: 'sentAt',
      header: 'Sent At',
      sortable: true,
      sortValue: l => {
        const ts = l.sentAt;
        if (!ts) return 0;
        return ts.seconds ? ts.seconds * 1000 : (ts.toDate ? ts.toDate().getTime() : new Date(ts).getTime());
      },
      render: l => <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(l.sentAt)}</span>,
      csvValue: l => fmtDate(l.sentAt),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Emails"
        labelIcon={Mail}
        title="Email Logs"
        subtitle="All outgoing transactional and marketing emails. Auto-expire after 90 days."
        actions={
          <Button onClick={() => fetchLogs()} isLoading={loading} variant="ghost" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
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
          <Card key={s.label} padding="sm" className="flex-row items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.accent}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <p className="text-lg font-black text-foreground leading-none">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          tabs={(['all', 'sent', 'failed'] as const).map(s => ({
            id: s,
            label: s.charAt(0).toUpperCase() + s.slice(1),
          }))}
          activeTab={filterStatus}
          onChange={id => setFilterStatus(id as typeof filterStatus)}
          variant="pill"
        />
        <div className="w-48">
          <Select
            value={filterType}
            onChange={val => setFilterType(val as string)}
            options={[{ value: '', label: 'All types' }, ...[...new Set(logs.map(l => l.type))].sort().map(t => ({ value: t, label: t }))]}
            isSearchable={false}
          />
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={log => log.id}
        loading={loading && logs.length === 0}
        searchPlaceholder="Search by email, type, subject..."
        exportFilename="email_logs"
        emptyIcon={Mail}
        emptyTitle="No Email Logs"
        emptyMessage="No outgoing emails match the current filters."
      />
    </div>
  );
}
