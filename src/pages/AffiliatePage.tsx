import { arrayUnion, collection, doc, getDocs, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  Gift,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  RefreshCw,
  Trophy,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMarketing } from '../hooks/useMarketing';
import { usePath } from '../hooks/usePath';
import { auth, db } from '../lib/firebase';
import { AFFILIATE_MILESTONES } from '../lib/milestones';
import { toast } from 'react-hot-toast';
import Button from '../components/primitives/Button';
import Card from '../components/primitives/Card';
import Input from '../components/primitives/Input';
import Spinner from '../components/feedback/Spinner';

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

function CommissionList({ commissions }: { commissions: any[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="divide-y divide-border">
      {commissions.map((c: any) => {
        const sale       = Number(c.grossSaleAmountUsd ?? c.grossSaleAmount ?? 0);
        const gatewayFee = Number(c.paymentFeeUsd ?? 0);
        const commBase   = Number(c.grossCommissionUsd ?? sale - gatewayFee);
        const rate       = Number(c.commissionRate ?? 0);
        const earned     = Number(c.netCommissionUsd ?? c.netCommission ?? 0);
        const lockUntil  = c.lockUntil ? fmt(c.lockUntil) : null;
        const isOpen     = expanded === c.id;

        return (
          <div key={c.id}>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : c.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/20 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{fmt(c.createdAt)}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    Sale ${sale.toFixed(2)} &rarr; <span className="text-emerald-600">${earned.toFixed(2)} earned</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${STATUS_STYLE[c.status] ?? ''}`}>
                  {c.status}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mx-6 mb-4 rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">How this commission was calculated</p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Buyer paid</span>
                      <span className="font-semibold">${sale.toFixed(2)}</span>
                    </div>
                    {gatewayFee > 0 && (
                      <div className="flex justify-between text-muted-foreground/70">
                        <span>− Gateway fee ({Number(c.paymentFeeRate ?? 2.9).toFixed(1)}%)</span>
                        <span>−${gatewayFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commission base</span>
                      <span className="font-semibold">${commBase.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-primary">
                      <span>Your rate ({rate}%)</span>
                      <span className="font-bold">×{(rate / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-600 pt-2 border-t border-border">
                      <span>You earned</span>
                      <span>${earned.toFixed(2)}</span>
                    </div>
                    {lockUntil && c.status === 'pending' && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 pt-1">
                        <Clock className="w-3 h-3" />
                        Locks until {lockUntil}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function AffiliatePage() {
  const { user, profile } = useAuth();
  const { marketingConfig } = useMarketing();
  const { prefix } = usePath();

  const [copied, setCopied] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'paypal' | 'bank'>('upi');
  const [submitting, setSubmitting] = useState(false);

  const referralLink = profile?.referralCode
    ? `${window.location.origin}${prefix('/login')}?ref=${profile.referralCode}`
    : '';

  const notifiedMilestones = useRef<Set<string>>(new Set());

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

  const commission = marketingConfig.referralCommission ?? 25;

  const PROMO_TEMPLATES = [
    {
      label: 'Twitter / X',
      text: `I've been using Promptly for AI prompts and it's genuinely great. You can unlock expert prompts, build collections, and share them with others.\n\nUse my link to get started → ${referralLink}`,
    },
    {
      label: 'WhatsApp / DM',
      text: `Hey! I've been using this AI prompt marketplace called Promptly — it has thousands of expert prompts for ChatGPT, Claude, Gemini, etc.\n\nCheck it out here: ${referralLink}`,
    },
    {
      label: 'Newsletter / Blog',
      text: `If you work with AI tools daily, Promptly is worth checking out. It's a curated marketplace of expert-crafted prompts — properly organized, categorized, and ready to copy.\n\nI use it every week. Here's my link if you want to try it: ${referralLink}`,
    },
  ];


  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyTemplate = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(idx);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const shareOn = (channel: 'twitter' | 'whatsapp' | 'linkedin' | 'email') => {
    if (!referralLink) return;
    const text = encodeURIComponent(`I've been using Promptly — a curated AI prompt marketplace. Check it out → ${referralLink}`);
    const urls: Record<string, string> = {
      twitter:  `https://twitter.com/intent/tweet?text=${text}`,
      whatsapp: `https://wa.me/?text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
      email:    `mailto:?subject=${encodeURIComponent('Check out Promptly — AI Prompt Marketplace')}&body=${text}`,
    };
    window.open(urls[channel], '_blank', 'noopener,noreferrer');
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

  // Build 30-day earnings chart data from commissions
  const earningsChartData = (() => {
    const days: Record<string, number> = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
    }
    (stats?.commissions ?? []).forEach((c: any) => {
      const date = c.createdAt instanceof Timestamp
        ? c.createdAt.toDate()
        : typeof c.createdAt === 'object' && c.createdAt?.seconds
          ? new Date(c.createdAt.seconds * 1000)
          : new Date(c.createdAt);
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (label in days) days[label] += Number(c.netCommission ?? 0);
    });
    return Object.entries(days).map(([date, amount]) => ({ date, amount: parseFloat(amount.toFixed(2)) }));
  })();

  const availableBalance = stats?.availableBalance ?? Number(profile?.affiliateEarnings ?? 0);
  const pendingEarnings  = stats?.pendingEarnings  ?? Number((profile as any)?.pendingEarnings ?? 0);
  const withdrawnAmount  = stats?.withdrawnAmount  ?? 0;
  const totalEarned      = stats?.totalEarned      ?? availableBalance + withdrawnAmount;
  const commissions      = stats?.commissions      ?? [];
  const payouts          = stats?.payouts          ?? [];
  const proReferrals     = commissions.filter((c: any) => c.status !== 'pending' || c.grossSaleAmount > 0);
  const minWithdraw      = marketingConfig.minWithdrawalAmount ?? 10;
  const canWithdraw      = availableBalance >= minWithdraw && !stats?.hasPendingWithdrawal;

  // Detect and persist newly unlocked milestones
  useEffect(() => {
    if (loading || !user || !profile) return;
    const alreadyUnlocked: string[] = profile.milestones ?? [];
    const newlyUnlocked = AFFILIATE_MILESTONES.filter(
      m => proReferrals.length >= m.count
        && !alreadyUnlocked.includes(m.label)
        && !notifiedMilestones.current.has(m.label)
    );
    if (newlyUnlocked.length === 0) return;

    newlyUnlocked.forEach(m => {
      notifiedMilestones.current.add(m.label);
      toast(`${m.icon} Milestone unlocked: ${m.label}!`, { duration: 5000 });
    });

    updateDoc(doc(db, 'users', user.uid), {
      milestones: arrayUnion(...newlyUnlocked.map(m => m.label)),
    }).catch(() => {});
  }, [loading, proReferrals.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <Card className="!rounded-2xl shadow-sm">
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

            {/* Social share */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Share on</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => shareOn('twitter')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1DA1F2]/10 text-[#1DA1F2] border border-[#1DA1F2]/20 text-xs font-bold hover:bg-[#1DA1F2]/20 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Twitter / X
                </button>
                <button
                  onClick={() => shareOn('whatsapp')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 text-xs font-bold hover:bg-[#25D366]/20 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </button>
                <button
                  onClick={() => shareOn('linkedin')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0077B5]/10 text-[#0077B5] border border-[#0077B5]/20 text-xs font-bold hover:bg-[#0077B5]/20 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> LinkedIn
                </button>
                <button
                  onClick={() => shareOn('email')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-muted-foreground border border-border text-xs font-bold hover:bg-muted/80 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
              </div>
            </div>

            {/* Promo copy templates */}
            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => setShowTemplates(v => !v)}
                className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" /> Promo Copy Templates
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showTemplates && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 space-y-3">
                      {PROMO_TEMPLATES.map((tpl, i) => (
                        <div key={i} className="bg-muted/50 rounded-xl p-4 border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{tpl.label}</span>
                            <button
                              onClick={() => copyTemplate(i, tpl.text)}
                              className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                            >
                              {copiedTemplate === i ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copiedTemplate === i ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-3">{tpl.text}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {/* How it works — zero state */}
          {!loading && commissions.length === 0 && (
            <Card className="!rounded-2xl shadow-sm">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-5">
                <Trophy className="w-4 h-4 text-primary" />
                How It Works
              </h2>
              <div className="grid sm:grid-cols-3 gap-5">
                {[
                  { step: '01', icon: '🔗', title: 'Share Your Link', desc: 'Copy your referral link and share it on social media, your blog, or directly with friends.' },
                  { step: '02', icon: '👥', title: 'Someone Signs Up', desc: "When someone clicks your link and creates a Promptly account, they're tracked to you." },
                  { step: '03', icon: '💰', title: 'You Earn', desc: `When they upgrade to Pro you earn ${commission}% commission. Withdraw once you hit $${minWithdraw}.` },
                ].map(s => (
                  <div key={s.step} className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-muted-foreground/30 tracking-widest">STEP {s.step}</span>
                    <div className="text-2xl">{s.icon}</div>
                    <p className="font-bold text-sm text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Earnings chart */}
          <Card className="!rounded-2xl shadow-sm">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4 text-primary" />
              Earnings — Last 30 Days
            </h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={earningsChartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                  interval={6}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `$${v}`}
                />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12, fontWeight: 700 }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, 'Earned']}
                  cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Commission history */}
          <Card padding="none" className="!rounded-2xl shadow-sm">
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
                <Spinner size="md" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Loading...</p>
              </div>
            ) : commissions.length > 0 ? (
              <CommissionList commissions={commissions} />
            ) : (
              <div className="py-16 text-center">
                <TrendingUp className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm font-bold text-muted-foreground">No commissions yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Share your link to start earning.</p>
              </div>
            )}
          </Card>

          {/* Withdrawal history */}
          <Card padding="none" className="!rounded-2xl shadow-sm">
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
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Link Clicks" value={(profile as any)?.referralClicks ?? 0} icon={TrendingUp} color="text-primary" />
            <StatCard label="Paid Referrals" value={proReferrals.length} icon={Award} color="text-amber-500" />
            <StatCard label="Total Signups" value={commissions.length} icon={Users} color="text-violet-500" />
            <StatCard label="Conversion" value={`${(profile as any)?.referralClicks > 0 ? Math.round((commissions.length / ((profile as any).referralClicks)) * 100) : 0}%`} icon={Zap} color="text-emerald-500" />
          </div>

          {/* Milestone achievements */}
          <Card padding="none" className="!rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-amber-500" />
              Achievements
              <span className="ml-auto text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {proReferrals.length} paid referral{proReferrals.length !== 1 ? 's' : ''}
              </span>
            </h3>
            <div className="space-y-2.5">
              {AFFILIATE_MILESTONES.map(m => {
                const achieved = proReferrals.length >= m.count;
                const nextMilestone = AFFILIATE_MILESTONES.find(ms => proReferrals.length < ms.count);
                const isNext = !achieved && nextMilestone?.count === m.count;
                return (
                  <div
                    key={m.count}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      achieved
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : isNext
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-muted/30 border-border opacity-40'
                    }`}
                  >
                    <div className="text-xl shrink-0">{m.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${achieved ? 'text-emerald-600' : 'text-foreground'}`}>{m.label}</p>
                      <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                    </div>
                    {achieved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground/60 shrink-0 tabular-nums whitespace-nowrap">
                        {m.count - proReferrals.length} left
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

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
            <Card
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="!rounded-2xl w-full max-w-md shadow-2xl"
              onClick={(e: any) => e.stopPropagation()}
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
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BalanceCard({ label, value, icon: Icon, accent, bg, note }: any) {
  return (
    <Card
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-row items-start gap-4 shadow-sm"
    >
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${accent}`} />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${accent}`}>{value}</p>
        {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
      </div>
    </Card>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card padding="sm" className="flex-col gap-2 shadow-sm">
      <Icon className={`w-5 h-5 ${color}`} />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </Card>
  );
}
