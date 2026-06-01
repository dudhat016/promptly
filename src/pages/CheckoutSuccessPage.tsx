import { Calendar, CheckCircle2, Copy, Download, Home, Layout, Rocket, Sparkles, Tag, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/primitives/Button';
import { toast } from 'react-hot-toast';
import { trackEvent } from '../lib/analytics';
import { useAuth } from '../hooks/useAuth';
import { usePath } from '../hooks/usePath';
import { generateInvoicePDF } from '../lib/invoice';

export default function CheckoutSuccessPage() {
  const { user, profile } = useAuth();
  const { prefix } = usePath();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const planName = searchParams.get('plan_name') || 'Pro Plan';
  const amount = searchParams.get('amount') || '0';
  const taxAmount      = parseFloat(searchParams.get('tax')              || '0');
  const taxRate        = parseFloat(searchParams.get('tax_rate')         || '0');
  const productPrice   = parseFloat(searchParams.get('product_price')    || amount);
  const couponDiscount = parseFloat(searchParams.get('coupon_discount')  || '0');
  const couponCode     = searchParams.get('coupon_code') || '';
  const billingCycle   = searchParams.get('billing_cycle')               || 'monthly';
  const gateway        = searchParams.get('gateway')                     || 'stripe';
  const isTrial        = searchParams.get('is_trial')                    === 'true';
  const trialEndsAt    = searchParams.get('trial_ends_at');
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setConfetti(false), 5000);
    trackEvent('complete_checkout', user?.uid, {
      orderId,
      planName,
      amount: Number(amount),
      currency: 'USD'
    });
    return () => clearTimeout(timer);
  }, []);

  const copyOrderId = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      toast.success("Order ID copied!");
    }
  };

  const downloadInvoice = () => {
    generateInvoicePDF({
      orderId: orderId || 'N/A',
      date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      planName,
      billingCycle,
      buyerName: profile?.displayName || user?.displayName || undefined,
      buyerEmail: user?.email || undefined,
      productPrice,
      couponDiscount,
      couponCode: couponCode || undefined,
      taxAmount,
      taxRate,
      buyerTotal: parseFloat(amount),
      currency: 'USD',
      gateway,
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-20 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-card rounded-lg p-8 md:p-16 shadow-2xl border border-border relative z-10 text-center"
      >
        {/* Success Icon */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, delay: 0.2 }}
          className="w-24 h-24 bg-emerald-500 text-white rounded-md flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/30"
        >
          <CheckCircle2 className="w-12 h-12" />
        </motion.div>

        {/* Text Content */}
        <div className="space-y-4 mb-12">
          <div className="flex items-center justify-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs">
            {isTrial ? <Zap className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {isTrial ? 'Trial Activated' : 'Payment Synchronized'}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            {isTrial ? 'Trial Started!' : "You're Now PRO!"}
          </h1>
          <p className="text-muted-foreground font-medium text-lg max-w-md mx-auto">
            {isTrial
              ? `Enjoy full PRO access free until ${trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'your trial ends'}. Your card will be charged automatically after the trial.`
              : 'Your neural workspace has been upgraded. Welcome to the future of AI engineering.'}
          </p>
        </div>

        {/* Receipt Card */}
        <div className="bg-muted/50 rounded-lg p-6 mb-10 border border-border relative overflow-hidden text-left">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />

          <div className="flex items-center justify-between mb-5 pl-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
                {isTrial ? 'Trial' : 'Receipt'}
              </p>
              <p className="font-mono text-xs font-bold text-foreground">{orderId || 'TXN_PROMPTLY_001'}</p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
              isTrial
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            }`}>
              {isTrial ? 'Trialing' : 'Paid'}
            </span>
          </div>

          <div className="space-y-2.5 pl-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{planName}</span>
              {isTrial
                ? <span className="font-semibold text-amber-600 dark:text-amber-400">FREE (Trial)</span>
                : <span className="font-semibold text-foreground">${productPrice.toFixed(2)}</span>
              }
            </div>
            {!isTrial && couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Tag className="w-3 h-3" />
                  {couponCode ? `Coupon (${couponCode})` : 'Coupon discount'}
                </span>
                <span className="font-semibold">-${couponDiscount.toFixed(2)}</span>
              </div>
            )}
            {!isTrial && taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span className="font-semibold text-foreground">+${taxAmount.toFixed(2)}</span>
              </div>
            )}
            {isTrial && trialEndsAt && (
              <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3 h-3" />
                  First charge date
                </span>
                <span className="font-semibold">
                  {new Date(trialEndsAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2.5 border-t border-border">
              <span className="font-bold text-foreground">{isTrial ? 'Due today' : 'Total charged'}</span>
              <span className={`font-bold ${isTrial ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`}>
                {isTrial ? '$0.00 USD' : `$${parseFloat(amount).toFixed(2)} USD`}
              </span>
            </div>
          </div>

          <div className="flex gap-2.5 mt-5 pl-2">
            <Button onClick={copyOrderId} variant="secondary" size="sm" leftIcon={Copy} className="font-bold">
              Copy ID
            </Button>
            {!isTrial && (
              <Button onClick={downloadInvoice} variant="secondary" size="sm" leftIcon={Download} className="font-bold">
                Download Invoice
              </Button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Button
            as={Link}
            to={prefix('/dashboard')}
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={Layout}
            className="bg-foreground text-background hover:bg-foreground/90 shadow-xl shadow-foreground/10"
          >
            Access Dashboard
          </Button>
          <Button
            as={Link}
            to={prefix('/explore')}
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={Rocket}
          >
            Explore Premium
          </Button>
        </div>

        <div className="mt-12">
           <Button
            as={Link}
            to={prefix('/')}
            variant="ghost"
            size="sm"
            leftIcon={Home}
            className="text-muted-foreground/40 hover:text-primary uppercase tracking-[0.3em] font-bold"
          >
            Back to Home
          </Button>
        </div>
      </motion.div>

      {/* Floating Sparkles Animation */}
      {confetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], y: -200, x: (i - 6) * 40 }}
              transition={{ duration: 3, delay: i * 0.1, repeat: Infinity }}
              className="absolute left-1/2 bottom-0 text-primary"
            >
              <Sparkles className="w-4 h-4 fill-current" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
