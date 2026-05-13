import React from 'react';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { cn } from '../../lib/utils';
import Progress from '../feedback/Progress';

export default function UpgradeCard({ collapsed }: { collapsed?: boolean }) {
  const { profile, isPro } = useAuth();
  const { prefix } = usePath();
  const navigate = useNavigate();

  const creditsUsed = profile?.totalUsedCredits || 0;
  const creditsTotal = 10;
  const creditPct = isPro ? 100 : Math.min(100, (creditsUsed / creditsTotal) * 100);

  if (collapsed) {
    return (
      <div 
        onClick={() => navigate(isPro ? prefix('/settings/billing') : prefix('/pricing'))}
        className="w-10 h-10 mx-auto rounded-lg bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
        title={isPro ? 'Pro Active' : 'Upgrade'}
      >
        <Zap className={cn("w-5 h-5", isPro ? "text-primary fill-primary" : "text-primary")} />
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(isPro ? prefix('/settings/billing') : prefix('/pricing'))}
      className={cn(
        "rounded-xl p-4 cursor-pointer transition-all hover:scale-[0.98] shadow-lg shadow-primary/10",
        isPro ? 'bg-foreground text-background' : 'gradient-primary text-white'
      )}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
          {isPro ? 'Pro Plan' : 'Free Plan'}
        </span>
        <Zap className={cn("w-3.5 h-3.5", isPro ? 'opacity-60' : 'opacity-90')} />
      </div>
      <p className="text-xs font-bold mb-3 leading-snug">
        {isPro ? 'Unlimited access active' : 'Upgrade for unlimited prompts'}
      </p>

      <Progress 
        value={isPro ? 100 : creditsUsed}
        max={creditsTotal}
        size="xs"
        variant={isPro ? 'default' : 'gradient'}
        trackClassName="bg-black/10 dark:bg-white/10"
        className="space-y-0"
      />

      <div className="flex items-center justify-between mt-2 opacity-70 text-[10px] font-bold uppercase tracking-widest">
        <span>{isPro ? 'Unlimited' : 'Used'}</span>
        <span>{isPro ? '∞' : `${creditsUsed} / ${creditsTotal}`}</span>
      </div>
    </div>
  );
}
