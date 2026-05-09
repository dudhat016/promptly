import { collection, getDocs, orderBy, query, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Check, Clock, DollarSign, ShieldCheck, X, CreditCard, User, AlertCircle } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import type { DataTableColumn } from '../../components/admin';
import { logAuditEvent } from '../../lib/auditLog';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';

type PayoutStatus = 'all' | 'pending' | 'completed' | 'rejected';

interface Payout {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  requestedAt: any;
  processedAt?: any;
  payoutMethod?: { upiId?: string; paypalEmail?: string };
}

const STATUS_TABS: { id: PayoutStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
];

export default function AdminWithdrawals() {
  const confirm = useConfirm();
  const { user: adminUser } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PayoutStatus>('all');

  useEffect(() => {
    async function fetchPayouts() {
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
    fetchPayouts();
  }, []);

  const handleStatusUpdate = async (payout: Payout, newStatus: 'completed' | 'rejected') => {
    const label = newStatus === 'completed' ? 'approve' : 'reject';
    const ok = await confirm({
      title: `${label === 'approve' ? 'Approve' : 'Reject'} $${payout.amount} payout to ${payout.userEmail}?`,
      description: newStatus === 'completed'
        ? 'This marks the payout as completed. Ensure you have sent the funds.'
        : 'The creator will be notified their request was rejected.',
      confirmLabel: label === 'approve' ? 'Approve' : 'Reject',
      destructive: newStatus === 'rejected',
    });
    if (!ok) return;
    try {
      await updateDoc(doc(db, 'payouts', payout.id), { status: newStatus, processedAt: serverTimestamp() });
      setPayouts(prev => prev.map(p => p.id === payout.id ? { ...p, status: newStatus } : p));
      logAuditEvent({
        action: newStatus === 'completed' ? 'payout.approved' : 'payout.rejected',
        entityType: 'payout',
        entityId: payout.id,
        actorEmail: adminUser?.email ?? undefined,
        details: { amount: payout.amount, userEmail: payout.userEmail },
      });
      toast.success(`Payout ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filteredData = useMemo(
    () => statusFilter === 'all' ? payouts : payouts.filter(p => p.status === statusFilter),
    [payouts, statusFilter]
  );

  const pendingCount = payouts.filter(p => p.status === 'pending').length;
  const totalPaid = payouts.filter(p => p.status === 'completed').reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const avgPayout = payouts.length > 0 ? Math.round(payouts.reduce((acc, p) => acc + Number(p.amount || 0), 0) / payouts.length) : 0;

  const columns: DataTableColumn<Payout>[] = [
    {
      key: 'requestedAt',
      header: 'Requested',
      sortable: true,
      sortValue: p => p.requestedAt?.seconds ?? 0,
      render: p => (
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
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
          <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{p.userEmail}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">{p.userId}</p>
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
          <span className="text-base font-semibold text-foreground">{p.amount}.00</span>
        </div>
      ),
      csvValue: p => p.amount,
    },
    {
      key: 'method',
      header: 'Payout Method',
      render: p => (
        <div className="space-y-1">
          {p.payoutMethod?.upiId && (
            <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              <span className="text-[8px] bg-muted px-1.5 py-0.5 rounded uppercase tracking-widest">UPI</span>
              {p.payoutMethod.upiId}
            </p>
          )}
          {p.payoutMethod?.paypalEmail && (
            <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              <span className="text-[8px] bg-primary/8 text-primary px-1.5 py-0.5 rounded uppercase tracking-widest">PayPal</span>
              {p.payoutMethod.paypalEmail}
            </p>
          )}
          {!p.payoutMethod?.upiId && !p.payoutMethod?.paypalEmail && (
            <p className="text-xs font-bold text-amber-600 flex items-center gap-2">
              <AlertCircle className="w-3 h-3" /> No method saved
            </p>
          )}
        </div>
      ),
      csvValue: p => p.payoutMethod?.upiId ?? p.payoutMethod?.paypalEmail ?? 'N/A',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: p => p.status,
      render: p => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
          p.status === 'pending'   ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
          p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                     'bg-rose-500/10 text-rose-600 border-rose-500/20'
        }`}>
          {p.status}
        </span>
      ),
      csvValue: p => p.status,
    },
    {
      key: 'actions',
      header: 'Approve / Reject',
      hideable: false,
      render: p => p.status === 'pending' ? (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleStatusUpdate(p, 'completed')}
            title="Approve"
            variant="success"
            size="icon"
            rounded="lg"
            className="shadow-sm shadow-emerald-500/20"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => handleStatusUpdate(p, 'rejected')}
            title="Reject"
            variant="danger"
            size="icon"
            rounded="lg"
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
        subtitle="Review and process creator payout requests."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Pending Requests', value: pendingCount, accent: 'text-amber-600' },
          { label: 'Total Paid Out', value: `$${totalPaid}.00`, accent: 'text-emerald-600' },
          { label: 'Average Payout',  value: `$${avgPayout}.00`, accent: 'text-primary' },
        ].map(stat => (
          <div key={stat.label} className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.accent}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg w-fit">
        {STATUS_TABS.map(tab => (
          <Button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            variant={statusFilter === tab.id ? 'white' : 'ghost'}
            size="sm"
            className={statusFilter === tab.id ? "shadow-sm" : ""}
          >
            {tab.label}
            {tab.id !== 'all' && (
              <span className="ml-1.5 text-[10px] opacity-70">
                ({payouts.filter(p => p.status === tab.id).length})
              </span>
            )}
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
    </div>
  );
}
