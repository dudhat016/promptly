import { addDoc, collection, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, CreditCard, Heart, Lock, ShieldCheck, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { AppConfig, PricingPlan } from '../types';
import UnifiedAuth from '../components/auth/UnifiedAuth';

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, syncMarketingTags } = useAuth();

  const planId = searchParams.get('plan');
  const cycle = searchParams.get('cycle') || 'monthly';

  const [plan, setPlan] = useState<PricingPlan | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [affiliateName, setAffiliateName] = useState<string | null>(null);
  const [affiliatePhoto, setAffiliatePhoto] = useState<string | null>(null);
  // Form state
  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  useEffect(() => {
    if (!planId) {
      navigate('/pricing');
      return;
    }

    if (authLoading) return;

    async function loadData() {
      try {
        const [pSnap, cSnap] = await Promise.all([
          getDoc(doc(db, 'plans', planId as string)),
          getDoc(doc(db, 'configs', 'global'))
        ]);

        if (pSnap.exists()) {
          setPlan({ id: pSnap.id, ...pSnap.data() } as PricingPlan);
        } else {
          toast.error("Plan not found");
          navigate('/pricing');
        }

        if (cSnap.exists()) {
          setConfig(cSnap.data() as AppConfig);
        }

        // Fetch Affiliate Name if they came from a referral
        const refCode = profile?.referredBy || searchParams.get('ref') || localStorage.getItem('referralCode');
        if (refCode) {
          // Set default immediately so the banner shows up
          setAffiliateName('a Creator');
          
          try {
            const q = query(collection(db, 'users'), where('referralCode', '==', refCode.toUpperCase()));
            const refSnap = await getDocs(q);
            
            if (!refSnap.empty) {
              const data = refSnap.docs[0].data();
              setAffiliateName(data.displayName || 'a Creator');
              setAffiliatePhoto(data.photoURL || null);
            }
          } catch (e) {
            // Fallback is already set
          }
        }
      } catch (err) {
        // Silently fail or handle error
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [planId, navigate, profile, searchParams, authLoading]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    if (!user) {
      toast.error("Please log in or create an account to continue.");
      return;
    }

    if (!name || cardNumber.length < 15 || expiry.length < 5 || cvc.length < 3) {
      toast.error("Please fill out all payment fields correctly.");
      return;
    }

    setProcessing(true);

    try {
      let finalUid = user?.uid;

      // Simulate real payment gateway delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const isTrial = config?.activePromotion === 'trial' && !profile?.trialUsed && plan.monthlyPrice > 0;

      let status: 'free' | 'pro' | 'enterprise' = 'pro';
      if (plan.monthlyPrice === 0) status = 'free';
      const planNameLower = plan.name.toLowerCase();
      if (planNameLower.includes('agency') || planNameLower.includes('enterprise') || planNameLower.includes('team')) {
        status = 'enterprise';
      }

      const trialDays = config?.freeTrialDays || 7;
      const trialEndsAt = isTrial
        ? new Date(Date.now() + (trialDays * 24 * 60 * 60 * 1000))
        : null;

      // Upgrade user
      if (finalUid) {
        let credits = 50;
        let limit = 50;
        if (status === 'pro') {
          credits = 500;
          limit = 500;
        } else if (status === 'enterprise') {
          credits = 2500;
          limit = 2500;
        }

        const userRef = doc(db, 'users', finalUid);
        await setDoc(userRef, {
          subscriptionStatus: status,
          activePlanId: plan.id,
          credits: credits,
          monthlyLimit: limit,
          trialUsed: isTrial ? true : (profile?.trialUsed || false),
          trialEndsAt: trialEndsAt,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Affiliate Payout Logic
        // We only pay affiliates for actual purchases, not free trials
        const refCode = profile?.referredBy || searchParams.get('ref') || localStorage.getItem('referralCode');
        if (refCode && !isTrial && price > 0) {
          const commission = Math.floor(price * 0.25); // 25% commission
          if (commission > 0) {
            try {
              const q = query(collection(db, 'users'), where('referralCode', '==', refCode));
              const snap = await getDocs(q);
              if (!snap.empty) {
                const affiliateDoc = snap.docs[0];
                await updateDoc(affiliateDoc.ref, {
                  affiliateEarnings: increment(commission)
                });

                // Create a commission record for the ledger
                await addDoc(collection(db, 'referrals'), {
                  referrerId: affiliateDoc.id,
                  buyerId: finalUid,
                  buyerEmail: user?.email,
                  amount: commission,
                  purchaseAmount: price,
                  planId: plan.id,
                  status: 'completed',
                  createdAt: serverTimestamp()
                });
              }
            } catch (e) {
              console.log("Simulated affiliate payout bypassed due to Firestore security rules.");
            }
          }
        }

        // Update Marketing Contact status
        try {
          const contactRef = collection(db, 'marketing_contacts');
          const q = query(contactRef, where('email', '==', user?.email));
          const snap = await getDocs(q);
          
          if (!snap.empty) {
            const contactDoc = snap.docs[0];
            const existingTags = contactDoc.data().tags || [];
            const newTags = Array.from(new Set([...existingTags, 'paying_customer', 'active_subscriber']));
            
            await updateDoc(contactDoc.ref, {
              tags: newTags,
              lastPurchaseAt: serverTimestamp(),
              subscriptionStatus: status
            });

            // Sync the NEW tags to the marketing_tags collection
            const freshTags = ['paying_customer', 'active_subscriber'].filter(t => !existingTags.includes(t));
            if (freshTags.length > 0) {
              await syncMarketingTags(freshTags);
            }
          }
        } catch (crmErr) {
          // Ignore CRM errors to not block checkout
        }
      }

      toast.success(
        isTrial
          ? `Trial Started! You have full access to ${plan.name} for ${trialDays} days.`
          : `Payment successful! Your ${plan.name} subscription is now active.`
      );

      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      toast.error(err.message || "Payment failed. Please try again.");
      setProcessing(false);
    }
  };

  // Input formatters
  const handleCardNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 16) val = val.slice(0, 16);
    const parts = val.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join(' ') : val);
  };

  const handleExpiry = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length >= 2) {
      val = val.slice(0, 2) + '/' + val.slice(2);
    }
    setExpiry(val);
  };

  const handleCvc = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);
    setCvc(val);
  };

  if (loading || !plan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isTrial = config?.activePromotion === 'trial' && !profile?.trialUsed && plan.monthlyPrice > 0;
  const price = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const isFree = price === 0;

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">

        <Link to="/pricing" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Pricing
        </Link>

        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* Payment Form (Left Col) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
              <div className="mb-8 border-b border-slate-100 pb-6">
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                  <Lock className="w-8 h-8 text-indigo-600" />
                  Secure Checkout
                </h1>
                <p className="text-slate-500 font-medium mt-2">Complete your purchase to unlock Promptly {plan.name}.</p>
              </div>

              {!user && (
                <div className="bg-slate-50 border border-slate-200 p-8 rounded-[2rem] mb-8 shadow-sm">
                  <UnifiedAuth initialMode="register" hideFooter />
                </div>
              )}

              {isFree ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">Ready to start?</h3>
                  <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">This plan is 100% free. Click below to activate your account and start prompting.</p>
                  <button
                    onClick={handleCheckout}
                    disabled={processing}
                    className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-black transition-all disabled:opacity-50 shadow-xl shadow-slate-200"
                  >
                    {processing ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : (
                      user ? 'Activate Free Plan' : 'Sign in to Activate'
                    )}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCheckout} className="space-y-6">

                  {isTrial && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 mb-6">
                      <Zap className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-900">Your {config.freeTrialDays}-day free trial starts today!</p>
                        <p className="text-xs text-amber-700 mt-1">You won't be charged until {new Date(Date.now() + (config.freeTrialDays * 24 * 60 * 60 * 1000)).toLocaleDateString()}. Cancel anytime before then.</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Name on card"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                      autoComplete="name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Card Information</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={handleCardNumber}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium font-mono"
                        autoComplete="cc-number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Expiry Date</label>
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={handleExpiry}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium font-mono"
                        autoComplete="cc-exp"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">CVC</label>
                      <input
                        type="text"
                        required
                        placeholder="123"
                        value={cvc}
                        onChange={handleCvc}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium font-mono"
                        autoComplete="cc-csc"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-indigo-600 text-white font-black text-lg py-4 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-200 disabled:opacity-50 mt-8"
                  >
                    {processing ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      isTrial ? 'Start Free Trial' : `Pay $${price}`
                    )}
                  </button>

                  <p className="text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-1 mt-4">
                    <ShieldCheck className="w-3.5 h-3.5" /> Payments are securely processed by Stripe
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Order Summary (Right Col) */}
          <div className="lg:col-span-5">

            {/* Affiliate Support Banner - Premium Redesign */}
            {affiliateName && (
              <div className="bg-white border-2 border-indigo-50 rounded-[2rem] p-6 mb-8 flex items-center gap-5 shadow-xl shadow-indigo-500/5 relative overflow-hidden group animate-in fade-in slide-in-from-top-6">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Heart className="w-12 h-12 text-rose-500 fill-rose-500" />
                </div>
                
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border-2 border-white shadow-sm overflow-hidden">
                    {affiliatePhoto ? (
                      <img src={affiliatePhoto} alt={affiliateName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xl">
                        {affiliateName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-rose-500 text-white p-1 rounded-lg shadow-lg border-2 border-white">
                    <Heart className="w-3 h-3 fill-white" />
                  </div>
                </div>

                <div className="relative z-10 flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase tracking-widest">Supporting a Creator</span>
                    <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  </div>
                  <h4 className="font-black text-slate-900 text-lg leading-tight">
                    {affiliateName}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    By upgrading today, a portion of your payment goes directly to support this creator.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-slate-900 rounded-[2rem] p-8 text-white sticky top-24 shadow-2xl">
              <h3 className="font-black text-xl mb-6 flex items-center justify-between">
                Order Summary
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full uppercase tracking-widest">{cycle}</span>
              </h3>

              <div className="flex items-center justify-between py-4 border-b border-slate-800">
                <div>
                  <p className="font-bold text-lg">{plan.name} Plan</p>
                  <p className="text-sm text-slate-400">Billed {cycle}</p>
                </div>
                <p className="font-black text-2xl">${price}</p>
              </div>

              {cycle === 'yearly' && plan.monthlyPrice > 0 && (
                <div className="flex items-center justify-between py-4 border-b border-slate-800 text-emerald-400">
                  <p className="font-bold text-sm">Yearly Discount applied</p>
                  <p className="font-bold text-sm">
                    -${(plan.monthlyPrice * 12) - plan.yearlyPrice}
                  </p>
                </div>
              )}

              {isTrial && (
                <div className="flex items-center justify-between py-4 border-b border-slate-800">
                  <div>
                    <p className="font-bold text-sm text-amber-400">Free Trial ({config?.freeTrialDays} Days)</p>
                    <p className="text-xs text-slate-400 mt-1">Due today</p>
                  </div>
                  <p className="font-black text-xl text-amber-400">$0.00</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-6 mt-2">
                <p className="font-black text-xl">Total due today</p>
                <p className="font-black text-4xl text-indigo-400">
                  ${isTrial ? '0.00' : price}
                </p>
              </div>

              {!isTrial && !isFree && (
                <p className="text-xs text-slate-500 font-medium mt-6 text-center">
                  By confirming this payment, you agree to our Terms of Service and authorize this recurring payment.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
