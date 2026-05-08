import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, serverTimestamp, addDoc, setDoc } from 'firebase/firestore';
import { logAuditEvent } from '../../lib/auditLog';
import { UserProfile } from '../../types';
import { Gift, Award, Check, Percent } from 'lucide-react';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import type { DataTableColumn, DataTableActions } from '../../components/admin';
import { toast } from 'react-hot-toast';
import { useMarketing } from '../../hooks/useMarketing';

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  try {
    if (typeof date.toDate === 'function') return date.toDate().toLocaleDateString();
    if (typeof date.seconds === 'number') return new Date(date.seconds * 1000).toLocaleDateString();
    return new Date(date).toLocaleDateString();
  } catch {
    return 'N/A';
  }
};

export default function AdminAffiliates() {
  const confirm = useConfirm();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { marketingConfig } = useMarketing();
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [newRate, setNewRate] = useState(marketingConfig.referralCommission);

  useEffect(() => { setNewRate(marketingConfig.referralCommission); }, [marketingConfig.referralCommission]);

  useEffect(() => {
    async function loadData() {
      try {
        const uSnap = await getDocs(collection(db, 'users'));
        setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpdateRate = async () => {
    try {
      await setDoc(doc(db, 'configs', 'marketing'), { referralCommission: Number(newRate), updatedAt: serverTimestamp() }, { merge: true });
      setIsEditingRate(false);
      logAuditEvent({ action: 'commission.updated', entityType: 'config', details: { rate: Number(newRate) } });
      toast.success('Commission rate updated!');
    } catch {
      toast.error('Failed to update rate');
    }
  };

  const handleProcessPayout = async (affiliate: UserProfile) => {
    const amount = affiliate.affiliateEarnings || 0;
    if (amount <= 0) return toast.error('No pending earnings');
    const ok = await confirm({ title: `Mark $${amount} as paid to ${affiliate.email}?`, description: 'This action cannot be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await addDoc(collection(db, 'payouts'), {
        userId: affiliate.uid,
        userEmail: affiliate.email,
        amount,
        status: 'paid',
        processedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', affiliate.uid), { affiliateEarnings: 0, updatedAt: serverTimestamp() });
      setUsers(prev => prev.map(u => u.uid === affiliate.uid ? { ...u, affiliateEarnings: 0 } : u));
      logAuditEvent({ action: 'payout.processed', entityType: 'user', entityId: affiliate.uid, details: { amount, email: affiliate.email } });
      toast.success('Payout processed!');
    } catch {
      toast.error('Failed to process payout');
    }
  };

  const affiliates = users.filter(u => (u.referralsCount && u.referralsCount > 0) || (u.affiliateEarnings && u.affiliateEarnings > 0));

  const columns: DataTableColumn<UserProfile>[] = [
    {
      key: 'affiliate',
      header: 'Affiliate',
      searchValue: u => `${u.displayName ?? ''} ${u.email ?? ''}`,
      sortable: true,
      sortValue: u => u.displayName ?? u.email ?? '',
      render: u => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500/10 text-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{u.displayName || 'Unknown User'}</p>
            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          </div>
        </div>
      ),
      csvValue: u => `${u.displayName ?? ''} <${u.email ?? ''}>`,
    },
    {
      key: 'referrals',
      header: 'Referrals',
      sortable: true,
      sortValue: u => u.referralsCount ?? 0,
      render: u => (
        <span className="font-bold text-foreground">{u.referralsCount || 0}</span>
      ),
      csvValue: u => u.referralsCount ?? 0,
    },
    {
      key: 'earnings',
      header: 'Unpaid Earnings',
      sortable: true,
      sortValue: u => u.affiliateEarnings ?? 0,
      render: u => (
        <span className={`font-bold ${(u.affiliateEarnings ?? 0) > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
          ${(u.affiliateEarnings || 0).toFixed(2)}
        </span>
      ),
      csvValue: u => (u.affiliateEarnings || 0).toFixed(2),
    },
    {
      key: 'joined',
      header: 'Joined',
      sortable: true,
      sortValue: u => {
        const d = u.createdAt as any;
        if (!d) return 0;
        if (typeof d.toMillis === 'function') return d.toMillis();
        if (typeof d.seconds === 'number') return d.seconds * 1000;
        return 0;
      },
      render: u => <span className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</span>,
      csvValue: u => formatDate(u.createdAt),
    },
    {
      key: 'payout',
      header: 'Payout',
      hideable: false,
      render: u => (u.affiliateEarnings ?? 0) > 0 ? (
        <button
          onClick={() => handleProcessPayout(u)}
          className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-bold hover:bg-primary/20 transition-all"
        >
          Mark as Paid
        </button>
      ) : (
        <span className="text-xs text-muted-foreground font-bold bg-muted px-3 py-1.5 rounded-lg">All Paid</span>
      ),
    },
  ];

  const actions: DataTableActions<UserProfile> = {
    view: u => `/admin/users/${u.uid}`,
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Revenue"
        labelIcon={Gift}
        title="Affiliate Program"
        subtitle="Manage referral earnings and process affiliate payouts."
        actions={
          <div className="bg-primary/8 border border-primary/10 rounded-lg px-5 py-3 flex items-center gap-4 shadow-sm min-w-[260px]">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <Percent className="w-4 h-4 text-white" />
            </div>
            <div className="flex-grow">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Commission Rate</p>
              {isEditingRate ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newRate}
                    onChange={e => setNewRate(Number(e.target.value))}
                    className="w-16 bg-card border border-border rounded-lg px-2 py-1 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button onClick={handleUpdateRate} className="bg-primary text-white p-1.5 rounded-lg hover:bg-primary/90 transition-all">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-foreground">{marketingConfig.referralCommission}% Commission</p>
                  <button onClick={() => setIsEditingRate(true)} className="text-xs font-bold text-primary hover:underline">Edit</button>
                </div>
              )}
            </div>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={affiliates}
        rowKey={u => u.uid}
        loading={loading}
        actions={actions}
        searchPlaceholder="Search by name or email..."
        exportFilename="affiliates"
        emptyIcon={Gift}
        emptyTitle="No affiliates yet"
        emptyMessage="Users who refer others will appear here."
      />
    </div>
  );
}
