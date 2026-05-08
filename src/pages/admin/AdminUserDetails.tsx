import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mail, Clock, Shield, Activity, ArrowLeft,
  CreditCard, Lock, Unlock, Award, MapPin,
  Users, Plus, Minus, AlertTriangle, Send,
} from 'lucide-react';
import { AdminPageHeader, useConfirm } from '../../components/admin';
import {
  collection, query, where, getDocs, orderBy,
  doc, getDoc, updateDoc, serverTimestamp, addDoc,
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { UserProfile, ActivityItem } from '../../types';
import { logAuditEvent } from '../../lib/auditLog';
import { toast } from 'react-hot-toast';

export default function AdminUserDetails() {
  const confirm = useConfirm();
  const { user: adminUser } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'security'>('overview');

  // Credit adjustment state
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (!userDoc.exists()) {
          toast.error('User not found');
          navigate('/admin/users');
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
  }, [id, navigate]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleToggleStatus = async () => {
    if (!user || !id) return;
    const newStatus = user.subscriptionStatus === 'pro' ? 'free' : 'pro';
    try {
      await updateDoc(doc(db, 'users', id), { subscriptionStatus: newStatus, updatedAt: serverTimestamp() });
      setUser(prev => prev ? { ...prev, subscriptionStatus: newStatus } : null);
      logAuditEvent({ action: 'user.plan_changed', entityType: 'user', entityId: id, actorEmail: adminUser?.email ?? undefined, details: { newStatus } });
      toast.success(`User updated to ${newStatus.toUpperCase()}`);
    } catch {
      toast.error('Failed to update plan');
    }
  };

  const handleToggleRole = async () => {
    if (!user || !id) return;
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const ok = await confirm({
      title: `Make this user ${newRole === 'admin' ? 'an Admin' : 'a regular User'}?`,
      description: 'This changes what the user can access in the admin panel.',
      confirmLabel: 'Confirm',
      destructive: newRole === 'admin',
    });
    if (!ok) return;
    try {
      await updateDoc(doc(db, 'users', id), { role: newRole, updatedAt: serverTimestamp() });
      setUser(prev => prev ? { ...prev, role: newRole } : null);
      logAuditEvent({ action: 'user.role_changed', entityType: 'user', entityId: id, actorEmail: adminUser?.email ?? undefined, details: { newRole } });
      toast.success(`Role updated to ${newRole.toUpperCase()}`);
    } catch {
      toast.error('Failed to update role');
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
            <button onClick={() => navigate('/admin/users')} className="btn-secondary">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={handleToggleStatus} className="btn-secondary">
              <CreditCard className="w-4 h-4" />
              {user.subscriptionStatus === 'pro' ? 'Downgrade to Free' : 'Upgrade to Pro'}
            </button>
            <button onClick={handleToggleRole} className="btn-secondary border-purple-500/20 text-purple-600 hover:bg-purple-500/10">
              <Shield className="w-4 h-4" />
              {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
            </button>
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
        <div className="flex border-t border-border bg-muted/20">
          {(['overview', 'activity', 'security'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-2 ${
                activeTab === tab
                  ? 'border-primary text-primary bg-background'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
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
                    { label: 'Display Name', value: user.displayName || 'Not set' },
                    { label: 'Account ID', value: user.uid, mono: true },
                    { label: 'Referral Code', value: user.referralCode || 'None' },
                    { label: 'Total Used Credits', value: String(user.totalUsedCredits || 0) },
                    { label: 'Referrals Count', value: String(user.referralsCount || 0) },
                    { label: 'Affiliate Earnings', value: `$${(user.affiliateEarnings || 0).toFixed(2)}` },
                  ].map(row => (
                    <div key={row.label} className="bg-muted/30 p-4 rounded-xl border border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{row.label}</p>
                      <p className={`text-sm font-bold text-foreground break-all ${row.mono ? 'font-mono text-xs' : ''}`}>{row.value}</p>
                    </div>
                  ))}
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
                      activity.type.includes('email') ? 'bg-primary text-white' : 'bg-muted text-foreground'
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
                <button
                  onClick={handleSuspend}
                  className={`px-5 py-2.5 rounded-lg text-sm font-bold border transition-all ${
                    isSuspended
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'
                  }`}
                >
                  {isSuspended ? 'Restore Access' : 'Suspend User'}
                </button>
              </div>

              {/* Reset password */}
              <div className="flex items-center justify-between p-6 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary text-white rounded-xl">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">Reset Password</h4>
                    <p className="text-sm text-muted-foreground">Send a password reset email to {user.email}.</p>
                  </div>
                </div>
                <button onClick={handleSendResetEmail} className="btn-primary">
                  Send Reset Link
                </button>
              </div>

              {/* Danger: role */}
              <div className="flex items-center justify-between p-6 bg-amber-500/5 rounded-xl border border-amber-500/10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500 text-white rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">Admin Privileges</h4>
                    <p className="text-sm text-muted-foreground">
                      Current role: <span className="font-bold text-foreground">{user.role}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleRole}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                >
                  {user.role === 'admin' ? 'Remove Admin' : 'Grant Admin'}
                </button>
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
                { label: 'Role', value: user.role.toUpperCase(), color: user.role === 'admin' ? 'text-rose-400' : 'text-primary' },
                { label: 'Plan', value: user.subscriptionStatus.toUpperCase(), color: user.subscriptionStatus === 'pro' ? 'text-emerald-400' : 'opacity-60' },
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
                  <button
                    onClick={() => setAdjustAmount(v => v - 10)}
                    className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center hover:bg-rose-500/20 transition-all font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(Number(e.target.value))}
                    className="flex-1 text-center font-bold text-foreground bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={() => setAdjustAmount(v => v + 10)}
                    className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center hover:bg-emerald-500/20 transition-all font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[10, 50, 100, 500].map(n => (
                    <button
                      key={n}
                      onClick={() => setAdjustAmount(n)}
                      className="flex-1 py-1 text-[10px] font-bold bg-muted hover:bg-muted/80 rounded-md text-muted-foreground transition-all"
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Reason</p>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="e.g. Compensation, bonus..."
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                onClick={handleCreditAdjustment}
                disabled={adjusting || adjustAmount === 0}
                className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  adjustAmount > 0
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20'
                    : adjustAmount < 0
                    ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20'
                    : 'bg-muted text-muted-foreground border border-border opacity-50 cursor-not-allowed'
                }`}
              >
                {adjusting ? (
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : adjustAmount > 0 ? (
                  <Plus className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
                {adjustAmount > 0 ? `Add ${adjustAmount} credits` : adjustAmount < 0 ? `Deduct ${Math.abs(adjustAmount)} credits` : 'Enter amount'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
