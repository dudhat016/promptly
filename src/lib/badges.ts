import {
  Award, Bell, Bookmark, CheckCircle, Coffee, Crown, Diamond, Flame, Gem, Gift,
  Globe, Heart, Medal, Rocket, ShieldCheck, Star, Target,
  Trophy, Unlock, Users, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { UserProfile, BadgeDefinition } from '../types';

export interface BadgeDef {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  hint: string;
}

export interface BadgeContext {
  promptCount: number;
  totalViews: number;
  referralCount: number;
  streak: number;
}

// Icon registry for dynamic icon rendering from Firestore name strings
export const BADGE_ICON_MAP: Record<string, LucideIcon> = {
  Award, Bell, Bookmark, CheckCircle, Coffee, Crown, Diamond, Flame, Gem, Gift,
  Globe, Heart, Medal, Rocket, ShieldCheck, Star, Target,
  Trophy, Unlock, Users, Zap,
};

// Preset color themes for the badge editor
export const BADGE_COLOR_PRESETS: { label: string; value: string; preview: string }[] = [
  { label: 'Violet',  value: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',   preview: 'bg-violet-500' },
  { label: 'Amber',   value: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',       preview: 'bg-amber-500' },
  { label: 'Blue',    value: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',           preview: 'bg-blue-500' },
  { label: 'Emerald', value: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', preview: 'bg-emerald-500' },
  { label: 'Pink',    value: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',           preview: 'bg-pink-500' },
  { label: 'Orange',  value: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',   preview: 'bg-orange-500' },
  { label: 'Yellow',  value: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',   preview: 'bg-yellow-500' },
  { label: 'Teal',    value: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',           preview: 'bg-teal-500' },
  { label: 'Rose',    value: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',           preview: 'bg-rose-500' },
  { label: 'Indigo',  value: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',   preview: 'bg-indigo-500' },
];

// Hardcoded fallback badge definitions (used when Firestore is unavailable)
export const BADGE_DEFS: BadgeDef[] = [
  {
    id: 'first_unlock',
    label: 'First Unlock',
    description: 'Unlocked your first premium prompt',
    icon: Unlock,
    color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
    hint: 'Unlock any premium prompt',
  },
  {
    id: 'power_prompter',
    label: 'Power Prompter',
    description: 'Unlocked 10 or more premium prompts',
    icon: Zap,
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    hint: 'Unlock 10 premium prompts',
  },
  {
    id: 'first_creation',
    label: 'First Creation',
    description: 'Submitted your first prompt to the marketplace',
    icon: Star,
    color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    hint: 'Submit a prompt to the marketplace',
  },
  {
    id: 'top_creator',
    label: 'Top Creator',
    description: 'Your prompts earned 100+ total views',
    icon: Trophy,
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    hint: 'Get 100 total views on your prompts',
  },
  {
    id: 'social_butterfly',
    label: 'Social',
    description: 'Following 5 or more creators',
    icon: Users,
    color: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
    hint: 'Follow 5 creators',
  },
  {
    id: 'streak_7',
    label: '7-Day Streak',
    description: 'Visited Promptly 7 days in a row',
    icon: Flame,
    color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    hint: 'Visit 7 days in a row',
  },
  {
    id: 'pro_member',
    label: 'Pro Member',
    description: 'Upgraded to a Pro subscription',
    icon: Crown,
    color: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    hint: 'Upgrade to Pro',
  },
  {
    id: 'connector',
    label: 'Connector',
    description: 'Referred at least one friend',
    icon: Gift,
    color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
    hint: 'Refer a friend via your referral link',
  },
  {
    id: 'early_adopter',
    label: 'Early Adopter',
    description: 'One of the first users on Promptly',
    icon: Rocket,
    color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    hint: 'Joined during early access',
  },
];

export function computeEarnedBadges(
  profile: UserProfile,
  ctx: BadgeContext
): string[] {
  const earned: string[] = [];
  const unlocks  = profile.unlockedPrompts?.length ?? 0;
  const following = profile.following?.length ?? 0;

  if (unlocks >= 1)                          earned.push('first_unlock');
  if (unlocks >= 10)                         earned.push('power_prompter');
  if (ctx.promptCount >= 1)                  earned.push('first_creation');
  if (ctx.totalViews >= 100)                 earned.push('top_creator');
  if (following >= 5)                        earned.push('social_butterfly');
  if (ctx.streak >= 7)                       earned.push('streak_7');
  if (profile.subscriptionStatus === 'pro')  earned.push('pro_member');
  if (ctx.referralCount >= 1)               earned.push('connector');

  if (profile.createdAt) {
    try {
      if (new Date(profile.createdAt) < new Date('2025-06-01')) earned.push('early_adopter');
    } catch {}
  }

  return earned;
}

// Dynamic version: evaluates Firestore-defined badge conditions
export function computeEarnedBadgesFromDefs(
  defs: BadgeDefinition[],
  profile: UserProfile,
  ctx: BadgeContext
): string[] {
  const earned: string[] = [];
  const unlocks  = profile.unlockedPrompts?.length ?? 0;
  const following = profile.following?.length ?? 0;

  for (const def of defs) {
    if (!def.isActive || !def.id) continue;
    const t = def.conditionThreshold;

    switch (def.conditionType) {
      case 'unlocks':          if (unlocks >= t)                             earned.push(def.id); break;
      case 'power_unlocks':    if (unlocks >= t)                             earned.push(def.id); break;
      case 'prompts':          if (ctx.promptCount >= t)                     earned.push(def.id); break;
      case 'views':            if (ctx.totalViews >= t)                      earned.push(def.id); break;
      case 'following':        if (following >= t)                           earned.push(def.id); break;
      case 'streak':           if (ctx.streak >= t)                          earned.push(def.id); break;
      case 'referrals':        if (ctx.referralCount >= t)                   earned.push(def.id); break;
      case 'subscription_pro': if (profile.subscriptionStatus === 'pro')    earned.push(def.id); break;
      case 'early_adopter':
        if (profile.createdAt) {
          try {
            // threshold is stored as ms timestamp of the cutoff date
            if (new Date(profile.createdAt).getTime() < t) earned.push(def.id);
          } catch {}
        }
        break;
      case 'manual':
        // Only awarded explicitly; check if already in profile.badges
        if (profile.badges?.includes(def.id)) earned.push(def.id);
        break;
    }
  }
  return earned;
}

// Convert a Firestore BadgeDefinition to a display-compatible BadgeDef
export function defToBadgeDef(def: BadgeDefinition): BadgeDef {
  return {
    id: def.id!,
    label: def.name,
    description: def.description,
    icon: BADGE_ICON_MAP[def.iconName] ?? Star,
    color: def.colorClass,
    hint: def.hint,
  };
}
