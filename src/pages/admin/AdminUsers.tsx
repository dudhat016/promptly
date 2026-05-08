import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { UserProfile } from '../../types';
import { UserCheck, Shield, Users } from 'lucide-react';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import type { DataTableColumn, DataTableActions } from '../../components/admin';
import { toast } from 'react-hot-toast';

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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateUser = async (uid: string, updates: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, 'users', uid), { ...updates, updatedAt: serverTimestamp() });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...updates } as UserProfile : u));
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
      setUsers(prev => prev.filter(u => u.uid !== user.uid));
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleBulkDelete = async (rows: UserProfile[]) => {
    await Promise.all(rows.map(u => deleteDoc(doc(db, 'users', u.uid))));
    setUsers(prev => prev.filter(u => !rows.some(r => r.uid === u.uid)));
    toast.success(`${rows.length} users deleted`);
  };

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
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
            u.subscriptionStatus === 'pro'
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}>
            {u.subscriptionStatus === 'pro' ? 'Pro' : 'Free'}
          </span>
          {u.role === 'admin' && (
            <span className="badge-red">Admin</span>
          )}
        </div>
      ),
      csvValue: u => u.subscriptionStatus ?? 'free',
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
          <button
            onClick={() => handleUpdateUser(u.uid, { subscriptionStatus: u.subscriptionStatus === 'pro' ? 'free' : 'pro' })}
            title={u.subscriptionStatus === 'pro' ? 'Downgrade to Free' : 'Upgrade to Pro'}
            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/8 rounded-md transition-all"
          >
            <UserCheck className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleUpdateUser(u.uid, { role: u.role === 'admin' ? 'user' : 'admin' })}
            title={u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
            className="p-2 text-muted-foreground hover:text-purple-600 hover:bg-purple-500/10 rounded-md transition-all"
          >
            <Shield className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const actions: DataTableActions<UserProfile> = {
    view: u => `/admin/users/${u.uid}`,
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
        exportFilename="users"
        emptyIcon={Users}
        emptyTitle="No users found"
        emptyMessage="Users will appear here once they sign up."
      />
    </div>
  );
}
