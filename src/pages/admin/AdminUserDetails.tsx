import { cn } from '@/src/lib/utils';
import { sendPasswordResetEmail } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc, getDoc,
  getDocs, orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  limit,
} from 'firebase/firestore';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  Clock,
  CreditCard, Lock,
  Mail,
  MapPin,
  Minus,
  Plus,
  Send,
  Shield,
  Unlock,
  Users,
  Target,
  Cpu,
  ShoppingBag,
  Gift,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { AdminPageHeader, useConfirm } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Card from '../../components/primitives/Card';
import Input from '../../components/primitives/Input';
import Tabs from '../../components/navigation/Tabs';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/useConfig';
import { logAuditEvent } from '../../lib/auditLog';
import { auth, db } from '../../lib/firebase';
import { ActivityItem, UserProfile } from '../../types';
import { useStaffRoles } from '../../hooks/useStaffRoles';
import Select from '../../components/primitives/Select';

export default function AdminUserDetails() {
  const confirm = useConfirm();
  const { user: adminUser } = useAuth();
  const { config } = useConfig();
  const { id } = useParams();
  const navigate = useNavigate();
  const { prefix } = usePath();


  const [user, setUser] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'security'>('overview');



  // Staff role assignment
  const { staffRoles } = useStaffRoles();
  const [savingStaffRole, setSavingStaffRole] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (!userDoc.exists()) {
          toast.error('User not found');
          navigate(prefix('/admin/users'));
          return;
        }
        setUser({ uid: userDoc.id, ...userDoc.data() } as UserProfile);

        const q = query(
          collection(db, 'marketing_activities'),
          where('contactId', '==', id),
          orderBy('timestamp', 'desc'),
        );
        const activitySnap = await getDocs(q);
        setActivities(activitySnap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityItem)));
      } catch (err) {
        console.error(err);
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, navigate, prefix]);




  // ── Actions ────────────────────────────────────────────────────────────────



  const handleToggleRole = async () => {
    if (!user || !id) return;
    const newRole: 'admin' | 'user' = user.role === 'admin' ? 'user' : 'admin';
    const ok = await confirm({
      title: `Make this user ${newRole === 'admin' ? 'an Admin' : 'a regular User'}?`,
      description: 'This changes what the user can access in the admin panel.',
      confirmLabel: 'Confirm',
      destructive: newRole === 'admin',
    });
    if (!ok) return;
    await handleSetStaffRole(newRole);
  };

  const handleSetStaffRole = async (newRole: 'admin' | 'user' | 'staff', newStaffRole?: string) => {
    if (!user || !id) return;
    setSavingStaffRole(true);
    try {
      const updates: any = { role: newRole, updatedAt: serverTimestamp() };
      if (newRole === 'staff') {
        updates.staffRole = newStaffRole || '';
      } else {
        updates.staffRole = null;
      }
      await updateDoc(doc(db, 'users', id), updates);
      setUser(prev => prev ? { ...prev, role: newRole, staffRole: newStaffRole } : null);
      logAuditEvent({ action: 'user.role_changed', entityType: 'user', entityId: id, actorEmail: adminUser?.email ?? undefined, details: { newRole, staffRole: newStaffRole } });
      toast.success(`Role updated to ${newRole.toUpperCase()}${newStaffRole ? ` (${newStaffRole})` : ''}`);
    } catch {
      toast.error('Failed to update role');
    } finally {
      setSavingStaffRole(false);
    }
  };



  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      logAuditEvent({ action: 'user.password_reset_sent', entityType: 'user', entityId: id, actorEmail: adminUser?.email ?? undefined });
      toast.success('Password reset email sent');
    } catch {
      toast.error('Failed to send reset email');
    }
  };

  const handleSuspend = async () => {
    if (!user || !id) return;
    const isSuspended = !!user.suspended;
    const ok = await confirm({
      title: isSuspended ? 'Restore account access?' : 'Suspend this user?',
      description: isSuspended
        ? 'The user will regain access to the platform.'
        : 'The user will be blocked from accessing the platform.',
      confirmLabel: isSuspended ? 'Restore' : 'Suspend',
      destructive: !isSuspended,
    });
    if (!ok) return;
    try {
      await updateDoc(doc(db, 'users', id), { suspended: !isSuspended, updatedAt: serverTimestamp() });
      setUser(prev => prev ? { ...prev, suspended: !isSuspended } : null);
      logAuditEvent({ action: isSuspended ? 'user.unsuspended' : 'user.suspended', entityType: 'user', entityId: id, actorEmail: adminUser?.email ?? undefined });
      toast.success(isSuspended ? 'Account restored' : 'Account suspended');
    } catch {
      toast.error('Failed to update account status');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="p-20 text-center text-muted-foreground font-bold uppercase tracking-widest animate-pulse">Loading User Profile...</div>;
  }
  if (!user) return null;

  const isSuspended = !!user.suspended;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        label="Users"
        labelIcon={Users}
        title={user.displayName || user.email || 'User Detail'}
        subtitle="Manage subscription, role, and activity for this user."
        actions={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate(prefix('/admin/users'))}
              variant="secondary"
              leftIcon={ArrowLeft}
              size="sm"
            >
              Back
            </Button>
            <Button
              onClick={handleToggleRole}
              variant="secondary"
              leftIcon={Shield}
              size="sm"
              className="border-purple-500/20 text-purple-600 hover:bg-purple-500/10"
            >
              {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
            </Button>
          </div>
        }
      />

      {/* Profile card */}
      <Card padding="none" className="!rounded-2xl">
        <div className="p-8 flex flex-wrap items-start justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-20 h-20 rounded-2xl border-4 border-white shadow-xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border-4 border-white shadow-xl text-3xl font-black uppercase">
                  {user.displayName?.charAt(0) || user.email?.charAt(0)}
                </div>
              )}
              {user.role === 'admin' && (
                <div className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white">
                  <Shield className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h1 className="text-2xl font-black text-foreground tracking-tight">{user.displayName || 'Unknown User'}</h1>
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  isSuspended ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                  'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                }`}>
                  {isSuspended ? 'Suspended' : 'Active'}
                </span>
              </div>
              <p className="text-base text-muted-foreground font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-muted/30 p-5 rounded-xl border border-border min-w-[140px]">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-primary" /> Joined
              </p>
              <span className="text-sm font-black text-foreground">
                {user.createdAt ? (() => { try { return (user.createdAt as any).toDate().toLocaleDateString(); } catch { return 'N/A'; } })() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview', icon: Users },
            { id: 'activity', label: 'Activity', icon: Activity },
            { id: 'security', label: 'Security', icon: Lock },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
          variant="pill"
          className="border-t border-border bg-muted/10 p-1 rounded-none"
          tabClassName="px-8 rounded-lg"
        />
      </Card>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: tab content */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {activeTab === 'overview' && (
            <Card padding="lg" className="!rounded-2xl space-y-8">
              <section>
                <h3 className="text-base font-bold text-foreground mb-5 flex items-center gap-2 uppercase tracking-tight">
                  <Shield className="w-4 h-4 text-primary" /> Profile Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      label: 'Display Name',
                      value: user.displayName || 'Not set'
                    },
                  {
                    label: 'User ID',
                    value: user.uid,
                    mono: true
                  },
                ].map(row => (
                  <div key={row.label} className="bg-muted/30 p-4 rounded-xl border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{row.label}</p>
                    <p className={`text-sm font-bold text-foreground break-all ${row.mono ? 'font-mono text-xs' : ''}`}>{row.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-base font-bold text-foreground mb-5 flex items-center gap-2 uppercase tracking-tight">
                <Target className="w-4 h-4 text-primary" /> Onboarding & Interests
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="!rounded-2xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Selected Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {(user.interests || []).map(interest => (
                      <span key={interest} className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold uppercase tracking-tight">
                        {interest}
                      </span>
                    ))}
                    {(!user.interests || user.interests.length === 0) && (
                      <p className="text-sm text-muted-foreground italic">No interests selected during onboarding.</p>
                    )}
                  </div>
                </Card>
                <Card className="!rounded-2xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Preferred AI Engine</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{user.preferredModel || 'Default (GPT-4o)'}</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Primary workspace model</p>
                    </div>
                  </div>
                </Card>
              </div>
            </section>

            <section>
                <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2 uppercase tracking-tight">
                  <MapPin className="w-4 h-4 text-primary" /> Timestamps
                </h3>
                <div className="bg-muted/20 rounded-xl border border-border divide-y divide-border">
                  {[
                    { label: 'Last Active', value: user.lastActiveAt },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{row.label}</span>
                      <span className="text-sm font-bold text-foreground">
                        {row.value ? (() => { try { return (row.value as any).toDate().toLocaleString(); } catch { return String(row.value); } })() : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </Card>
          )}



          {activeTab === 'activity' && (
            <Card padding="lg" className="!rounded-2xl">
              <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2 uppercase tracking-tight">
                <Activity className="w-4 h-4 text-primary" /> Activity History
              </h3>
              <div className="space-y-4 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border/50">
                {activities.map(activity => (
                  <div key={activity.id} className="relative pl-12 group">
                    <div className={`absolute left-0 top-0 w-10 h-10 rounded-xl border-4 border-card flex items-center justify-center z-10 shadow-sm ${
                      activity.type.includes('email') ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    }`}>
                      {activity.type.includes('email') ? <Mail className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div className="bg-muted/10 rounded-xl border border-border/50 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{activity.type}</span>
                        <span className="text-xs text-muted-foreground">{activity.timestamp?.toDate().toLocaleString()}</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">{activity.description}</p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-16 bg-muted/20 rounded-xl border-2 border-dashed border-border">
                    <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-bold">No activity history found.</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card padding="lg" className="!rounded-2xl space-y-4">
              {/* Suspend / Restore */}
              <div className={`flex items-center justify-between p-6 rounded-xl border ${
                isSuspended ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/10'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isSuspended ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {isSuspended ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">{isSuspended ? 'Account Suspended' : 'Restrict Account'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {isSuspended ? 'This user is currently blocked from the platform.' : 'Disable user access to the platform temporarily.'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSuspend}
                  variant={isSuspended ? 'success' : 'danger'}
                  leftIcon={isSuspended ? Unlock : Lock}
                  size="sm"
                >
                  {isSuspended ? 'Restore Access' : 'Suspend User'}
                </Button>
              </div>

              {/* Reset password */}
              <div className="flex items-center justify-between p-6 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary text-primary-foreground rounded-xl">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">Reset Password</h4>
                    <p className="text-sm text-muted-foreground">Send a password reset email to {user.email}.</p>
                  </div>
                </div>
                <Button
                  onClick={handleSendResetEmail}
                  variant="primary"
                  leftIcon={Send}
                  size="sm"
                >
                  Send Reset Link
                </Button>
              </div>

              {/* Role management */}
              <div className="space-y-3">
                {/* Admin toggle */}
                <div className="flex items-center justify-between p-6 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500 text-white rounded-xl">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">Admin Privileges</h4>
                      <p className="text-sm text-muted-foreground">
                        Current role: <span className="font-bold text-foreground">{user.role}</span>
                        {user.role === 'staff' && user.staffRole && (
                          <span className="ml-2 text-primary font-mono text-xs">({user.staffRole})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleToggleRole}
                    variant="outline"
                    leftIcon={AlertTriangle}
                    size="sm"
                    className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"
                  >
                    {user.role === 'admin' ? 'Remove Admin' : 'Grant Admin'}
                  </Button>
                </div>

                {/* Staff role assignment */}
                {staffRoles.length > 0 && (
                  <div className="p-5 bg-primary/5 rounded-xl border border-primary/10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-primary text-primary-foreground rounded-lg">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-sm">Staff Role</h4>
                        <p className="text-xs text-muted-foreground">Assign scoped admin access without full privileges</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleSetStaffRole('user')}
                        disabled={savingStaffRole}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          user.role === 'user' && !user.staffRole
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        Regular User
                      </button>
                      {staffRoles.map(sr => (
                        <button
                          key={sr.id}
                          onClick={() => handleSetStaffRole('staff', sr.id)}
                          disabled={savingStaffRole}
                          style={{ borderColor: user.staffRole === sr.id ? sr.color : undefined, color: user.staffRole === sr.id ? sr.color : undefined }}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                            user.staffRole === sr.id
                              ? 'bg-primary/10'
                              : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                          )}
                        >
                          {sr.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-5">

          {/* Permissions summary */}
          <div className="bg-foreground text-background rounded-2xl p-6 shadow-xl">
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-5 flex items-center gap-2 opacity-60">
              <Shield className="w-3.5 h-3.5" /> Permissions
            </h4>
            <div className="space-y-3">
              {[
                { label: 'Role', value: user.role.toUpperCase(), color: user.role === 'admin' ? 'text-rose-400' : user.role === 'staff' ? 'text-amber-400' : 'text-primary' },
                ...(user.role === 'staff' && user.staffRole ? [{ label: 'Staff Role', value: user.staffRole, color: 'text-amber-300' }] : []),
                { label: 'Status', value: isSuspended ? 'SUSPENDED' : 'ACTIVE', color: isSuspended ? 'text-rose-400' : 'text-emerald-400' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase opacity-50">{row.label}</span>
                  <span className={`text-xs font-black uppercase ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
