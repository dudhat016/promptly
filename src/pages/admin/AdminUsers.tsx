import { collection, deleteDoc, doc, getDocs, increment, orderBy, query, serverTimestamp, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { Coins, Mail, Shield, UserCheck, Users, TrendingUp, Clock, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { BulkAction, DataTableActions, DataTableColumn } from '../../components/admin';
import { AdminPageHeader, DataTable, useConfirm } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Select from '../../components/primitives/Select';
import Card from '../../components/primitives/Card';
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
  const { staffRoles } = useStaffRoles();

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    const cachedUsers = adminCache.get<UserProfile[]>('admin_users');
    if (cachedUsers) {
      setUsers(cachedUsers);
      setLoading(false);
      return;
    }
    try {
      const userSnap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
      const users = userSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      adminCache.set('admin_users', users);
      setUsers(users);
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
    } catch (err: any) {
      console.error('[AdminUsers] Error deleting user:', err);
      toast.error(err?.message ? `Failed to delete user: ${err.message}` : 'Failed to delete user');
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
    try {
      await Promise.all(rows.map(u => deleteDoc(doc(db, 'users', u.uid))));
      setUsers(prev => { const next = prev.filter(u => !rows.some(r => r.uid === u.uid)); adminCache.set('admin_users', next); return next; });
      toast.success(`${rows.length} users deleted`);
    } catch (err: any) {
      console.error('[AdminUsers] Error bulk deleting users:', err);
      toast.error(err?.message ? `Failed to delete users: ${err.message}` : 'Failed to delete users');
    }
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
          <div onClick={e => e.stopPropagation()} className="min-w-[130px]">
            <Select
              value={currentValue}
              onChange={val => handleRoleChange(u, val as string)}
              options={[
                { value: 'user', label: 'User' },
                { value: 'admin', label: 'Admin' },
                ...staffRoles.map(r => ({ value: `staff:${r.id}`, label: r.name })),
              ]}
              isSearchable={false}
            />
          </div>
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
        subtitle="Manage platform users and roles."
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
