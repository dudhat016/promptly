import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/primitives/Button';
import { usePath } from '../hooks/usePath';

type Status = 'confirmed' | 'already' | 'invalid';

export default function NewsletterConfirmPage() {
  const [params] = useSearchParams();
  const { prefix } = usePath();
  const status = (params.get('status') as Status | null);
  const email  = params.get('email') || '';

  const states: Record<Status | 'pending', {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    title: string;
    body: string;
  }> = {
    pending: {
      icon: Clock,
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
      title: 'Check your email',
      body: 'We sent a confirmation link. Click it to activate your subscription.',
    },
    confirmed: {
      icon: CheckCircle2,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
      title: "You're subscribed!",
      body: `${email ? `${email} is now` : 'You\'re'} subscribed to the Promptly newsletter. Expect tips, new prompts, and AI workflow ideas.`,
    },
    already: {
      icon: Mail,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      title: 'Already subscribed',
      body: `${email || 'This address'} is already confirmed and receiving the newsletter.`,
    },
    invalid: {
      icon: AlertCircle,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
      title: 'Invalid or expired link',
      body: 'This confirmation link has already been used or is no longer valid. Subscribe again to get a fresh link.',
    },
  };

  const state = states[status ?? 'pending'];
  const Icon  = state.icon;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card rounded-2xl border border-border shadow-2xl shadow-black/5 overflow-hidden"
      >
        <div className="bg-primary px-8 py-5 text-center">
          <p className="text-white font-black text-lg tracking-tight">PROMPTLY</p>
          <p className="text-primary-foreground/70 text-[10px] font-bold uppercase tracking-widest mt-0.5">Newsletter</p>
        </div>

        <div className="p-10 text-center">
          <div className={`w-16 h-16 ${state.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
            <Icon className={`w-8 h-8 ${state.iconColor}`} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{state.title}</h2>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">{state.body}</p>

          <div className="space-y-3">
            <Button as={Link} to={prefix('/')} variant="primary" size="md" className="w-full">
              Explore Promptly
            </Button>
            <Button as={Link} to={prefix('/')} variant="ghost" size="md" leftIcon={ArrowLeft} className="w-full text-muted-foreground">
              Back to home
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
