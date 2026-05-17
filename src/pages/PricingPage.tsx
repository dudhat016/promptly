import { ArrowRight, Calendar, Check, ChevronDown, CreditCard, HelpCircle, RefreshCw, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { usePath } from '../hooks/usePath';
import { PricingPlan } from '../types';
import { useConfig } from '../hooks/useConfig';
import { useSEO } from '../hooks/useSEO';
import { useCurrency } from '../context/CurrencyContext';
import Button from '../components/primitives/Button';
import PageContainer from '../components/layout/PageContainer';
import Schema from '../components/SEO/Schema';
import { db } from '../lib/firebase';

export default function PricingPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { prefix } = usePath();
  const { config, loading: configLoading } = useConfig();
  const { currency, symbol, exchangeRate, setCurrency } = useCurrency();

  useSEO({
    title: 'Pricing',
    description: 'Simple, transparent pricing for AI prompt creators. Start free — upgrade when you need more credits, storage, and pro features.',
  });
  const plans = config.plans;
  const [loading] = useState(false);
  const [billingCycle, setBillingCycle]     = useState<'monthly' | 'yearly'>('monthly');
  const [faqItems, setFaqItems]             = useState<{ q: string; a: string }[]>([]);
  const [openFaq, setOpenFaq]               = useState<number | null>(null);

  const DEFAULT_FAQ = [
    { q: 'Can I cancel anytime?',           a: 'Yes — cancel with one click from your billing settings. You keep Pro access until the end of your billing period with no extra charges.' },
    { q: 'Is there a free plan?',            a: 'Absolutely. Our Free plan gives you access to the prompt library, vault storage, and AI builder with daily limits — no card required.' },
    { q: 'What payment methods do you accept?', a: 'We accept all major cards, UPI, and net banking via Cashfree (India), and PayPal for international payments.' },
    { q: 'Do unused credits roll over?',     a: 'Credits reset monthly. Upgrading mid-cycle gives you a fresh set of credits immediately.' },
    { q: 'Can I switch between monthly and yearly?', a: 'Yes — you can switch billing cycles anytime from your subscription settings. Yearly billing saves you up to 20%.' },
    { q: 'Is my payment information secure?', a: 'Yes. We never store your payment details. All transactions are processed by PCI-DSS compliant payment gateways.' },
  ];

  useEffect(() => {
    getDoc(doc(db, 'site_content', 'faq'))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          // Support both flat array and categories structure
          const items = Array.isArray(data.categories)
            ? data.categories.flatMap((c: any) => (c.questions || []).map((q: any) => ({ q: q.question, a: q.answer })))
            : [];
          if (items.length > 0) setFaqItems(items);
          else setFaqItems(DEFAULT_FAQ);
        } else {
          setFaqItems(DEFAULT_FAQ);
        }
      })
      .catch(() => setFaqItems(DEFAULT_FAQ));
  }, []);

  const handleSubscribe = (plan: PricingPlan) => {
    const refCode = new URLSearchParams(window.location.search).get('ref') || localStorage.getItem('referralCode');
    const refParam = refCode ? `&ref=${refCode}` : '';
    navigate(prefix(`/checkout?plan=${plan.id}&cycle=${billingCycle}${refParam}`));
  };

  if (configLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Schema type="Pricing" data={{ plans, currency }} />

      {/* ── Hero ── */}
      <div className="relative pt-24 pb-12 md:pb-16 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.14) 0%, transparent 70%)' }} />

        <PageContainer className="relative z-10" ignoreCustomizer>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-5 md:mb-6 bg-primary/10 border border-primary/25 text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            Simple, transparent pricing
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground mb-3 md:mb-4 tracking-tight leading-[1.1]">
            Invest in better<br />
            <span className="gradient-text">AI results</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto px-2 mb-8 md:mb-10">
            Start free. Upgrade only when you're ready. No hidden fees, no contracts.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            {/* Billing toggle */}
            <div className="inline-flex items-center p-1 rounded-xl gap-1 bg-muted border border-border">
              {(['monthly', 'yearly'] as const).map(cycle => (
                <Button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  variant={billingCycle === cycle ? 'white' : 'ghost'}
                  size="md"
                  className="px-8"
                >
                  {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                  {cycle === 'yearly' && plans.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md ml-2"
                      style={{
                        background: config?.activePromotion === 'yearly_bonus' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.2)',
                        color: config?.activePromotion === 'yearly_bonus' ? 'rgb(52,211,153)' : 'rgb(167,139,250)',
                        border: `1px solid ${config?.activePromotion === 'yearly_bonus' ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.3)'}`,
                      }}>
                      {config?.activePromotion === 'yearly_bonus'
                        ? (config.yearlyIncentiveType === 'months' ? `${config.yearlyIncentiveValue}mo Free` : `${config.yearlyIncentiveValue}% Off`)
                        : 'Save 20%'}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {/* Currency switcher */}
            <div className="inline-flex items-center p-1 rounded-xl gap-0.5 bg-muted border border-border">
              {(['USD', 'INR'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currency === c
                      ? 'bg-card shadow-sm text-foreground border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {c === 'USD' ? '$ USD' : '₹ INR'}
                </button>
              ))}
            </div>
          </div>
        </PageContainer>
      </div>

      {/* ── Promotional banners ── */}
      <AnimatePresence mode="wait">
        {config?.activePromotion === 'trial' && !profile?.trialUsed && (
          <PageContainer className="mb-8" ignoreCustomizer>
            <div className="rounded-xl p-5 flex items-center justify-between border"
              style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Calendar className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Limited Time Offer</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Start any plan and get the first{' '}
                    <span className="text-amber-500 dark:text-amber-400 font-bold">{config.freeTrialDays} days FREE</span>.
                  </p>
                </div>
              </div>
              <span className="hidden md:block text-xs font-bold text-amber-500 dark:text-amber-400 uppercase tracking-widest">Trial Available</span>
            </div>
          </PageContainer>
        )}

        {config?.activePromotion === 'yearly_bonus' && (
          <PageContainer className="mb-8" ignoreCustomizer>
            <div className="rounded-xl p-5 flex items-center justify-between border"
              style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Annual Value Pack</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Switch to yearly and get{' '}
                    <span className="text-emerald-500 dark:text-emerald-400 font-bold">
                      {config.yearlyIncentiveType === 'months'
                        ? `${config.yearlyIncentiveValue} MONTHS FREE`
                        : `${config.yearlyIncentiveValue}% EXTRA DISCOUNT`}
                    </span>.
                  </p>
                </div>
              </div>
              <span className="hidden md:block text-xs font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest">Best Value</span>
            </div>
          </PageContainer>
        )}
      </AnimatePresence>

      {/* ── Plan cards ── */}
      <PageContainer className="pb-16 md:pb-20" ignoreCustomizer>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan, i) => {
            // Fixed INR prices take priority over live rate conversion.
            // If inrMonthlyPrice is 0/unset on the plan, fall back to live rate.
            const inrMonthly = plan.inrMonthlyPrice > 0 ? plan.inrMonthlyPrice : Math.round(plan.monthlyPrice * exchangeRate);
            const inrYearly  = plan.inrYearlyPrice  > 0 ? plan.inrYearlyPrice  : Math.round(plan.yearlyPrice  * exchangeRate);

            const discount = plan.monthlyPrice > 0
              ? Math.round(((plan.monthlyPrice * 12 - plan.yearlyPrice) / (plan.monthlyPrice * 12)) * 100)
              : 0;
            // Primary: match activePlanId. Fallback: match by subscriptionStatus when activePlanId is unset.
            const isCurrent = profile?.activePlanId
              ? plan.id === profile.activePlanId
              : profile?.subscriptionStatus === 'free'
                ? plan.monthlyPrice === 0
                : profile?.subscriptionStatus === 'pro'
                  ? (plan.isPopular ?? false)
                  : false;
            const displayPrice = billingCycle === 'monthly'
              ? (currency === 'INR' ? inrMonthly : plan.monthlyPrice)
              : (currency === 'INR' ? Math.round(inrYearly / 12) : Math.floor(plan.yearlyPrice / 12));

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl p-8 flex flex-col relative overflow-hidden"
                style={plan.isPopular
                  ? { background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.35)', boxShadow: '0 0 40px rgba(139,92,246,0.12)' }
                  : { border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }
                }
              >
                {plan.isPopular && (
                  <>
                    <div className="absolute top-0 left-0 right-0 h-px"
                      style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)' }} />
                    <div className="absolute top-4 right-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(139,92,246,0.2)', color: 'rgb(167,139,250)', border: '1px solid rgba(139,92,246,0.3)' }}>
                        Most Popular
                      </span>
                    </div>
                  </>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                </div>

                <div className="mb-7">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-foreground">{symbol}{displayPrice}</span>
                    <span className="text-muted-foreground text-sm font-medium">/mo</span>
                    {billingCycle === 'yearly' && discount > 0 && (
                      <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-md"
                        style={{ background: 'rgba(16,185,129,0.12)', color: 'rgb(52,211,153)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        -{discount}%
                      </span>
                    )}
                  </div>
                  {billingCycle === 'yearly' && plan.yearlyPrice > 0 && (
                    <p className="text-primary text-xs font-semibold mt-2 uppercase tracking-wider">
                      Billed as {symbol}{currency === 'INR' ? Math.round(plan.yearlyPrice * exchangeRate) : plan.yearlyPrice}/year
                    </p>
                  )}
                </div>

                <ul className="space-y-3.5 mb-8 flex-1">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                        style={plan.isPopular
                          ? { background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }
                          : { background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }
                        }
                      >
                        <Check className={`w-3 h-3 ${plan.isPopular ? 'text-violet-400' : 'text-muted-foreground'}`} />
                      </div>
                      <span className="text-muted-foreground text-sm leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={loading || isCurrent}
                  variant={plan.isPopular && !isCurrent ? 'primary' : 'secondary'}
                  size="lg"
                  fullWidth
                  rightIcon={!isCurrent ? ArrowRight : undefined}
                >
                  {isCurrent ? 'Current Plan' : (
                    config?.activePromotion === 'trial' && !profile?.trialUsed && plan.monthlyPrice > 0
                      ? 'Start Free Trial'
                      : 'Get Started'
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* ── Trust badges ── */}
        {(() => {
          const configBadges = (config as any).trustBadges as { label: string }[] | undefined;
          const badges = configBadges?.length
            ? configBadges.map((b, i) => ({ icon: [ShieldCheck, CreditCard, Zap, RefreshCw][i % 4], label: b.label }))
            : [
                { icon: ShieldCheck, label: 'Secure Bank-Level Payments' },
                { icon: CreditCard,  label: `${[(config as any).cashfreeEnabled ? 'Cashfree' : '', (config as any).paypalEnabled ? 'PayPal' : ''].filter(Boolean).join(' & ') || 'Card & UPI'} Support` },
                { icon: Zap,         label: 'Instant Access After Payment' },
                { icon: RefreshCw,   label: 'Cancel Anytime' },
              ];
          return (
            <div className="mt-16 flex flex-wrap items-center justify-center gap-6 max-w-3xl mx-auto">
              {badges.map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-muted-foreground/40" />
                  <span className="text-xs text-muted-foreground/40 uppercase tracking-widest font-medium">{label}</span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── Money-back guarantee ── */}
        {(config as any).moneyBackDays > 0 && (
          <div className="mt-10 max-w-xl mx-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex items-center gap-4 text-center justify-center">
            <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
            <div className="text-left">
              <p className="font-bold text-foreground text-sm">{(config as any).moneyBackDays}-Day Money-Back Guarantee</p>
              <p className="text-xs text-muted-foreground mt-0.5">Not happy? Get a full refund within {(config as any).moneyBackDays} days — no questions asked.</p>
            </div>
          </div>
        )}
      </PageContainer>

      {/* ── FAQ Section ── */}
      {faqItems.length > 0 && (
        <div className="border-t border-border bg-muted/20 py-14 md:py-20">
          <PageContainer className="max-w-3xl" ignoreCustomizer>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 bg-primary/10 border border-primary/25 text-primary">
                <HelpCircle className="w-3.5 h-3.5" /> FAQ
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Frequently asked questions</h2>
            </div>
            <div className="space-y-2">
              {faqItems.slice(0, 8).map((item, i) => (
                <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
                  >
                    <span className="font-semibold text-foreground text-sm pr-4">{item.q}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </PageContainer>
        </div>
      )}
    </div>
  );
}
