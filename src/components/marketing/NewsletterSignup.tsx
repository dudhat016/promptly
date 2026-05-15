import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { usePath } from '../../hooks/usePath';
import { cn } from '../../lib/utils';

interface Props {
  className?: string;
  variant?: 'default' | 'inline' | 'card';
  label?: string;
  placeholder?: string;
}

export default function NewsletterSignup({
  className,
  variant = 'default',
  label = 'Get AI prompt tips, weekly.',
  placeholder = 'your@email.com',
}: Props) {
  const { prefix } = usePath();
  const navigate   = useNavigate();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { toast.error('Enter a valid email'); return; }
    setLoading(true);
    try {
      const r = await api.post('/email/newsletter/subscribe', { email }) as any;
      if (r?.alreadySubscribed) {
        toast.success('You\'re already subscribed!');
        setDone(true);
        return;
      }
      if (r?.ok) {
        setDone(true);
        navigate(prefix('/newsletter/confirm'));
      } else {
        toast.error((r as any)?.error || 'Something went wrong');
      }
    } catch {
      toast.error('Could not subscribe. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className={cn('flex items-center gap-2 text-sm font-semibold text-emerald-600', className)}>
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Check your inbox to confirm!
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className={cn('flex items-center gap-2', className)}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={placeholder}
          required
          className="flex-1 min-w-0 px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          Subscribe
        </button>
      </form>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('bg-card border border-border rounded-2xl p-8 text-center', className)}>
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
          <ArrowRight className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-black text-foreground text-lg mb-1">{label}</h3>
        <p className="text-muted-foreground text-sm mb-6">New prompts, AI tips, and workflow ideas. No spam.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm mx-auto">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={placeholder}
            required
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Subscribe for free
          </button>
        </form>
      </div>
    );
  }

  // default variant
  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={placeholder}
          required
          className="flex-1 min-w-0 px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </form>
      <p className="text-[10px] text-muted-foreground/60">No spam. Unsubscribe any time.</p>
    </div>
  );
}
