import { collection, deleteDoc, doc, getDocs, increment, orderBy, query, serverTimestamp, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { Coins, Mail, Shield, UserCheck, Users, TrendingUp, Clock, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { BulkAction, DataTableActions, DataTableColumn } from '../../components/admin';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import { adminCache } from '../../lib/adminCache';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { usePath } from '../../hooks/usePath';
import Badge from '../../components/primitives/Badge';
import { useStaffRoles } from '../../hooks/useStaffRoles';
import { useConfig } from '../../hooks/useConfig';

const formatDate = (date: any): string => {
  if (!date) return 'N/A';
  try {
    if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
    if (typeof date === 'object' && date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    const parsed = new Date(date);
    return parsed.toString() !== 'Invalid Date' ? parsed.toLocaleDateString() : 'N/A';
  } catch {
    return 'N/A';
  }
};

const sortableDate = (date: any): number => {
  if (!date) return 0;
  try {
    if (date instanceof Timestamp) return date.toMillis();
    if (typeof date === 'object' && date.seconds) return date.seconds * 1000;
    return new Date(date).getTime() || 0;
  } catch {
    return 0;
  }
};

export default function AdminUsers() {
  const confirm = useConfirm();
  const { prefix } = usePath();
  const { config } = useConfig();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [ltvMap, setLtvMap] = useState<Record<string, number>>({});
  const { staffRoles } = useStaffRoles();

  // Bulk action modals
  const [creditModal, setCreditModal] = useState<{ open: boolean; rows: UserProfile[] }>({ open: false, rows: [] });
  const [planModal, setPlanModal] = useState<{ open: boolean; rows: UserProfile[] }>({ open: false, rows: [] });
  const [creditAmount, setCreditAmount] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [bulkWorking, setBulkWorking] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    const cachedUsers = adminCache.get<UserProfile[]>('admin_users');
    const cachedLtv   = adminCache.get<Record<string, number>>('admin_ltv');
    if (cachedUsers && cachedLtv) {
      setUsers(cachedUsers);
      setLtvMap(cachedLtv);
      setLoading(false);
      return;
    }
    try {
      const [userSnap, orderSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'orders'), where('status', 'in', ['paid', 'completed']))),
      ]);
      const users = userSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      const ltv: Record<string, number> = {};
      orderSnap.docs.forEach(d => {
        const { userId, amount } = d.data();
        if (userId) ltv[userId] = (ltv[userId] || 0) + (Number(amount) || 0);
      });
      adminCache.set('admin_users', users);
      adminCache.set('admin_ltv', ltv);
      setUsers(users);
      setLtvMap(ltv);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateUser = async (uid: string, updates: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, 'users', uid), { ...updates, updatedAt: serverTimestamp() });
      setUsers(prev => { const next = prev.map(u => u.uid === uid ? { ...u, ...updates } as UserProfile : u); adminCache.set('admin_users', next); return next; });
      toast.success('User updated');
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async (user: UserProfile) => {
    const ok = await confirm({ title: `Delete user "${user.displayName || user.email}"?`, description: 'This action cannot be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      setUsers(prev => { const next = prev.filter(u => u.uid !== user.uid); adminCache.set('admin_users', next); return next; });
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleRoleChange = async (u: UserProfile, value: string) => {
    if (value === 'admin') {
      await handleUpdateUser(u.uid, { role: 'admin', staffRole: undefined });
    } else if (value === 'user') {
      await handleUpdateUser(u.uid, { role: 'user', staffRole: undefined });
    } else if (value.startsWith('staff:')) {
      const staffRoleId = value.slice(6);
      await handleUpdateUser(u.uid, { role: 'staff', staffRole: staffRoleId });
    }
  };

  const handleBulkDelete = async (rows: UserProfile[]) => {
    await Promise.all(rows.map(u => deleteDoc(doc(db, 'users', u.uid))));
    setUsers(prev => { const next = prev.filter(u => !rows.some(r => r.uid === u.uid)); adminCache.set('admin_users', next); return next; });
    toast.success(`${rows.length} users deleted`);
  };

  const handleBulkCredits = async () => {
    const delta = parseInt(creditAmount);
    if (!delta || isNaN(delta)) { toast.error('Enter a valid amount'); return; }
    setBulkWorking(true);
    try {
      const batch = writeBatch(db);
      creditModal.rows.forEach(u => {
        batch.update(doc(db, 'users', u.uid), {
          credits: increment(delta),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      setUsers(prev => { const next = prev.map(u => creditModal.rows.some(r => r.uid === u.uid) ? { ...u, credits: (u.credits || 0) + delta } : u); adminCache.set('admin_users', next); return next; });
      toast.success(`${delta > 0 ? '+' : ''}${delta} credits applied to ${creditModal.rows.length} users`);
      setCreditModal({ open: false, rows: [] });
      setCreditAmount('');
    } catch {
      toast.error('Failed to adjust credits');
    } finally {
      setBulkWorking(false);
    }
  };

  const handleBulkPlan = async () => {
    if (!selectedPlan) { toast.error('Select a plan'); return; }
    setBulkWorking(true);
    const isUpgrade = selectedPlan === 'pro';
    try {
      const batch = writeBatch(db);
      planModal.rows.forEach(u => {
        batch.update(doc(db, 'users', u.uid), {
          subscriptionStatus: selectedPlan,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      setUsers(prev => { const next = prev.map(u => planModal.rows.some(r => r.uid === u.uid) ? { ...u, subscriptionStatus: selectedPlan as UserProfile['subscriptionStatus'] } : u); adminCache.set('admin_users', next); return next; });
      toast.success(`${planModal.rows.length} users moved to ${selectedPlan}`);
      setPlanModal({ open: false, rows: [] });
      setSelectedPlan('');
    } catch {
      toast.error('Failed to update plans');
    } finally {
      setBulkWorking(false);
    }
  };

  const bulkActions: BulkAction<UserProfile>[] = [
    {
      label: 'Adjust Credits',
      icon: Coins,
      variant: 'success',
      onClick: rows => setCreditModal({ open: true, rows }),
    },
    {
      label: 'Change Plan',
      icon: Zap,
      variant: 'warning',
      onClick: rows => setPlanModal({ open: true, rows }),
    },
  ];

  const columns: DataTableColumn<UserProfile>[] = [
    {
      key: 'user',
      header: 'User',
      searchValue: u => `${u.displayName ?? ''} ${u.email ?? ''}`,
      render: u => (
        <div className="flex items-center gap-3">
          {u.photoURL ? (
            <img src={u.photoURL} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-sm uppercase flex-shrink-0">
              {u.displayName?.charAt(0) || u.email?.charAt(0) || 'U'}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{u.displayName || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          </div>
        </div>
      ),
      csvValue: u => `${u.displayName ?? ''} <${u.email ?? ''}>`,
    },
    {
      key: 'plan',
      header: 'Plan',
      searchValue: u => u.subscriptionStatus ?? '',
      sortable: true,
      sortValue: u => u.subscriptionStatus ?? '',
      render: u => (
        <div className="flex flex-col gap-1.5 items-start">
          <Badge variant={u.subscriptionStatus === 'pro' ? 'soft' : 'outline'} size="sm">
            {u.subscriptionStatus === 'pro' ? 'Pro' : 'Free'}
          </Badge>
          {u.role === 'admin' && (
            <Badge variant="error" size="sm" dot pulse>Admin</Badge>
          )}
        </div>
      ),
      csvValue: u => u.subscriptionStatus ?? 'free',
    },
    {
      key: 'role',
      header: 'Role',
      searchValue: u => `${u.role ?? ''} ${u.staffRole ?? ''}`,
      render: u => {
        const currentValue = u.role === 'admin'
          ? 'admin'
          : u.role === 'staff' && u.staffRole
            ? `staff:${u.staffRole}`
            : 'user';
        return (
          <select
            value={currentValue}
            onChange={e => handleRoleChange(u, e.target.value)}
            onClick={e => e.stopPropagation()}
            className="text-xs font-medium bg-background border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer min-w-[120px]"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            {staffRoles.map(role => (
              <option key={role.id} value={`staff:${role.id}`}>
                {role.name}
              </option>
            ))}
          </select>
        );
      },
      csvValue: u => u.staffRole ? `staff:${u.staffRole}` : (u.role ?? 'user'),
    },
    {
      key: 'interests',
      header: 'Interests',
      searchValue: u => (u.interests || []).join(' '),
      render: u => (
        <div className="flex flex-wrap gap-1 max-w-[150px]">
          {(u.interests || []).slice(0, 3).map(interest => (
            <Badge key={interest} variant="outline" size="sm" className="bg-muted/50 border-border/50 lowercase font-medium">
              {interest}
            </Badge>
          ))}
          {(u.interests || []).length > 3 && (
            <span className="text-[9px] font-bold text-muted-foreground/60">
              +{(u.interests || []).length - 3}
            </span>
          )}
          {(!u.interests || u.interests.length === 0) && (
            <span className="text-[10px] text-muted-foreground/40 italic">No interests</span>
          )}
        </div>
      ),
      csvValue: u => (u.interests || []).join(', '),
    },
    {
      key: 'credits',
      header: 'Credits',
      sortable: true,
      sortValue: u => u.credits ?? 0,
      render: u => (
        <span className="font-bold text-foreground">{u.credits ?? 0}</span>
      ),
      csvValue: u => u.credits ?? 0,
    },
    {
      key: 'ltv',
      header: 'LTV',
      sortable: true,
      sortValue: u => ltvMap[u.uid] ?? 0,
      render: u => {
        const val = ltvMap[u.uid] ?? 0;
        return (
          <div className="flex items-center gap-1.5">
            <TrendingUp className={`w-3.5 h-3.5 shrink-0 ${val > 0 ? 'text-emerald-500' : 'text-muted-foreground/30'}`} />
            <span className={`font-bold text-sm ${val > 0 ? 'text-emerald-600' : 'text-muted-foreground/40'}`}>
              {val > 0 ? `$${val.toFixed(2)}` : '—'}
            </span>
          </div>
        );
      },
      csvValue: u => ltvMap[u.uid] ?? 0,
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      sortable: true,
      sortValue: u => sortableDate(u.lastActiveAt),
      render: u => {
        if (!u.lastActiveAt) return <span className="text-xs text-muted-foreground/40">Never</span>;
        const d = u.lastActiveAt instanceof Timestamp ? u.lastActiveAt.toDate() : new Date(u.lastActiveAt?.seconds ? u.lastActiveAt.seconds * 1000 : u.lastActiveAt);
        const now = Date.now();
        const diff = now - d.getTime();
        const days = Math.floor(diff / 86400000);
        const label = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? `${days}d ago` : days < 30 ? `${Math.floor(days / 7)}w ago` : formatDate(u.lastActiveAt);
        const isRecent = days < 3;
        return (
          <div className="flex items-center gap-1.5">
            <Clock className={`w-3 h-3 shrink-0 ${isRecent ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
            <span className={`text-xs font-medium ${isRecent ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
          </div>
        );
      },
      csvValue: u => formatDate(u.lastActiveAt),
    },
    {
      key: 'joined',
      header: 'Joined',
      sortable: true,
      sortValue: u => sortableDate(u.createdAt),
      render: u => (
        <span className="text-sm text-muted-foreground font-medium">{formatDate(u.createdAt)}</span>
      ),
      csvValue: u => formatDate(u.createdAt),
    },
    {
      key: 'quickActions',
      header: 'Quick Actions',
      hideable: false,
      className: 'text-right',
      render: u => (
        <div className="flex items-center justify-end gap-1">
          <Button
            onClick={() => handleUpdateUser(u.uid, { subscriptionStatus: u.subscriptionStatus === 'pro' ? 'free' : 'pro' })}
            title={u.subscriptionStatus === 'pro' ? 'Downgrade to Free' : 'Upgrade to Pro'}
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary hover:bg-primary/8"
          >
            <UserCheck className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => handleUpdateUser(u.uid, { role: u.role === 'admin' ? 'user' : 'admin' })}
            title={u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-purple-600 hover:bg-purple-500/10"
          >
            <Shield className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const actions: DataTableActions<UserProfile> = {
    edit: u => prefix(`/admin/users/${u.uid}`),
    onDelete: handleDelete,
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        label="Platform"
        labelIcon={Users}
        title="Users"
        subtitle="Manage platform users, roles, and subscriptions."
      />
      <DataTable
        columns={columns}
        data={users}
        rowKey={u => u.uid}
        loading={loading}
        actions={actions}
        searchPlaceholder="Search by name or email..."
        selectable
        onBulkDelete={handleBulkDelete}
        bulkActions={bulkActions}
        exportFilename="users"
        emptyIcon={Users}
        emptyTitle="No users found"
        emptyMessage="Users will appear here once they sign up."
      />

      {/* ── Credit Adjust Modal ── */}
      {creditModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setCreditModal({ open: false, rows: [] })} />
          <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <Coins className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Adjust Credits</h3>
                <p className="text-xs text-muted-foreground">{creditModal.rows.length} user{creditModal.rows.length !== 1 ? 's' : ''} selected</p>
              </div>
            </div>
            <Input
              label="Credit amount (use negative to deduct)"
              type="number"
              value={creditAmount}
              onChange={e => setCreditAmount(e.target.value)}
              placeholder="e.g. 10 or -5"
              variant="outline"
              autoFocus
            />
            <div className="flex gap-3">
              <Button onClick={() => { setCreditModal({ open: false, rows: [] }); setCreditAmount(''); }} variant="outline" size="sm" fullWidth>Cancel</Button>
              <Button onClick={handleBulkCredits} isLoading={bulkWorking} variant="primary" size="sm" fullWidth>Apply</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan Change Modal ── */}
      {planModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setPlanModal({ open: false, rows: [] })} />
          <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Change Plan</h3>
                <p className="text-xs text-muted-foreground">{planModal.rows.length} user{planModal.rows.length !== 1 ? 's' : ''} selected</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-foreground">Select plan</p>
              <div className="grid grid-cols-2 gap-2">
                {['free', 'pro', ...(config.plans.map(p => p.id).filter(id => id !== 'free' && id !== 'pro'))].map(planId => (
                  <button
                    key={planId}
                    onClick={() => setSelectedPlan(planId)}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-all ${
                      selectedPlan === planId
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {planId.charAt(0).toUpperCase() + planId.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => { setPlanModal({ open: false, rows: [] }); setSelectedPlan(''); }} variant="outline" size="sm" fullWidth>Cancel</Button>
              <Button onClick={handleBulkPlan} isLoading={bulkWorking} variant="primary" size="sm" fullWidth disabled={!selectedPlan}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
