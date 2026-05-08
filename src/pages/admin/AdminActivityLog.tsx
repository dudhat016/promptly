import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { History, User, FileText, CreditCard, Shield, Settings, Trash2, Edit, LogIn } from 'lucide-react';
import { AdminPageHeader, DataTable } from '../../components/admin';
import type { DataTableColumn } from '../../components/admin';

interface AuditLog {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  actorEmail?: string;
  details?: Record<string, unknown>;
  createdAt?: any;
}

const ACTION_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
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
      limit(500),
    );
    const unsub = onSnapshot(q, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: 'action',
      header: 'Action',
      searchValue: l => l.action,
      sortable: true,
      sortValue: l => l.action,
      render: l => {
        const meta = getActionMeta(l.action);
        const Icon = meta.icon;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{meta.label}</p>
              <p className="text-xs text-muted-foreground font-mono">{l.action}</p>
            </div>
          </div>
        );
      },
      csvValue: l => l.action,
    },
    {
      key: 'entity',
      header: 'Entity',
      searchValue: l => `${l.entityType ?? ''} ${l.entityId ?? ''}`,
      render: l => l.entityType ? (
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{l.entityType}</span>
          {l.entityId && (
            <p className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">{l.entityId}</p>
          )}
        </div>
      ) : <span className="text-muted-foreground">—</span>,
      csvValue: l => l.entityId ?? '',
    },
    {
      key: 'actor',
      header: 'Admin',
      searchValue: l => l.actorEmail ?? '',
      sortable: true,
      sortValue: l => l.actorEmail ?? '',
      render: l => l.actorEmail ? (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
            {l.actorEmail.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-foreground font-medium truncate max-w-[160px]">{l.actorEmail}</span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">System</span>
      ),
      csvValue: l => l.actorEmail ?? 'System',
    },
    {
      key: 'details',
      header: 'Details',
      render: l => l.details && Object.keys(l.details).length > 0 ? (
        <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
          {JSON.stringify(l.details)}
        </p>
      ) : <span className="text-muted-foreground">—</span>,
      csvValue: l => l.details ? JSON.stringify(l.details) : '',
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      sortValue: l => {
        const ts = l.createdAt;
        if (!ts) return 0;
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        if (typeof ts.seconds === 'number') return ts.seconds * 1000;
        return 0;
      },
      render: l => (
        <span className="text-sm text-muted-foreground tabular-nums">{formatTimestamp(l.createdAt)}</span>
      ),
      csvValue: l => formatTimestamp(l.createdAt),
    },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="System"
        labelIcon={History}
        title="Activity Log"
        subtitle="Audit trail of admin actions across the platform."
      />
      <DataTable
        columns={columns}
        data={logs}
        rowKey={l => l.id}
        loading={loading}
        searchPlaceholder="Search by action, entity, or admin email..."
        exportFilename="activity-log"
        emptyIcon={History}
        emptyTitle="No activity yet"
        emptyMessage="Admin actions will be recorded here automatically."
      />
    </div>
  );
}
