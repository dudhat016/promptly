import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { 
  Users, DollarSign, Link as LinkIcon, Copy, Check, 
  ArrowRight, ShieldCheck, Zap, BarChart3, TrendingUp,
  Gift, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Utility to handle Firestore timestamps or ISO strings
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
  const { profile, user } = useAuth();
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
      // Find users who were referred by this user's referral code
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

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        {/* Hero Section */}
        <header className="mb-12 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6"
          >
            <Gift className="w-4 h-4" />
            Partner Program
          </motion.div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Earn while you <span className="text-indigo-600">Share</span>.</h1>
          <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto">
            Join the Promptly Affiliate Program. For every person who joins and upgrades to Pro using your link, you earn <span className="font-bold text-slate-900">25% recurring commission</span>.
          </p>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Dashboard */}
          <div className="lg:col-span-2 space-y-8">
            {/* Link Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-indigo-500/5"
            >
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-indigo-600" />
                Your Unique Referral Link
              </h2>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow bg-slate-50 p-4 rounded-2xl font-mono text-sm text-slate-600 border border-slate-100 break-all">
                  {referralLink}
                </div>
                <button 
                  onClick={copyToClipboard}
                  className={`flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all whitespace-nowrap ${copied ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-6 font-medium">
                Tip: Share this link on Twitter, LinkedIn, or your blog to maximize your reach.
              </p>
            </motion.div>

            {/* Referrals List */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Your Referrals
                </h2>
              </div>
              
              <div className="p-8">
                {loading ? (
                  <div className="flex flex-col items-center py-12">
                    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                    <p className="text-slate-400 font-bold">Syncing data...</p>
                  </div>
                ) : referrals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs font-black uppercase tracking-widest text-slate-400">
                          <th className="pb-4">User</th>
                          <th className="pb-4">Joined</th>
                          <th className="pb-4">Status</th>
                          <th className="pb-4 text-right">Commission</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 uppercase tracking-tight">
                        {referrals.map(ref => (
                          <tr key={ref.id}>
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <img src={ref.photoURL} className="w-8 h-8 rounded-lg" alt="" />
                                <span className="font-bold text-slate-900 line-clamp-1">{ref.email.split('@')[0]}</span>
                              </div>
                            </td>
                            <td className="py-4 text-xs text-slate-500 font-bold">
                              {formatDate(ref.createdAt)}
                            </td>
                            <td className="py-4">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${ref.subscriptionStatus === 'pro' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                                {ref.subscriptionStatus}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <span className="font-black text-slate-900">
                                {ref.subscriptionStatus === 'pro' ? '$3.75' : '$0.00'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 grayscale">
                      <Users className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold">No referrals yet.</p>
                    <p className="text-xs text-slate-300">Share your link to see new users here.</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Payout History */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50">
                 <h2 className="text-xl font-black flex items-center gap-2">
                   <DollarSign className="w-5 h-5 text-indigo-600" />
                   Payout History
                 </h2>
              </div>
              <div className="p-8">
                 {payouts.length > 0 ? (
                   <table className="w-full text-left">
                     <thead>
                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <th className="pb-4">Amount</th>
                          <th className="pb-4">Date</th>
                          <th className="pb-4 text-right">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50 uppercase tracking-tight">
                        {payouts.map(p => (
                          <tr key={p.id}>
                            <td className="py-4 font-black text-slate-900">${p.amount}.00</td>
                            <td className="py-4 text-xs text-slate-500 font-bold">{formatDate(p.processedAt)}</td>
                            <td className="py-4 text-right">
                               <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-lg">Paid</span>
                            </td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                 ) : (
                   <div className="text-center py-8">
                      <p className="text-slate-400 font-bold">No payouts yet.</p>
                      <p className="text-xs text-slate-300">Earnings are paid once you reach $50.</p>
                   </div>
                 )}
              </div>
            </motion.div>
          </div>

          {/* Stats Sidebar */}
          <div className="grid md:grid-cols-2 lg:grid-cols-1 gap-6">
            <StatCard label="Total Earnings" value={`$${profile?.affiliateEarnings || 0}.00`} icon={DollarSign} color="text-green-600" bg="bg-green-50" />
            <StatCard label="Referrals" value={referrals.length} icon={Users} color="text-indigo-600" bg="bg-indigo-50" />
            <StatCard label="Conversion" value={referrals.length > 0 ? `${Math.round((referrals.filter(r => r.subscriptionStatus === 'pro').length / referrals.length) * 100)}%` : '0%'} icon={TrendingUp} color="text-amber-600" bg="bg-amber-50" />
            
            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
               <Award className="w-24 h-24 absolute -right-6 -bottom-6 text-white/5 rotate-12" />
               <div className="relative z-10">
                 <h3 className="text-xl font-black mb-4">Milestone Bonus</h3>
                 <p className="text-slate-400 text-sm mb-6 leading-relaxed">Refer 10 Pro users and get a <span className="text-white font-bold">$100 bonus</span> + permanent Pro lifetime access.</p>
                 <div className="bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full w-[20%]" />
                 </div>
                 <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mt-2">2 / 10 Referrals</p>
               </div>
            </div>

            <div className="bg-indigo-600 text-white p-8 rounded-[3rem] shadow-xl">
               <h3 className="text-xl font-black mb-4">Payouts</h3>
               <p className="text-indigo-100 text-sm mb-6">Payouts are processed automatically via PayPal or Stripe once you reach $50.</p>
               <button className="w-full bg-white text-indigo-600 font-black py-4 rounded-2xl hover:bg-indigo-50 transition-all opacity-50 cursor-not-allowed">
                 Request Payout
               </button>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="mt-24 max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Program Details</h2>
          <div className="grid md:grid-cols-2 gap-8 font-medium italic">
            <div className="bg-white p-8 rounded-3xl border border-slate-100">
               <h4 className="font-black text-slate-900 mb-2 not-italic underline decoration-indigo-200">How do I get paid?</h4>
               <p className="text-slate-500 text-sm leading-relaxed">We pay balance on the 1st of every month. Standard minimum payout is $50.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100">
               <h4 className="font-black text-slate-900 mb-2 not-italic underline decoration-indigo-200">Cookie Duration</h4>
               <p className="text-slate-500 text-sm leading-relaxed">Our cookies last 60 days. If someone clicks your link, they have 2 months to buy.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100">
               <h4 className="font-black text-slate-900 mb-2 not-italic underline decoration-indigo-200">Recurring?</h4>
               <p className="text-slate-500 text-sm leading-relaxed">Yes! As long as the user stays subscribed to Pro, you keep earning monthly.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100">
               <h4 className="font-black text-slate-900 mb-2 not-italic underline decoration-indigo-200">Support</h4>
               <p className="text-slate-500 text-sm leading-relaxed">Need help with assets? Contact partners@promptly.com for banner ads and text samples.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
      <div className={`w-12 h-12 ${bg} ${color} rounded-2xl flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <h4 className="text-2xl font-black text-slate-900">{value}</h4>
      </div>
    </div>
  );
}
