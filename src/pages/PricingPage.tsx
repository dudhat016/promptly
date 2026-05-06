import { ArrowRight, Calendar, Check, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PricingPlan } from '../types';
import { useConfig } from '../hooks/useConfig';
import { useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';

export default function PricingPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { config, loading: configLoading } = useConfig();
  const { currency, symbol, exchangeRate } = useCurrency();
  const plans = config.plans;
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');


  // Static data is now managed globally by useConfig, eliminating local fetch logic.

  const handleSubscribe = async (plan: PricingPlan) => {
    // Redirect to the dedicated checkout page (login is handled there or not required just to view)
    navigate(`/checkout?plan=${plan.id}&cycle=${billingCycle}`);
  };

  if (configLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-24">
      {/* Conditional Banners */}
      <AnimatePresence mode="wait">
        {config?.activePromotion === 'trial' && !profile?.trialUsed && (
          <motion.div
            key="trial-banner"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="max-w-4xl mx-auto mb-12"
          >
            <div className="bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-6 flex items-center justify-between shadow-lg shadow-amber-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg tracking-tight">Limited Time Offer!</h4>
                  <p className="text-sm text-slate-600 font-medium">Start any premium plan and get the first <span className="font-bold text-amber-600">{config.freeTrialDays} days FREE</span>.</p>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-black uppercase text-amber-600 tracking-wider border border-amber-100">
                  <Calendar className="w-4 h-4" />
                  Trial Available
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {config?.activePromotion === 'yearly_bonus' && (
          <motion.div
            key="yearly-banner"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="max-w-4xl mx-auto mb-12"
          >
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-[2rem] p-6 flex items-center justify-between shadow-lg shadow-emerald-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg tracking-tight">Annual Value Pack</h4>
                  <p className="text-sm text-slate-600 font-medium">
                    Switch to yearly billing and get <span className="font-bold text-emerald-600 underline decoration-2 underline-offset-4">
                      {config.yearlyIncentiveType === 'months' ? `${config.yearlyIncentiveValue} MONTHS COMPLETELY FREE` : `${config.yearlyIncentiveValue}% ADDITIONAL DISCOUNT`}
                    </span>.
                  </p>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-black uppercase text-emerald-600 tracking-wider border border-emerald-100">
                  Best Value
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
            {plans.length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                config?.activePromotion === 'yearly_bonus'
                  ? 'bg-emerald-100 text-emerald-600 border-emerald-200 animate-pulse'
                  : 'bg-indigo-100 text-indigo-600 border-indigo-200'
              }`}>
                {config?.activePromotion === 'yearly_bonus'
                  ? (config.yearlyIncentiveType === 'months'
                      ? `${config.yearlyIncentiveValue} Months Free!`
                      : `Up to ${Math.max(...plans.map(p => p.monthlyPrice > 0 ? Math.round(((p.monthlyPrice * 12 - p.yearlyPrice) / (p.monthlyPrice * 12)) * 100) : 0))}% Off`)
                  : 'Save 20%'}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
        {plans.map((plan, i) => {
          const discount = plan.monthlyPrice > 0 ? Math.round(((plan.monthlyPrice * 12 - plan.yearlyPrice) / (plan.monthlyPrice * 12)) * 100) : 0;

          return (
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-black text-slate-900">{plan.name}</h3>
                  {billingCycle === 'yearly' && discount > 0 && (
                    <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-lg border border-emerald-200">
                      -{discount}%
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-sm font-medium">{plan.description}</p>
              </div>

                <div className="flex flex-col gap-1 mb-10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-6xl font-black text-slate-900 leading-none">
                      {symbol}{billingCycle === 'monthly' 
                        ? (currency === 'INR' ? Math.round(plan.monthlyPrice * exchangeRate) : plan.monthlyPrice)
                        : (currency === 'INR' ? Math.round((plan.yearlyPrice / 12) * exchangeRate) : Math.floor(plan.yearlyPrice / 12))
                      }
                    </span>
                    <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">/mo</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-indigo-600 font-black text-xs uppercase tracking-widest mt-2 animate-in fade-in slide-in-from-top-1">
                      Billed as {symbol}{currency === 'INR' ? Math.round(plan.yearlyPrice * exchangeRate) : plan.yearlyPrice}/year
                    </p>
                  )}
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
              disabled={loading || (plan.id === profile?.activePlanId)}
              className={`w-full py-5 rounded-[1.5rem] font-black text-lg transition-all flex items-center justify-center gap-3 ${
                plan.isPopular
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 hover:-translate-y-1'
                  : 'bg-slate-900 text-white hover:bg-black'
              } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
            >
              {plan.id === profile?.activePlanId ? 'Current Plan' : (
                config?.activePromotion === 'trial' && !profile?.trialUsed && plan.monthlyPrice > 0 ? 'Start Free Trial' : 'Get Started'
              )}
              {plan.id !== profile?.activePlanId && <ArrowRight className="w-5 h-5 font-black" />}
            </button>
          </motion.div>
        );
      })}
    </div>

      <div className="mt-24 text-center">
        <div className="inline-flex flex-wrap justify-center gap-8 px-12 py-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
          <div className="flex items-center gap-3 text-slate-400">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-xs font-black uppercase tracking-widest">Secure Bank-Level Payments</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <CreditCard className="w-6 h-6" />
            <span className="text-xs font-black uppercase tracking-widest">Cashfree & PayPal Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}
