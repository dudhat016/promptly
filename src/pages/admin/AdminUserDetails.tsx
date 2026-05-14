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
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import { AdminPageHeader, useConfirm } from '../../components/admin';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import Tabs from '../../components/navigation/Tabs';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/useConfig';
import { logAuditEvent } from '../../lib/auditLog';
import { auth, db } from '../../lib/firebase';
import { ActivityItem, PricingPlan, UserProfile } from '../../types';
import { useStaffRoles } from '../../hooks/useStaffRoles';
import Select from '../../components/primitives/Select';

export default function AdminUserDetails() {
  const confirm = useConfirm();
  const { user: adminUser } = useAuth();
  const { config } = useConfig();
  const { id } = useParams();
  const navigate = useNavigate();
  const { prefix } = usePath();

  const plans = config.plans;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'security'>('overview');

  // Credit adjustment state
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

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

  const [changingPlan, setChangingPlan] = useState(false);

  const handleChangePlan = async (planId: string) => {
    if (!user || !id || planId === user.activePlanId) return;
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    // Derive subscriptionStatus from plan properties
    const nameLower = plan.name.toLowerCase();
    let newStatus: 'free' | 'pro' | 'enterprise' = 'pro';
    if (plan.monthlyPrice === 0) newStatus = 'free';
    else if (nameLower.includes('enterprise') || nameLower.includes('agency') || nameLower.includes('team')) newStatus = 'enterprise';

    const credits = plan.monthlyCredits ?? (newStatus === 'enterprise' ? 2500 : newStatus === 'pro' ? 500 : 50);

    setChangingPlan(true);
    try {
      await updateDoc(doc(db, 'users', id), {
        subscriptionStatus: newStatus,
        activePlanId: planId,
        credits,
        monthlyLimit: credits,
        updatedAt: serverTimestamp(),
      });
      setUser(prev => prev ? { ...prev, subscriptionStatus: newStatus, activePlanId: planId, credits } : null);
      logAuditEvent({ action: 'user.plan_changed', entityType: 'user', entityId: id, actorEmail: adminUser?.email ?? undefined, details: { planId, newStatus } });
      toast.success(`Plan changed to ${plan.name}`);
    } catch {
      toast.error('Failed to update plan');
    } finally {
      setChangingPlan(false);
    }
  };

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

  const handleCreditAdjustment = async () => {
    if (!adjustAmount || !user || !id) return;
    setAdjusting(true);
    try {
      const newCredits = Math.max(0, (user.credits || 0) + adjustAmount);
      await updateDoc(doc(db, 'users', id), { credits: newCredits, updatedAt: serverTimestamp() });
      await addDoc(collection(db, 'credits_history'), {
        userId: id,
        amount: adjustAmount,
        type: adjustAmount > 0 ? 'admin_grant' : 'admin_deduct',
        reason: adjustReason || 'Admin adjustment',
        balanceAfter: newCredits,
        createdAt: serverTimestamp(),
      });
      logAuditEvent({
        action: 'user.credits_adjusted',
        entityType: 'user',
        entityId: id,
        actorEmail: adminUser?.email ?? undefined,
        details: { delta: adjustAmount, reason: adjustReason, newBalance: newCredits },
      });
      setUser(prev => prev ? { ...prev, credits: newCredits } : null);
      setAdjustAmount(0);
      setAdjustReason('');
      toast.success(`Credits ${adjustAmount > 0 ? 'added' : 'deducted'} — new balance: ${newCredits}`);
    } catch {
      toast.error('Failed to adjust credits');
    } finally {
      setAdjusting(false);
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
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
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
                  user.subscriptionStatus === 'pro' ? 'bg-primary/10 text-primary border-primary/20' :
                  'bg-muted text-muted-foreground border-border'
                }`}>
                  {isSuspended ? 'Suspended' : user.subscriptionStatus === 'pro' ? 'Pro' : 'Free'}
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
                <Award className="w-3 h-3 text-amber-500" /> Credits
              </p>
              <span className="text-3xl font-black text-foreground leading-none">{user.credits || 0}</span>
            </div>
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
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: tab content */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {activeTab === 'overview' && (
            <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-8">
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
                    label: 'Account ID',
                    value: user.uid,
                    mono: true
                  },
                  {
                    label: 'Referral Code',
                    value: user.referralCode || 'None'
                  },
                  {
                    label: 'Total Used Credits',
                    value: String(user.totalUsedCredits || 0)
                  },
                  {
                    label: 'Referrals Count',
                    value: String(user.referralsCount || 0)
                  },
                  {
                    label: 'Affiliate Earnings',
                    value: `$${(user.affiliateEarnings || 0).toFixed(2)}`
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
                <div className="bg-card border border-border rounded-2xl p-6">
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
                </div>
                <div className="bg-card border border-border rounded-2xl p-6">
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
                </div>
              </div>
            </section>

            <section>
                <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2 uppercase tracking-tight">
                  <MapPin className="w-4 h-4 text-primary" /> Timestamps
                </h3>
                <div className="bg-muted/20 rounded-xl border border-border divide-y divide-border">
                  {[
                    { label: 'Last Active', value: user.lastActiveAt },
                    { label: 'Trial Ends At', value: user.trialEndsAt },
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
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
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
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-card rounded-2xl border border-border p-8 shadow-sm space-y-4">
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
            </div>
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
                { label: 'Plan', value: user.subscriptionStatus.toUpperCase(), color: user.subscriptionStatus === 'pro' ? 'text-emerald-400' : user.subscriptionStatus === 'enterprise' ? 'text-amber-400' : 'opacity-60' },
                { label: 'Status', value: isSuspended ? 'SUSPENDED' : 'ACTIVE', color: isSuspended ? 'text-rose-400' : 'text-emerald-400' },
                { label: 'Affiliate', value: 'ENABLED', color: 'text-emerald-400' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase opacity-50">{row.label}</span>
                  <span className={`text-xs font-black uppercase ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan selector */}
          {plans.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-primary" /> Change Plan
              </h4>
              <Select
                value={user.activePlanId || ''}
                onChange={(val) => handleChangePlan(val)}
                disabled={changingPlan}
                options={plans.map(p => ({
                  value: p.id,
                  label: p.name,
                  description: p.monthlyPrice === 0
                    ? 'Free'
                    : `$${p.monthlyPrice}/mo · ${p.monthlyCredits ?? 0} credits`,
                }))}
                placeholder="Select a plan..."
                isSearchable={false}
              />
              {user.activePlanId && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Current: <span className="font-bold text-foreground">{plans.find(p => p.id === user.activePlanId)?.name ?? user.activePlanId}</span>
                  {' · '}{user.subscriptionStatus.toUpperCase()}
                </p>
              )}
            </div>
          )}

          {/* Credit adjustment */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-amber-500" /> Adjust Credits
            </h4>
            <p className="text-2xl font-black text-foreground mb-4">
              {user.credits || 0} <span className="text-sm font-medium text-muted-foreground">current balance</span>
            </p>

            <div className="space-y-3">
              {/* Amount buttons */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Amount</p>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setAdjustAmount(v => v - 10)}
                    variant="ghost"
                    size="icon"
                    className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <Input
                    id="adjustAmount"
                    name="adjustAmount"
                    type="number"
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(Number(e.target.value))}
                    className="flex-1 text-center"
                    variant="filled"
                  />
                  <Button
                    onClick={() => setAdjustAmount(v => v + 10)}
                    variant="ghost"
                    size="icon"
                    className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[10, 50, 100, 500].map(n => (
                    <Button
                      key={n}
                      onClick={() => setAdjustAmount(n)}
                      variant="secondary"
                      size="sm"
                      className="flex-1 h-7 text-[10px]"
                    >
                      +{n}
                    </Button>
                  ))}
                </div>
              </div>

              <Input
                label="Reason"
                id="adjustReason"
                name="adjustReason"
                type="text"
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                placeholder="e.g. Compensation, bonus..."
                variant="filled"
              />

              <Button
                onClick={handleCreditAdjustment}
                isLoading={adjusting}
                variant={adjustAmount > 0 ? 'success' : adjustAmount < 0 ? 'danger' : 'outline'}
                fullWidth
                disabled={adjustAmount === 0}
                leftIcon={adjustAmount > 0 ? Plus : adjustAmount < 0 ? Minus : undefined}
              >
                {adjustAmount > 0 ? `Add ${adjustAmount} credits` : adjustAmount < 0 ? `Deduct ${Math.abs(adjustAmount)} credits` : 'Enter amount'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
