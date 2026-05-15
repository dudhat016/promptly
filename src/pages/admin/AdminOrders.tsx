import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import {
  ShoppingBag, ExternalLink, Gift, AlertCircle, CheckCircle, RefreshCw,
} from 'lucide-react';
import { AdminPageHeader, DataTable } from '../../components/admin';
import type { DataTableColumn } from '../../components/admin';
import { toast } from 'react-hot-toast';
import Button from '../../components/primitives/Button';
import Badge from '../../components/primitives/Badge';
import Input from '../../components/primitives/Input';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { auth } from '../../lib/firebase';

interface Order {
  id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  billingCycle: string;
  gateway: string;
  createdAt: any;
  hasCommission?: boolean;
  referredBy?: string;
}

interface AwardModalState {
  open: boolean;
  orderId: string;
  referralCode: string;
}

const currencySymbol = (c: string) => c === 'INR' ? '₹' : '$';
const formatDate = (ts: any) => {
  try { return ts?.toDate ? ts.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'; }
  catch { return 'N/A'; }
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState<string | null>(null);
  const [modal, setModal] = useState<AwardModalState>({ open: false, orderId: '', referralCode: '' });
  const { prefix } = usePath();
  const navigate = useNavigate();

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    setLoading(true);
    try {
      const [orderSnap, commSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(200))),
        getDocs(collection(db, 'referral_commissions')),
      ]);

      // Build a Set of orderIds that already have a commission
      const commissionnedOrders = new Set(commSnap.docs.map(d => d.data().orderId as string));

      const rawOrders = orderSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));

      // Fetch referredBy for each unique userId in one pass
      const uniqueUserIds = [...new Set(rawOrders.map(o => o.userId).filter(Boolean))];
      const userMap: Record<string, string | undefined> = {};
      await Promise.all(
        uniqueUserIds.map(async uid => {
          const snap = await getDoc(doc(db, 'users', uid));
          userMap[uid] = snap.exists() ? snap.data()?.referredBy : undefined;
        })
      );

      setOrders(rawOrders.map(o => ({
        ...o,
        hasCommission: commissionnedOrders.has(o.orderId),
        referredBy: userMap[o.userId],
      })));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  async function handleAwardCommission() {
    if (!modal.referralCode.trim()) {
      toast.error('Enter the referral code');
      return;
    }
    setAwarding(modal.orderId);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');
      const res = await fetch('/api/affiliates/award-commission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ orderId: modal.orderId, referralCode: modal.referralCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Commission awarded successfully');
      setModal({ open: false, orderId: '', referralCode: '' });
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAwarding(null);
    }
  }

  const columns: DataTableColumn<Order>[] = [
    {
      key: 'orderId',
      header: 'Order ID',
      searchValue: o => `${o.orderId} ${o.userEmail}`,
      render: o => (
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-foreground truncate max-w-[200px]">{o.orderId}</p>
          <p className="text-[10px] text-muted-foreground truncate">{o.userEmail}</p>
        </div>
      ),
      csvValue: o => o.orderId,
    },
    {
      key: 'plan',
      header: 'Plan',
      render: o => (
        <div>
          <p className="font-bold text-foreground text-sm">{o.planName}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{o.billingCycle}</p>
        </div>
      ),
      csvValue: o => o.planName,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      sortValue: o => o.amount,
      render: o => (
        <span className="font-black text-emerald-600 text-base">
          {currencySymbol(o.currency)}{Number(o.amount).toFixed(2)}
        </span>
      ),
      csvValue: o => o.amount,
    },
    {
      key: 'gateway',
      header: 'Gateway',
      render: o => (
        <Badge variant={o.gateway === 'cashfree' ? 'info' : 'default'} size="sm">
          {o.gateway}
        </Badge>
      ),
      csvValue: o => o.gateway,
    },
    {
      key: 'status',
      header: 'Status',
      render: o => (
        <Badge variant={o.status === 'completed' ? 'success' : 'warning'} size="sm" dot>
          {o.status}
        </Badge>
      ),
      csvValue: o => o.status,
    },
    {
      key: 'commission',
      header: 'Commission',
      render: o => o.hasCommission ? (
        <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
          <CheckCircle className="w-3.5 h-3.5" /> Awarded
        </span>
      ) : (
        <button
          onClick={() => setModal({ open: true, orderId: o.orderId, referralCode: o.referredBy || '' })}
          className="flex items-center gap-1 text-amber-600 text-xs font-bold hover:text-amber-700 transition-colors"
        >
          <Gift className="w-3.5 h-3.5" /> Award
        </button>
      ),
      csvValue: o => o.hasCommission ? 'Yes' : 'No',
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      sortValue: o => o.createdAt?.toDate?.()?.getTime?.() ?? 0,
      render: o => <span className="text-xs text-muted-foreground font-medium">{formatDate(o.createdAt)}</span>,
      csvValue: o => formatDate(o.createdAt),
    },
    {
      key: 'actions',
      header: '',
      render: o => (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={ExternalLink}
          onClick={() => navigate(prefix(`/admin/users/${o.userId}`))}
          className="text-xs"
        >
          User
        </Button>
      ),
      csvValue: () => '',
    },
  ];

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const missingCommissions = orders.filter(o => !o.hasCommission && o.referredBy).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Revenue"
        labelIcon={ShoppingBag}
        title="Orders"
        subtitle="All completed payment orders across Cashfree and PayPal."
        actions={
          <Button variant="secondary" size="sm" leftIcon={RefreshCw} onClick={fetchOrders}>
            Refresh
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: orders.length.toString(), color: 'primary' },
          { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(2)}`, color: 'emerald' },
          { label: 'With Commission', value: orders.filter(o => o.hasCommission).length.toString(), color: 'violet' },
          { label: 'Missing Commission', value: missingCommissions.toString(), color: missingCommissions > 0 ? 'amber' : 'muted' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
            <p className={cn('text-2xl font-black', {
              'text-primary': s.color === 'primary',
              'text-emerald-600': s.color === 'emerald',
              'text-violet-600': s.color === 'violet',
              'text-amber-500': s.color === 'amber',
              'text-foreground': s.color === 'muted',
            })}>{s.value}</p>
          </div>
        ))}
      </div>

      {missingCommissions > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm font-medium">
            <strong>{missingCommissions}</strong> order(s) have a referral code but no commission was awarded. Click <strong>Award</strong> on each row to fix.
          </p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={orders}
        rowKey={o => o.id}
        loading={loading}
        searchPlaceholder="Search by order ID or email..."
        exportFilename="orders"
        emptyIcon={ShoppingBag}
        emptyTitle="No orders found"
        emptyMessage="Orders appear here after successful payments."
      />

      {/* Award commission modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-black text-foreground">Award Affiliate Commission</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Manually credit the referrer for order <span className="font-mono text-xs">{modal.orderId}</span>
              </p>
            </div>
            <Input
              label="Referral Code"
              id="referralCode"
              name="referralCode"
              placeholder="e.g. ABC123"
              value={modal.referralCode}
              onChange={e => setModal(m => ({ ...m, referralCode: e.target.value }))}
              variant="filled"
            />
            <p className="text-xs text-muted-foreground">
              This will look up the user with this referral code and credit them the commission based on current marketing config rates.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setModal({ open: false, orderId: '', referralCode: '' })}>
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                isLoading={awarding === modal.orderId}
                onClick={handleAwardCommission}
                leftIcon={Gift}
              >
                Award Commission
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
