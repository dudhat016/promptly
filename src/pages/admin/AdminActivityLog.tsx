import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { LucideIcon, History, User, FileText, CreditCard, Shield, Settings, Trash2, Edit, LogIn, CheckCircle, XCircle, AlertTriangle, EyeOff, Flag } from 'lucide-react';
import { AdminPageHeader } from '../../components/admin';
import { Timeline, type TimelineItem } from '../../components/data';
import Badge from '../../components/primitives/Badge';
import { Card } from '../../components/primitives';

interface AuditLog {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  actorEmail?: string;
  details?: Record<string, unknown>;
  createdAt?: any;
}

const ACTION_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  'user.role_changed':    { icon: Shield,   color: 'text-primary bg-primary/10',       label: 'Role Change' },
  'user.deleted':         { icon: Trash2,   color: 'text-rose-600 bg-rose-500/10',     label: 'User Deleted' },
  'payout.processed':     { icon: CreditCard, color: 'text-emerald-600 bg-emerald-500/10', label: 'Payout' },
  'prompt.deleted':       { icon: Trash2,   color: 'text-rose-600 bg-rose-500/10',     label: 'Prompt Deleted' },
  'prompt.edited':        { icon: Edit,     color: 'text-amber-600 bg-amber-500/10',   label: 'Prompt Edited' },
  'blog.published':       { icon: FileText, color: 'text-emerald-600 bg-emerald-500/10', label: 'Blog Published' },
  'blog.deleted':         { icon: Trash2,   color: 'text-rose-600 bg-rose-500/10',     label: 'Blog Deleted' },
  'settings.updated':     { icon: Settings, color: 'text-amber-600 bg-amber-500/10',   label: 'Settings Updated' },
  'commission.updated':   { icon: CreditCard, color: 'text-purple-600 bg-purple-500/10', label: 'Commission Rate' },
  'admin.login':          { icon: LogIn,    color: 'text-primary bg-primary/10',       label: 'Admin Login' },
  'prompt.approved':      { icon: CheckCircle,   color: 'text-emerald-600 bg-emerald-500/10', label: 'Prompt Approved' },
  'prompt.rejected':      { icon: XCircle,       color: 'text-rose-600 bg-rose-500/10',       label: 'Prompt Rejected' },
  'report.warn_creator':  { icon: AlertTriangle, color: 'text-amber-600 bg-amber-500/10',     label: 'Creator Warned' },
  'report.hide_prompt':   { icon: EyeOff,        color: 'text-rose-600 bg-rose-500/10',       label: 'Prompt Hidden' },
  'report.delete_prompt': { icon: Trash2,        color: 'text-rose-700 bg-rose-600/10',       label: 'Prompt Deleted (Report)' },
  'report.dismissed':     { icon: Flag,          color: 'text-muted-foreground bg-muted',     label: 'Report Dismissed' },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { icon: History, color: 'text-muted-foreground bg-muted', label: action };
}

function formatTimestamp(ts: any): string {
  if (!ts) return '—';
  try {
    const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export default function AdminActivityLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'audit_logs'),
      orderBy('createdAt', 'desc'),
      limit(100),
    );
    const unsub = onSnapshot(q, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const timelineItems: TimelineItem[] = logs.map(l => {
    const meta = getActionMeta(l.action);
    return {
      id: l.id,
      title: meta.label,
      description: (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-foreground">{l.actorEmail || 'System'}</span>
            <span className="text-xs text-muted-foreground">performed</span>
            <Badge variant="soft" size="sm" className="font-mono lowercase px-1.5">
              {l.action}
            </Badge>
            {l.entityType && (
              <>
                <span className="text-xs text-muted-foreground">on</span>
                <Badge variant="outline" size="sm" className="uppercase tracking-widest font-black">
                  {l.entityType}
                </Badge>
                {l.entityId && <span className="text-[10px] font-mono text-muted-foreground">({l.entityId})</span>}
              </>
            )}
          </div>
          {l.details && Object.keys(l.details).length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <pre className="text-[10px] text-muted-foreground font-mono overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(l.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ),
      timestamp: formatTimestamp(l.createdAt),
      icon: meta.icon,
      color: meta.color.includes('rose') ? 'error' : 
             meta.color.includes('emerald') ? 'success' : 
             meta.color.includes('amber') ? 'warning' : 'primary'
    };
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="System"
        labelIcon={History}
        title="Activity Log"
        subtitle="Audit trail of admin actions across the platform."
      />

      <Card variant="raised" className="p-8 md:p-12">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Fetching audit trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
             <History className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-foreground">No logs found</h3>
             <p className="text-muted-foreground mt-1">Platform actions will appear here in real-time.</p>
          </div>
        ) : (
          <Timeline items={timelineItems} />
        )}
      </Card>
    </div>
  );
}
