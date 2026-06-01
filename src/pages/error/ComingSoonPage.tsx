import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Bell, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // In production, wire to a real email collection endpoint
    setSubmitted(true);
    toast.success('You\'re on the list! We\'ll notify you.');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-bold uppercase tracking-widest text-primary mb-8"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Coming Soon
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-black text-foreground mb-4"
        >
          Something Amazing Is{' '}
          <span className="gradient-text">
            Coming
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-lg mb-10 leading-relaxed"
        >
          We're working hard to build something extraordinary. Be the first to know when it launches.
        </motion.p>

        {/* Email capture */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {submitted ? (
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              You're on the list! We'll reach out soon.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                variant="outline"
                className="flex-1"
              />
              <Button type="submit" variant="gradient" leftIcon={Bell} className="whitespace-nowrap">
                Notify Me
              </Button>
            </form>
          )}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-muted-foreground/50 mt-6"
        >
          No spam, ever. Unsubscribe any time.
        </motion.p>
      </div>
    </div>
  );
}
