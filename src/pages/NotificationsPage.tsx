import { AlertCircle, AlertTriangle, Bell, CheckCircle2, CheckSquare, ExternalLink, Info, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/primitives/Button';
import { Notification, useNotifications } from '../hooks/useNotifications';
import { usePath } from '../hooks/usePath';
import { cn } from '../lib/utils';

// ── type config ───────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  info:    { icon: Info,          color: 'text-blue-500',    bg: 'bg-blue-500/10'    },
  success: { icon: CheckCircle2,  color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-500',   bg: 'bg-amber-500/10'   },
  error:   { icon: AlertCircle,   color: 'text-rose-500',    bg: 'bg-rose-500/10'    },
} as const;

// ── date grouping ─────────────────────────────────────────────────────────────

function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (typeof ts.toDate === 'function') return ts.toDate();
  return new Date(ts);
}

function getGroup(ts: any): string {
  const d = toDate(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  if (d >= today) return 'Today';
  if (d >= yesterday) return 'Yesterday';
  if (d >= weekAgo) return 'This Week';
  return 'Older';
}

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Older'];

function groupNotifications(notifications: Notification[]) {
  const map: Record<string, Notification[]> = {};
  notifications.forEach(n => {
    const g = getGroup(n.createdAt);
    if (!map[g]) map[g] = [];
    map[g].push(n);
  });
  return GROUP_ORDER.filter(g => map[g]).map(g => ({ label: g, items: map[g] }));
}

function formatRelativeTime(ts: any): string {
  if (!ts) return '';
  const d = toDate(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── notification row ──────────────────────────────────────────────────────────

function NotifRow({
  n,
  onRead,
  onDelete,
}: {
  n: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { prefix } = usePath();
  const isRead = !!n.readAt;
  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info;
  const Icon = cfg.icon;

  const handleClick = () => {
    if (!isRead) onRead(n.id);
    if (n.link) navigate(prefix(n.link));
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
      className={cn(
        'relative flex gap-4 px-5 py-4 group cursor-pointer transition-colors border-b border-border/50 last:border-0',
        isRead ? 'hover:bg-muted/30' : 'bg-primary/[0.03] hover:bg-primary/[0.06]'
      )}
      onClick={handleClick}
    >
      {/* unread pill */}
      {!isRead && (
        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r bg-primary" />
      )}

      {/* icon */}
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
        <Icon className={cn('w-4 h-4', cfg.color)} />
      </div>

      {/* content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className={cn(
            'text-sm font-semibold leading-snug truncate',
            isRead ? 'text-muted-foreground' : 'text-foreground'
          )}>
            {n.title}
          </p>
          <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5 font-medium">
            {formatRelativeTime(n.createdAt)}
          </span>
        </div>
        <p className={cn(
          'text-xs mt-0.5 line-clamp-2 leading-relaxed',
          isRead ? 'text-muted-foreground/60' : 'text-muted-foreground'
        )}>
          {n.body}
        </p>
        {n.link && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-primary uppercase tracking-widest">
            <ExternalLink className="w-2.5 h-2.5" />
            View details
          </span>
        )}
      </div>

      {/* delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(n.id); }}
        className="shrink-0 mt-0.5 p-1.5 rounded-md text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
        aria-label="Delete notification"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

type Filter = 'all' | 'unread';

export default function NotificationsPage() {
  const { prefix } = usePath();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, loading } = useNotifications();
  const [filter, setFilter] = useState<Filter>('all');

  const visible = filter === 'unread' ? notifications.filter(n => !n.readAt) : notifications;
  const groups = groupNotifications(visible);

  return (
    <div className="space-y-6">

      {/* ── header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs mb-2">
            <Bell className="w-4 h-4" />
            Activity Feed
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Alerts for credits, unlocks, follows, and account events.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={CheckSquare}
          onClick={markAllAsRead}
          disabled={loading || unreadCount === 0}
          className="shrink-0"
        >
          Mark all read
        </Button>
      </div>

      {/* ── filter tabs ── */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border w-fit">
        {(['all', 'unread'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5',
              filter === f
                ? 'bg-background text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f}
            {f === 'unread' && unreadCount > 0 && (
              <span className="min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── content card ── */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground/20" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              {filter === 'unread'
                ? 'You have no unread notifications.'
                : 'When you unlock prompts, earn credits, or receive updates — they\'ll appear here.'}
            </p>
            {filter === 'unread' && notifications.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setFilter('all')}
              >
                View all notifications
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {groups.map(({ label, items }) => (
              <div key={label}>
                <div className="px-5 py-2.5 bg-muted/30 border-b border-border">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/70">
                    {label}
                  </p>
                </div>
                <AnimatePresence>
                  {items.map(n => (
                    <NotifRow
                      key={n.id}
                      n={n}
                      onRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ── settings nudge ── */}
      {!loading && (
        <p className="text-xs text-muted-foreground text-center">
          Manage email preferences in{' '}
          <Link to={prefix('/settings/notifications')} className="text-primary font-semibold hover:underline">
            Notification Settings
          </Link>
        </p>
      )}
    </div>
  );
}
