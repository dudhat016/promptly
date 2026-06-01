import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { UserProfile } from '../../types';
import { Gift, Award, RefreshCw, Clock, DollarSign, Users, TrendingUp, ExternalLink } from 'lucide-react';
import { AdminPageHeader, DataTable } from '../../components/admin';
import type { DataTableColumn, DataTableActions } from '../../components/admin';
import { toast } from 'react-hot-toast';
import Button from '../../components/primitives/Button';
import Badge from '../../components/primitives/Badge';
import Card from '../../components/primitives/Card';
import { usePath } from '../../hooks/usePath';

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
  const { prefix } = usePath();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const uSnap = await getDocs(collection(db, 'users'));
      setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load affiliates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const affiliates = users.filter(u =>
    (u.referralsCount && u.referralsCount > 0) ||
    (u.affiliateEarnings && u.affiliateEarnings > 0) ||
    (u.pendingEarnings && u.pendingEarnings > 0)
  );

  const totalAvailable = affiliates.reduce((s, u) => s + (u.affiliateEarnings ?? 0), 0);
  const totalLocked    = affiliates.reduce((s, u) => s + (u.pendingEarnings ?? 0), 0);
  const totalReferrals = affiliates.reduce((s, u) => s + (u.referralsCount ?? 0), 0);

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
      render: u => <span className="font-bold text-foreground">{u.referralsCount || 0}</span>,
      csvValue: u => u.referralsCount ?? 0,
    },
    {
      key: 'available',
      header: 'Available',
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
      key: 'pending',
      header: 'In Lock-up',
      sortable: true,
      sortValue: u => u.pendingEarnings ?? 0,
      render: u => (
        <div className="flex items-center gap-1.5">
          {(u.pendingEarnings ?? 0) > 0 && <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
          <span className={`font-semibold ${(u.pendingEarnings ?? 0) > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
            ${(u.pendingEarnings || 0).toFixed(2)}
          </span>
        </div>
      ),
      csvValue: u => (u.pendingEarnings || 0).toFixed(2),
    },
    {
      key: 'withdrawn',
      header: 'Withdrawn',
      sortable: true,
      sortValue: u => u.withdrawnAmount ?? 0,
      render: u => (
        <span className="text-sm text-muted-foreground font-semibold">
          ${(u.withdrawnAmount || 0).toFixed(2)}
        </span>
      ),
      csvValue: u => (u.withdrawnAmount || 0).toFixed(2),
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
      key: 'payouts',
      header: 'Payouts',
      hideable: false,
      render: u => (u.affiliateEarnings ?? 0) > 0 ? (
        <Link
          to={prefix('/admin/withdrawals')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          View Requests
        </Link>
      ) : (
        <Badge variant="soft" size="sm" className="bg-muted text-muted-foreground border-transparent">
          {(u.pendingEarnings ?? 0) > 0 ? 'In Lock-up' : 'All Paid'}
        </Badge>
      ),
    },
  ];

  const actions: DataTableActions<UserProfile> = {
    view: u => prefix(`/admin/users/${u.uid}`),
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Revenue"
        labelIcon={Gift}
        title="Affiliate Program"
        subtitle="Track referral earnings, lock periods, and withdrawal requests."
        actions={
          <Button onClick={loadData} isLoading={loading} variant="ghost" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Affiliates',      value: affiliates.length,                icon: Users,      accent: 'bg-amber-500/10 text-amber-600' },
          { label: 'Total Referrals', value: totalReferrals,                   icon: TrendingUp, accent: 'bg-primary/10 text-primary' },
          { label: 'Available',       value: `$${totalAvailable.toFixed(2)}`,  icon: DollarSign, accent: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'In Lock-up',      value: `$${totalLocked.toFixed(2)}`,     icon: Clock,      accent: 'bg-amber-500/10 text-amber-600' },
        ].map(s => (
          <Card key={s.label} padding="sm" className="flex-row items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.accent}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <p className="text-lg font-black text-foreground leading-none">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

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
