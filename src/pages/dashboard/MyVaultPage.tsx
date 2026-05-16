import { collection, getDocs, query, where } from 'firebase/firestore';
import { Database, FolderLock, Lock, Search, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import PromptCard from '../../components/PromptCard';
import PromptCardSkeleton from '../../components/PromptCardSkeleton';
import UpgradeModal from '../../components/UpgradeModal';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/useConfig';
import { db } from '../../lib/firebase';
import { Prompt } from '../../types';
import { X } from 'lucide-react';

export default function MyVaultPage() {
  const { user, profile, isPro, isAdmin } = useAuth();
  const { config } = useConfig();
  const { prefix } = usePath();
  const [unlockedPrompts, setUnlockedPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vaultUpgradeOpen, setVaultUpgradeOpen] = useState(false);

  const vaultLimit   = config?.vaultLimit || 10;
  const vaultUsed    = unlockedPrompts.length;
  const vaultFillPct = Math.round((vaultUsed / vaultLimit) * 100);
  const vaultFull    = !isPro && !isAdmin && vaultUsed >= vaultLimit;
  const vaultNearFull = !isPro && !isAdmin && vaultFillPct >= 70 && !vaultFull;

  useEffect(() => {
    async function fetchVault() {
      if (!profile) return;
      setLoading(true);
      try {
        // 1. Fetch Unlocked Prompts
        let prompts: Prompt[] = [];
        if (profile.unlockedPrompts?.length) {
          const promptsRef = collection(db, 'prompts');
          // Firestore 'in' queries are limited to 30 items — chunk for scale
          const chunks: string[][] = [];
          for (let i = 0; i < profile.unlockedPrompts.length; i += 30) {
            chunks.push(profile.unlockedPrompts.slice(i, i + 30));
          }
          const results = await Promise.all(
            chunks.map(chunk => getDocs(query(promptsRef, where('__name__', 'in', chunk))))
          );
          prompts = results.flatMap(snap =>
            snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Prompt))
          );
        }

        // 2. Fetch AI Creations
        const creationsRef = collection(db, 'creations');
        const cq = query(creationsRef, where('userId', '==', user?.uid));
        const cSnapshot = await getDocs(cq);
        const creations = cSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          title: `Creation ${doc.id.slice(-4)}`, // Fallback title
          description: (doc.data() as any).prompt || 'AI Generated Asset',
          isCreation: true 
        }));

        setUnlockedPrompts([...prompts, ...creations as any]);
      } catch (err) {
        console.error("Error fetching vault:", err);
      } finally {
        setLoading(false);
      }
    }

    if (profile) fetchVault();
  }, [profile, user]);

  const filteredPrompts = unlockedPrompts.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs">
            <ShieldCheck className="w-4 h-4" />
            Secure Assets
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Private Vault</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Access your unlocked premium formulas and expert AI blueprints.
          </p>
        </div>

        <Input
          placeholder="Search your vault..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={Search}
          variant="filled"
          className="md:w-80"
          rightAction={searchTerm && (
            <button onClick={() => setSearchTerm('')} className="p-1 hover:bg-muted rounded-md transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        />
      </div>

      {/* Near-limit amber warning */}
      {!loading && vaultNearFull && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/8 border border-amber-500/20 rounded-xl mb-2">
          <Database className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex-1">
            <span className="font-bold">{vaultUsed}/{vaultLimit}</span> vault slots used — almost full.
          </span>
          <button
            onClick={() => setVaultUpgradeOpen(true)}
            className="text-xs font-bold text-amber-600 dark:text-amber-300 hover:underline shrink-0"
          >
            Get unlimited →
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => <PromptCardSkeleton key={i} />)}
        </div>
      ) : unlockedPrompts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-32 bg-muted/30 rounded-2xl border border-border border-dashed"
        >
          <div className="w-20 h-20 bg-background rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/5">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Your vault is empty</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-8">
            You haven't unlocked any premium prompts yet. Start exploring our marketplace to build your library.
          </p>
          <Link
            to={prefix("/explore")}
            className="btn-primary btn-lg"
          >
            <Sparkles className="w-5 h-5" />
            Explore Marketplace
          </Link>
        </motion.div>
      ) : filteredPrompts.length === 0 && searchTerm ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-semibold">No results for "<span className="text-foreground">{searchTerm}</span>"</p>
          <button onClick={() => setSearchTerm('')} className="mt-3 text-sm text-primary hover:underline">
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredPrompts.map((prompt) => (
              <motion.div
                key={prompt.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <PromptCard prompt={prompt} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Vault-full upgrade wall */}
          {!loading && vaultFull && (
            <div className="col-span-full rounded-xl border-2 border-dashed border-primary/20 bg-primary/[0.02] p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <FolderLock className="w-6 h-6 text-primary" />
              </div>
              <div className="inline-flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-2">
                {vaultUsed}/{vaultLimit} slots used
              </div>
              <p className="text-sm font-bold text-foreground mb-1">Your vault is full</p>
              <p className="text-[11px] text-muted-foreground mb-4 max-w-xs mx-auto leading-relaxed">
                Upgrade to Pro for unlimited vault storage. Keep every premium prompt you unlock, forever.
              </p>
              <Button onClick={() => setVaultUpgradeOpen(true)} variant="primary" size="sm" leftIcon={Zap}>
                Upgrade for Unlimited Vault
              </Button>
            </div>
          )}
        </div>
      )}

      <UpgradeModal isOpen={vaultUpgradeOpen} onClose={() => setVaultUpgradeOpen(false)} />

      {/* Security Banner */}
      <div className="mt-24 p-8 bg-card border border-border rounded-2xl flex flex-col md:flex-row items-center gap-8 shadow-sm">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
          <FolderLock className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-grow text-center md:text-left">
          <h3 className="text-xl font-bold text-foreground mb-1">Encrypted Content Protection</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            All your unlocked prompt formulas are fetched directly from our secure database server.
            Even with your browser open, your secret content is only loaded when you explicitly view it.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2 bg-muted px-4 py-2 rounded-md border border-border">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Secure Connection</span>
        </div>
      </div>
    </div>
  );
}
