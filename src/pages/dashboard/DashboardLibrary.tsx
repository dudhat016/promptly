import { collection, getDocs, query, where } from 'firebase/firestore';
import { BookOpen, Plus, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PromptCard from '../../components/PromptCard';
import PromptCardSkeleton from '../../components/PromptCardSkeleton';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { Prompt } from '../../types';

export default function DashboardLibrary() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const q = query(collection(db, 'prompts'), where('creatorId', '==', user.uid));
        const qSnap = await getDocs(q);
        setPrompts(qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Prompt)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs mb-2">
            <BookOpen className="w-4 h-4" />
            My Contributions
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">My Creations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the custom-built AI formulas you've contributed to the marketplace.
            {prompts.length > 0 && <span className="ml-1 text-primary font-semibold">{prompts.length} published</span>}
          </p>
        </div>
        <Link to="/builder"
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
          style={{ background: 'linear-gradient(135deg, hsl(258,90%,56%), hsl(280,90%,60%))' }}>
          <Plus className="w-4 h-4" /> New Prompt
        </Link>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <PromptCardSkeleton key={i} />)}
        </div>
      ) : prompts.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {prompts.map(p => <PromptCard key={p.id} prompt={p} />)}
        </motion.div>
      ) : (
        <div className="py-24 bg-muted/30 rounded-2xl border border-border border-dashed text-center">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Your library is empty</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            You haven't built any public prompts yet. Use the AI Builder to start creating.
          </p>
          <Link to="/builder" className="btn-primary">
            <Sparkles className="w-4 h-4" />
            Open AI Builder
          </Link>
        </div>
      )}
    </div>
  );
}
