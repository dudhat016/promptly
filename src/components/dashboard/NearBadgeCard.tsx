import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BadgeDef, BadgeContext } from '../../lib/badges';
import { BADGE_ICON_MAP } from '../../lib/badges';
import { BadgeDefinition, UserProfile } from '../../types';
import { usePath } from '../../hooks/usePath';
import { cn } from '../../lib/utils';

interface NearBadgeCardProps {
  defs: BadgeDef[];
  earnedIds: Set<string>;
  profile: UserProfile;
  ctx: BadgeContext;
  dynamicDefs?: BadgeDefinition[];
}

interface NearBadge {
  def: BadgeDef;
  current: number;
  threshold: number;
  pct: number;
  remaining: number;
  label: string;
}

function resolveCurrentValue(
  conditionType: BadgeDefinition['conditionType'],
  profile: UserProfile,
  ctx: BadgeContext,
): number {
  switch (conditionType) {
    case 'unlocks':
    case 'power_unlocks': return profile.unlockedPrompts?.length ?? 0;
    case 'prompts':       return ctx.promptCount;
    case 'views':         return ctx.totalViews;
    case 'following':     return profile.following?.length ?? 0;
    case 'streak':        return ctx.streak;
    case 'referrals':     return ctx.referralCount;
    default:              return 0;
  }
}

const CONDITION_UNIT: Partial<Record<BadgeDefinition['conditionType'], string>> = {
  unlocks:       'unlock',
  power_unlocks: 'unlock',
  prompts:       'prompt',
  views:         'view',
  following:     'follow',
  streak:        'day',
  referrals:     'referral',
};

export default function NearBadgeCard({
  defs,
  earnedIds,
  profile,
  ctx,
  dynamicDefs = [],
}: NearBadgeCardProps) {
  const { prefix } = usePath();

  // Find the closest unearned badge with a measurable distance
  const candidates: NearBadge[] = [];

  for (const def of defs) {
    if (earnedIds.has(def.id)) continue;

    const dynDef = dynamicDefs.find(d => d.id === def.id);
    const conditionType = dynDef?.conditionType;
    if (!conditionType) continue;

    // Skip non-countable conditions
    if (['subscription_pro', 'early_adopter', 'manual'].includes(conditionType)) continue;

    const threshold = dynDef!.conditionThreshold;
    const current   = resolveCurrentValue(conditionType as BadgeDefinition['conditionType'], profile, ctx);
    if (current >= threshold) continue; // should be earned already

    const remaining = threshold - current;
    const pct       = Math.min(99, Math.round((current / threshold) * 100));
    const unit      = CONDITION_UNIT[conditionType as BadgeDefinition['conditionType']] ?? 'action';

    candidates.push({
      def,
      current,
      threshold,
      pct,
      remaining,
      label: `${remaining} more ${unit}${remaining !== 1 ? 's' : ''}`,
    });
  }

  if (candidates.length === 0) return null;

  // Sort by highest percentage (closest to done)
  candidates.sort((a, b) => b.pct - a.pct);
  const nearest = candidates[0];
  const Icon = BADGE_ICON_MAP[
    dynamicDefs.find(d => d.id === nearest.def.id)?.iconName ?? 'Star'
  ] ?? (() => <span>🏅</span>);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">Next achievement</h3>
        <Link to={prefix('/dashboard')} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
          All badges <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-full flex items-center justify-center border shrink-0', nearest.def.color)}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold text-foreground">{nearest.def.label}</p>
            <span className="text-xs font-bold text-primary tabular-nums">{nearest.pct}%</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{nearest.def.description}</p>

          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
            <div
              className={cn('h-full rounded-full transition-all duration-700', nearest.def.color.includes('violet') ? 'bg-violet-500' : nearest.def.color.includes('amber') ? 'bg-amber-500' : nearest.def.color.includes('blue') ? 'bg-blue-500' : nearest.def.color.includes('emerald') ? 'bg-emerald-500' : nearest.def.color.includes('pink') ? 'bg-pink-500' : nearest.def.color.includes('orange') ? 'bg-orange-500' : nearest.def.color.includes('yellow') ? 'bg-yellow-500' : nearest.def.color.includes('teal') ? 'bg-teal-500' : 'bg-primary')}
              style={{ width: `${nearest.pct}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">
            {nearest.current} / {nearest.threshold} · {nearest.label} to unlock
          </p>
        </div>
      </div>

      {/* Show 2 more upcoming */}
      {candidates.length > 1 && (
        <div className="mt-3 pt-3 border-t border-border flex gap-2 flex-wrap">
          {candidates.slice(1, 3).map(c => {
            const dynDef = dynamicDefs.find(d => d.id === c.def.id);
            const SmIcon = BADGE_ICON_MAP[dynDef?.iconName ?? 'Star'] ?? (() => <span>🏅</span>);
            return (
              <div key={c.def.id} className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium', c.def.color)}>
                <SmIcon className="w-3.5 h-3.5" />
                <span>{c.def.label}</span>
                <span className="opacity-60">{c.pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
