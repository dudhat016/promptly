import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Prompt } from '../../types';
import PromptCard from '../../components/PromptCard';
import { BookOpen, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell';

export default function DashboardLibrary() {
  const { profile, user } = useAuth();
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

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <PageShell
      title="My Creations"
      description="Manage and optimize the custom-built AI formulas you've contributed to the marketplace."
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {prompts.length > 0 ? (
          prompts.map(p => <PromptCard key={p.id} prompt={p} />)
        ) : (
          <div className="col-span-full py-32 bg-muted/30 rounded-[3rem] border border-border border-dashed text-center">
            <div className="w-20 h-20 bg-background rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/5">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-2">Your library is empty</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-10">
              You haven't built any public prompts yet. Use our AI engineering lab to start creating.
            </p>
            <Link 
              to="/builder" 
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-5 rounded-2xl font-black text-lg hover:opacity-90 transition-all shadow-xl shadow-primary/20"
            >
              <Sparkles className="w-5 h-5" />
              Open AI Builder
            </Link>
          </div>
        )}
      </motion.div>
    </PageShell>
  );
}
