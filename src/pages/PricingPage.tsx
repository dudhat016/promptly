import { useAuth } from '../hooks/useAuth';
import { Check, Zap, ArrowRight, ShieldCheck, CreditCard, Sparkles, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, increment, getDocs, getDoc, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { PricingPlan, AppConfig } from '../types';

export default function PricingPage() {
  const { user, profile, isPro: userIsPro } = useAuth();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function loadPricing() {
      try {
        const [pSnap, cSnap] = await Promise.all([
          getDocs(collection(db, 'plans')),
          getDoc(doc(db, 'config', 'global'))
        ]);

        const pData = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as PricingPlan));
        if (pData.length > 0) {
          setPlans(pData.sort((a, b) => a.monthlyPrice - b.monthlyPrice));
        } else {
          // Fallback if not seeded
          setPlans([
            { id: 'free', name: 'Explorer', description: 'Perfect for getting started', monthlyPrice: 0, yearlyPrice: 0, features: ['5 Prompts/day', 'Basic AI Tools'], accessLevel: 'free', limits: { dailyPrompts: 5, favorites: 10 } },
            { id: 'pro', name: 'Professional', description: 'Best for power users', monthlyPrice: 29, yearlyPrice: 290, features: ['Unlimited Prompts', 'Priority Support', 'Commercial License'], accessLevel: 'pro', isPopular: true, limits: { dailyPrompts: 999, favorites: 999 } }
          ]);
        }

        if (cSnap.exists()) {
          setConfig(cSnap.data() as AppConfig);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    }
    loadPricing();
  }, []);

  const handleSubscribe = async (plan: PricingPlan) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (plan.accessLevel === 'free') {
      window.location.href = '/dashboard';
      return;
    }

    setLoading(true);
    try {
      // Simulation of a successful checkout for demo purposes
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const isTrial = config?.freeTrialEnabled && !profile?.trialUsed;
      const finalStatus = plan.accessLevel === 'enterprise' ? 'enterprise' : 'pro';

      // Upgrade user
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        subscriptionStatus: finalStatus,
        trialUsed: isTrial ? true : profile?.trialUsed,
        updatedAt: serverTimestamp()
      });

      // Reward Affiliate
      if (profile?.referredBy) {
        const commission = billingCycle === 'monthly' ? (plan.monthlyPrice * 0.25) : (plan.yearlyPrice * 0.25);
        const q = query(collection(db, 'users'), where('referralCode', '==', profile.referredBy));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(doc(db, 'users', snap.docs[0].id), {
            affiliateEarnings: increment(commission)
          });
        }
      }

      alert(isTrial ? `Trial Started! You have PRO access for ${config?.freeTrialDays} days.` : "Success! Your subscription is active.");
      window.location.href = '/dashboard';
    } catch (err) {
      console.error(err);
      alert("Something went wrong during checkout.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-24">
      {/* Trial Banner */}
      <AnimatePresence>
        {config?.freeTrialEnabled && !profile?.trialUsed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            className="max-w-4xl mx-auto mb-12"
          >
            <div className="bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-6 flex items-center justify-between shadow-lg shadow-amber-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900">Limited Time Offer!</h4>
                  <p className="text-sm text-slate-600 font-medium">Start any premium plan and get the first <span className="font-bold text-amber-600">{config.freeTrialDays} days FREE</span>.</p>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-black uppercase text-amber-600 tracking-wider">
                  <Calendar className="w-4 h-4" />
                  Trial Available
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">Simple, Powerful <span className="text-indigo-600">Plans</span></h1>
        
        {/* Toggle */}
        <div className="inline-flex items-center bg-slate-100 p-1.5 rounded-2xl mb-8">
          <button 
            onClick={() => setBillingCycle('monthly')}
            className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBillingCycle('yearly')}
            className={`px-8 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Yearly
            <span className="bg-indigo-100 text-indigo-600 text-[10px] px-2 py-0.5 rounded-lg border border-indigo-200">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative bg-white rounded-[3rem] p-10 border-2 transition-all flex flex-col ${
              plan.isPopular ? 'border-indigo-600 shadow-2xl shadow-indigo-500/10' : 'border-slate-100 shadow-sm'
            }`}
          >
            {plan.isPopular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest px-8 py-2.5 rounded-full shadow-xl">
                Most Popular
              </div>
            )}

            <div className="mb-10">
              <h3 className="text-2xl font-black text-slate-900 mb-2">{plan.name}</h3>
              <p className="text-slate-500 text-sm font-medium">{plan.description}</p>
            </div>

            <div className="flex items-baseline gap-1 mb-10">
              <span className="text-6xl font-black text-slate-900 leading-none">
                ${billingCycle === 'monthly' ? plan.monthlyPrice : Math.floor(plan.yearlyPrice / 12)}
              </span>
              <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">/mo</span>
            </div>

            <ul className="space-y-5 mb-12 flex-1">
              {plan.features.map((feature, j) => (
                <li key={j} className="flex items-start gap-4">
                  <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${plan.isPopular ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-slate-600 font-bold text-sm leading-tight">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan)}
              disabled={loading || (plan.accessLevel === profile?.subscriptionStatus)}
              className={`w-full py-5 rounded-[1.5rem] font-black text-lg transition-all flex items-center justify-center gap-3 ${
                plan.isPopular 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 hover:-translate-y-1' 
                  : 'bg-slate-900 text-white hover:bg-black'
              } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
            >
              {plan.accessLevel === profile?.subscriptionStatus ? 'Current Plan' : (
                config?.freeTrialEnabled && !profile?.trialUsed && plan.accessLevel !== 'free' ? 'Start Free Trial' : 'Get Started'
              )}
              {plan.accessLevel !== profile?.subscriptionStatus && <ArrowRight className="w-5 h-5 font-black" />}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-24 text-center">
        <div className="inline-flex flex-wrap justify-center gap-8 px-12 py-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
          <div className="flex items-center gap-3 text-slate-400">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-xs font-black uppercase tracking-widest">Secure Bank-Level Payments</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <CreditCard className="w-6 h-6" />
            <span className="text-xs font-black uppercase tracking-widest">Stripe & PayPal Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
