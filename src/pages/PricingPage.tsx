import { ArrowRight, Calendar, Check, CreditCard, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PricingPlan } from '../types';
import { useConfig } from '../hooks/useConfig';
import { useCurrency } from '../context/CurrencyContext';

export default function PricingPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { config, loading: configLoading } = useConfig();
  const { currency, symbol, exchangeRate } = useCurrency();
  const plans = config.plans;
  const [loading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleSubscribe = (plan: PricingPlan) => {
    navigate(`/checkout?plan=${plan.id}&cycle=${billingCycle}`);
  };

  if (configLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ── */}
      <div className="relative pt-24 pb-16 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.14) 0%, transparent 70%)' }} />

        <div className="container mx-auto px-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 bg-primary/10 border border-primary/25 text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tight leading-[1.1]">
            Invest in better<br />
            <span style={{
              background: 'linear-gradient(135deg, hsl(258,90%,70%), hsl(280,100%,75%))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>AI results</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
            Start free. Upgrade only when you're ready. No hidden fees, no contracts.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center p-1.5 rounded-xl gap-1 bg-muted border border-border">
            {(['monthly', 'yearly'] as const).map(cycle => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${billingCycle === cycle ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                {cycle === 'yearly' && plans.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
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
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Promotional banners ── */}
      <AnimatePresence mode="wait">
        {config?.activePromotion === 'trial' && !profile?.trialUsed && (
          <motion.div key="trial-banner" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="container mx-auto px-4 max-w-4xl mb-8">
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
          </motion.div>
        )}

        {config?.activePromotion === 'yearly_bonus' && (
          <motion.div key="yearly-banner" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="container mx-auto px-4 max-w-4xl mb-8">
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Plan cards ── */}
      <div className="container mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan, i) => {
            const discount = plan.monthlyPrice > 0
              ? Math.round(((plan.monthlyPrice * 12 - plan.yearlyPrice) / (plan.monthlyPrice * 12)) * 100)
              : 0;
            const isCurrent = plan.id === profile?.activePlanId;
            const displayPrice = billingCycle === 'monthly'
              ? (currency === 'INR' ? Math.round(plan.monthlyPrice * exchangeRate) : plan.monthlyPrice)
              : (currency === 'INR' ? Math.round((plan.yearlyPrice / 12) * exchangeRate) : Math.floor(plan.yearlyPrice / 12));

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
                      style={{ background: 'linear-gradient(90deg, transparent, hsl(258,90%,60%), transparent)' }} />
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

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={loading || isCurrent}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={plan.isPopular && !isCurrent
                    ? { background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))', color: '#fff', boxShadow: '0 0 24px rgba(139,92,246,0.3)' }
                    : { background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }
                  }
                >
                  {isCurrent ? 'Current Plan' : (
                    config?.activePromotion === 'trial' && !profile?.trialUsed && plan.monthlyPrice > 0
                      ? 'Start Free Trial'
                      : 'Get Started'
                  )}
                  {!isCurrent && <ArrowRight className="w-4 h-4" />}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* ── Trust badges ── */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 max-w-2xl mx-auto">
          {[
            { icon: ShieldCheck, label: 'Secure Bank-Level Payments' },
            { icon: CreditCard, label: 'Cashfree & PayPal Support' },
            { icon: Zap,         label: 'Instant Access After Payment' },
          ].map(({ icon: Icon, label }, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Icon className="w-4 h-4 text-muted-foreground/40" />
              <span className="text-xs text-muted-foreground/40 uppercase tracking-widest font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
