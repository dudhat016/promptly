import { addDoc, collection, getDocs } from 'firebase/firestore';
import { Plus, Send, ShieldCheck, Sparkles, Terminal, Wand2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { db } from '../../lib/firebase';
import { generateAIPrompt } from '../../services/geminiService';
import { AIModel } from '../../types';

export default function DashboardBuilder() {
  const { user, isAdmin } = useAuth();
  const { permissions } = usePermissions();
  const navigate = useNavigate();
  const [models, setModels] = useState<AIModel[]>([]);
  const [targetModel, setTargetModel] = useState('');
  const [idea, setIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  useEffect(() => {
    async function fetchModels() {
      try {
        const mSnap = await getDocs(collection(db, 'models'));
        const fetchedModels = mSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AIModel));
        setModels(fetchedModels);
        if (fetchedModels.length > 0) setTargetModel(fetchedModels[0].id);
      } catch (err) {
        console.error("Error fetching models:", err);
      }
    }
    fetchModels();
  }, []);

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    if (!permissions.canUseAIBuilder) {
      toast.error("AI Builder is not available on your current plan. Please upgrade to PRO.");
      return;
    }
    setIsGenerating(true);
    setGeneratedPrompt('');
    try {
      const result = await generateAIPrompt(idea, targetModel);
      setGeneratedPrompt(result);
      toast.success("Prompt engineered successfully!");
    } catch (err) {
      toast.error("Error generating prompt. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!generatedPrompt || !user) return;
    try {
      const newPrompt: any = {
        title: idea.length > 50 ? idea.substring(0, 47) + '...' : idea,
        description: `Custom engineered for ${targetModel}`,
        content: generatedPrompt,
        isPaid: false,
        creatorId: user.uid,
        model: targetModel,
        categoryId: 'general',
        tags: ['Generated'],
        likesCount: 0,
        viewsCount: 0,
        createdAt: new Date().toISOString(), // Use string to match typical client side creation before sync
        updatedAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'prompts'), newPrompt);
      toast.success("Saved to your Vault!");
      navigate('/vault');
    } catch (err) {
      toast.error("Failed to save prompt");
      console.error(err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-xs">
            <Wand2 className="w-4 h-4" />
            AI Labs
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">Prompt Builder</h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            Transform simple ideas into high-performance, model-specific formulas.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-2xl border border-green-500/20">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Optimized Output</span>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto">
        <div className="bg-card rounded-[3rem] md:rounded-[4rem] border border-border p-6 md:p-14 shadow-sm">
          <div className="space-y-12">
            {/* Model Selection */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Terminal className="w-4 h-4 text-primary" />
                <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground">Select Target Model</label>
              </div>
              <div className="flex gap-3 flex-wrap">
                {models.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setTargetModel(m.id)}
                    className={`px-6 py-3 rounded-2xl font-black text-sm transition-all border-2 ${
                      targetModel === m.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'bg-muted border-transparent text-muted-foreground/60 hover:bg-muted/80'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-6 ml-1 text-center md:text-left">Describe your vision</label>
              <div className="relative group">
                <textarea
                  rows={4}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="e.g. Generate an SEO optimized blog post about React performance tips with a friendly tone."
                  className="w-full bg-muted/50 border-2 border-transparent rounded-[2.5rem] p-8 md:p-10 focus:outline-none focus:bg-card focus:border-primary/30 transition-all text-xl md:text-2xl font-bold placeholder:text-muted-foreground/30 text-foreground resize-none"
                />
                <div className="absolute right-6 bottom-6 hidden md:block">
                  <Sparkles className="w-8 h-8 text-primary/10 group-focus-within:text-primary transition-colors" />
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !idea.trim()}
              className="w-full bg-primary text-primary-foreground font-black py-6 rounded-[2.5rem] text-xl hover:opacity-90 transition-all flex items-center justify-center gap-4 shadow-xl shadow-primary/20 disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="w-6 h-6 border-4 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>Engineer Blueprint <Send className="w-6 h-6" /></>
              )}
            </button>
          </div>

          {/* Result Section */}
          <AnimatePresence>
            {generatedPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className="mt-16 pt-16 border-t border-border"
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Optimized Result</span>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div className="w-2 h-2 bg-green-500/50 rounded-full" />
                    <div className="w-2 h-2 bg-green-500/20 rounded-full" />
                  </div>
                </div>
                <div className="bg-foreground text-background rounded-[2.5rem] p-8 md:p-12 font-mono text-sm leading-relaxed mb-8 border border-border whitespace-pre-wrap shadow-2xl relative group">
                  {generatedPrompt}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPrompt);
                      toast.success("Copied to clipboard!");
                    }}
                    className="absolute top-4 right-4 p-3 bg-background/10 rounded-xl hover:bg-background/20 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <button
                    onClick={handleSavePrompt}
                    className="flex-grow bg-foreground text-background font-black py-5 rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    Add to My Vault
                  </button>
                  <button
                    onClick={() => setGeneratedPrompt('')}
                    className="px-10 bg-muted text-muted-foreground font-black py-5 rounded-2xl hover:bg-muted/80 transition-all"
                  >
                    Discard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
