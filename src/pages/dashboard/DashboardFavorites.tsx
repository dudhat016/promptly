import { collection, getDocs, query, where } from 'firebase/firestore';
import { Heart, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PromptCard from '../../components/PromptCard';
import PromptCardSkeleton from '../../components/PromptCardSkeleton';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { Prompt } from '../../types';

export default function DashboardFavorites() {
  const { user, profile, isPro, isAdmin } = useAuth();
  const [favorites, setFavorites] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const favRef = collection(db, 'users', user.uid, 'favorites');
        const favSnap = await getDocs(favRef);
        const favPromptIds = favSnap.docs.map(d => d.data().promptId);

        if (favPromptIds.length > 0) {
          const pRef = collection(db, 'prompts');
          // Firestore 'in' query limit is 30, taking first 30 for MVP
          const pQuery = query(pRef, where('__name__', 'in', favPromptIds.slice(0, 30)));
          const pSnap = await getDocs(pQuery);
          
          const sanitized = pSnap.docs.map(d => {
            const data = d.data();
            const id = d.id;
            const isUnlocked = (profile?.unlockedPrompts || []).includes(id);
            const hasAccess = isPro || isAdmin || isUnlocked || !data.isPaid;
            
            if (!hasAccess) {
              delete data.content; // SECURITY: Content never leaves the database if locked
            }
            
            return { id, ...data } as Prompt;
          });

          setFavorites(sanitized);
        }
      } catch (err) {
        console.error("Error fetching favorites:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  return (
    <div>
      <div className="mb-12">
        <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs mb-2">
          <Heart className="w-4 h-4 fill-current" />
          Saved Selection
        </div>
        <h1 className="text-4xl font-black tracking-tight text-foreground">My Favorites</h1>
        <p className="text-muted-foreground text-lg">Quick access to the high-performance prompts you've saved.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => <PromptCardSkeleton key={i} />)}
        </div>
      ) : favorites.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-32 bg-muted/30 rounded-[3rem] border border-border border-dashed"
        >
          <div className="w-20 h-20 bg-background rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/5">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">No favorites yet</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-8">
            Browse the marketplace and heart the prompts you love to see them here.
          </p>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-black hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-5 h-5" />
            Explore Marketplace
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {favorites.map((prompt) => (
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
        </div>
      )}
    </div>
  );
}
