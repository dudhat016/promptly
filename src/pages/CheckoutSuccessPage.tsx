import { CheckCircle2, Copy, Home, Layout, Rocket, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { trackEvent } from '../lib/analytics';
import { useAuth } from '../hooks/useAuth';

export default function CheckoutSuccessPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const planName = searchParams.get('plan_name') || 'Pro Plan';
  const amount = searchParams.get('amount') || '0';
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setConfetti(false), 5000);
    
    // Track complete_checkout (Gap #1)
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
        className="max-w-2xl w-full bg-card rounded-[3rem] p-8 md:p-16 shadow-2xl border border-border relative z-10 text-center"
      >
        {/* Success Icon */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, delay: 0.2 }}
          className="w-24 h-24 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/30"
        >
          <CheckCircle2 className="w-12 h-12" />
        </motion.div>

        {/* Text Content */}
        <div className="space-y-4 mb-12">
          <div className="flex items-center justify-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-xs">
            <Sparkles className="w-4 h-4" />
            Payment Synchronized
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">You're Now PRO!</h1>
          <p className="text-muted-foreground font-medium text-lg max-w-md mx-auto">
            Your neural workspace has been upgraded. Welcome to the future of AI engineering.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-muted/50 rounded-[2.5rem] p-8 mb-12 border border-border relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">Transaction Receipt</p>
              <p className="font-mono text-xs font-bold text-foreground truncate max-w-[200px]">
                {orderId || 'TXN_PROMPTLY_001'}
              </p>
            </div>
            <button 
              onClick={copyOrderId}
              className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-2xl text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all active:scale-95 shadow-sm"
            >
              <Copy className="w-3 h-3" />
              Copy Order ID
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link 
            to="/dashboard"
            className="flex items-center justify-center gap-3 bg-foreground text-background font-black py-5 rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-foreground/10"
          >
            <Layout className="w-5 h-5" />
            Access Dashboard
          </Link>
          <Link 
            to="/explore"
            className="flex items-center justify-center gap-3 bg-primary text-primary-foreground font-black py-5 rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/10"
          >
            <Rocket className="w-5 h-5" />
            Explore Premium
          </Link>
        </div>

        <div className="mt-12">
          <Link to="/" className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/40 hover:text-primary transition-colors flex items-center justify-center gap-2">
            <Home className="w-3 h-3" />
            Back to Home
          </Link>
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
              className="absolute left-1/2 bottom-0 text-indigo-500"
            >
              <Sparkles className="w-4 h-4 fill-current" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
