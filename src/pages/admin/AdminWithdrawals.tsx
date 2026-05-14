import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import {
  AlertTriangle, Check, Clock, CreditCard, DollarSign,
  RefreshCw, ShieldCheck, User, X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { db, auth } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import { AdminPageHeader, DataTable } from '../../components/admin';
import type { DataTableColumn } from '../../components/admin';
import { logAuditEvent } from '../../lib/auditLog';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import Textarea from '../../components/primitives/Textarea';
import { AnimatePresence, motion } from 'motion/react';

type PayoutStatus = 'all' | 'pending' | 'flagged' | 'completed' | 'rejected';

interface Payout {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  amount: number;
  currency?: string;
  status: 'pending' | 'flagged' | 'completed' | 'rejected';
  payoutMethod?: string;
  payoutDetails?: { upiId?: string; paypalEmail?: string; bankDetails?: string };
  riskScore?: number;
  riskLevel?: string;
  requestedAt: any;
  processedAt?: any;
  transactionRef?: string;
  adminNote?: string;
}

const STATUS_TABS: { id: PayoutStatus; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'pending',   label: 'Pending' },
  { id: 'flagged',   label: 'Flagged' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected',  label: 'Rejected' },
];

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-500/10 text-amber-600 border-amber-500/20',
  flagged:   'bg-orange-500/10 text-orange-600 border-orange-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected:  'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

export default function AdminWithdrawals() {
  const { user: adminUser } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PayoutStatus>('all');

  // Approve modal state
  const [approveTarget, setApproveTarget] = useState<Payout | null>(null);
  const [txnRef, setTxnRef] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<Payout | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    fetchPayouts();
  }, []);

  async function fetchPayouts() {
    setLoading(true);
    try {
      const q = query(collection(db, 'payouts'), orderBy('requestedAt', 'desc'));
      const snap = await getDocs(q);
      setPayouts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payout)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!approveTarget) return;
    if (!txnRef.trim()) { toast.error('Transaction reference is required'); return; }

    setProcessing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/affiliates/approve/${approveTarget.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ transactionRef: txnRef.trim(), adminNote: adminNote.trim() || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');

      setPayouts(prev => prev.map(p =>
        p.id === approveTarget.id ? { ...p, status: 'completed', transactionRef: txnRef.trim() } : p
      ));
      logAuditEvent({
        action: 'payout.approved',
        entityType: 'payout',
        entityId: approveTarget.id,
        actorEmail: adminUser?.email ?? undefined,
        details: { amount: approveTarget.amount, userEmail: approveTarget.userEmail, transactionRef: txnRef.trim() }
      });
      toast.success('Payout approved and balance updated.');
      setApproveTarget(null);
      setTxnRef('');
      setAdminNote('');
    } catch (err: any) {
      toast.error(err.message || 'Approval failed');
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;

    setProcessing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/affiliates/reject/${rejectTarget.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ adminNote: rejectNote.trim() || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rejection failed');

      setPayouts(prev => prev.map(p =>
        p.id === rejectTarget.id ? { ...p, status: 'rejected', adminNote: rejectNote.trim() } : p
      ));
      logAuditEvent({
        action: 'payout.rejected',
        entityType: 'payout',
        entityId: rejectTarget.id,
        actorEmail: adminUser?.email ?? undefined,
        details: { amount: rejectTarget.amount, userEmail: rejectTarget.userEmail }
      });
      toast.success('Payout rejected.');
      setRejectTarget(null);
      setRejectNote('');
    } catch (err: any) {
      toast.error(err.message || 'Rejection failed');
    } finally {
      setProcessing(false);
    }
  }

  const filteredData = useMemo(
    () => statusFilter === 'all' ? payouts : payouts.filter(p => p.status === statusFilter),
    [payouts, statusFilter]
  );

  const pendingCount  = payouts.filter(p => p.status === 'pending' || p.status === 'flagged').length;
  const totalPaid     = payouts.filter(p => p.status === 'completed').reduce((a, p) => a + Number(p.amount ?? 0), 0);
  const flaggedCount  = payouts.filter(p => p.status === 'flagged').length;

  const columns: DataTableColumn<Payout>[] = [
    {
      key: 'requestedAt',
      header: 'Requested',
      sortable: true,
      sortValue: p => p.requestedAt?.seconds ?? 0,
      render: p => (
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Clock className="w-3 h-3" />
          {p.requestedAt?.toDate?.().toLocaleDateString() ?? 'N/A'}
        </div>
      ),
      csvValue: p => p.requestedAt?.toDate?.().toLocaleDateString() ?? 'N/A',
    },
    {
      key: 'creator',
      header: 'Creator',
      searchValue: p => `${p.userEmail ?? ''} ${p.userId ?? ''}`,
      render: p => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{p.userName || p.userEmail}</p>
            <p className="text-xs text-muted-foreground truncate">{p.userEmail}</p>
          </div>
        </div>
      ),
      csvValue: p => p.userEmail,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      sortValue: p => p.amount,
      render: p => (
        <div className="flex items-center gap-1">
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="text-base font-bold text-foreground">{Number(p.amount).toFixed(2)}</span>
        </div>
      ),
      csvValue: p => p.amount,
    },
    {
      key: 'method',
      header: 'Payout Method',
      render: p => {
        const det = p.payoutDetails;
        return (
          <div className="space-y-1">
            {det?.upiId && (
              <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <span className="text-[8px] bg-muted px-1.5 py-0.5 rounded uppercase tracking-widest">UPI</span>
                {det.upiId}
              </p>
            )}
            {det?.paypalEmail && (
              <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <span className="text-[8px] bg-primary/8 text-primary px-1.5 py-0.5 rounded uppercase tracking-widest">PayPal</span>
                {det.paypalEmail}
              </p>
            )}
            {det?.bankDetails && (
              <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <span className="text-[8px] bg-muted px-1.5 py-0.5 rounded uppercase tracking-widest">Bank</span>
                {det.bankDetails}
              </p>
            )}
            {!det?.upiId && !det?.paypalEmail && !det?.bankDetails && p.payoutMethod && (
              <span className="text-xs text-muted-foreground uppercase">{p.payoutMethod}</span>
            )}
          </div>
        );
      },
      csvValue: p => p.payoutDetails?.upiId ?? p.payoutDetails?.paypalEmail ?? p.payoutMethod ?? 'N/A',
    },
    {
      key: 'risk',
      header: 'Risk',
      sortable: true,
      sortValue: p => p.riskScore ?? 0,
      render: p => p.riskScore !== undefined ? (
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: p.riskLevel === 'high_risk' ? '#ef4444'
                : p.riskLevel === 'medium_risk' ? '#f59e0b'
                : '#10b981'
            }}
          />
          <span className="text-xs font-bold text-muted-foreground">{p.riskScore}</span>
        </div>
      ) : null,
      csvValue: p => p.riskScore ?? 0,
    },
    {
      key: 'txnRef',
      header: 'Transaction Ref',
      render: p => p.transactionRef ? (
        <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px] block">{p.transactionRef}</span>
      ) : null,
      csvValue: p => p.transactionRef ?? '',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: p => p.status,
      render: p => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${STATUS_STYLE[p.status] ?? ''}`}>
          {p.status}
        </span>
      ),
      csvValue: p => p.status,
    },
    {
      key: 'actions',
      header: 'Actions',
      hideable: false,
      render: p => (p.status === 'pending' || p.status === 'flagged') ? (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => { setApproveTarget(p); setTxnRef(''); setAdminNote(''); }}
            variant="success"
            size="icon"
            rounded="lg"
            title="Approve"
            className="shadow-sm shadow-emerald-500/20"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => { setRejectTarget(p); setRejectNote(''); }}
            variant="danger"
            size="icon"
            rounded="lg"
            title="Reject"
            className="shadow-sm shadow-rose-500/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : null,
    },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Financial Governance"
        labelIcon={ShieldCheck}
        title="Withdrawals"
        subtitle="Review withdrawal requests, enter transaction references, and update user balances."
        actions={
          <Button
            onClick={async () => {
              try {
                const idToken = await auth.currentUser?.getIdToken();
                const res = await fetch('/api/affiliates/process-locks', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${idToken}` }
                });
                const data = await res.json();
                toast.success(`Processed ${data.processed} expired lock(s).`);
                fetchPayouts();
              } catch { toast.error('Failed to process locks'); }
            }}
            variant="secondary"
            size="sm"
            leftIcon={RefreshCw}
          >
            Process Lock Periods
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Pending + Flagged', value: pendingCount,        accent: 'text-amber-600', note: 'Awaiting review' },
          { label: 'Total Paid Out',    value: `$${totalPaid.toFixed(2)}`, accent: 'text-emerald-600', note: 'All time' },
          { label: 'Flagged (High Risk)', value: flaggedCount,      accent: 'text-orange-600', note: 'Needs extra review' },
        ].map(stat => (
          <div key={stat.label} className="bg-card p-5 rounded-xl border border-border shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.accent}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.note}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg w-fit">
        {STATUS_TABS.map(tab => (
          <Button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            variant={statusFilter === tab.id ? 'white' : 'ghost'}
            size="sm"
            className={statusFilter === tab.id ? 'shadow-sm' : ''}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] opacity-60">
              ({tab.id === 'all' ? payouts.length : payouts.filter(p => p.status === tab.id).length})
            </span>
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        rowKey={p => p.id}
        loading={loading}
        searchPlaceholder="Search by email or user ID..."
        exportFilename="withdrawals"
        emptyIcon={CreditCard}
        emptyTitle="No withdrawal requests"
        emptyMessage="Creator payout requests will appear here."
      />

      {/* Approve modal */}
      <AnimatePresence>
        {approveTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setApproveTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl p-8 w-full max-w-md border border-border shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-foreground mb-1">Approve Payout</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Approving <span className="font-bold text-foreground">${Number(approveTarget.amount).toFixed(2)}</span>{' '}
                to <span className="font-bold text-foreground">{approveTarget.userEmail}</span>.{' '}
                Enter the transaction reference after sending funds.
              </p>

              <div className="space-y-4">
                <Input
                  id="txnRef"
                  name="txnRef"
                  label="Transaction Reference *"
                  placeholder="UTR number, PayPal TXN ID, etc."
                  value={txnRef}
                  onChange={e => setTxnRef(e.target.value)}
                />
                <Textarea
                  id="adminNote"
                  name="adminNote"
                  label="Admin Note (optional)"
                  placeholder="Internal note about this payout"
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleApprove}
                  isLoading={processing}
                  disabled={!txnRef.trim()}
                  variant="success"
                  size="lg"
                  fullWidth
                  leftIcon={Check}
                >
                  Confirm & Approve
                </Button>
                <Button
                  onClick={() => setApproveTarget(null)}
                  variant="ghost"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject modal */}
      <AnimatePresence>
        {rejectTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setRejectTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl p-8 w-full max-w-md border border-border shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h2 className="text-lg font-bold text-foreground">Reject Payout</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                This will reject the ${Number(rejectTarget.amount).toFixed(2)} request from{' '}
                <span className="font-bold">{rejectTarget.userEmail}</span>. The user's balance will not be changed.
              </p>

              <Textarea
                id="rejectNote"
                name="rejectNote"
                label="Reason (optional)"
                placeholder="Why is this payout being rejected?"
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                rows={3}
              />

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleReject}
                  isLoading={processing}
                  variant="danger"
                  size="lg"
                  fullWidth
                  leftIcon={X}
                >
                  Reject Request
                </Button>
                <Button
                  onClick={() => setRejectTarget(null)}
                  variant="ghost"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
