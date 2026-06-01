import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { AlertCircle, AlertTriangle, BarChart3, CheckCircle2, ChevronRight, Mail, RefreshCw, Send, Settings, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminPageHeader } from '../../components/admin';
import Badge from '../../components/primitives/Badge';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import { db } from '../../lib/firebase';
import { api } from '../../lib/api';
import { usePath } from '../../hooks/usePath';
import { toast } from 'react-hot-toast';

interface RecentLog {
  id: string;
  recipientEmail: string;
  type: string;
  subject: string;
  status: 'sent' | 'failed';
  sentAt: any;
}

function fmtDate(ts: any): string {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    return d.toLocaleString();
  } catch { return '—'; }
}

export default function AdminEmails() {
  const { prefix } = usePath();
  const [logs, setLogs]           = useState<RecentLog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [smtpStatus, setSmtpStatus] = useState<'checking' | 'ok' | 'error' | 'unknown'>('unknown');
  useEffect(() => {
    getDocs(query(collection(db, 'email_logs'), orderBy('sentAt', 'desc'), limit(10)))
      .then(snap => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecentLog))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const checkSmtp = async () => {
    setSmtpStatus('checking');
    try {
      const r = await api.post('/marketing/test-email') as any;
      setSmtpStatus(r?.success ? 'ok' : 'error');
    } catch {
      setSmtpStatus('unknown');
    }
  };

  const sent   = logs.filter(l => l.status === 'sent').length;
  const failed = logs.filter(l => l.status === 'failed').length;
  const rate   = logs.length > 0 ? Math.round((sent / logs.length) * 100) : null;

  const navCards = [
    {
      icon: Settings,
      title: 'Email Templates',
      description: 'Edit transactional & marketing email templates. Preview with live variables.',
      href: prefix('/admin/emails/templates'),
      accent: 'bg-primary/10 text-primary border-primary/20',
    },
    {
      icon: Mail,
      title: 'Email Logs',
      description: 'Browse all outgoing emails with status, subject, and recipient. Filter by type.',
      href: prefix('/admin/emails/logs'),
      accent: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    },
    {
      icon: Zap,
      title: 'Automation Instances',
      description: 'Monitor active flow runs, retry failed steps, or cancel pending sequences.',
      href: prefix('/admin/emails/automation'),
      accent: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    },
    {
      icon: Send,
      title: 'Send Broadcast',
      description: 'Send a one-time email to a segment or all active contacts.',
      href: prefix('/admin/emails/broadcast'),
      accent: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Open rates, click rates, failures, and per-group delivery breakdown.',
      href: prefix('/admin/emails/analytics'),
      accent: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Communications"
        labelIcon={Mail}
        title="Emails"
        subtitle="SMTP health, outgoing email logs, templates, and automation flows."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={checkSmtp} isLoading={smtpStatus === 'checking'} variant="secondary" size="sm">
              Test SMTP
            </Button>
            <Button onClick={() => {
              setLoading(true);
              getDocs(query(collection(db, 'email_logs'), orderBy('sentAt', 'desc'), limit(10)))
                .then(snap => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecentLog))))
                .catch(() => {}).finally(() => setLoading(false));
            }} isLoading={loading} variant="ghost" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {/* SMTP Health Banner */}
      {smtpStatus === 'error' && (
        <div className="flex items-start gap-3 px-5 py-4 bg-destructive/10 border border-destructive/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-destructive">SMTP not configured</p>
            <p className="text-xs text-destructive/80 mt-0.5">
              Emails will fail until SMTP credentials are set in environment variables (<code className="font-mono">SMTP_HOST</code>, <code className="font-mono">SMTP_USER</code>, <code className="font-mono">SMTP_PASS</code>).
            </p>
          </div>
        </div>
      )}
      {smtpStatus === 'unknown' && (
        <div className="flex items-start gap-3 px-5 py-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">SMTP status unknown</p>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">Could not verify SMTP. Check your server configuration.</p>
          </div>
        </div>
      )}
      {smtpStatus === 'ok' && (
        <div className="flex items-center gap-3 px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">SMTP connected and ready</p>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Recent (10)', value: logs.length, icon: Mail, accent: 'bg-primary/10 text-primary' },
          { label: 'Sent',        value: sent,          icon: CheckCircle2, accent: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'Failed',      value: failed,        icon: AlertCircle,  accent: 'bg-destructive/10 text-destructive' },
          { label: 'Delivery',    value: rate !== null ? `${rate}%` : '—', icon: Zap, accent: 'bg-muted text-muted-foreground' },
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

      {/* Nav Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {navCards.map(card => (
          <Card
            key={card.title}
            as={Link}
            to={card.href}
            interactive
            className="group hover:border-primary/40 hover:shadow-md"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${card.accent}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-foreground">{card.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{card.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Emails */}
      <Card padding="none" className="shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">Recent Emails</p>
          <Button as={Link} to={prefix('/admin/emails/logs')} variant="ghost" size="sm" rightIcon={ChevronRight}>
            View all
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recipient</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm font-semibold">No emails logged yet.</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 text-sm font-semibold text-foreground">{log.recipientEmail}</td>
                  <td className="px-5 py-3">
                    <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{log.type}</code>
                  </td>
                  <td className="px-5 py-3 max-w-xs">
                    <p className="text-sm text-muted-foreground truncate">{log.subject || '—'}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={log.status === 'sent' ? 'success' : 'error'} size="sm" dot>
                      {log.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(log.sentAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
