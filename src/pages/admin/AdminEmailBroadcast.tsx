import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { AlertTriangle, Mail, Send, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AdminPageHeader } from '../../components/admin';
import Badge from '../../components/primitives/Badge';
import Button from '../../components/primitives/Button';
import { db } from '../../lib/firebase';
import { api } from '../../lib/api';
import { usePath } from '../../hooks/usePath';
interface EmailTypeInfo { type: string; name: string; group: string; defaultSubject: string; variables: { name: string }[]; }
interface Segment { id: string; name: string; description?: string; }

interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}

export default function AdminEmailBroadcast() {
  const { prefix } = usePath();
  const [segments, setSegments]     = useState<Segment[]>([]);
  const [emailTypes, setEmailTypes] = useState<EmailTypeInfo[]>([]);
  const [segmentId, setSegmentId]   = useState('');
  const [emailType, setEmailType]   = useState('');
  const [sending, setSending]         = useState(false);
  const [result, setResult]           = useState<BroadcastResult | null>(null);
  const [confirmed, setConfirmed]     = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [countLoading, setCountLoading]     = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, 'marketing_segments'), orderBy('name')))
      .then(snap => setSegments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Segment))))
      .catch(() => {});
    api.get('/email/types')
      .then(r => setEmailTypes(Array.isArray(r) ? r : (r as any).data ?? []))
      .catch(() => {});
  }, []);

  // Fetch recipient count when audience changes
  useEffect(() => {
    setRecipientCount(null);
    setConfirmed(false);
    setCountLoading(true);
    const qs = segmentId ? `?segmentId=${segmentId}` : '';
    api.get(`/email/broadcast/preview${qs}`)
      .then((r: any) => setRecipientCount(r?.total ?? 0))
      .catch(() => setRecipientCount(null))
      .finally(() => setCountLoading(false));
  }, [segmentId]);

  const selectedType = emailTypes.find(t => t.type === emailType);
  const audienceLabel = segmentId
    ? (segments.find(s => s.id === segmentId)?.name ?? 'Selected segment')
    : 'All active contacts';

  const handleSend = async () => {
    if (!emailType) { toast.error('Select an email type'); return; }
    if (!confirmed) { toast.error('Confirm the send before proceeding'); return; }

    setSending(true);
    setResult(null);
    const toastId = toast.loading('Sending broadcast…');
    try {
      const r = await api.post('/email/broadcast', {
        ...(segmentId ? { segmentId } : {}),
        type: emailType,
      }) as any;
      setResult(r);
      toast.success(`Broadcast done — ${r.sent} sent, ${r.failed} failed, ${r.skipped} skipped`, { id: toastId });
      setConfirmed(false);
    } catch (err: any) {
      toast.error(err?.message || 'Broadcast failed', { id: toastId });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Emails"
        labelIcon={Mail}
        title="Send Broadcast"
        subtitle="Send a one-time email to a segment or all active contacts."
        actions={
          <Button as={Link} to={prefix('/admin/emails')} variant="ghost" size="md">
            Back to Emails
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config panel */}
        <div className="space-y-5">
          {/* Audience */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <p className="text-sm font-bold text-foreground">1. Choose audience</p>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Segment (leave blank for all active)</label>
              <select
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                value={segmentId}
                onChange={e => { setSegmentId(e.target.value); setConfirmed(false); }}
              >
                <option value="">All active contacts</option>
                {segments.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Email type */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <p className="text-sm font-bold text-foreground">2. Choose email type</p>
            <select
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              value={emailType}
              onChange={e => { setEmailType(e.target.value); setConfirmed(false); }}
            >
              <option value="">Select a type…</option>
              {emailTypes.map(t => (
                <option key={t.type} value={t.type}>{t.name} ({t.type})</option>
              ))}
            </select>
            {selectedType && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Subject:</span> {selectedType.defaultSubject}
                </p>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs text-muted-foreground font-semibold">Variables:</span>
                  {selectedType.variables.map(v => (
                    <code key={v.name} className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{`{{${v.name}}}`}</code>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm + Send */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <p className="text-sm font-bold text-foreground">3. Confirm &amp; send</p>

            <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-400">
                <p>This will send <span className="font-bold">{emailType ? `"${emailType}"` : 'the selected email'}</span> to <span className="font-bold">{audienceLabel}</span>.</p>
                <p className="mt-1">
                  {countLoading ? (
                    <span className="opacity-60">Counting recipients…</span>
                  ) : recipientCount !== null ? (
                    <span className="font-bold">{recipientCount} active contact{recipientCount !== 1 ? 's' : ''} will receive this email.</span>
                  ) : null}
                  {' '}Unsubscribed contacts are automatically excluded.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-primary"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
              />
              <span className="text-sm text-foreground">I understand this will send real emails</span>
            </label>

            <Button
              onClick={handleSend}
              isLoading={sending}
              disabled={!emailType || !confirmed}
              variant="primary"
              size="md"
              leftIcon={Send}
              className="w-full"
            >
              Send Broadcast
            </Button>
          </div>
        </div>

        {/* Result panel */}
        <div className="space-y-5">
          {result ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <p className="text-sm font-bold text-foreground">Send results</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total', value: result.total, accent: 'bg-primary/10 text-primary' },
                  { label: 'Sent', value: result.sent, accent: 'bg-emerald-500/10 text-emerald-600' },
                  { label: 'Failed', value: result.failed, accent: 'bg-destructive/10 text-destructive' },
                  { label: 'Skipped', value: result.skipped, accent: 'bg-muted text-muted-foreground' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl p-4 border border-border flex flex-col ${s.accent}`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{s.label}</p>
                    <p className="text-2xl font-black leading-none mt-1">{s.value}</p>
                  </div>
                ))}
              </div>
              <Button as={Link} to={prefix('/admin/emails/logs')} variant="secondary" size="sm" leftIcon={Mail} className="w-full">
                View email logs
              </Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[200px]">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Results will appear here</p>
              <p className="text-xs text-muted-foreground">Configure your audience and email type, then send.</p>
            </div>
          )}

          {/* Tips */}
          <div className="bg-muted/40 border border-border rounded-xl p-5 space-y-2">
            <p className="text-xs font-bold text-foreground uppercase tracking-widest">Notes</p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Skipped = unsubscribed or suppressed contacts</li>
              <li>Each send is logged in Email Logs</li>
              <li>Dynamic variables like <code className="font-mono bg-muted px-1 rounded">{`{{name}}`}</code> are injected per recipient</li>
              <li>For automated sequences, use Automation Flows instead</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
