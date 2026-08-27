import confetti from 'canvas-confetti';
import { addDoc, collection, getDocs, query, serverTimestamp, updateDoc, where, doc } from 'firebase/firestore';
import {
  Briefcase, Check, ChevronLeft, ChevronRight, Cpu,
  Loader2, MapPin, Rocket, Star, Target, User, Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/primitives/Button';
import Input from '../components/primitives/Input';
import Textarea from '../components/primitives/Textarea';
import { useAuth } from '../hooks/useAuth';
import { usePath } from '../hooks/usePath';
import { INTERACTION_WEIGHTS, seedAffinityFromInterests } from '../lib/affinity';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { EmailService } from '../services/emailService';

// ── step config ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'profile',   title: 'Profile',   icon: User      },
  { id: 'role',      title: 'Role',      icon: Briefcase },
  { id: 'goals',     title: 'Goals',     icon: Target    },
  { id: 'interests', title: 'Interests', icon: Star      },
  { id: 'model',     title: 'AI Model',  icon: Cpu       },
  { id: 'launch',    title: 'Launch',    icon: Rocket    },
];

// ── static data ───────────────────────────────────────────────────────────────

const ROLES = [
  { id: 'marketer',        label: 'Marketer',         icon: '📢', affinityKeys: ['marketing', 'seo', 'social'] },
  { id: 'developer',       label: 'Developer',        icon: '💻', affinityKeys: ['coding', 'productivity'] },
  { id: 'writer',          label: 'Writer',           icon: '✍️', affinityKeys: ['writing', 'creative'] },
  { id: 'business-owner',  label: 'Business Owner',   icon: '💼', affinityKeys: ['business', 'marketing', 'productivity'] },
  { id: 'content-creator', label: 'Content Creator',  icon: '🎬', affinityKeys: ['social', 'creative', 'writing'] },
  { id: 'designer',        label: 'Designer',         icon: '🎨', affinityKeys: ['creative', 'social'] },
  { id: 'student',         label: 'Student',          icon: '🎓', affinityKeys: ['productivity', 'coding', 'writing'] },
  { id: 'entrepreneur',    label: 'Entrepreneur',     icon: '🚀', affinityKeys: ['business', 'marketing', 'productivity'] },
];

const GOALS = [
  { id: 'save-time',      label: 'Save time on content',   icon: '⚡', affinityKeys: ['productivity', 'writing'] },
  { id: 'automate',       label: 'Automate workflows',     icon: '🤖', affinityKeys: ['productivity', 'coding'] },
  { id: 'code-faster',    label: 'Code faster & smarter',  icon: '💻', affinityKeys: ['coding'] },
  { id: 'grow-business',  label: 'Grow my business',       icon: '📈', affinityKeys: ['business', 'marketing'] },
  { id: 'learn-ai',       label: 'Learn AI prompting',     icon: '🧠', affinityKeys: ['productivity', 'coding'] },
  { id: 'boost-creative', label: 'Boost creativity',       icon: '🎨', affinityKeys: ['creative', 'writing'] },
  { id: 'social-content', label: 'Create social content',  icon: '📱', affinityKeys: ['social', 'marketing'] },
  { id: 'seo-content',    label: 'Rank higher on Google',  icon: '🔍', affinityKeys: ['seo', 'marketing'] },
];

const INTERESTS = [
  { id: 'marketing',   label: 'Marketing',     icon: '📢' },
  { id: 'coding',      label: 'Coding',        icon: '💻' },
  { id: 'writing',     label: 'Writing',       icon: '✍️' },
  { id: 'business',    label: 'Business',      icon: '💼' },
  { id: 'creative',    label: 'Creative',      icon: '🎨' },
  { id: 'seo',         label: 'SEO',           icon: '🔍' },
  { id: 'productivity',label: 'Productivity',  icon: '⚡' },
  { id: 'social',      label: 'Social Media',  icon: '📱' },
  { id: 'ecommerce',   label: 'E-Commerce',    icon: '🛒' },
  { id: 'education',   label: 'Education',     icon: '🎓' },
  { id: 'finance',     label: 'Finance',       icon: '💰' },
  { id: 'health',      label: 'Health',        icon: '🏥' },
];

const MODELS = [
  { id: 'gpt-4o',        name: 'GPT-4o',             provider: 'OpenAI',    description: 'Smart & balanced for most tasks',   icon: '✨' },
  { id: 'claude-3-5',    name: 'Claude 3.5 Sonnet',  provider: 'Anthropic', description: 'Creative, nuanced, long context',    icon: '🎨' },
  { id: 'gemini-1-5',    name: 'Gemini 1.5 Pro',     provider: 'Google',    description: 'Fast with deep context window',      icon: '🚀' },
  { id: 'llama-3',       name: 'Llama 3',             provider: 'Meta',      description: 'Open-source, privacy-first',         icon: '🦙' },
];

// ── form state type ───────────────────────────────────────────────────────────

interface FormData {
  displayName: string;
  username: string;
  bio: string;
  location: string;
  role: string;
  goals: string[];
  interests: string[];
  preferredModel: string;
}

// ── main component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { prefix } = usePath();

  const [step, setStep]     = useState(0);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const [form, setForm] = useState<FormData>({
    displayName:    '',
    username:       '',
    bio:            '',
    location:       '',
    role:           '',
    goals:          [],
    interests:      [],
    preferredModel: 'gpt-4o',
  });

  useEffect(() => {
    if (profile) {
      setForm(prev => ({
        ...prev,
        displayName:    profile.displayName || prev.displayName,
        username:       profile.username    || prev.username,
        bio:            profile.bio      || prev.bio,
        location:       profile.location || prev.location,
        interests:      profile.interests?.length ? profile.interests : prev.interests,
        preferredModel: profile.preferredModel || prev.preferredModel,
      }));
    }
  }, [profile]);

  // ── validation per step ──────────────────────────────────────────────────

  const canAdvance = (() => {
    if (step === 0) return form.displayName.trim().length >= 2;
    if (step === 1) return !!form.role;
    if (step === 2) return form.goals.length >= 1;
    if (step === 3) return form.interests.length >= 1;
    return true;
  })();

  // ── navigation ───────────────────────────────────────────────────────────

  const handleNext = async () => {
    // Validate username uniqueness on step 0 advance
    if (step === 0 && form.username.trim()) {
      const clean = form.username.trim().toLowerCase();
      if (!/^[a-z0-9_-]{3,30}$/.test(clean)) {
        setUsernameError('3–30 characters: letters, numbers, _ or - only.');
        return;
      }
      const taken = await getDocs(
        query(collection(db, 'users'), where('username', '==', clean))
      );
      if (taken.docs.some(d => d.id !== user?.uid)) {
        setUsernameError('This handle is already taken.');
        return;
      }
      setUsernameError('');
    }

    if (step < STEPS.length - 1) {
      const next = step + 1;
      setStep(next);
      if (next === STEPS.length - 1) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#7c3aed', '#a855f7', '#6366f1'] });
      }
    } else {
      await completeOnboarding();
    }
  };

  const handleBack = () => { if (step > 0) setStep(s => s - 1); };

  // ── complete ─────────────────────────────────────────────────────────────

  const completeOnboarding = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Build affinity keys from role + goals + interests
      const roleData    = ROLES.find(r => r.id === form.role);
      const goalKeys    = form.goals.flatMap(g => GOALS.find(x => x.id === g)?.affinityKeys || []);
      const roleKeys    = roleData?.affinityKeys || [];
      const allKeys     = [...new Set([...form.interests, ...roleKeys, ...goalKeys])];

      // Seed local affinity immediately
      seedAffinityFromInterests(allKeys);

      // Build Firestore affinityProfile map
      const affinityProfile = Object.fromEntries(
        allKeys.map(key => [key.toLowerCase().replace(/\s+/g, '-'), INTERACTION_WEIGHTS.ONBOARDING_SEED])
      );

      await updateDoc(doc(db, 'users', user.uid), {
        displayName:            form.displayName,
        username:               form.username.trim().toLowerCase() || null,
        bio:                    form.bio.trim() || null,
        location:               form.location.trim() || null,
        role:                   form.role,
        goals:                  form.goals,
        interests:              form.interests,
        expertiseTags:          form.interests,
        preferredModel:         form.preferredModel,
        hasCompletedOnboarding: true,
        affinityProfile,
      });

      // Sync interest + goal tags to CRM (non-blocking)
      try {
        const interestTags = [
          ...form.interests.map(i => `Interest: ${i.charAt(0).toUpperCase() + i.slice(1)}`),
          `Role: ${form.role}`,
          'onboarding_complete',
        ];
        const contactSnap = await getDocs(
          query(collection(db, 'marketing_contacts'), where('userId', '==', user.uid))
        );
        if (!contactSnap.empty) {
          const existing = contactSnap.docs[0].data();
          await updateDoc(contactSnap.docs[0].ref, {
            tags:      Array.from(new Set([...(existing.tags || []), ...interestTags])),
            interests: form.interests,
            role:      form.role,
          });
        } else if (user.email) {
          // Create CRM contact on first onboarding completion
          await addDoc(collection(db, 'marketing_contacts'), {
            userId:    user.uid,
            email:     user.email,
            name:      form.displayName || user.displayName || '',
            status:    'active',
            source:    'onboarding',
            tags:      interestTags,
            interests: form.interests,
            role:      form.role,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch {}

      // Personalized onboarding email (non-blocking)
      try {
        if (user.email) {
          await EmailService.sendOnboardingCompleteEmail(
            user.uid, user.email,
            form.displayName || user.displayName || 'Creator',
            form.interests,
          );
        }
      } catch {}

      navigate(prefix('/dashboard'));
    } catch (err) {
      console.error('Onboarding failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">

        {/* ── stepper ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between px-2 mb-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active    = i === step;
              const completed = i < step;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all duration-200',
                    active    ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30' :
                    completed ? 'bg-primary/10 border-primary/30 text-primary' :
                                'bg-muted/50 border-transparent text-muted-foreground/50'
                  )}>
                    {completed ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={cn(
                    'text-[9px] font-bold uppercase tracking-widest hidden sm:block',
                    active ? 'text-primary' : 'text-muted-foreground/50'
                  )}>{s.title}</span>
                </div>
              );
            })}
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(124,58,237,0.3)]"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <p className="text-center text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-2">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>

        {/* ── content card ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 md:p-12 min-h-[460px] flex flex-col">
          <div className="flex-1">
            {step === 0 && (
              <StepProfile
                displayName={form.displayName}
                username={form.username}
                bio={form.bio}
                location={form.location}
                usernameError={usernameError}
                onChangeName={v => setForm(p => ({ ...p, displayName: v }))}
                onChangeUsername={v => { setForm(p => ({ ...p, username: v })); setUsernameError(''); }}
                onChangeBio={v => setForm(p => ({ ...p, bio: v }))}
                onChangeLocation={v => setForm(p => ({ ...p, location: v }))}
              />
            )}
            {step === 1 && (
              <StepRole
                selected={form.role}
                onChange={v => setForm(p => ({ ...p, role: v }))}
              />
            )}
            {step === 2 && (
              <StepGoals
                selected={form.goals}
                onChange={v => setForm(p => ({ ...p, goals: v }))}
              />
            )}
            {step === 3 && (
              <StepInterests
                selected={form.interests}
                onChange={v => setForm(p => ({ ...p, interests: v }))}
              />
            )}
            {step === 4 && (
              <StepModel
                selected={form.preferredModel}
                onChange={v => setForm(p => ({ ...p, preferredModel: v }))}
              />
            )}
            {step === 5 && <StepLaunch form={form} />}
          </div>

          {/* ── nav ── */}
          <div className="flex items-center justify-between mt-10 pt-8 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 0 || saving}
              leftIcon={ChevronLeft}
              className="font-bold"
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleNext}
              isLoading={saving}
              disabled={!canAdvance}
              rightIcon={isLastStep ? Rocket : ChevronRight}
              className="px-8 shadow-xl shadow-primary/20 gradient-cta"
            >
              {isLastStep ? 'Launch App' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Profile ───────────────────────────────────────────────────────────

function StepProfile({ displayName, username, bio, location, usernameError, onChangeName, onChangeUsername, onChangeBio, onChangeLocation }: {
  displayName: string; username: string; bio: string; location: string; usernameError: string;
  onChangeName: (v: string) => void; onChangeUsername: (v: string) => void;
  onChangeBio: (v: string) => void; onChangeLocation: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Let's set up your profile</h2>
        <p className="text-muted-foreground text-sm mt-1">This is how other creators will find you.</p>
      </div>
      <div className="max-w-md mx-auto space-y-4">
        <Input
          label="Display Name"
          placeholder="e.g. Alex Creator"
          value={displayName}
          onChange={e => onChangeName(e.target.value)}
          variant="outline"
          autoFocus
          required
          helperText="Shown publicly on your creator profile."
        />
        <Input
          label="Username / Handle"
          placeholder="e.g. alexcreator"
          value={username}
          onChange={e => onChangeUsername(e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase())}
          variant="outline"
          helperText={usernameError || 'Optional.'}
          error={usernameError || undefined}
        />
        <Textarea
          label="Bio"
          placeholder="Tell others what you do and what you're passionate about..."
          value={bio}
          onChange={e => onChangeBio(e.target.value)}
          variant="outline"
          rows={3}
          maxLength={300}
          helperText={`${bio.length}/300 — Shown on your public profile. Optional.`}
          className="min-h-[90px] resize-none"
        />
        <Input
          label="Location"
          placeholder="e.g. Mumbai, India"
          value={location}
          onChange={e => onChangeLocation(e.target.value)}
          variant="outline"
          helperText="City or country — optional."
          leftIcon={MapPin}
        />
      </div>
    </div>
  );
}

// ── Step 2: Role ──────────────────────────────────────────────────────────────

function StepRole({ selected, onChange }: { selected: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">What best describes you?</h2>
        <p className="text-muted-foreground text-sm mt-1">We'll tailor your experience to your role.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ROLES.map(r => (
          <button
            key={r.id}
            onClick={() => onChange(r.id)}
            className={cn(
              'p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all text-center',
              selected === r.id
                ? 'bg-primary/8 border-primary shadow-sm shadow-primary/10'
                : 'bg-muted/30 border-transparent hover:bg-muted/60 hover:border-border'
            )}
          >
            <span className="text-2xl">{r.icon}</span>
            <span className="text-xs font-bold text-foreground leading-tight">{r.label}</span>
            {selected === r.id && (
              <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: Goals ─────────────────────────────────────────────────────────────

function StepGoals({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">What do you want to achieve?</h2>
        <p className="text-muted-foreground text-sm mt-1">Pick all that apply — this powers your recommendations.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GOALS.map(g => {
          const active = selected.includes(g.id);
          return (
            <button
              key={g.id}
              onClick={() => toggle(g.id)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                active
                  ? 'bg-primary/8 border-primary'
                  : 'bg-muted/30 border-transparent hover:bg-muted/60 hover:border-border'
              )}
            >
              <span className="text-xl shrink-0">{g.icon}</span>
              <span className="text-sm font-semibold text-foreground flex-1">{g.label}</span>
              <div className={cn(
                'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                active ? 'bg-primary border-primary' : 'border-border'
              )}>
                {active && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 4: Interests ─────────────────────────────────────────────────────────

function StepInterests({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Pick your topics</h2>
        <p className="text-muted-foreground text-sm mt-1">Select at least one to personalize your feed.</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {INTERESTS.map(item => {
          const active = selected.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={cn(
                'p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all relative',
                active
                  ? 'bg-primary/8 border-primary shadow-sm'
                  : 'bg-muted/30 border-transparent hover:bg-muted/60 hover:border-border'
              )}
            >
              {active && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              )}
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[11px] font-bold text-foreground">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 5: AI Model ──────────────────────────────────────────────────────────

function StepModel({ selected, onChange }: { selected: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Cpu className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Which AI do you use most?</h2>
        <p className="text-muted-foreground text-sm mt-1">We'll surface prompts built for your preferred model.</p>
      </div>
      <div className="space-y-3 max-w-md mx-auto">
        {MODELS.map(m => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
              selected === m.id
                ? 'bg-primary/8 border-primary'
                : 'bg-muted/30 border-transparent hover:bg-muted/60 hover:border-border'
            )}
          >
            <div className="w-11 h-11 rounded-xl bg-background border border-border flex items-center justify-center text-xl shrink-0 shadow-sm">
              {m.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{m.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{m.provider}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
            </div>
            <div className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
              selected === m.id ? 'bg-primary border-primary' : 'border-border'
            )}>
              {selected === m.id && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 6: Launch ────────────────────────────────────────────────────────────

function StepLaunch({ form }: { form: FormData }) {
  const role      = ROLES.find(r => r.id === form.role);
  const goalCount = form.goals.length;
  const topics    = form.interests.slice(0, 3);
  const model     = MODELS.find(m => m.id === form.preferredModel);

  return (
    <div className="text-center space-y-5 py-4">
      <div className="relative inline-block">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto gradient-cta">
          <Zap className="w-10 h-10 text-white" />
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-foreground tracking-tight">
          You're all set, {form.displayName || 'Creator'}!
        </h2>
        <p className="text-muted-foreground mt-2 max-w-sm mx-auto text-sm leading-relaxed">
          Your personalized feed is ready. We'll surface prompts that match your role, goals, and interests from day one.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
        {role && (
          <div className="p-3 rounded-xl bg-muted/40 border border-border">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Role</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{role.icon} {role.label}</p>
          </div>
        )}
        <div className="p-3 rounded-xl bg-muted/40 border border-border">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Goals</p>
          <p className="text-sm font-bold text-foreground mt-0.5">{goalCount} selected</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/40 border border-border">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Interests</p>
          <p className="text-sm font-bold text-foreground mt-0.5 truncate">{topics.join(', ') || '—'}</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/40 border border-border">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">AI Model</p>
          <p className="text-sm font-bold text-foreground mt-0.5 truncate">{model ? `${model.icon} ${model.name}` : '—'}</p>
        </div>
        {form.location && (
          <div className="p-3 rounded-xl bg-muted/40 border border-border col-span-2">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Location</p>
            <p className="text-sm font-bold text-foreground mt-0.5">📍 {form.location}</p>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground/60 font-medium">
        Your dashboard is personalized — you can update everything in Settings anytime.
      </p>
    </div>
  );
}
