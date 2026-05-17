import { Flame, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FeaturedPromptConfig } from '../../hooks/useFeaturedPrompt';
import { usePath } from '../../hooks/usePath';
import { cn } from '../../lib/utils';

function toMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'string') return new Date(val).getTime();
  if (val?.seconds)            return val.seconds * 1000;
  if (val?.toDate)             return val.toDate().getTime();
  return 0;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

interface FeaturedPromptBannerProps {
  featured: FeaturedPromptConfig;
}

export default function FeaturedPromptBanner({ featured }: FeaturedPromptBannerProps) {
  const { prefix } = usePath();
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft]   = useState(() => toMs(featured.expiresAt) - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const ms = toMs(featured.expiresAt) - Date.now();
      setTimeLeft(ms);
      if (ms <= 0) clearInterval(interval);
    }, 60_000);
    return () => clearInterval(interval);
  }, [featured.expiresAt]);

  const dismissKey = `featured_dismissed_${featured.promptId}`;
  useEffect(() => {
    if (sessionStorage.getItem(dismissKey)) setDismissed(true);
  }, [dismissKey]);

  if (dismissed || timeLeft <= 0) return null;

  const countdown = formatCountdown(timeLeft);
  const urgent    = timeLeft < 3 * 3_600_000; // < 3 hours

  return (
    <div className={cn(
      'relative flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 rounded-2xl border overflow-hidden',
      urgent
        ? 'bg-rose-500/8 border-rose-500/20'
        : 'bg-amber-500/8 border-amber-500/20'
    )}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <Flame className="w-48 h-48 absolute -right-8 -top-8 text-amber-500" />
      </div>

      <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
          urgent ? 'bg-rose-500/15' : 'bg-amber-500/15'
        )}>
          <Flame className={cn('w-4 h-4', urgent ? 'text-rose-500' : 'text-amber-500')} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full',
              urgent ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            )}>
              Today's Featured
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground">
              ⏱ {countdown}
            </span>
          </div>
          <p className="text-sm font-bold text-foreground truncate mt-0.5">{featured.promptTitle}</p>
          {featured.description && (
            <p className="text-xs text-muted-foreground truncate">{featured.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 relative z-10">
        <Link
          to={prefix(`/prompt/${featured.promptSlug}`)}
          className={cn(
            'text-xs font-bold px-4 py-2 rounded-lg transition-colors',
            urgent
              ? 'bg-rose-500 text-white hover:bg-rose-600'
              : 'bg-amber-500 text-white hover:bg-amber-600'
          )}
        >
          View Prompt →
        </Link>
        <button
          onClick={() => { sessionStorage.setItem(dismissKey, '1'); setDismissed(true); }}
          className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
