import { addDoc, collection, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, CreditCard, Heart, Lock, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { trackEvent } from '../lib/analytics';
import { db } from '../lib/firebase';
import { AppConfig, PricingPlan } from '../types';
import UnifiedAuth from '../components/auth/UnifiedAuth';
import { PaymentService } from '../services/paymentService';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useCurrency } from '../context/CurrencyContext';

const UNLOCK_BENEFITS = [
  '5,000+ expert-engineered AI prompts',
  'Copy, save & organize unlimited prompts',
  'New prompts added every week',
  'Priority support & feature requests',
  'Cancel anytime — no lock-in',
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, syncMarketingTags } = useAuth();
  const { currency, symbol, exchangeRate, isLoading: currencyLoading } = useCurrency();
  const [searchParams] = useSearchParams();

  const planId = searchParams.get('plan');
  const cycle = searchParams.get('cycle') || 'monthly';

  const [plan, setPlan] = useState<PricingPlan | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [affiliateName, setAffiliateName] = useState<string | null>(null);
  const [affiliatePhoto, setAffiliatePhoto] = useState<string | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);

  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  useEffect(() => {
    if (!planId) { navigate('/pricing'); return; }
    if (authLoading || currencyLoading) return;

    async function loadData() {
      try {
        const [pSnap, cSnap] = await Promise.all([
          getDoc(doc(db, 'plans', planId as string)),
          getDoc(doc(db, 'configs', 'global'))
        ]);

        if (pSnap.exists()) {
          const planData = pSnap.data() as any;
          setPlan({ id: pSnap.id, ...planData } as PricingPlan);
          trackEvent('start_checkout', user?.uid, { planId, planName: planData.name, amount: planData.monthlyPrice, currency: 'USD' });
        } else {
          toast.error("Plan not found");
          navigate('/pricing');
        }

        if (cSnap.exists()) setConfig(cSnap.data() as AppConfig);

        const pConfig = await PaymentService.getPaymentConfig();
        setPaymentConfig(pConfig);

        const refCode = profile?.referredBy || searchParams.get('ref') || localStorage.getItem('referralCode');
        if (refCode) {
          setAffiliateName('a Creator');
          try {
            const q = query(collection(db, 'users'), where('referralCode', '==', refCode.toUpperCase()));
            const refSnap = await getDocs(q);
            if (!refSnap.empty) {
              const data = refSnap.docs[0].data();
              setAffiliateName(data.displayName || 'a Creator');
              setAffiliatePhoto(data.photoURL || null);
            }
          } catch (e) { /* fallback already set */ }
        }
      } catch (err) { /* silent */ } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [planId, navigate, profile, searchParams, authLoading]);

  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeToTerms) { toast.error("Please agree to the Terms and Refund Policy to proceed."); return; }
    if (!plan) return;
    if (!user) { toast.error("Please log in or create an account to continue."); return; }

    setProcessing(true);
    try {
      if (paymentConfig?.cashfree?.enabled && price > 0) {
        await PaymentService.initiateCashfreePayment({
          amount: price, currency, customerId: user.uid, customerEmail: user.email || '',
          customerPhone: profile?.phoneNumber || '9999999999', planId, billingCycle: cycle
        });
        return;
      }

      if (price > 0 && !name) { toast.error("Please enter your name for the purchase."); setProcessing(false); return; }

      let finalUid = user?.uid;
      await new Promise(resolve => setTimeout(resolve, 1500));

      const isTrial = config?.activePromotion === 'trial' && !profile?.trialUsed && plan.monthlyPrice > 0;
      let status: 'free' | 'pro' | 'enterprise' = 'pro';
      if (plan.monthlyPrice === 0) status = 'free';
      const planNameLower = plan.name.toLowerCase();
      if (planNameLower.includes('agency') || planNameLower.includes('enterprise') || planNameLower.includes('team')) status = 'enterprise';

      const trialDays = config?.freeTrialDays || 7;
      const trialEndsAt = isTrial ? new Date(Date.now() + (trialDays * 24 * 60 * 60 * 1000)) : null;

      const userRef = doc(db, 'users', finalUid);
      await setDoc(userRef, {
        subscriptionStatus: status, activePlanId: plan.id,
        credits: status === 'pro' ? 500 : (status === 'enterprise' ? 2500 : 50),
        monthlyLimit: status === 'pro' ? 500 : (status === 'enterprise' ? 2500 : 50),
        trialUsed: isTrial ? true : (profile?.trialUsed || false),
        trialEndsAt, updatedAt: serverTimestamp()
      }, { merge: true });

      const refCode = profile?.referredBy || searchParams.get('ref') || localStorage.getItem('referralCode');
      if (refCode && !isTrial && price > 0) {
        const commission = Math.floor(price * 0.25);
        if (commission > 0) {
          const q = query(collection(db, 'users'), where('referralCode', '==', refCode));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const affiliateDoc = snap.docs[0];
            await updateDoc(affiliateDoc.ref, { affiliateEarnings: increment(commission) });
            await addDoc(collection(db, 'referrals'), {
              referrerId: affiliateDoc.id, buyerId: finalUid, buyerEmail: user?.email,
              amount: commission, purchaseAmount: price, planId: plan.id,
              status: 'completed', createdAt: serverTimestamp()
            });
          }
        }
      }

      try {
        const contactRef = collection(db, 'marketing_contacts');
        const q = query(contactRef, where('email', '==', user?.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const contactDoc = snap.docs[0];
          const existingTags = contactDoc.data().tags || [];
          const newTags = Array.from(new Set([...existingTags, 'paying_customer', 'active_subscriber']));
          await updateDoc(contactDoc.ref, { tags: newTags, lastPurchaseAt: serverTimestamp(), subscriptionStatus: status });
          const freshTags = ['paying_customer', 'active_subscriber'].filter(t => !existingTags.includes(t));
          if (freshTags.length > 0) await syncMarketingTags(freshTags);
        }
      } catch (crmErr) { /* non-blocking */ }

      toast.success(isTrial ? `Trial Started!` : `Success! Your ${plan.name} plan is active.`);
      setTimeout(() => navigate('/dashboard'), 1500);

    } catch (err: any) {
      toast.error(err.message || "Checkout failed.");
      setProcessing(false);
    }
  };

  const handleCardNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 16) val = val.slice(0, 16);
    const parts = val.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join(' ') : val);
  };

  const handleExpiry = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
    setExpiry(val);
  };

  const handleCvc = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);
    setCvc(val);
  };

  if (loading || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isTrial = config?.activePromotion === 'trial' && !profile?.trialUsed && plan.monthlyPrice > 0;
  const price = cycle === 'yearly'
    ? (currency === 'INR' ? Math.round(plan.yearlyPrice * exchangeRate) : plan.yearlyPrice)
    : (currency === 'INR' ? Math.round(plan.monthlyPrice * exchangeRate) : plan.monthlyPrice);
  const isFree = price === 0;

  const inputClass = "w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all bg-background border border-border focus:border-primary/50";

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-5xl">

        <Link to="/pricing"
          className="inline-flex items-center gap-2 text-sm font-semibold mb-8 transition-colors text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Pricing
        </Link>

        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* ── Payment Form ── */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl p-8 bg-card border border-border">
              <div className="mb-8 pb-6 border-b border-border">
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                    <Lock className="w-4 h-4 text-violet-400" />
                  </div>
                  Secure Checkout
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Complete your purchase to unlock Promptly {plan.name}.
                </p>
              </div>

              {!user && (
                <div className="rounded-xl mb-8 p-6 bg-muted border border-border">
                  <UnifiedAuth initialMode="register" hideFooter />
                </div>
              )}

              {isFree ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                    style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Ready to start?</h3>
                  <p className="text-sm mb-8 max-w-md mx-auto text-muted-foreground">
                    This plan is 100% free. Click below to activate your account and start prompting.
                  </p>
                  <button onClick={handleCheckout} disabled={processing}
                    className="w-full py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))', boxShadow: '0 0 24px rgba(139,92,246,0.25)' }}>
                    {processing
                      ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                      : (user ? 'Activate Free Plan' : 'Sign in to Activate')
                    }
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {isTrial && (
                    <div className="rounded-xl p-4 flex items-start gap-3"
                      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-300">Your {config?.freeTrialDays}-day free trial starts today!</p>
                        <p className="text-xs mt-1 text-amber-600/60 dark:text-amber-400/60">
                          You won't be charged until {new Date(Date.now() + ((config?.freeTrialDays || 7) * 24 * 60 * 60 * 1000)).toLocaleDateString()}. Cancel anytime before then.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Terms checkbox */}
                  <div className="rounded-xl p-5 bg-muted border border-border">
                    <label htmlFor="termsCheckbox" className="flex items-start gap-4 cursor-pointer group">
                      <div className="relative flex items-center mt-0.5">
                        <input
                          id="termsCheckbox"
                          type="checkbox"
                          checked={agreeToTerms}
                          onChange={e => setAgreeToTerms(e.target.checked)}
                          className="peer appearance-none w-5 h-5 rounded-md cursor-pointer transition-all border border-border bg-background checked:bg-primary checked:border-primary"
                        />
                        <CheckCircle2 className={`absolute w-3.5 h-3.5 text-white left-0.5 transition-opacity ${agreeToTerms ? 'opacity-100' : 'opacity-0'} pointer-events-none`} />
                      </div>
                      <span className="text-sm leading-relaxed text-muted-foreground">
                        I have read and agree to the{' '}
                        <Link to="/terms" className="text-primary hover:text-primary/80 font-semibold">Terms of Service</Link>
                        {' '}and{' '}
                        <Link to="/privacy" className="text-primary hover:text-primary/80 font-semibold">Refund Policy</Link>.
                      </span>
                    </label>
                  </div>

                  {/* Payment gateways */}
                  <div className="space-y-4">
                    {paymentConfig?.cashfree?.enabled && (
                      <button onClick={handleCheckout} disabled={processing}
                        className="w-full py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))', boxShadow: '0 0 24px rgba(139,92,246,0.25)' }}>
                        {processing
                          ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <Zap className="w-5 h-5" />
                        }
                        {isTrial ? 'Start Trial with Cashfree' : `Pay ${symbol}${price} with Cashfree`}
                      </button>
                    )}

                    {paymentConfig?.paypal?.enabled && currency !== 'INR' && (
                      <div className="relative z-0">
                        <PayPalScriptProvider options={{
                          "clientId": (import.meta as any).env.VITE_PAYPAL_CLIENT_ID || (process.env as any).PAYPAL_CLIENT_ID || "test",
                          currency: "USD", intent: "capture"
                        }}>
                          <PayPalButtons
                            style={{ layout: "vertical", shape: "rect", label: "pay", color: "blue" }}
                            disabled={processing}
                            onClick={(data, actions) => {
                              if (!agreeToTerms) { toast.error("Please agree to the Terms and Refund Policy to proceed."); return actions.reject(); }
                              return actions.resolve();
                            }}
                            createOrder={(data, actions) => actions.order.create({
                              intent: "CAPTURE",
                              purchase_units: [{ description: `${plan.name} Subscription`, amount: { currency_code: "USD", value: price.toString() } }],
                            })}
                            onApprove={async (data, actions) => {
                              try {
                                setProcessing(true);
                                const response = await fetch('/api/payments/paypal/verify', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ orderID: data.orderID, planId, billingCycle: cycle, customerId: user?.uid, customerEmail: user?.email })
                                });
                                const result = await response.json();
                                if (result.status === 'COMPLETED') {
                                  toast.success("Payment Successful! Welcome to Pro.");
                                  window.location.href = result.redirectUrl || '/checkout/success';
                                } else {
                                  throw new Error(result.message || "Payment verification failed");
                                }
                              } catch (err: any) {
                                toast.error(err.message || "Payment failed");
                              } finally {
                                setProcessing(false);
                              }
                            }}
                          />
                        </PayPalScriptProvider>
                      </div>
                    )}

                    {!paymentConfig?.cashfree?.enabled && !paymentConfig?.paypal?.enabled && (
                      <form onSubmit={handleCheckout} className="space-y-5">
                        <div>
                          <label htmlFor="cardName" className="block text-sm font-semibold mb-2 text-muted-foreground">Cardholder Name</label>
                          <input id="cardName" type="text" required placeholder="Name on card" value={name} onChange={e => setName(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label htmlFor="cardNumber" className="block text-sm font-semibold mb-2 text-muted-foreground">Card Information</label>
                          <div className="relative">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                            <input id="cardNumber" type="text" required placeholder="0000 0000 0000 0000" value={cardNumber} onChange={handleCardNumber}
                              className={`${inputClass} pl-12 font-mono`}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { label: 'Expiry Date', placeholder: 'MM/YY', value: expiry, onChange: handleExpiry },
                            { label: 'CVC', placeholder: '123', value: cvc, onChange: handleCvc },
                          ].map(({ label, placeholder, value, onChange }) => (
                            <div key={label}>
                              <label htmlFor={`field-${label.toLowerCase().replace(/\s+/g, '-')}`} className="block text-sm font-semibold mb-2 text-muted-foreground">{label}</label>
                              <input id={`field-${label.toLowerCase().replace(/\s+/g, '-')}`} type="text" required placeholder={placeholder} value={value} onChange={onChange}
                                className={`${inputClass} font-mono`}
                              />
                            </div>
                          ))}
                        </div>
                        <button type="submit" disabled={processing}
                          className="w-full py-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                          style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))', boxShadow: '0 0 24px rgba(139,92,246,0.25)' }}>
                          {processing
                            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : (isTrial ? 'Start Free Trial' : `Pay ${symbol}${price}`)
                          }
                        </button>
                      </form>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-5 pt-2">
                    {[
                      { icon: ShieldCheck, label: '256-bit SSL' },
                      { icon: Lock, label: 'Secure Payment' },
                      { icon: AlertCircle, label: 'No Hidden Fees' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/50">
                        <Icon className="w-3.5 h-3.5" /> {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Order Summary ── */}
          <div className="lg:col-span-5 space-y-5">

            {/* Affiliate banner */}
            {affiliateName && (
              <div className="rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden"
                style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0"
                  style={{ border: '2px solid rgba(139,92,246,0.3)' }}>
                  {affiliatePhoto ? (
                    <img src={affiliatePhoto} alt={affiliateName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xl text-violet-400"
                      style={{ background: 'rgba(139,92,246,0.2)' }}>
                      {affiliateName.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(244,63,94,0.15)', color: 'rgb(244,63,94)' }}>
                      Supporting a Creator
                    </span>
                  </div>
                  <p className="font-semibold text-foreground text-sm">{affiliateName}</p>
                  <p className="text-xs mt-0.5 text-muted-foreground">A portion of your payment supports this creator.</p>
                </div>
                <Heart className="absolute right-4 top-4 w-8 h-8 text-rose-500/10" />
              </div>
            )}

            {/* Order summary card */}
            <div className="rounded-2xl p-7 sticky top-24 bg-card border border-border">
              <h3 className="font-bold text-foreground text-lg mb-5 flex items-center justify-between">
                Order Summary
                <span className="text-xs px-2.5 py-1 rounded-full font-bold capitalize"
                  style={{ background: 'rgba(139,92,246,0.15)', color: 'rgb(167,139,250)', border: '1px solid rgba(139,92,246,0.25)' }}>
                  {cycle}
                </span>
              </h3>

              <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                  <p className="font-bold text-foreground">{plan.name} Plan</p>
                  <p className="text-xs mt-0.5 text-muted-foreground">Billed {cycle}</p>
                </div>
                <p className="font-bold text-2xl text-foreground">{symbol}{price}</p>
              </div>

              {cycle === 'yearly' && plan.monthlyPrice > 0 && (
                <div className="flex items-center justify-between py-3 border-b border-border text-emerald-600 dark:text-emerald-400">
                  <p className="text-sm font-semibold">Yearly discount</p>
                  <p className="text-sm font-bold">
                    -{symbol}{currency === 'INR'
                      ? Math.round(((plan.monthlyPrice * 12) - plan.yearlyPrice) * exchangeRate)
                      : (plan.monthlyPrice * 12) - plan.yearlyPrice}
                  </p>
                </div>
              )}

              {isTrial && (
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Free Trial ({config?.freeTrialDays} Days)</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">Due today</p>
                  </div>
                  <p className="font-bold text-xl text-amber-600 dark:text-amber-400">{symbol}0.00</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-5 mt-2">
                <p className="font-bold text-foreground">Total due today</p>
                <p className="font-bold text-3xl text-primary">{symbol}{isTrial ? '0.00' : price}</p>
              </div>

              {/* What you unlock */}
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  What you unlock today
                </p>
                <ul className="space-y-2.5">
                  {UNLOCK_BENEFITS.map(benefit => (
                    <li key={benefit} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <div className="w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <Check className="w-2.5 h-2.5 text-violet-400" />
                      </div>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {!isTrial && !isFree && (
                <p className="text-xs text-center mt-5 text-muted-foreground/40">
                  By confirming, you authorize this recurring charge per our Terms of Service.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
