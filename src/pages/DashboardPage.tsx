import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { generateAIPrompt } from '../services/geminiService';
import { Prompt } from '../types';
import PromptCard from '../components/PromptCard';
import { EmailService } from '../services/emailService';
import { Sparkles, Plus, LayoutGrid, Heart, History, Wand2, Search, Zap, Code, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [activeTab, setActiveTab] = useState<'library' | 'favorites' | 'builder' | 'admin'>('library');
  const [myPrompts, setMyPrompts] = useState<Prompt[]>([]);
  const [favorites, setFavorites] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder States
  const [idea, setIdea] = useState('');
  const [targetModel, setTargetModel] = useState('GPT-4');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isPaidPrompt, setIsPaidPrompt] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // Fetch user's prompts
        const q = query(collection(db, 'prompts'), where('creatorId', '==', user.uid));
        const qSnap = await getDocs(q);
        setMyPrompts(qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Prompt)));

        // Fetch favorites
        const favRef = collection(db, 'users', user.uid, 'favorites');
        const favSnap = await getDocs(favRef);
        const favPromptIds = favSnap.docs.map(d => d.data().promptId);
        
        if (favPromptIds.length > 0) {
          const pRef = collection(db, 'prompts');
          // Firestore 'in' limit is 10, but for demo it's fine
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

  const handleGenerate = async () => {
    if (!idea.trim()) return;

    if (!permissions.canUseAIBuilder) {
      alert("AI Builder is not available on your current plan. Please upgrade to PRO.");
      return;
    }

    // Check daily limits
    const today = new Date();
    today.setHours(0,0,0,0);
    const dailyCount = myPrompts.filter(p => {
      if (!p.createdAt) return false;
      const pDate = parseDate(p.createdAt);
      return pDate >= today;
    }).length;

    if (dailyCount >= permissions.maxDailyPrompts) {
      alert(`Daily limit reached (${permissions.maxDailyPrompts} generations). Come back tomorrow or upgrade for more!`);
      return;
    }

    setIsGenerating(true);
    setGeneratedPrompt('');
    try {
      const result = await generateAIPrompt(idea, targetModel);
      setGeneratedPrompt(result);
    } catch (err) {
      alert("Error generating prompt. Please try again.");
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
        isPaid: isPaidPrompt && isAdmin, // Only admins can create paid prompts for now
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
      
      // Send notification email
      await EmailService.sendNewPromptEmail(user.uid, user.email || '', newPrompt.title);

      setGeneratedPrompt('');
      setIdea('');
      setActiveTab('library');
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || permsLoading) return <div className="p-12 text-center">Loading Profile...</div>;

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">My Dashboard</h1>
          <p className="text-slate-500">Manage your library and build new expert prompts.</p>
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-2 p-1.5 bg-slate-100 rounded-2xl w-full md:w-fit overflow-x-auto scrollbar-hide">
          <TabButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={LayoutGrid}>Library</TabButton>
          <TabButton active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')} icon={Heart}>Favorites</TabButton>
          <TabButton active={activeTab === 'builder'} onClick={() => setActiveTab('builder')} icon={Wand2}>AI Builder</TabButton>
          {isAdmin && <TabButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={ShieldCheck}>Admin</TabButton>}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'library' && (
          <motion.div key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {myPrompts.length > 0 ? myPrompts.map(p => <PromptCard key={p.id} prompt={p} />) : <EmptyState icon={History} title="Your library is empty" desc="Get started by creating your first professional prompt with our AI builder." onBtnClick={() => setActiveTab('builder')} btnText="Build First Prompt" />}
          </motion.div>
        )}

        {activeTab === 'favorites' && (
          <motion.div key="favorites" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {favorites.length > 0 ? favorites.map(p => <PromptCard key={p.id} prompt={p} />) : <EmptyState icon={Heart} title="No favorites yet" desc="Browse the marketplace and save prompts to your collection." onBtnClick={() => window.location.href='/explore'} btnText="Explore Marketplace" />}
          </motion.div>
        )}

        {activeTab === 'builder' && (
          <motion.div key="builder" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto">
            <div className="bg-white rounded-[3rem] border border-slate-100 p-8 md:p-12 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-indigo-600 p-2 rounded-xl text-white">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-black text-slate-900">AI Prompt Builder</h2>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Target Model</label>
                  <div className="flex gap-4 flex-wrap">
                    {['GPT-4', 'Claude-3', 'Gemini Pro'].map(m => (
                      <button key={m} onClick={() => setTargetModel(m)} className={`px-6 py-3 rounded-2xl font-bold transition-all border ${targetModel === m ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'}`}>{m}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Describe your task</label>
                  <textarea rows={4} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. Generate an SEO optimized blog post about React performance tips with a friendly tone." className="w-full bg-slate-50 border border-transparent rounded-2xl p-6 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-lg" />
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="isPaid" checked={isPaidPrompt} onChange={(e) => setIsPaidPrompt(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="isPaid" className="text-sm font-bold text-slate-700">Mark as Paid (Admin Only)</label>
                  </div>
                )}

                <button onClick={handleGenerate} disabled={isGenerating || !idea.trim()} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl text-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 disabled:opacity-50">
                  {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Generate Professional Prompt"}
                </button>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Daily Limit: {permissions.maxDailyPrompts - myPrompts.filter(p => {
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const pDate = parseDate(p.createdAt);
                      return pDate >= today;
                    }).length} / {permissions.maxDailyPrompts} Remaining
                  </p>
                </div>
              </div>

              {generatedPrompt && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 pt-12 border-t border-slate-100">
                  <div className="bg-slate-900 rounded-3xl p-8 text-indigo-100 font-mono text-sm leading-loose mb-8 border border-slate-800 whitespace-pre-wrap">{generatedPrompt}</div>
                  <div className="flex gap-4">
                    <button onClick={handleSavePrompt} className="flex-grow bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all">Save to My Library</button>
                    <button onClick={() => setGeneratedPrompt('')} className="px-8 bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all">Discard</button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'admin' && (
          <motion.div key="admin" className="space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-100">
              <h3 className="text-2xl font-bold mb-6">System Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <StatCard label="Total Prompts" value={myPrompts.length} />
                <StatCard label="Paid Prompts" value={myPrompts.filter(p => p.isPaid).length} />
                <StatCard label="New Users" value="24" />
                <StatCard label="Revenue" value="$1,240" />
              </div>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100">
              <h3 className="text-2xl font-bold mb-6">Featured Creators</h3>
              <p className="text-slate-500">Admin actions for promoting/demoting content go here.</p>
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

import { ShieldCheck } from 'lucide-react';
