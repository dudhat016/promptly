import { addDoc, collection, getDocs, query, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { Clock, Database, Heart, LayoutGrid, Plus, Send, ShieldCheck, Sparkles, Wand2, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import PromptCard from '../components/PromptCard';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../hooks/useConfig';
import { usePermissions } from '../hooks/usePermissions';
import { db } from '../lib/firebase';
import { EmailService } from '../services/emailService';
import { generateAIPrompt } from '../services/geminiService';
import { Prompt } from '../types';

// Utility to safely handle Firestore dates
const parseDate = (date: any): Date => {
  if (!date) return new Date();
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === 'object' && date.seconds) return new Date(date.seconds * 1000);
  const parsed = new Date(date);
  return parsed.toString() !== 'Invalid Date' ? parsed : new Date();
};

export default function DashboardPage() {
  const { user, profile, loading: authLoading, isPro, isAdmin } = useAuth();
  const { permissions, loading: permsLoading } = usePermissions();
  const { config } = useConfig();
  const models = config?.models || [];
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'library' | 'favorites' | 'builder'>(
    (searchParams.get('tab') as any) || 'library'
  );
  const [myPrompts, setMyPrompts] = useState<Prompt[]>([]);
  const [favorites, setFavorites] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [todayCount, setTodayCount] = useState(0);

  // Builder States
  const [idea, setIdea] = useState('');
  const [targetModel, setTargetModel] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isPaidPrompt, setIsPaidPrompt] = useState(false);

  useEffect(() => {
    if (models.length > 0 && !targetModel) {
      setTargetModel(models[0].id);
    }
  }, [models, targetModel]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // Fetch user's prompts
        const q = query(collection(db, 'prompts'), where('creatorId', '==', user.uid));
        const qSnap = await getDocs(q);
        const pList = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Prompt));
        setMyPrompts(pList);

        // Calculate today's usage
        const today = new Date();
        today.setHours(0,0,0,0);
        const count = pList.filter(p => {
          if (!p.createdAt) return false;
          const pDate = parseDate(p.createdAt);
          return pDate >= today;
        }).length;
        setTodayCount(count);

        // Fetch favorites
        const favRef = collection(db, 'users', user.uid, 'favorites');
        const favSnap = await getDocs(favRef);
        const favPromptIds = favSnap.docs.map(d => d.data().promptId);

        if (favPromptIds.length > 0) {
          const pRef = collection(db, 'prompts');
          const pQuery = query(pRef, where('__name__', 'in', favPromptIds.slice(0, 10)));
          const pSnap = await getDocs(pQuery);
          setFavorites(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Prompt)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get('tab') as any;
    if (tab && ['library', 'favorites', 'builder'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'library' | 'favorites' | 'builder') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleGenerate = async () => {
    if (!idea.trim()) return;

    if (!permissions.canUseAIBuilder) {
      toast.error("AI Builder restricted. Please upgrade to Pro.");
      return;
    }

    if (todayCount >= permissions.maxDailyPrompts) {
      toast.error(`Daily limit reached. Upgrade for more!`);
      return;
    }

    setIsGenerating(true);
    setGeneratedPrompt('');
    const toastId = toast.loading("AI is crafting your expert prompt...");
    try {
      const result = await generateAIPrompt(idea, targetModel);
      setGeneratedPrompt(result);
      toast.success("Prompt generated successfully!", { id: toastId });
    } catch (err) {
      toast.error("Generation failed. Please try again.", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!generatedPrompt || !user) return;
    try {
      const newPrompt: any = {
        title: idea.length > 50 ? idea.substring(0, 47) + '...' : idea,
        description: `Generated for ${targetModel}`,
        content: generatedPrompt,
        isPaid: isPaidPrompt && isAdmin,
        creatorId: user.uid,
        model: targetModel,
        categoryId: 'general',
        tags: ['Generated'],
        likesCount: 0,
        viewsCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'prompts'), newPrompt);
      setMyPrompts(prev => [{ id: docRef.id, ...newPrompt, createdAt: new Date().toISOString() }, ...prev]);
      setTodayCount(prev => prev + 1);

      await EmailService.sendNewPromptEmail(user.uid, user.email || '', newPrompt.title);

      toast.success("Prompt saved to your library!");
      setGeneratedPrompt('');
      setIdea('');
      handleTabChange('library');
    } catch (err) {
      console.error(err);
      toast.error("Failed to save prompt");
    }
  };

  if (authLoading || permsLoading) return <div className="min-h-screen flex items-center justify-center">Loading Dashboard...</div>;

  const usagePercent = Math.min(100, (todayCount / (permissions.maxDailyPrompts || 1)) * 100);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-card rounded-lg p-8 border border-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Sparkles className="w-64 h-64 text-primary rotate-12" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <img src={profile?.photoURL || undefined} className="w-14 h-14 rounded-lg bg-muted object-cover border border-border" alt="" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Hello, {profile?.displayName?.split(' ')[0] || 'Creator'}!</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${isPro ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                  {profile?.subscriptionStatus} Plan
                </span>
                <span className="text-muted-foreground text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'recently'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[420px]">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
               <div className="flex justify-between items-start mb-3">
                 <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center text-primary">
                   <Zap className="w-4 h-4" />
                 </div>
                 <span className="text-xl font-bold text-foreground">{profile?.credits || 0}</span>
               </div>
               <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mb-2">
                 <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, ((profile?.credits || 0) / (profile?.monthlyLimit || 50)) * 100)}%` }} className="h-full rounded-full bg-primary" />
               </div>
               <div className="flex justify-between text-xs text-muted-foreground">
                 <span>Unlocks</span><span>{profile?.monthlyLimit || 50} max</span>
               </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
               <div className="flex justify-between items-start mb-3">
                 <div className="w-8 h-8 bg-amber-500/10 rounded-md flex items-center justify-center text-amber-500">
                   <Database className="w-4 h-4" />
                 </div>
                 <span className="text-xl font-bold text-foreground">{isPro ? '∞' : (profile?.unlockedPrompts || []).length}</span>
               </div>
               <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mb-2">
                 <motion.div initial={{ width: 0 }} animate={{ width: isPro ? '100%' : `${((profile?.unlockedPrompts || []).length / (config?.vaultLimit || 10)) * 100}%` }} className={`h-full rounded-full ${(!isPro && (profile?.unlockedPrompts || []).length >= (config?.vaultLimit || 10) - 1) ? 'bg-rose-500' : 'bg-amber-500'}`} />
               </div>
               <div className="flex justify-between text-xs text-muted-foreground">
                 <span>Vault</span><span>{isPro ? 'Unlimited' : `${config?.vaultLimit || 10} slots`}</span>
               </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
               <div className="flex justify-between items-start mb-3">
                 <div className="w-8 h-8 bg-emerald-500/10 rounded-md flex items-center justify-center text-emerald-500">
                   <Wand2 className="w-4 h-4" />
                 </div>
                 <span className="text-xl font-bold text-foreground">{todayCount}</span>
               </div>
               <div className="w-full h-1.5 bg-border rounded-full overflow-hidden mb-2">
                 <motion.div initial={{ width: 0 }} animate={{ width: `${usagePercent}%` }} className={`h-full rounded-full ${usagePercent > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
               </div>
               <div className="flex justify-between text-xs text-muted-foreground">
                 <span>Builder</span><span>{permissions.maxDailyPrompts} daily</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-muted rounded-md w-fit">
          <TabButton active={activeTab === 'library'} onClick={() => handleTabChange('library')} icon={LayoutGrid}>My Library</TabButton>
          <TabButton active={activeTab === 'favorites'} onClick={() => handleTabChange('favorites')} icon={Heart}>Favorites</TabButton>
          <TabButton active={activeTab === 'builder'} onClick={() => handleTabChange('builder')} icon={Wand2}>AI Builder</TabButton>
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-primary hover:bg-card transition-all">
              <ShieldCheck className="w-4 h-4" />
              Admin
            </Link>
          )}
        </div>

        <button
          onClick={() => handleTabChange('builder')}
          className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-md font-semibold text-sm hover:bg-foreground/90 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create New Prompt
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'library' && (
          <motion.div key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {myPrompts.length > 0 ? myPrompts.map(p => <PromptCard key={p.id} prompt={p} />) : <EmptyState icon={History} title="Your library is empty" desc="Get started by creating your first professional prompt with our AI builder." onBtnClick={() => setActiveTab('builder')} btnText="Build First Prompt" />}
          </motion.div>
        )}

        {activeTab === 'favorites' && (
          <motion.div key="favorites" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -10 }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {favorites.length > 0 ? favorites.map(p => (
              <PromptCard
                key={p.id}
                prompt={p}
                isUnlocked={(profile?.unlockedPrompts || []).includes(p.id!)}
              />
            )) : <EmptyState icon={Heart} title="No favorites yet" desc="Browse the marketplace and save prompts to your collection." onBtnClick={() => window.location.href='/explore'} btnText="Explore Marketplace" />}
          </motion.div>
        )}

        {activeTab === 'builder' && (
          <motion.div key="builder" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto">
            <div className="bg-card rounded-xl border border-border p-8 md:p-14 shadow-sm">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-16 h-16 bg-primary rounded-md flex items-center justify-center text-white shadow-md shadow-primary/20">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-foreground">AI Prompt Builder</h2>
                  <p className="text-muted-foreground font-medium">Transform simple ideas into expert-level prompts.</p>
                </div>
              </div>

              <div className="space-y-10">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Select Optimized Model</label>
                  <div className="flex gap-4 flex-wrap">
                    {models.map(m => (
                      <button key={m.id} onClick={() => setTargetModel(m.id)} className={`px-8 py-2.5 rounded-md font-semibold transition-all border-2 ${targetModel === m.id ? 'border-primary bg-primary/10 text-primary' : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'}`}>{m.name}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="builderIdea" className="block text-sm font-medium uppercase tracking-widest text-muted-foreground mb-3">What do you want to build?</label>
                  <textarea id="builderIdea" rows={4} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. Generate an SEO optimized blog post about React performance tips with a friendly tone." className="textarea" />
                </div>

                <button onClick={handleGenerate} disabled={isGenerating || !idea.trim()} className="w-full btn-primary btn-lg">
                  {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Generate Prompt <Send className="w-5 h-5" /></>}
                </button>
              </div>

              {generatedPrompt && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10 pt-10 border-t border-border">
                  <div className="bg-foreground rounded-md p-6 text-primary-foreground/80 font-mono text-sm leading-relaxed mb-6 border border-border/20 whitespace-pre-wrap shadow-md">{generatedPrompt}</div>
                  <div className="flex gap-3">
                    <button onClick={handleSavePrompt} className="flex-grow bg-foreground text-background font-semibold py-3 rounded-md hover:bg-foreground/90 transition-all flex items-center justify-center gap-2 text-sm">
                      <Plus className="w-4 h-4" />
                      Save to My Library
                    </button>
                    <button onClick={() => setGeneratedPrompt('')} className="px-6 bg-muted text-muted-foreground font-semibold py-3 rounded-md hover:bg-muted/80 transition-all text-sm">Discard</button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 flex-shrink-0 ${active ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  );
}

function EmptyState({ icon: Icon, title, desc, onBtnClick, btnText }: any) {
  return (
    <div className="col-span-full py-20 bg-muted/30 border border-border border-dashed rounded-lg text-center">
      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4 text-muted-foreground">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">{desc}</p>
      <button onClick={onBtnClick} className="btn-primary">{btnText}</button>
    </div>
  );
}

function StatCard({ label, value }: any) {
  return (
    <div className="bg-muted/50 px-4 py-3 rounded-md border border-border">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-0.5">{label}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}
