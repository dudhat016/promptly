import { CheckCircle2, Copy, Home, Layout, Rocket, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
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
            <Sparkles className="w-4 h-4" />
            Payment Synchronized
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">You're Now PRO!</h1>
          <p className="text-muted-foreground font-medium text-lg max-w-md mx-auto">
            Your neural workspace has been upgraded. Welcome to the future of AI engineering.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-muted/50 rounded-lg p-8 mb-12 border border-border relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Transaction Receipt</p>
              <p className="font-mono text-xs font-bold text-foreground truncate max-w-[200px]">
                {orderId || 'TXN_PROMPTLY_001'}
              </p>
            </div>
             <Button 
              onClick={copyOrderId}
              variant="secondary"
              size="sm"
              leftIcon={Copy}
              className="font-bold uppercase tracking-widest"
            >
              Copy Order ID
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Button 
            as={Link} 
            to="/dashboard"
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
            to="/explore"
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
            to="/" 
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
