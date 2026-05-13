import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { Shield, UserCheck, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { DataTableActions, DataTableColumn } from '../../components/admin';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import Button from '../../components/primitives/Button';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { usePath } from '../../hooks/usePath';
import Badge from '../../components/primitives/Badge';
import { useStaffRoles } from '../../hooks/useStaffRoles';

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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { staffRoles } = useStaffRoles();

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
        exportFilename="users"
        emptyIcon={Users}
        emptyTitle="No users found"
        emptyMessage="Users will appear here once they sign up."
      />
    </div>
  );
}
