import { useEffect, useRef, useState } from 'react';
import { Bell, Wallet, MessageSquare, Ticket, Users, Flag, ArrowRight } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Button from '../primitives/Button';

interface NotifGroup {
  key: string;
  icon: React.ElementType;
  color: string;
  label: string;
  count: number;
  href: string;
  items: { text: string; sub?: string }[];
}

export default function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<NotifGroup[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Firestore listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const updates: Partial<Record<string, NotifGroup>> = {};

    // 1. Pending withdrawals
    const unsubWithdrawals = onSnapshot(
      query(collection(db, 'payouts'), where('status', '==', 'pending')),
      (snap) => {
        updates['withdrawals'] = {
          key: 'withdrawals',
          icon: Wallet,
          color: 'text-amber-500 bg-amber-500/10',
          label: 'Pending Withdrawals',
          count: snap.size,
          href: '/admin/withdrawals',
          items: snap.docs.slice(0, 3).map(d => ({
            text: d.data().userEmail ?? 'Unknown user',
            sub: `$${d.data().amount ?? 0} pending`,
          })),
        };
        setGroups(Object.values(updates).filter((g): g is NotifGroup => !!g && g.count > 0));
      }
    );

    // 2. Open support tickets
    const unsubTickets = onSnapshot(
      query(collection(db, 'tickets'), where('status', '==', 'open'), orderBy('updatedAt', 'desc'), limit(10)),
      (snap) => {
        updates['tickets'] = {
          key: 'tickets',
          icon: Ticket,
          color: 'text-rose-500 bg-rose-500/10',
          label: 'Open Tickets',
          count: snap.size,
          href: '/admin/tickets',
          items: snap.docs.slice(0, 3).map(d => ({
            text: d.data().subject ?? 'Untitled',
            sub: d.data().userEmail,
          })),
        };
        setGroups(Object.values(updates).filter((g): g is NotifGroup => !!g && g.count > 0));
      },
      () => { /* tickets collection may not exist yet */ }
    );

    // 3. Unread contact messages
    const unsubMessages = onSnapshot(
      query(collection(db, 'contact_messages'), where('status', '==', 'unread'), orderBy('createdAt', 'desc'), limit(10)),
      (snap) => {
        updates['messages'] = {
          key: 'messages',
          icon: MessageSquare,
          color: 'text-primary bg-primary/10',
          label: 'Unread Inquiries',
          count: snap.size,
          href: '/admin/inquiries',
          items: snap.docs.slice(0, 3).map(d => ({
            text: d.data().subject ?? 'No subject',
            sub: d.data().name,
          })),
        };
        setGroups(Object.values(updates).filter((g): g is NotifGroup => !!g && g.count > 0));
      },
      () => {}
    );

    // 4. New users in last 24 h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('createdAt', '>=', since), orderBy('createdAt', 'desc'), limit(20)),
      (snap) => {
        updates['newUsers'] = {
          key: 'newUsers',
          icon: Users,
          color: 'text-emerald-600 bg-emerald-500/10',
          label: 'New Signups (24h)',
          count: snap.size,
          href: '/admin/users',
          items: snap.docs.slice(0, 3).map(d => ({
            text: d.data().displayName || d.data().email || 'Unknown',
            sub: d.data().subscriptionStatus === 'pro' ? 'Pro plan' : 'Free plan',
          })),
        };
        setGroups(Object.values(updates).filter((g): g is NotifGroup => !!g && g.count > 0));
      },
      () => {}
    );

    // 5. Pending content reports
    const unsubReports = onSnapshot(
      query(collection(db, 'prompt_reports'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(10)),
      (snap) => {
        updates['reports'] = {
          key: 'reports',
          icon: Flag,
          color: 'text-rose-600 bg-rose-500/10',
          label: 'Flagged Prompts',
          count: snap.size,
          href: '/admin/reports',
          items: snap.docs.slice(0, 3).map(d => ({
            text: d.data().promptTitle ?? 'Unknown prompt',
            sub: d.data().reason?.replace(/_/g, ' ') ?? '',
          })),
        };
        setGroups(Object.values(updates).filter((g): g is NotifGroup => !!g && g.count > 0));
      },
      () => {}
    );

    return () => { unsubWithdrawals(); unsubTickets(); unsubMessages(); unsubUsers(); unsubReports(); };
  }, []);

  const totalCount = groups.reduce((sum, g) => sum + g.count, 0);

  return (
    <div ref={ref} className="relative">
      <Button
        onClick={() => setOpen(v => !v)}
        variant="ghost"
        size="icon"
        className="relative text-muted-foreground hover:text-foreground hover:bg-muted/60"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl shadow-black/10 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="text-sm font-bold text-foreground">Notifications</p>
                {totalCount > 0 && (
                  <p className="text-xs text-muted-foreground">{totalCount} item{totalCount !== 1 ? 's' : ''} need attention</p>
                )}
              </div>
              {totalCount > 0 && (
                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 text-xs font-bold rounded-full">{totalCount}</span>
              )}
            </div>

            {/* Groups */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
              {groups.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">No pending actions.</p>
                </div>
              ) : groups.map(group => (
                <div key={group.key}>
                  {/* Group header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${group.color}`}>
                        <group.icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-foreground">{group.label}</span>
                    </div>
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${group.color}`}>
                      {group.count}
                    </span>
                  </div>

                  {/* Items */}
                  {group.items.map((item, i) => (
                    <Link
                      key={i}
                      to={group.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{item.text}</p>
                        {item.sub && <p className="text-xs text-muted-foreground truncate">{item.sub}</p>}
                      </div>
                    </Link>
                  ))}

                  {/* View all link */}
                  <Button
                    as={Link}
                    to={group.href}
                    onClick={() => setOpen(false)}
                    variant="ghost"
                    size="sm"
                    fullWidth
                    rightIcon={ArrowRight}
                    className="justify-start px-4 py-2 text-primary hover:bg-primary/5 border-t border-border/50 rounded-none h-auto font-bold"
                  >
                    View all {group.label.toLowerCase()}
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
