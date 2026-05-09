import { addDoc, collection, doc, updateDoc, increment } from 'firebase/firestore';
import { Plus, Send, ShieldCheck, Sparkles, Terminal, Wand2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/useConfig';
import { usePermissions } from '../../hooks/usePermissions';
import { db } from '../../lib/firebase';
import { generateAIPrompt } from '../../services/geminiService';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';

export default function DashboardBuilder() {
  const { user, profile, isAdmin } = useAuth();
  const { permissions } = usePermissions();
  const navigate = useNavigate();
  const { config } = useConfig();
  const models = config.models;
  const [targetModel, setTargetModel] = useState('');
  const [idea, setIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  useEffect(() => {
    if (models.length > 0 && !targetModel) {
      setTargetModel(models[0].id);
    }
  }, [models, targetModel]);

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    if (!permissions.canUseAIBuilder) {
      toast.error("AI Builder is not available on your current plan. Please upgrade to PRO.");
      return;
    }

    // Credit Check (Gap #3)
    const isPro = profile?.subscriptionStatus !== 'free';
    if (!isPro && (profile?.credits || 0) <= 0) {
      toast.error("Out of credits! Upgrade to Pro for unlimited generation.");
      return;
    }

    setIsGenerating(true);
    setGeneratedPrompt('');
    try {
      const result = await generateAIPrompt(idea, targetModel);
      
      // Consume Credit (Gap #3)
      if (!isPro && user) {
        await updateDoc(doc(db, 'users', user.uid), {
          credits: increment(-1),
          totalUsedCredits: increment(1)
        });

        // Log to Audit Ledger (Gap #2)
        await addDoc(collection(db, 'credits_history'), {
          userId: user.uid,
          type: 'ai_builder',
          promptIdea: idea.substring(0, 100),
          targetModel: targetModel,
          amount: 1,
          createdAt: new Date()
        });
      }

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
      navigate('/dashboard/vault');
    } catch (err) {
      toast.error("Failed to save prompt");
      console.error(err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs">
            <Wand2 className="w-4 h-4" />
            AI Labs
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Prompt Builder</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Transform simple ideas into high-performance, model-specific formulas.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-md border border-green-500/20">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Optimized Output</span>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto">
        <div className="bg-card rounded-lg md:rounded-xl border border-border p-6 md:p-14 shadow-sm">
          <div className="space-y-12">
            {/* Model Selection */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Terminal className="w-4 h-4 text-primary" />
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Target Model</label>
              </div>
              <div className="flex gap-3 flex-wrap">
                {models.map(m => (
                  <Button
                    key={m.id}
                    onClick={() => setTargetModel(m.id)}
                    variant={targetModel === m.id ? 'primary' : 'secondary'}
                    size="sm"
                  >
                    {m.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="relative group">
              <Textarea
                label="Describe your vision"
                id="builderVision"
                name="builderVision"
                rows={4}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g. Generate an SEO optimized blog post about React performance tips with a friendly tone."
                variant="filled"
                className="p-8 md:p-10 text-xl md:text-2xl font-bold resize-none"
              />
              <div className="absolute right-6 bottom-6 hidden md:block">
                <Sparkles className="w-8 h-8 text-primary/10 group-focus-within:text-primary transition-colors" />
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={handleGenerate}
              isLoading={isGenerating}
              disabled={!idea.trim()}
              variant="primary"
              size="lg"
              fullWidth
              rightIcon={Send}
            >
              Engineer Blueprint
            </Button>
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
                  <span className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Optimized Result</span>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div className="w-2 h-2 bg-green-500/50 rounded-full" />
                    <div className="w-2 h-2 bg-green-500/20 rounded-full" />
                  </div>
                </div>
                <div className="bg-foreground text-background rounded-lg p-6 font-mono text-sm leading-relaxed mb-8 border border-border whitespace-pre-wrap shadow-2xl relative group">
                  {generatedPrompt}
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPrompt);
                      toast.success("Copied to clipboard!");
                    }}
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 text-background/50 hover:text-background hover:bg-background/10 opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </Button>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <Button
                    onClick={handleSavePrompt}
                    variant="primary"
                    className="flex-grow"
                    leftIcon={Plus}
                  >
                    Add to My Vault
                  </Button>
                  <Button
                    onClick={() => setGeneratedPrompt('')}
                    variant="secondary"
                    className="px-10"
                  >
                    Discard
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
