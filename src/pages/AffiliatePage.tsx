import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import {
  AlertTriangle,
  Award,
  Check,
  Clock,
  Copy,
  DollarSign,
  Gift,
  Link as LinkIcon,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMarketing } from '../hooks/useMarketing';
import { usePath } from '../hooks/usePath';
import { auth, db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import Button from '../components/primitives/Button';
import Progress from '../components/feedback/Progress';
import Input from '../components/primitives/Input';

const fmt = (date: any) => {
  if (!date) return 'N/A';
  try {
    if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
    if (typeof date === 'object' && date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    const d = new Date(date);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  } catch { return 'N/A'; }
};

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approved:  'bg-violet-500/10 text-violet-600 border-violet-500/20',
  paid:      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected:  'bg-rose-500/10 text-rose-600 border-rose-500/20',
  flagged:   'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

interface Stats {
  availableBalance: number;
  pendingEarnings: number;
  withdrawnAmount: number;
  totalEarned: number;
  commissions: any[];
  payouts: any[];
  hasPendingWithdrawal: boolean;
}

export default function AffiliatePage() {
  const { user, profile } = useAuth();
  const { marketingConfig } = useMarketing();
  const { prefix } = usePath();

  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'paypal' | 'bank'>('upi');
  const [submitting, setSubmitting] = useState(false);

  const referralLink = profile?.referralCode
    ? `${window.location.origin}${prefix('/login')}?ref=${profile.referralCode}`
    : '';

  useEffect(() => {
    if (user?.uid) fetchStats();
  }, [user]);

  async function fetchStats() {
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/affiliates/stats', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats(data);
    } catch {
      // Fallback: read directly from Firestore
      try {
        const [commissionsSnap, payoutsSnap] = await Promise.all([
          getDocs(query(
            collection(db, 'referral_commissions'),
            where('referrerId', '==', user!.uid),
            orderBy('createdAt', 'desc')
          )),
          getDocs(query(
            collection(db, 'payouts'),
            where('userId', '==', user!.uid),
            orderBy('requestedAt', 'desc')
          )),
        ]);
        const commissions = commissionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const payouts = payoutsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const totalWithdrawn = payouts.filter((p: any) => p.status === 'completed')
          .reduce((a: number, p: any) => a + Number(p.amount ?? 0), 0);
        setStats({
          availableBalance: Number(profile?.affiliateEarnings ?? 0),
          pendingEarnings: Number((profile as any)?.pendingEarnings ?? 0),
          withdrawnAmount: totalWithdrawn,
          totalEarned: Number(profile?.affiliateEarnings ?? 0) + totalWithdrawn,
          commissions,
          payouts,
          hasPendingWithdrawal: payouts.some((p: any) => p.status === 'pending')
        });
      } catch { /* silent */ }
    } finally {
      setLoading(false);
    }
  }

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }

    const minAmount = marketingConfig.minWithdrawalAmount ?? 10;
    if (amount < minAmount) { toast.error(`Minimum withdrawal is $${minAmount}`); return; }

    const available = stats?.availableBalance ?? 0;
    if (amount > available) { toast.error('Amount exceeds available balance'); return; }

    const methods = profile?.payoutMethods;
    const payoutDetails =
      selectedMethod === 'upi'    ? { upiId: methods?.upiId }
      : selectedMethod === 'paypal' ? { paypalEmail: methods?.paypalEmail }
      : { bankDetails: methods?.bankDetails };

    const hasMethod = selectedMethod === 'upi'    ? !!methods?.upiId
      : selectedMethod === 'paypal' ? !!methods?.paypalEmail
      : !!methods?.bankDetails;

    if (!hasMethod) {
      toast.error(`Please save your ${selectedMethod.toUpperCase()} details in Account Settings first.`);
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/affiliates/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ amount, payoutMethod: selectedMethod, payoutDetails })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Withdrawal failed');

      toast.success(data.status === 'flagged'
        ? 'Request submitted! A security review is required (approx. 48h).'
        : 'Withdrawal request submitted! Our team will process it shortly.');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  const availableBalance = stats?.availableBalance ?? Number(profile?.affiliateEarnings ?? 0);
  const pendingEarnings  = stats?.pendingEarnings  ?? Number((profile as any)?.pendingEarnings ?? 0);
  const withdrawnAmount  = stats?.withdrawnAmount  ?? 0;
  const totalEarned      = stats?.totalEarned      ?? availableBalance + withdrawnAmount;
  const commissions      = stats?.commissions      ?? [];
  const payouts          = stats?.payouts          ?? [];
  const proReferrals     = commissions.filter((c: any) => c.status !== 'pending' || c.grossSaleAmount > 0);
  const minWithdraw      = marketingConfig.minWithdrawalAmount ?? 10;
  const canWithdraw      = availableBalance >= minWithdraw && !stats?.hasPendingWithdrawal;

  const methods = profile?.payoutMethods;
  const availableMethods = [
    methods?.upiId    && { id: 'upi',    label: 'UPI',    detail: methods.upiId },
    methods?.paypalEmail && { id: 'paypal', label: 'PayPal', detail: methods.paypalEmail },
    methods?.bankDetails && { id: 'bank',   label: 'Bank',   detail: methods.bankDetails },
  ].filter(Boolean) as { id: 'upi'|'paypal'|'bank'; label: string; detail: string }[];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs">
            <Award className="w-4 h-4" />
            Partner Ecosystem
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Affiliate Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Track earnings, review referrals, and withdraw your commissions.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-lg border border-primary/20">
          <Gift className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">
            {marketingConfig.referralCommission ?? 25}% Commission
          </span>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BalanceCard
          label="Available Balance"
          value={`$${availableBalance.toFixed(2)}`}
          icon={Wallet}
          accent="text-emerald-500"
          bg="bg-emerald-500/10"
          note={canWithdraw ? 'Ready to withdraw' : stats?.hasPendingWithdrawal ? 'Withdrawal pending' : `Min. $${minWithdraw} required`}
        />
        <BalanceCard
          label="Pending (Lock Period)"
          value={`$${pendingEarnings.toFixed(2)}`}
          icon={Clock}
          accent="text-amber-500"
          bg="bg-amber-500/10"
          note={`Clears after ${marketingConfig.lockPeriodDays ?? 14}-day hold`}
        />
        <BalanceCard
          label="Total Withdrawn"
          value={`$${withdrawnAmount.toFixed(2)}`}
          icon={DollarSign}
          accent="text-primary"
          bg="bg-primary/10"
          note="All time"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Referral link */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
              <LinkIcon className="w-4 h-4 text-primary" />
              Your Referral Link
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-muted/50 px-4 py-3 rounded-xl text-sm font-mono text-muted-foreground border border-border break-all">
                {referralLink || 'Loading...'}
              </div>
              <Button onClick={copyLink} variant={copied ? 'success' : 'primary'} size="md" leftIcon={copied ? Check : Copy}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Commission history */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Commission History
              </h2>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {commissions.length} entries
              </span>
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Loading...</p>
              </div>
            ) : commissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/30">
                    <tr className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Sale Amount</th>
                      <th className="px-6 py-3">Commission</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {commissions.map((c: any) => (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm text-muted-foreground">{fmt(c.createdAt)}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">
                          {c.currency === 'INR' ? '₹' : '$'}{Number(c.grossSaleAmount ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                          ${Number(c.netCommission ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${STATUS_STYLE[c.status] ?? ''}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center">
                <TrendingUp className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm font-bold text-muted-foreground">No commissions yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Share your link to start earning.</p>
              </div>
            )}
          </div>

          {/* Withdrawal history */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-muted/20">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                Withdrawal History
              </h2>
            </div>
            {payouts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/30">
                    <tr className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Method</th>
                      <th className="px-6 py-3">Ref</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payouts.map((p: any) => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm text-muted-foreground">{fmt(p.requestedAt)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-foreground">${Number(p.amount).toFixed(2)}</td>
                        <td className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">{p.payoutMethod}</td>
                        <td className="px-6 py-4 text-xs font-mono text-muted-foreground/60 truncate max-w-[120px]">
                          {p.transactionRef || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${STATUS_STYLE[p.status] ?? ''}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No withdrawals yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Total Network" value={commissions.length} icon={Users} color="text-primary" />
            <StatCard label="Paid Referrals" value={proReferrals.length} icon={Award} color="text-amber-500" />
          </div>

          {/* Milestone card */}
          <div className="bg-foreground text-background rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <Award className="w-24 h-24 absolute -right-4 -bottom-4 opacity-5" />
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-3">Tier 1 Milestone</p>
              <h3 className="text-xl font-bold mb-1">Growth Accelerator</h3>
              <p className="text-xs opacity-50 mb-5 leading-relaxed">
                Refer 10 paying users to unlock a <span className="text-primary font-bold">$100 bonus</span>.
              </p>
              <Progress
                value={proReferrals.length}
                max={10}
                size="md"
                trackClassName="bg-background/10 border border-background/5"
              />
              <div className="flex justify-between mt-2">
                <span className="text-[10px] opacity-40 uppercase font-bold">{proReferrals.length} / 10</span>
                <span className="text-[10px] text-primary uppercase font-bold">
                  {Math.round((proReferrals.length / 10) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Payout CTA */}
          <div className="bg-primary rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-primary/20">
            <Zap className="w-20 h-20 absolute -left-4 -bottom-4 opacity-10" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-5 h-5 text-white/80" />
                <h3 className="text-base font-bold text-white">Withdraw Funds</h3>
              </div>
              <p className="text-white/50 text-xs mb-5 leading-relaxed">
                {canWithdraw
                  ? `$${availableBalance.toFixed(2)} available for withdrawal.`
                  : stats?.hasPendingWithdrawal
                    ? 'A withdrawal is already pending review.'
                    : `Need $${minWithdraw} minimum to withdraw. Keep sharing!`}
              </p>
              <Button
                onClick={() => setShowWithdrawModal(true)}
                disabled={!canWithdraw}
                variant="white"
                size="lg"
                fullWidth
                leftIcon={canWithdraw ? RefreshCw : Clock}
                className="font-bold uppercase tracking-widest"
              >
                {canWithdraw ? `Withdraw $${availableBalance.toFixed(2)}` : `Min. $${minWithdraw}`}
              </Button>
              {availableMethods.length === 0 && (
                <p className="text-white/40 text-[10px] text-center mt-3">
                  Add a payout method in Account Settings first.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Withdraw modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowWithdrawModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl p-8 w-full max-w-md border border-border shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Request Withdrawal</h2>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {availableMethods.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                  <p className="font-semibold text-foreground">No payout method saved</p>
                  <p className="text-sm text-muted-foreground">
                    Add your UPI ID, PayPal email, or bank details in{' '}
                    <Link to={prefix('/settings/profile')} className="text-primary font-bold hover:underline">
                      Account Settings
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Amount */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                      Amount (USD)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="withdrawAmount"
                        name="withdrawAmount"
                        type="number"
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                        placeholder={`${minWithdraw} – ${availableBalance.toFixed(2)}`}
                      />
                      <Button
                        onClick={() => setWithdrawAmount(availableBalance.toFixed(2))}
                        variant="secondary"
                        size="sm"
                        className="shrink-0"
                      >
                        Max
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: <span className="font-bold text-emerald-600">${availableBalance.toFixed(2)}</span>
                      &nbsp;·&nbsp;Min: ${minWithdraw}
                    </p>
                  </div>

                  {/* Payout method */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                      Payout Method
                    </label>
                    <div className="space-y-2">
                      {availableMethods.map(m => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMethod(m.id)}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between ${
                            selectedMethod === m.id
                              ? 'border-primary/40 bg-primary/5 text-foreground'
                              : 'border-border bg-muted/30 text-muted-foreground hover:border-border/60'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-bold uppercase tracking-widest">{m.label}</span>
                            <p className="text-xs mt-0.5 font-mono">{m.detail}</p>
                          </div>
                          {selectedMethod === m.id && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-4">
                      Withdrawals are reviewed within 2–3 business days. You'll receive a confirmation once processed.
                    </p>
                    <Button
                      onClick={handleWithdraw}
                      isLoading={submitting}
                      variant="primary"
                      size="lg"
                      fullWidth
                      className="shadow-lg shadow-primary/20"
                    >
                      Submit Withdrawal Request
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BalanceCard({ label, value, icon: Icon, accent, bg, note }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-5 flex items-start gap-4 shadow-sm"
    >
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${accent}`} />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${accent}`}>{value}</p>
        {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-2 shadow-sm">
      <Icon className={`w-5 h-5 ${color}`} />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
