import { addDoc, collection, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, CreditCard, Heart, Lock, RefreshCw, ShieldCheck, Sparkles, Tag, TrendingUp, X, Zap } from 'lucide-react';
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
import Input from "../components/primitives/Input";
import Checkbox from "../components/primitives/Checkbox";
import { useCurrency } from '../context/CurrencyContext';
import Button from '../components/primitives/Button';
import PageContainer from '../components/layout/PageContainer';
import { usePath } from '../hooks/usePath';
import { useMarketing } from '../hooks/useMarketing';
import { useConfig } from '../hooks/useConfig';

const DEFAULT_BENEFITS = [
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
  const { marketingConfig } = useMarketing();
  const { config: globalConfig } = useConfig();
  const { prefix } = usePath();
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!planId) { navigate(prefix('/pricing')); return; }
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
          navigate(prefix('/pricing'));
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
  const [autoPay, setAutoPay] = useState(true);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [couponData, setCouponData] = useState<null | { couponId: string; code: string; type: string; value: number; discountAmount: number; finalAmount: number; description: string }>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Two-sided referral: referee discount
  const refereeDiscountPct = marketingConfig?.refereeDiscountPercent ?? 10;

  const validate = () => {
    if (price === 0) return true;
    if (paymentConfig?.cashfree?.enabled || (paymentConfig?.paypal?.enabled && currency !== 'INR')) return true;

    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Cardholder name is required";
    if (cardNumber.replace(/\s/g, '').length < 16) newErrors.cardNumber = "Enter a valid card number";
    if (!expiry.includes('/')) newErrors.expiry = "Invalid format";
    if (cvc.length < 3) newErrors.cvc = "Required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const redeemCoupon = async (idToken: string | undefined) => {
    if (!couponData) return;
    try {
      await fetch('/api/coupons/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(idToken && { Authorization: `Bearer ${idToken}` }) },
        body: JSON.stringify({ couponId: couponData.couponId, planId, amount: price }),
      });
    } catch { /* non-blocking */ }
  };

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), planId, amount: price }),
      });
      const data = await res.json();
      if (!res.ok) { setCouponError(data.error); return; }
      setCouponData(data);
      toast.success(`Coupon applied — ${data.type === 'percent' ? `${data.value}% off` : `₹${data.value} off`}`);
    } catch { setCouponError('Failed to validate coupon'); }
    finally { setCouponLoading(false); }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeToTerms) { toast.error("Please agree to the Terms and Refund Policy to proceed."); return; }
    if (!plan) return;
    if (!user) { toast.error("Please log in or create an account to continue."); return; }
    if (!validate()) return;

    setProcessing(true);
    try {
      if (paymentConfig?.cashfree?.enabled && price > 0) {
        const idToken = await user?.getIdToken();
        await redeemCoupon(idToken);
        if (autoPay) {
          await PaymentService.initiateCashfreeSubscription({
            amount: price, currency, customerId: user.uid, customerEmail: user.email || '',
            customerPhone: profile?.phoneNumber || '9999999999',
            customerName: profile?.displayName || user.displayName || 'Creator',
            planId: planId as string, billingCycle: cycle
          });
        } else {
          await PaymentService.initiateCashfreePayment({
            amount: price, currency, customerId: user.uid, customerEmail: user.email || '',
            customerPhone: profile?.phoneNumber || '9999999999',
            planId: planId as string, billingCycle: cycle
          });
        }
        return;
      }

      let finalUid = user?.uid;
      await new Promise(resolve => setTimeout(resolve, 1500));

      const isTrial = config?.activePromotion === 'trial' && !profile?.trialUsed && plan.monthlyPrice > 0;
      let status: 'free' | 'pro' | 'enterprise' = 'pro';
      if (plan.monthlyPrice === 0) status = 'free';
      const planNameLower = plan.name.toLowerCase();
      if (planNameLower.includes('agency') || planNameLower.includes('enterprise') || planNameLower.includes('team')) status = 'enterprise';

      const trialDays = config?.freeTrialDays || 7;
      const trialEndsAt = isTrial ? new Date(Date.now() + (trialDays * 24 * 60 * 60 * 1000)) : null;

      const planCredits = plan.monthlyCredits ?? (status === 'enterprise' ? 2500 : status === 'pro' ? 500 : 50);
      const userRef = doc(db, 'users', finalUid);
      await setDoc(userRef, {
        subscriptionStatus: status, activePlanId: plan.id,
        credits: planCredits,
        monthlyLimit: planCredits,
        trialUsed: isTrial ? true : (profile?.trialUsed || false),
        trialEndsAt, updatedAt: serverTimestamp()
      }, { merge: true });

      if (couponData && !isTrial && price > 0) {
        const idToken = await user?.getIdToken();
        await redeemCoupon(idToken);
      }

      const refCode = profile?.referredBy || searchParams.get('ref') || localStorage.getItem('referralCode');
      if (refCode && !isTrial && price > 0) {
        const commissionRate = (marketingConfig.referralCommission ?? 25) / 100;
        const paymentFeeRate = (marketingConfig.paymentFeePercent ?? 2) / 100;
        const platformFeeRate = (marketingConfig.platformFeePercent ?? 0) / 100;
        const paymentFee = price * paymentFeeRate;
        const netAmount = price - paymentFee;
        const grossCommission = netAmount * commissionRate;
        const platformFee = grossCommission * platformFeeRate;
        const commission = Math.max(0, Math.floor(grossCommission - platformFee));
        if (commission > 0) {
          const q = query(collection(db, 'users'), where('referralCode', '==', refCode));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const affiliateDoc = snap.docs[0];
            await updateDoc(affiliateDoc.ref, { affiliateEarnings: increment(commission) });
            await addDoc(collection(db, 'referrals'), {
              referrerId: affiliateDoc.id, buyerId: finalUid, buyerEmail: user?.email,
              grossSaleAmount: price, paymentFee, platformFee,
              grossCommission, netCommission: commission,
              commissionRate: commissionRate * 100,
              purchaseAmount: price, planId: plan.id,
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
      setTimeout(() => navigate(prefix('/dashboard')), 1500);

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

  // Use fixed INR prices from the plan when set; fall back to live rate conversion.
  const inrMonthly = (plan.inrMonthlyPrice ?? 0) > 0 ? plan.inrMonthlyPrice : Math.round(plan.monthlyPrice * exchangeRate);
  const inrYearly  = (plan.inrYearlyPrice  ?? 0) > 0 ? plan.inrYearlyPrice  : Math.round(plan.yearlyPrice  * exchangeRate);

  const basePrice = cycle === 'yearly'
    ? (currency === 'INR' ? inrYearly : plan.yearlyPrice)
    : (currency === 'INR' ? inrMonthly : plan.monthlyPrice);

  // Referee discount (two-sided referral)
  const refCode = profile?.referredBy || searchParams.get('ref') || localStorage.getItem('referralCode');
  const refereeDiscount = refCode && affiliateName ? parseFloat((basePrice * refereeDiscountPct / 100).toFixed(2)) : 0;

  // Final price: base → referee discount → coupon
  const priceAfterReferee = Math.max(0, basePrice - refereeDiscount);
  const price = couponData ? couponData.finalAmount : priceAfterReferee;
  const isFree = price === 0;

  const UNLOCK_BENEFITS: string[] = (globalConfig as any)?.checkoutBenefits?.length
    ? (globalConfig as any).checkoutBenefits
    : DEFAULT_BENEFITS;

  const inputClass = "w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all bg-background border border-border focus:border-primary/50";

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <PageContainer ignoreCustomizer className="max-w-5xl">

        <Button
          as={Link}
          to={prefix('/pricing')}
          variant="ghost"
          size="sm"
          leftIcon={ArrowLeft}
          className="mb-8 font-bold"
        >
          Back to Pricing
        </Button>

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
                   <Button
                    onClick={handleCheckout}
                    isLoading={processing}
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="shadow-xl shadow-primary/20"
                  >
                    {user ? 'Activate Free Plan' : 'Sign in to Activate'}
                  </Button>
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

                  <Checkbox
                    id="termsCheckbox"
                    checked={agreeToTerms}
                    onChange={e => setAgreeToTerms(e.target.checked)}
                    label="I have read and agree to the Terms of Service and Refund Policy."
                    description="By checking this, you confirm that you have read our legal documentation."
                    className="p-5"
                  />

                  {/* Auto-pay toggle */}
                  <div
                    className="rounded-xl p-4 flex items-center justify-between cursor-pointer border transition-colors"
                    style={autoPay
                      ? { background: 'rgba(139,92,246,0.06)', borderColor: 'rgba(139,92,246,0.25)' }
                      : { background: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}
                    onClick={() => setAutoPay(p => !p)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={autoPay
                          ? { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }
                          : { background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
                        <RefreshCw className={`w-4 h-4 ${autoPay ? 'text-violet-400' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${autoPay ? 'text-foreground' : 'text-muted-foreground'}`}>
                          Auto-renew subscription
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {autoPay
                            ? `Renews automatically every ${cycle === 'yearly' ? 'year' : 'month'}. Cancel anytime.`
                            : 'One-time payment — you will need to renew manually.'}
                        </p>
                      </div>
                    </div>
                    <div
                      className="relative w-11 h-6 rounded-full transition-colors shrink-0"
                      style={{ background: autoPay ? 'rgba(139,92,246,0.8)' : 'hsl(var(--border))' }}
                    >
                      <div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all"
                        style={{ left: autoPay ? '24px' : '4px' }}
                      />
                    </div>
                  </div>

                  {/* Coupon Code */}
                  {!couponData ? (
                    <div className="rounded-xl border border-border p-4 space-y-2.5">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5" /> Have a coupon?
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                          placeholder="Enter coupon code"
                          className={inputClass + " flex-1 uppercase font-mono tracking-widest"}
                          onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                        />
                        <Button onClick={applyCoupon} isLoading={couponLoading} variant="outline" size="sm" className="shrink-0 px-5">
                          Apply
                        </Button>
                      </div>
                      {couponError && (
                        <p className="text-xs text-rose-500 flex items-center gap-1.5">
                          <AlertCircle className="w-3 h-3 shrink-0" />{couponError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl p-4 flex items-center justify-between"
                      style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(16,185,129,0.15)' }}>
                          <Tag className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{couponData.code} applied!</p>
                          <p className="text-xs text-emerald-600/60 dark:text-emerald-400/60">
                            {couponData.type === 'percent' ? `${couponData.value}% off` : `${symbol}${couponData.value} off`}
                            {couponData.description ? ` — ${couponData.description}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setCouponData(null); setCouponInput(''); setCouponError(''); }}
                        className="text-muted-foreground hover:text-rose-500 transition-colors ml-3"
                        title="Remove coupon"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Payment gateways */}
                  <div className="space-y-4">
                    {paymentConfig?.cashfree?.enabled && (
                      <Button
                        onClick={handleCheckout}
                        isLoading={processing}
                        variant="primary"
                        size="lg"
                        fullWidth
                        leftIcon={autoPay ? RefreshCw : Zap}
                        className="shadow-xl shadow-primary/20"
                      >
                        {isTrial
                          ? 'Start Trial with Cashfree'
                          : autoPay
                            ? `Subscribe ${symbol}${price}/${cycle === 'yearly' ? 'yr' : 'mo'} with Cashfree`
                            : `Pay ${symbol}${price} with Cashfree`}
                      </Button>
                    )}

                    {paymentConfig?.paypal?.enabled && currency !== 'INR' && (
                      autoPay ? (
                        // PayPal subscription (redirect flow)
                        <Button
                          onClick={async () => {
                            if (!agreeToTerms) { toast.error("Please agree to the Terms and Refund Policy to proceed."); return; }
                            if (!user) { toast.error("Please log in to continue."); return; }
                            setProcessing(true);
                            try {
                              await PaymentService.initiatePaypalSubscription({
                                customerId: user.uid, customerEmail: user.email || '',
                                planId: planId as string, billingCycle: cycle, amount: price
                              });
                            } catch (err: any) {
                              toast.error(err.message || "PayPal subscription failed");
                              setProcessing(false);
                            }
                          }}
                          isLoading={processing}
                          variant="secondary"
                          size="lg"
                          fullWidth
                          leftIcon={RefreshCw}
                          className="border-[#0070ba] text-[#0070ba] hover:bg-[#0070ba]/10"
                        >
                          Subscribe with PayPal
                        </Button>
                      ) : (
                        // PayPal one-time payment
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
                                // PayPal is only shown for non-INR users so currency is always USD here.
                                purchase_units: [{ description: `${plan.name} Plan`, amount: { currency_code: "USD", value: price.toString() } }],
                              })}
                              onApprove={async (data, actions) => {
                                try {
                                  setProcessing(true);
                                  const idToken = await user?.getIdToken();
                                  const response = await fetch('/api/payments/paypal/verify', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
                                    },
                                    body: JSON.stringify({ orderID: data.orderID, planId, billingCycle: cycle, customerId: user?.uid, customerEmail: user?.email })
                                  });
                                  const result = await response.json();
                                  if (result.status === 'COMPLETED') {
                                    await redeemCoupon(idToken);
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
                      )
                    )}

                    {!paymentConfig?.cashfree?.enabled && !paymentConfig?.paypal?.enabled && (
                      <form onSubmit={handleCheckout} className="space-y-5">
                        <Input 
                          label="Cardholder Name"
                          id="cardName"
                          name="cardName"
                          type="text"
                          error={errors.name}
                          value={name}
                          onChange={e => {
                            setName(e.target.value);
                            if (errors.name) setErrors({...errors, name: ''});
                          }}
                          placeholder="Name on card"
                        />

                        <Input 
                          label="Card Information"
                          id="cardNumber"
                          name="cardNumber"
                          type="text"
                          error={errors.cardNumber}
                          value={cardNumber}
                          onChange={e => {
                            handleCardNumber(e);
                            if (errors.cardNumber) setErrors({...errors, cardNumber: ''});
                          }}
                          placeholder="0000 0000 0000 0000"
                          leftIcon={CreditCard}
                          className="font-mono"
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <Input 
                            label="Expiry Date"
                            id="cardExpiry"
                            name="cardExpiry"
                            type="text"
                            error={errors.expiry}
                            value={expiry}
                            onChange={e => {
                              handleExpiry(e);
                              if (errors.expiry) setErrors({...errors, expiry: ''});
                            }}
                            placeholder="MM/YY"
                            className="font-mono"
                          />
                          <Input 
                            label="CVC"
                            id="cardCvc"
                            name="cardCvc"
                            type="text"
                            error={errors.cvc}
                            value={cvc}
                            onChange={e => {
                              handleCvc(e);
                              if (errors.cvc) setErrors({...errors, cvc: ''});
                            }}
                            placeholder="123"
                            className="font-mono"
                          />
                        </div>
                         <Button
                          type="submit"
                          isLoading={processing}
                          variant="primary"
                          size="lg"
                          fullWidth
                          className="mt-2 shadow-xl shadow-primary/20"
                        >
                          {isTrial ? 'Start Free Trial' : `Pay ${symbol}${price}`}
                        </Button>
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
                  {refereeDiscount > 0 && (
                    <p className="text-xs font-bold mt-1" style={{ color: 'rgb(139,92,246)' }}>
                      You save {refereeDiscountPct}% as a referred friend!
                    </p>
                  )}
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
                <div className="text-right">
                  {(refereeDiscount > 0 || couponData) && (
                    <p className="text-sm text-muted-foreground line-through">{symbol}{basePrice}</p>
                  )}
                  <p className="font-bold text-2xl text-foreground">{symbol}{price}</p>
                </div>
              </div>

              {cycle === 'monthly' && plan.yearlyPrice > 0 && plan.yearlyPrice < plan.monthlyPrice * 12 && (() => {
                const annualSavings = currency === 'INR'
                  ? Math.round(inrMonthly * 12 - inrYearly)
                  : (plan.monthlyPrice * 12) - plan.yearlyPrice;
                const annualBase = currency === 'INR' ? inrMonthly * 12 : plan.monthlyPrice * 12;
                const savePct = Math.round((annualSavings / (annualBase || 1)) * 100);
                const incentiveVal = (globalConfig as any)?.yearlyIncentiveValue ?? savePct;
                const incentiveType = (globalConfig as any)?.yearlyIncentiveType ?? 'percent';
                const label = incentiveType === 'free_months'
                  ? `Get ${incentiveVal} months free`
                  : incentiveType === 'amount'
                  ? `Save ${symbol}${incentiveVal}`
                  : `Save ${incentiveVal}%`;
                const params = new URLSearchParams(window.location.search);
                params.set('cycle', 'yearly');
                return (
                  <div className="my-3 rounded-xl p-3.5 flex items-center justify-between gap-3 bg-emerald-500/8 border border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-600">{label} with Annual billing</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Pay {symbol}{currency === 'INR' ? inrYearly : plan.yearlyPrice}/yr instead</p>
                      </div>
                    </div>
                    <a
                      href={`?${params.toString()}`}
                      className="text-[10px] font-bold text-emerald-600 bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap border border-emerald-500/20"
                    >
                      Switch →
                    </a>
                  </div>
                );
              })()}

              {cycle === 'yearly' && plan.monthlyPrice > 0 && (
                <div className="flex items-center justify-between py-3 border-b border-border text-emerald-600 dark:text-emerald-400">
                  <p className="text-sm font-semibold">Yearly discount</p>
                  <p className="text-sm font-bold">
                    -{symbol}{currency === 'INR'
                      ? Math.max(0, inrMonthly * 12 - inrYearly)
                      : (plan.monthlyPrice * 12) - plan.yearlyPrice}
                  </p>
                </div>
              )}

              {refereeDiscount > 0 && (
                <div className="flex items-center justify-between py-3 border-b border-border" style={{ color: 'rgb(139,92,246)' }}>
                  <p className="text-sm font-semibold">Referral discount ({refereeDiscountPct}%)</p>
                  <p className="text-sm font-bold">-{symbol}{refereeDiscount}</p>
                </div>
              )}

              {couponData && (
                <div className="flex items-center justify-between py-3 border-b border-border text-emerald-600 dark:text-emerald-400">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />{couponData.code}
                    </p>
                    {couponData.description && <p className="text-xs text-muted-foreground mt-0.5">{couponData.description}</p>}
                  </div>
                  <p className="text-sm font-bold shrink-0">-{symbol}{couponData.discountAmount}</p>
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
      </PageContainer>
    </div>
  );
}
