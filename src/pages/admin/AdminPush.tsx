import {
  addDoc, collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp, writeBatch,
} from 'firebase/firestore';
import {
  AlertTriangle, Bell, CheckCircle2, Clock, Info,
  Send, Users, XCircle, Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AdminPageHeader } from '../../components/admin';
import Spinner from '../../components/feedback/Spinner';
import Badge from '../../components/primitives/Badge';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Input from '../../components/primitives/Input';
import Textarea from '../../components/primitives/Textarea';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifType = 'info' | 'success' | 'warning' | 'error';
type Audience = 'all' | 'pro' | 'free';

interface Broadcast {
  id: string;
  title: string;
  body: string;
  type: NotifType;
  link?: string;
  audience: Audience;
  sentCount: number;
  createdAt: any;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: NotifType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'info',    label: 'Info',    icon: Info,          color: 'text-blue-500 bg-blue-500/10' },
  { value: 'success', label: 'Success', icon: CheckCircle2,  color: 'text-emerald-500 bg-emerald-500/10' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10' },
  { value: 'error',   label: 'Error',   icon: XCircle,       color: 'text-rose-500 bg-rose-500/10' },
];

const AUDIENCE_OPTIONS: { value: Audience; label: string; description: string }[] = [
  { value: 'all',  label: 'All users',  description: 'Every registered user' },
  { value: 'pro',  label: 'Pro users',  description: 'Users on a paid plan' },
  { value: 'free', label: 'Free users', description: 'Users on the free plan' },
];

function formatDate(ts: any) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPush() {
  const [title, setTitle]       = useState('');
  const [body, setBody]         = useState('');
  const [link, setLink]         = useState('');
  const [type, setType]         = useState<NotifType>('info');
  const [audience, setAudience] = useState<Audience>('all');
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending]   = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'push_broadcasts'), orderBy('createdAt', 'desc'));
    getDocs(q)
      .then(snap => setBroadcasts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Broadcast))))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setLink('');
    setType('info');
    setAudience('all');
    setConfirmed(false);
  };

  const handleSend = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!body.trim())  { toast.error('Body is required');  return; }
    if (!confirmed)    { toast.error('Please confirm before sending'); return; }

    setSending(true);
    const toastId = toast.loading('Sending notifications…');

    try {
      // Fetch matching users
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.filter(d => {
        const data = d.data();
        if (audience === 'pro')  return data.plan && data.plan !== 'free';
        if (audience === 'free') return !data.plan || data.plan === 'free';
        return true;
      });

      // Batch write notifications (Firestore batches max 500 ops)
      const BATCH_SIZE = 450;
      let written = 0;
      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        users.slice(i, i + BATCH_SIZE).forEach(u => {
          const ref = doc(collection(db, 'users', u.id, 'notifications'));
          batch.set(ref, {
            title: title.trim(),
            body: body.trim(),
            type,
            ...(link.trim() ? { link: link.trim() } : {}),
            readAt: null,
            createdAt: new Date().toISOString(),
          });
        });
        await batch.commit();
        written += users.slice(i, i + BATCH_SIZE).length;
      }

      // Store broadcast record
      const broadcastRef = await addDoc(collection(db, 'push_broadcasts'), {
        title: title.trim(),
        body: body.trim(),
        type,
        ...(link.trim() ? { link: link.trim() } : {}),
        audience,
        sentCount: written,
        createdAt: serverTimestamp(),
      });

      const newBroadcast: Broadcast = {
        id: broadcastRef.id,
        title: title.trim(),
        body: body.trim(),
        type,
        link: link.trim() || undefined,
        audience,
        sentCount: written,
        createdAt: new Date(),
      };
      setBroadcasts(prev => [newBroadcast, ...prev]);

      toast.success(`Sent to ${written} user${written !== 1 ? 's' : ''}`, { id: toastId });
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send notifications', { id: toastId });
    } finally {
      setSending(false);
    }
  };

  const selectedType = TYPE_OPTIONS.find(t => t.value === type)!;
  const TypeIcon = selectedType.icon;

  return (
    <div>
      <AdminPageHeader
        label="Marketing"
        labelIcon={Bell}
        title="Push Notifications"
        subtitle="Send in-app notifications to your users instantly."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Compose ────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Content */}
          <Card>
            <h3 className="font-bold text-foreground mb-5">Compose notification</h3>
            <div className="space-y-4">
              <Input
                label="Title"
                value={title}
                onChange={e => { setTitle(e.target.value); setConfirmed(false); }}
                placeholder="e.g. New feature available"
                variant="outline"
              />
              <Textarea
                label="Body"
                value={body}
                onChange={e => { setBody(e.target.value); setConfirmed(false); }}
                placeholder="Describe what the notification is about…"
                rows={3}
                variant="outline"
              />
              <Input
                label="Link (optional)"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="/dashboard or https://…"
                variant="outline"
              />
            </div>
          </Card>

          {/* Type */}
          <Card>
            <h3 className="font-bold text-foreground mb-4">Notification type</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TYPE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setType(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 text-xs font-bold transition-all',
                      type === opt.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/30'
                    )}
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', opt.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Audience */}
          <Card>
            <h3 className="font-bold text-foreground mb-4">Audience</h3>
            <div className="space-y-2">
              {AUDIENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setAudience(opt.value); setConfirmed(false); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                    audience === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    audience === opt.value ? 'border-primary' : 'border-muted-foreground/40'
                  )}>
                    {audience === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className={cn('text-sm font-bold', audience === opt.value ? 'text-primary' : 'text-foreground')}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Confirm & Send */}
          <Card>
            <h3 className="font-bold text-foreground mb-4">Confirm &amp; send</h3>
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                This will send a notification to <span className="font-bold">
                  {AUDIENCE_OPTIONS.find(a => a.value === audience)?.label}
                </span>. This action cannot be undone.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none mb-5">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-primary"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
              />
              <span className="text-sm text-foreground">I confirm I want to send this notification</span>
            </label>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                leftIcon={Send}
                isLoading={sending}
                disabled={!title.trim() || !body.trim() || !confirmed}
                onClick={handleSend}
              >
                Send Notification
              </Button>
              <Button variant="ghost" onClick={resetForm} disabled={sending}>
                Clear
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Preview ────────────────────────────────── */}
        <div className="space-y-5">
          <Card variant="flat">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Preview</h3>
            <div className="bg-background rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-start gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', selectedType.color)}>
                  <TypeIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {title || <span className="text-muted-foreground italic">Notification title</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {body || <span className="italic">Notification body text appears here.</span>}
                  </p>
                  {link.trim() && (
                    <p className="text-[10px] text-primary mt-1 truncate">{link}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/50 mt-1">Just now</p>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Audience: <span className="font-bold text-foreground">{AUDIENCE_OPTIONS.find(a => a.value === audience)?.label}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Delivered to user notification bell
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Shown in real-time via Firestore listener
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Broadcast History ─────────────────────── */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-border bg-muted/10 flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground">Broadcast History</h3>
          <span className="text-xs text-muted-foreground font-bold">{broadcasts.length} sent</span>
        </div>

        {historyLoading ? (
          <div className="py-12 text-center">
            <Spinner size="sm" variant="muted" className="mx-auto" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-bold text-muted-foreground">No broadcasts yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Sent notifications will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {broadcasts.map(b => {
              const opt = TYPE_OPTIONS.find(t => t.value === b.type)!;
              const Icon = opt.icon;
              return (
                <div key={b.id} className="px-6 py-4 flex items-start gap-4">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', opt.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">{b.title}</span>
                      <Badge variant="default" size="sm">{b.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.body}</p>
                    {b.link && (
                      <p className="text-[10px] text-primary mt-0.5 truncate">{b.link}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    <div className="flex items-center gap-1 justify-end text-xs font-bold text-foreground">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      {b.sentCount}
                    </div>
                    <Badge variant="outline" size="sm">{AUDIENCE_OPTIONS.find(a => a.value === b.audience)?.label ?? b.audience}</Badge>
                    <div className="flex items-center gap-1 justify-end text-[10px] text-muted-foreground/60">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(b.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
