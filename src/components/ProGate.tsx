import { Lock } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import Button from './primitives/Button';
import UpgradeModal from './UpgradeModal';

// ── Blur-overlay gate ─────────────────────────────────────────────────────────
// Pass real or mock children — they render blurred behind the lock overlay.
// Pro users see the children unwrapped.

interface ProGateProps {
  children: React.ReactNode;
  feature: string;
  description?: string;
  className?: string;
}

export function ProGate({ children, feature, description, className }: ProGateProps) {
  const { isPro, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  if (isPro || isAdmin) return <>{children}</>;

  return (
    <div className={cn('relative overflow-hidden rounded-xl', className)}>
      {/* Blurred preview — pointer-events-none so user can't accidentally interact */}
      <div className="pointer-events-none select-none blur-[5px] opacity-40 saturate-0">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-[2px] rounded-xl">
        <div className="text-center px-6 py-4 max-w-xs">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground tracking-tight">{feature}</p>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              {description}
            </p>
          )}
          <Button
            onClick={() => setOpen(true)}
            variant="primary"
            size="sm"
            className="mt-3 shadow-lg shadow-primary/20"
          >
            Upgrade to Pro
          </Button>
        </div>
      </div>

      <UpgradeModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}

// ── Standalone locked feature card ────────────────────────────────────────────
// No children needed. Click anywhere on the card opens the upgrade modal.

interface ProFeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  className?: string;
}

export function ProFeatureCard({ icon: Icon, title, description, badge, className }: ProFeatureCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'group w-full text-left p-4 rounded-xl border border-border bg-card',
          'hover:border-primary/30 hover:shadow-sm hover:bg-primary/[0.02] transition-all',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-foreground">{title}</span>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                {badge ?? 'PRO'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
          </div>
          <Lock className="w-3 h-3 text-muted-foreground/30 shrink-0 mt-0.5 group-hover:text-primary/40 transition-colors" />
        </div>
      </button>
      <UpgradeModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
