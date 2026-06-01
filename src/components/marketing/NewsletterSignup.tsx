import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { usePath } from '../../hooks/usePath';
import { cn } from '../../lib/utils';
import Input from '../primitives/Input';
import Button from '../primitives/Button';

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
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={placeholder}
          required
          variant="outline"
          className="flex-1 min-w-0"
        />
        <Button type="submit" isLoading={loading} leftIcon={loading ? undefined : ArrowRight} size="sm" className="shrink-0">
          Subscribe
        </Button>
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
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={placeholder}
            required
            variant="outline"
          />
          <Button type="submit" isLoading={loading} variant="primary" size="md" fullWidth>
            Subscribe for free
          </Button>
        </form>
      </div>
    );
  }

  // default variant
  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={placeholder}
          required
          variant="outline"
          className="flex-1 min-w-0"
        />
        <Button type="submit" isLoading={loading} size="icon" className="shrink-0">
          {!loading && <ArrowRight className="w-4 h-4" />}
        </Button>
      </form>
      <p className="text-[10px] text-muted-foreground/60">No spam. Unsubscribe any time.</p>
    </div>
  );
}
