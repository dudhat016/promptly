import {
  arrayUnion, collection, doc, getDocs, query,
  serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import {
  Briefcase, CheckCircle2, ChevronRight, Circle, Key,
  Link2, MapPin, Sparkles, Tag, Unlock, User,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { usePath } from '../../hooks/usePath';
import { cn } from '../../lib/utils';

interface Step {
  id: string;
  label: string;
  why: string;
  icon: React.ElementType;
  done: boolean;
  link: string;
}

function buildSteps(profile: UserProfile, prefix: (p: string) => string): Step[] {
  const hasSocial = !!(
    profile.website ||
    profile.socialLinks?.twitter ||
    profile.socialLinks?.github ||
    profile.socialLinks?.linkedin ||
    profile.socialLinks?.instagram ||
    profile.socialLinks?.youtube
  );

  return [
    {
      id: 'photo',
      label: 'Add a profile photo',
      why: 'Builds trust with followers',
      icon: User,
      done: !!profile.photoURL,
      link: prefix('/settings/profile'),
    },
    {
      id: 'bio',
      label: 'Write your bio',
      why: 'Appear in creator discovery',
      icon: Sparkles,
      done: !!(profile.bio?.trim()),
      link: prefix('/settings/profile'),
    },
    {
      id: 'social',
      label: 'Add a social link',
      why: 'Build your audience outside Promptly',
      icon: Link2,
      done: hasSocial,
      link: prefix('/settings/profile'),
    },
    {
      id: 'expertise',
      label: 'Add expertise tags',
      why: 'Get matched to the right users',
      icon: Tag,
      done: (profile.expertiseTags?.length ?? 0) > 0,
      link: prefix('/settings/profile'),
    },
    {
      id: 'location',
      label: 'Add your location',
      why: 'Helps with regional discovery',
      icon: MapPin,
      done: !!(profile.location?.trim()),
      link: prefix('/settings/profile'),
    },
    {
      id: 'payout',
      label: 'Set up payout method',
      why: 'Required to withdraw affiliate earnings',
      icon: Briefcase,
      done: !!(
        profile.payoutMethods?.upiId ||
        profile.payoutMethods?.paypalEmail ||
        profile.payoutMethods?.bankDetails
      ),
      link: prefix('/settings/profile'),
    },
    {
      id: 'ai_key',
      label: 'Connect an AI key',
      why: 'Use AI Twin Studio and run prompts',
      icon: Key,
      done: !!(
        profile.aiKeys?.gemini ||
        profile.aiKeys?.openai ||
        profile.aiKeys?.anthropic
      ),
      link: prefix('/settings/ai'),
    },
    {
      id: 'unlock',
      label: 'Unlock your first prompt',
      why: 'Start building your prompt vault',
      icon: Unlock,
      done: (profile.unlockedPrompts?.length ?? 0) > 0,
      link: prefix('/explore'),
    },
  ];
}

interface ProfileCompletionCardProps {
  profile: UserProfile;
  userId: string;
}

export default function ProfileCompletionCard({ profile, userId }: ProfileCompletionCardProps) {
  const { prefix } = usePath();
  const steps   = buildSteps(profile, prefix);
  const done    = steps.filter(s => s.done).length;
  const total   = steps.length;
  const pct     = Math.round((done / total) * 100);
  const is100   = pct === 100;

  // Track milestone CRM tagging (run once per milestone crossing)
  const tagged50  = useRef(false);
  const tagged100 = useRef(false);

  useEffect(() => {
    async function tag(label: string, badgeId?: string) {
      try {
        const snap = await getDocs(
          query(collection(db, 'marketing_contacts'), where('userId', '==', userId))
        );
        if (!snap.empty) {
          await updateDoc(snap.docs[0].ref, { tags: arrayUnion(label) });
        }
        if (badgeId) {
          await updateDoc(doc(db, 'users', userId), {
            badges: arrayUnion(badgeId),
          });
        }
      } catch { /* non-fatal */ }
    }

    const key50  = `profile_50_${userId}`;
    const key100 = `profile_100_${userId}`;

    if (pct >= 50 && !tagged50.current && !localStorage.getItem(key50)) {
      tagged50.current = true;
      localStorage.setItem(key50, '1');
      tag('profile_50');
    }
    if (pct === 100 && !tagged100.current && !localStorage.getItem(key100)) {
      tagged100.current = true;
      localStorage.setItem(key100, '1');
      tag('profile_complete', 'profile_complete');
    }
  }, [pct, userId]);

  // Hide once fully complete (after showing briefly)
  if (is100) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl text-sm">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="text-emerald-700 dark:text-emerald-400 font-medium flex-1">
          Profile complete — you've unlocked the Creator Pro badge! 🏅
        </span>
      </div>
    );
  }

  const incomplete = steps.filter(s => !s.done);
  const nextStep   = incomplete[0];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Complete your profile</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {done} of {total} steps done · creators with complete profiles get 2× more followers
          </p>
        </div>
        <span className={cn(
          'text-lg font-black tabular-nums',
          pct >= 75 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-primary'
        )}>
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-primary'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps grid — show only first 4 incomplete + completed ones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {steps.map(step => {
          const Icon = step.icon;
          return (
            <Link
              key={step.id}
              to={step.done ? '#' : step.link}
              onClick={e => step.done && e.preventDefault()}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors',
                step.done
                  ? 'text-muted-foreground/50 cursor-default'
                  : 'hover:bg-muted/60 text-foreground group'
              )}
            >
              {step.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-primary transition-colors" />
              )}
              <Icon className={cn('w-3.5 h-3.5 shrink-0', step.done ? 'text-muted-foreground/30' : 'text-muted-foreground group-hover:text-primary transition-colors')} />
              <span className={cn('flex-1 font-medium', step.done && 'line-through')}>{step.label}</span>
              {!step.done && <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />}
            </Link>
          );
        })}
      </div>

      {/* CTA to next step */}
      {nextStep && (
        <div className="pt-1 border-t border-border">
          <Link
            to={nextStep.link}
            className="flex items-center justify-between px-3 py-2.5 bg-primary/5 hover:bg-primary/10 border border-primary/15 rounded-xl transition-colors group"
          >
            <div>
              <p className="text-xs font-bold text-foreground">Next: {nextStep.label}</p>
              <p className="text-[11px] text-muted-foreground">{nextStep.why}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        </div>
      )}
    </div>
  );
}
