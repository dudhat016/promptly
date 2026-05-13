import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { Button, Card, Input } from '../components/primitives';
import { cn } from '../lib/utils';
import { INTERACTION_WEIGHTS, seedAffinityFromInterests } from '../lib/affinity';
import { EmailService } from '../services/emailService';
import { 
  Sparkles, User, Target, Cpu, CreditCard, Rocket, 
  Check, ChevronRight, ChevronLeft, Zap, Star, Loader2 
} from 'lucide-react';
import { usePath } from '../hooks/usePath';
import { useSiteContent } from '../hooks/useSiteContent';
import confetti from 'canvas-confetti';

const STEPS = [
  { id: 'welcome', title: 'Profile', icon: User },
  { id: 'interests', title: 'Interests', icon: Target },
  { id: 'model', title: 'AI Model', icon: Cpu },
  { id: 'plan', title: 'Plan', icon: CreditCard },
  { id: 'finish', title: 'Launch', icon: Rocket },
];

const DEFAULT_INTERESTS = [
  { id: 'marketing', name: 'Marketing', icon: '📢' },
  { id: 'coding', name: 'Coding', icon: '💻' },
  { id: 'writing', name: 'Writing', icon: '✍️' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'creative', name: 'Creative', icon: '🎨' },
  { id: 'seo', name: 'SEO', icon: '🔍' },
  { id: 'productivity', name: 'Productivity', icon: '⚡' },
  { id: 'social', name: 'Social Media', icon: '📱' },
];

const DEFAULT_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Smart & Balanced', icon: '✨' },
  { id: 'claude-3-5', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Creative & Nuanced', icon: '🎨' },
  { id: 'gemini-1-5', name: 'Gemini 1.5 Pro', provider: 'Google', description: 'Fast & Deep Context', icon: '🚀' },
];

export default function OnboardingPage() {
  const { profile, user } = useAuth();
  const { content: dynamicContent, loading } = useSiteContent('onboarding');
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    displayName: '',
    interests: [] as string[],
    preferredModel: 'gpt-4o',
    plan: 'free'
  });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { prefix } = usePath();

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        displayName: profile.displayName || prev.displayName,
        interests: profile.interests?.length ? profile.interests : prev.interests,
        preferredModel: profile.preferredModel || prev.preferredModel,
      }));
    }
  }, [profile]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      if (nextStep === STEPS.length - 1) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#7c3aed', '#a855f7', '#6366f1']
        });
      }
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Seed local affinity immediately — fixes cold-start before first browse
      seedAffinityFromInterests(formData.interests);

      // Build initial affinityProfile map for Firestore so new devices inherit it
      const affinityProfile = Object.fromEntries(
        formData.interests.map(id => [
          id.toLowerCase().replace(/\s+/g, '-'),
          INTERACTION_WEIGHTS.ONBOARDING_SEED
        ])
      );

      await updateDoc(doc(db, 'users', user.uid), {
        displayName: formData.displayName,
        hasCompletedOnboarding: true,
        interests: formData.interests,
        preferredModel: formData.preferredModel,
        affinityProfile
      });

      // Sync interest tags to marketing CRM (non-blocking)
      try {
        const interestTags = formData.interests.map(
          i => `Interest: ${i.charAt(0).toUpperCase() + i.slice(1)}`
        );
        const contactSnap = await getDocs(
          query(collection(db, 'marketing_contacts'), where('userId', '==', user.uid))
        );
        if (!contactSnap.empty) {
          const existing = contactSnap.docs[0].data();
          const mergedTags = Array.from(
            new Set([...(existing.tags || []), ...interestTags, 'onboarding_complete'])
          );
          await updateDoc(contactSnap.docs[0].ref, {
            tags: mergedTags,
            interests: formData.interests
          });
        }
      } catch {}

      // Send personalized onboarding-complete email (non-blocking)
      try {
        if (user.email) {
          await EmailService.sendOnboardingCompleteEmail(
            user.uid,
            user.email,
            formData.displayName || user.displayName || 'Creator',
            formData.interests
          );
        }
      } catch {}

      navigate(prefix('/dashboard/vault'));
    } catch (err) {
      console.error("Onboarding failed:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] animate-pulse">Preparing your experience...</p>
      </div>
    );
  }

  const isLastStep = currentStep === STEPS.length - 1;
  const onboardingData = dynamicContent || {};

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        {/* Stepper Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between px-4 mb-4">
            {STEPS.map((step, idx) => {
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex flex-col items-center gap-2 relative">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 border-2",
                    isActive ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30" : 
                    isCompleted ? "bg-primary/10 border-primary/20 text-primary" : 
                    "bg-muted/50 border-transparent text-muted-foreground"
                  )}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Global Progress Bar */}
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden px-1">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(124,58,237,0.3)]"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content Card */}
        <Card variant="raised" className="p-8 md:p-12 border-primary/5 min-h-[450px] flex flex-col">
          <div className="flex-1">
            {currentStep === 0 && (
              <StepWelcome 
                value={formData.displayName} 
                onChange={(v) => setFormData(p => ({ ...p, displayName: v }))} 
              />
            )}
            {currentStep === 1 && (
              <StepInterests 
                categories={onboardingData.interests || DEFAULT_INTERESTS}
                selected={formData.interests} 
                onChange={(v) => setFormData(p => ({ ...p, interests: v }))} 
              />
            )}
            {currentStep === 2 && (
              <StepModel 
                models={onboardingData.models || DEFAULT_MODELS}
                selected={formData.preferredModel} 
                onChange={(v) => setFormData(p => ({ ...p, preferredModel: v }))} 
              />
            )}
            {currentStep === 3 && (
              <StepPlan 
                selected={formData.plan} 
                onChange={(v) => setFormData(p => ({ ...p, plan: v }))} 
              />
            )}
            {currentStep === 4 && (
              <StepFinish 
                headline={onboardingData.welcome?.headline}
                description={onboardingData.welcome?.description}
              />
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t border-border">
            <Button 
              variant="ghost" 
              onClick={handleBack} 
              disabled={currentStep === 0 || saving}
              leftIcon={ChevronLeft}
              className="font-bold"
            >
              Back
            </Button>
            
            <Button 
              variant="primary" 
              onClick={handleNext} 
              isLoading={saving}
              disabled={(currentStep === 0 && !formData.displayName) || (currentStep === 1 && formData.interests.length === 0)}
              className="px-8 shadow-xl shadow-primary/20 gradient-cta"
              rightIcon={!isLastStep ? ChevronRight : Rocket}
            >
              {isLastStep ? 'Launch App' : 'Continue'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StepWelcome({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold text-foreground tracking-tight">Let's get started!</h2>
        <p className="text-muted-foreground text-lg">First, what should we call you?</p>
      </div>
      <div className="max-w-md mx-auto">
        <Input 
          label="Display Name"
          placeholder="e.g. Alex Creator"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputSize="lg"
          className="text-center text-xl font-bold h-16"
          autoFocus
        />
        <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
          This name will be visible to other creators if you choose to publish prompts.
        </p>
      </div>
    </div>
  );
}

function StepInterests({ categories, selected, onChange }: { categories: any[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(i => i !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold text-foreground tracking-tight">What's your focus?</h2>
        <p className="text-muted-foreground text-lg">Choose at least one interest to personalize your experience.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            className={cn(
              "p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all relative overflow-hidden",
              selected.includes(c.id) 
                ? "bg-primary/5 border-primary shadow-lg shadow-primary/5" 
                : "bg-muted/30 border-transparent hover:bg-muted/50"
            )}
          >
            {selected.includes(c.id) && (
              <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
            )}
            <span className="text-3xl relative z-10">{c.icon}</span>
            <span className="text-xs font-bold text-foreground relative z-10">{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepModel({ models, selected, onChange }: { models: any[]; selected: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold text-foreground tracking-tight">Pick your engine</h2>
        <p className="text-muted-foreground text-lg">Which AI model do you plan to use most?</p>
      </div>
      <div className="space-y-3 max-w-md mx-auto">
        {models.map((m) => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={cn(
              "w-full p-4 rounded-2xl border-2 flex items-center gap-4 text-left transition-all relative",
              selected === m.id 
                ? "bg-primary/5 border-primary shadow-lg shadow-primary/5" 
                : "bg-muted/30 border-transparent hover:bg-muted/50"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-2xl shadow-sm border border-border/50">
              {m.icon}
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground">{m.name}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{m.provider}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
            </div>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
              selected === m.id ? "bg-primary text-primary-foreground" : "bg-muted text-transparent"
            )}>
              <Check className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepPlan({ selected, onChange }: { selected: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold text-foreground tracking-tight">Choose your path</h2>
        <p className="text-muted-foreground text-lg">You can change this anytime later.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div 
          className={cn(
            "p-6 rounded-3xl border-2 cursor-pointer transition-all relative overflow-hidden group",
            selected === 'free' ? "bg-primary/5 border-primary shadow-inner" : "bg-muted/30 border-transparent hover:bg-muted/50"
          )}
          onClick={() => onChange('free')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <Rocket className="w-5 h-5" />
            </div>
            {selected === 'free' && <Check className="text-primary w-6 h-6" />}
          </div>
          <h3 className="text-xl font-bold text-foreground">Free Starter</h3>
          <p className="text-sm text-muted-foreground mt-2">Explore the marketplace and save your favorites.</p>
          <p className="text-2xl font-black text-foreground mt-6">$0<span className="text-sm font-medium text-muted-foreground">/mo</span></p>
        </div>

        <div 
          className={cn(
            "p-6 rounded-3xl border-2 cursor-pointer transition-all relative overflow-hidden group",
            selected === 'pro' ? "bg-primary/5 border-primary shadow-inner shadow-primary/10" : "bg-muted/30 border-transparent hover:bg-muted/50"
          )}
          onClick={() => onChange('pro')}
        >
          <div className="absolute top-0 right-0 p-3">
             <span className="bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">Recommended</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Zap className="w-5 h-5" />
            </div>
            {selected === 'pro' && <Check className="text-primary w-6 h-6" />}
          </div>
          <h3 className="text-xl font-bold text-foreground">Pro Creator</h3>
          <p className="text-sm text-muted-foreground mt-2">Unlock unlimited premium prompts and advanced features.</p>
          <p className="text-2xl font-black text-foreground mt-6">$29<span className="text-sm font-medium text-muted-foreground">/mo</span></p>
        </div>
      </div>
    </div>
  );
}

function StepFinish({ headline, description }: { headline?: string; description?: string }) {
  return (
    <div className="text-center space-y-6 py-10">
      <div className="relative inline-block">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
          <Rocket className="w-12 h-12 text-primary" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg">
          <Star className="w-4 h-4 fill-current" />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-foreground tracking-tight">{headline || "You're all set!"}</h2>
        <p className="text-muted-foreground text-lg max-w-sm mx-auto">
          {description || "Your profile is ready. We've customized your dashboard based on your interests."}
        </p>
      </div>
      <div className="pt-6 grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
        <div className="p-4 rounded-2xl bg-muted/50 border border-border">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">+50 Credits</p>
          <p className="text-xs text-muted-foreground mt-1">Signup bonus added</p>
        </div>
        <div className="p-4 rounded-2xl bg-muted/50 border border-border">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Vault Ready</p>
          <p className="text-xs text-muted-foreground mt-1">Personal library initialized</p>
        </div>
      </div>
    </div>
  );
}
