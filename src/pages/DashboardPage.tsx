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
    <div className="container mx-auto px-4 py-16">
      {/* Dynamic Header */}
      <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Sparkles className="w-64 h-64 text-indigo-600 rotate-12" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <img src={profile?.photoURL || undefined} className="w-20 h-20 rounded-3xl bg-slate-100 object-cover shadow-lg border-4 border-white" alt="" />
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-1">Hello, {profile?.displayName?.split(' ')[0] || 'Creator'}!</h1>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isPro ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  {profile?.subscriptionStatus} Plan
                </span>
                <span className="text-slate-400 text-xs font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'recently'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full lg:w-auto">
            {/* Library Unlocks */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
               <div className="flex justify-between items-start mb-6">
                 <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                   <Zap className="w-6 h-6 fill-current" />
                 </div>
                 <div className="text-right">
                   <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Unlocks</span>
                   <span className="text-2xl font-black text-slate-900 leading-none">{profile?.credits || 0}</span>
                 </div>
               </div>
               <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                 <motion.div
                   initial={{ width: 0 }}
                   animate={{ width: `${Math.min(100, ((profile?.credits || 0) / (profile?.monthlyLimit || 50)) * 100)}%` }}
                   className="h-full rounded-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]"
                 />
               </div>
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                 <span>Allowance</span>
                 <span>{profile?.monthlyLimit || 50} Max</span>
               </div>
            </div>

            {/* Vault Capacity */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
               <div className="flex justify-between items-start mb-6">
                 <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                   <Database className="w-6 h-6 fill-current" />
                 </div>
                 <div className="text-right">
                   <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vault</span>
                   <span className="text-2xl font-black text-slate-900 leading-none">
                     {isPro ? '∞' : (profile?.unlockedPrompts || []).length}
                   </span>
                 </div>
               </div>
               <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                 <motion.div
                   initial={{ width: 0 }}
                   animate={{ width: isPro ? '100%' : `${((profile?.unlockedPrompts || []).length / (config?.vaultLimit || 10)) * 100}%` }}
                   className={`h-full rounded-full transition-colors ${(!isPro && (profile?.unlockedPrompts || []).length >= (config?.vaultLimit || 10) - 1) ? 'bg-rose-500' : 'bg-amber-500'} shadow-[0_0_10px_rgba(245,158,11,0.3)]`}
                 />
               </div>
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                 <span>Storage</span>
                 <span>{isPro ? 'Infinite' : `${config?.vaultLimit || 10} Slots`}</span>
               </div>
            </div>

            {/* AI Builder */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
               <div className="flex justify-between items-start mb-6">
                 <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                   <Wand2 className="w-6 h-6 fill-current" />
                 </div>
                 <div className="text-right">
                   <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Builder</span>
                   <span className="text-2xl font-black text-slate-900 leading-none">{todayCount}</span>
                 </div>
               </div>
               <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                 <motion.div
                   initial={{ width: 0 }}
                   animate={{ width: `${usagePercent}%` }}
                   className={`h-full rounded-full ${usagePercent > 80 ? 'bg-rose-500' : 'bg-emerald-500'} shadow-[0_0_10px_rgba(16,185,129,0.3)]`}
                 />
               </div>
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                 <span>Daily Cap</span>
                 <span>{permissions.maxDailyPrompts} Built</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
        <div className="flex flex-wrap md:flex-nowrap gap-2 p-1.5 bg-slate-100 rounded-2xl w-full md:w-fit overflow-x-auto scrollbar-hide">
          <TabButton active={activeTab === 'library'} onClick={() => handleTabChange('library')} icon={LayoutGrid}>My Library</TabButton>
          <TabButton active={activeTab === 'favorites'} onClick={() => handleTabChange('favorites')} icon={Heart}>Favorites</TabButton>
          <TabButton active={activeTab === 'builder'} onClick={() => handleTabChange('builder')} icon={Wand2}>AI Builder</TabButton>
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black text-indigo-600 hover:bg-white hover:shadow-sm transition-all">
              <ShieldCheck className="w-4 h-4" />
              Admin Portal
            </Link>
          )}
        </div>

        <button
          onClick={() => handleTabChange('builder')}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
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
            <div className="bg-white rounded-[4rem] border border-slate-100 p-8 md:p-14 shadow-sm">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900">AI Prompt Builder</h2>
                  <p className="text-slate-500 font-medium">Transform simple ideas into expert-level prompts.</p>
                </div>
              </div>

              <div className="space-y-10">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Select Optimized Model</label>
                  <div className="flex gap-4 flex-wrap">
                    {models.map(m => (
                      <button key={m.id} onClick={() => setTargetModel(m.id)} className={`px-8 py-4 rounded-2xl font-black transition-all border-2 ${targetModel === m.id ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'}`}>{m.name}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-4">What do you want to build?</label>
                  <textarea rows={4} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. Generate an SEO optimized blog post about React performance tips with a friendly tone." className="w-full bg-slate-50 border-2 border-transparent rounded-[2rem] p-8 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all text-xl font-medium placeholder:text-slate-300" />
                </div>

                <button onClick={handleGenerate} disabled={isGenerating || !idea.trim()} className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] text-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-indigo-100 disabled:opacity-50">
                  {isGenerating ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <>Generate Prompt <Send className="w-6 h-6" /></>}
                </button>
              </div>

              {generatedPrompt && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 pt-12 border-t border-slate-100">
                  <div className="bg-slate-900 rounded-[2.5rem] p-10 text-indigo-100 font-mono text-sm leading-relaxed mb-8 border border-slate-800 whitespace-pre-wrap shadow-2xl">{generatedPrompt}</div>
                  <div className="flex gap-4">
                    <button onClick={handleSavePrompt} className="flex-grow bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                      <Plus className="w-5 h-5" />
                      Save to My Library
                    </button>
                    <button onClick={() => setGeneratedPrompt('')} className="px-10 bg-slate-100 text-slate-500 font-black py-5 rounded-2xl hover:bg-slate-200 transition-all">Discard</button>
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
    <button onClick={onClick} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 flex-shrink-0 ${active ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

function EmptyState({ icon: Icon, title, desc, onBtnClick, btnText }: any) {
  return (
    <div className="col-span-full py-24 bg-white border border-slate-100 rounded-[3rem] text-center">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <p className="text-slate-500 mb-8 max-w-sm mx-auto">{desc}</p>
      <button onClick={onBtnClick} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">{btnText}</button>
    </div>
  );
}

function StatCard({ label, value }: any) {
  return (
    <div className="bg-slate-50 p-6 rounded-2xl">
      <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-3xl font-black text-slate-900">{value}</div>
    </div>
  );
}
