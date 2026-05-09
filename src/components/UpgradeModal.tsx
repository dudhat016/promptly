import { ArrowRight, Check, Shield, Sparkles, X, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../hooks/useConfig';
import Button from './ui/Button';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PERKS = [
  'Unlimited access to all 5,000+ prompts',
  'Copy, save & organize without limits',
  'New prompts added every week',
  'Priority support + feature requests',
  'Cancel anytime — no lock-in',
];

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const navigate = useNavigate();
  const { config } = useConfig();
  const { profile } = useAuth();
  const { symbol, exchangeRate, currency } = useCurrency();

  const proPlan = config.plans?.find(p => p.isPopular) || config.plans?.[0];
  const price = proPlan
    ? (currency === 'INR' ? Math.round(proPlan.monthlyPrice * exchangeRate) : proPlan.monthlyPrice)
    : 15;
  const isTrial = config?.activePromotion === 'trial' && !profile?.trialUsed;

  const handleUpgrade = () => {
    onClose();
    navigate(proPlan ? `/checkout?plan=${proPlan.id}&cycle=monthly` : '/pricing');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            className="relative z-10 w-full max-w-md bg-background rounded-2xl p-8 border border-primary/20"
            style={{ boxShadow: '0 0 60px rgba(139,92,246,0.15)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, transparent, hsl(258,90%,56%), transparent)' }} />

            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="text-center mb-7">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))' }}>
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {isTrial ? `Start Your Free ${config.freeTrialDays}-Day Trial` : 'Unlock Everything'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {isTrial
                  ? 'Full Pro access. No credit card needed. Cancel anytime.'
                  : `${symbol}${price}/month — unlimited access to 5,000+ expert prompts.`}
              </p>
            </div>

            <ul className="space-y-3 mb-7">
              {PERKS.map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <Button
              onClick={handleUpgrade}
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={isTrial ? Zap : ArrowRight}
              className="mb-3 shadow-[0_0_30px_rgba(139,92,246,0.3)]"
            >
              {isTrial ? `Start Free Trial` : `Upgrade Now — ${symbol}${price}/mo`}
            </Button>

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/40">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure checkout</span>
              <span>•</span>
              <span>Cancel anytime</span>
              <span>•</span>
              <span>Instant access</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
