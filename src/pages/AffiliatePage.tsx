import { addDoc, collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import {
  Award,
  Check,
  Clock,
  Copy,
  DollarSign,
  Gift,
  Link as LinkIcon,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMarketing } from '../hooks/useMarketing';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import Button from '../components/primitives/Button';
import Progress from '../components/feedback/Progress';
import { cn } from '../lib/utils';

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  try {
    if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
    if (typeof date === 'object' && date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    const parsed = new Date(date);
    return parsed.toString() !== 'Invalid Date' ? parsed.toLocaleDateString() : 'N/A';
  } catch (err) {
    return 'N/A';
  }
};

export default function AffiliatePage() {
  const { user, profile } = useAuth();
  const { marketingConfig } = useMarketing();
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const referralLink = profile?.referralCode
    ? `${window.location.origin}/login?ref=${profile.referralCode}`
    : 'Loading your link...';

  useEffect(() => {
    if (profile?.referralCode) {
      fetchReferrals();
      fetchPayouts();
    }
  }, [profile]);

  async function fetchPayouts() {
    try {
      const q = query(
        collection(db, 'payouts'),
        where('userId', '==', profile?.uid),
        orderBy('processedAt', 'desc')
      );
      const snap = await getDocs(q);
      setPayouts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching payouts:", err);
    }
  }

  async function fetchReferrals() {
    try {
      const q = query(collection(db, 'users'), where('referredBy', '==', profile?.referralCode));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReferrals(data);
    } catch (err) {
      console.error("Error fetching referrals:", err);
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async () => {
    if (!profile?.payoutMethods?.upiId && !profile?.payoutMethods?.paypalEmail && !profile?.payoutMethods?.bankDetails) {
      toast.error("Please save your payout methods in Account Settings first!");
      return;
    }

    if (Number(profile?.affiliateEarnings || 0) < marketingConfig.minWithdrawalAmount) {
      toast.error(`Minimum withdrawal amount is $${marketingConfig.minWithdrawalAmount}`);
      return;
    }

    setLoading(true);
    try {
      // --- NEURAL FRAUD GUARD (Gap #3) ---
      let fraudScore = 0;
      const createdAtMillis = (profile?.createdAt as any)?.toMillis 
        ? (profile.createdAt as any).toMillis() 
        : (profile?.createdAt ? new Date(profile.createdAt as any).getTime() : Date.now());
      
      const accountAgeDays = (Date.now() - createdAtMillis) / (1000 * 60 * 60 * 24);
      
      // Rule 1: New accounts are suspicious
      if (accountAgeDays < 7) fraudScore += 40;
      if (accountAgeDays < 2) fraudScore += 30;

      // Rule 2: High referral velocity (e.g., more than 5 referrals in same session)
      if (referrals.length > 20 && accountAgeDays < 5) fraudScore += 50;

      // Rule 3: Missing profile data
      if (!profile?.photoURL || !profile?.displayName) fraudScore += 10;

      const payoutData = {
        userId: user?.uid,
        userEmail: user?.email,
        amount: profile.affiliateEarnings,
        currency: 'USD',
        status: fraudScore >= marketingConfig.fraudScoreThreshold ? 'flagged' : 'pending',
        riskScore: fraudScore,
        riskLevel: fraudScore >= marketingConfig.fraudScoreThreshold ? 'high_risk' : (fraudScore >= 40 ? 'medium_risk' : 'low_risk'),
        payoutMethod: profile.payoutMethods,
        requestedAt: Timestamp.now(),
        processedAt: null
      };
      
      await addDoc(collection(db, 'payouts'), payoutData);
      
      if (fraudScore >= 70) {
        toast.success("Request received! Due to security protocols, your request is undergoing a neural audit (approx. 48h).");
      } else {
        toast.success("Withdrawal request submitted! Our team will process it shortly.");
      }
      fetchPayouts();
    } catch (err) {
      console.error("Withdrawal Error:", err);
      toast.error("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs">
            <Award className="w-4 h-4" />
            Partner Ecosystem
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Affiliate Dashboard</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Track your impact, monitor earnings, and grow your recurring revenue.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-md border border-primary/20">
          <Gift className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">25% Recurring Commission</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Dashboard */}
          <div className="lg:col-span-2 space-y-8">
            {/* Link Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card p-6 rounded-2xl border border-border shadow-sm"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
                <LinkIcon className="w-5 h-5 text-primary" />
                Your Referral Engine
              </h2>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow bg-muted/50 p-5 rounded-xl font-mono text-sm text-muted-foreground border border-border break-all flex items-center">
                  {referralLink}
                </div>
                <Button
                  onClick={copyToClipboard}
                  variant={copied ? 'success' : 'primary'}
                  size="lg"
                  leftIcon={copied ? Check : Copy}
                  className="px-6 h-12"
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-8 font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Pro-tip: High quality content on YouTube and Twitter drives the best conversion rates.
              </p>
            </motion.div>

            {/* Referrals List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="p-8 border-b border-border bg-muted/30 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <Users className="w-5 h-5 text-primary" />
                  Recent Referrals
                </h2>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{referrals.length} Total Users</span>
              </div>

              <div className="p-8">
                {loading ? (
                  <div className="flex flex-col items-center py-20">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-muted-foreground font-bold text-sm tracking-widest uppercase">Syncing Ledger...</p>
                  </div>
                ) : referrals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                          <th className="pb-6">Subscriber</th>
                          <th className="pb-6">Onboarded</th>
                          <th className="pb-6">Account Type</th>
                          <th className="pb-6 text-right">Commission</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border uppercase tracking-tight">
                        {referrals.map(ref => (
                          <tr key={ref.id} className="group hover:bg-muted/30 transition-colors">
                            <td className="py-5">
                              <div className="flex items-center gap-3">
                                {ref.photoURL ? (
                                  <img src={ref.photoURL} className="w-8 h-8 rounded-lg shadow-sm" alt="" />
                                ) : (
                                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-xs font-bold">
                                    {ref.email.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-bold text-foreground line-clamp-1">{ref.email.split('@')[0]}</span>
                              </div>
                            </td>
                            <td className="py-5 text-xs text-muted-foreground font-bold">
                              {formatDate(ref.createdAt)}
                            </td>
                            <td className="py-5">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${ref.subscriptionStatus === 'pro' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-muted text-muted-foreground/60 border-border'}`}>
                                {ref.subscriptionStatus?.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-5 text-right">
                              <span className={`font-bold ${ref.subscriptionStatus === 'pro' ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                                {ref.subscriptionStatus === 'pro' ? `$${(15 * (marketingConfig.referralCommission / 100)).toFixed(2)}` : '$0.00'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Users className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Growth starting point</h3>
                    <p className="text-muted-foreground text-sm max-w-[200px] mx-auto">Your referrals will appear here once users join through your link.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Stats Sidebar */}
          <div className="grid md:grid-cols-2 lg:grid-cols-1 gap-6">
            <StatCard label="Total Earnings" value={`$${profile?.affiliateEarnings || 0}.00`} icon={DollarSign} color="text-green-500" />
            <StatCard label="Total Network" value={referrals.length} icon={Users} color="text-primary" />
            <StatCard label="Yield Rate" value={referrals.length > 0 ? `${Math.round((referrals.filter(r => r.subscriptionStatus === 'pro').length / referrals.length) * 100)}%` : '0%'} icon={TrendingUp} color="text-amber-500" />

            <div className="bg-foreground text-background p-8 md:p-10 rounded-2xl shadow-2xl relative overflow-hidden group">
               <Award className="w-32 h-32 absolute -right-8 -bottom-8 opacity-5 rotate-12" />
               <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-6">
                   <div className="px-3 py-1 bg-background/10 text-xs font-bold rounded-full uppercase tracking-widest border border-background/20">Tier 1 Milestone</div>
                 </div>
                 <h3 className="text-2xl font-bold mb-4 tracking-tighter">Growth Accelerator</h3>
                 <p className="opacity-60 text-sm mb-8 leading-relaxed font-medium">Refer 10 Pro users to unlock a <span className="text-primary font-bold">$100 instant bonus</span> and lifetime platform access.</p>

                 <Progress 
                    value={referrals.filter(r => r.subscriptionStatus === 'pro').length}
                    max={10}
                    size="md"
                    trackClassName="bg-background/10 border border-background/5"
                 />
                 <div className="flex justify-between items-center mt-4">
                   <p className="text-xs uppercase font-bold tracking-widest opacity-40">{referrals.filter(r => r.subscriptionStatus === 'pro').length} / 10 Referrals</p>
                   <p className="text-xs uppercase font-bold tracking-widest text-primary">
                     {Math.round((referrals.filter(r => r.subscriptionStatus === 'pro').length / 10) * 100)}%
                   </p>
                 </div>
               </div>
            </div>

            <div className="bg-primary text-primary-foreground p-8 md:p-10 rounded-2xl shadow-xl relative overflow-hidden">
               <Zap className="w-24 h-24 absolute -left-6 -bottom-6 opacity-10 -rotate-12" />
               <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-4">
                   <Clock className="w-5 h-5 opacity-60" />
                   <h3 className="text-xl font-bold">Payout Hub</h3>
                 </div>
                 <p className="text-primary-foreground/60 text-sm mb-10 leading-relaxed font-medium">Earnings are distributed automatically via PayPal once you reach the ${marketingConfig.minWithdrawalAmount} threshold.</p>
                 <Button
                   onClick={handleWithdraw}
                   isLoading={loading}
                   disabled={Number(profile?.affiliateEarnings || 0) < marketingConfig.minWithdrawalAmount}
                   variant="white"
                   size="lg"
                   fullWidth
                   className={cn(
                     "font-bold uppercase tracking-widest h-12 shadow-lg",
                     Number(profile?.affiliateEarnings || 0) < marketingConfig.minWithdrawalAmount && "bg-card/10 text-white/30 border-none shadow-none"
                   )}
                 >
                   {Number(profile?.affiliateEarnings || 0) >= marketingConfig.minWithdrawalAmount ? 'Withdraw Funds' : `Min. $${marketingConfig.minWithdrawalAmount} for Payout`}
                 </Button>
               </div>
            </div>
          </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-card p-8 rounded-2xl border border-border shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</p>
        <h4 className="text-3xl font-bold text-foreground">{value}</h4>
      </div>
      <div className={`w-14 h-14 bg-muted rounded-2xl flex items-center justify-center border border-border group-hover:bg-primary/5 transition-colors`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  );
}
