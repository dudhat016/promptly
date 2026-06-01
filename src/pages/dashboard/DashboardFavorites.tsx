import { collection, getDocs, query, where } from 'firebase/firestore';
import { Heart, Search, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import PromptCard from '../../components/PromptCard';
import PromptCardSkeleton from '../../components/PromptCardSkeleton';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { Prompt } from '../../types';
import Input from '../../components/primitives/Input';
import Button from '../../components/primitives/Button';
import { X } from 'lucide-react';

export default function DashboardFavorites() {
  const { user, profile, isPro, isAdmin } = useAuth();
  const { prefix } = usePath();
  const [favorites, setFavorites] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [truncated, setTruncated] = useState(0);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const favRef = collection(db, 'users', user.uid, 'favorites');
        const favSnap = await getDocs(favRef);
        const favPromptIds = favSnap.docs.map(d => d.data().promptId);

        if (favPromptIds.length > 0) {
          const pRef = collection(db, 'prompts');
          const pQuery = query(pRef, where('__name__', 'in', favPromptIds.slice(0, 30)));
          const pSnap = await getDocs(pQuery);
          if (favPromptIds.length > 30) setTruncated(favPromptIds.length - 30);

          const sanitized = pSnap.docs.map(d => {
            const data = d.data();
            const id = d.id;
            const isUnlocked = (profile?.unlockedPrompts || []).includes(id);
            const hasAccess = isPro || isAdmin || isUnlocked || !data.isPaid;
            if (!hasAccess) delete data.content;
            return { id, ...data } as Prompt;
          });

          setFavorites(sanitized);
        }
      } catch (err) {
        console.error('Error fetching favorites:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const filtered = favorites.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs mb-2">
            <Heart className="w-4 h-4 fill-current" />
            Saved Selection
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Favorites</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quick access to the high-performance prompts you've saved.
            {favorites.length > 0 && <span className="ml-1 text-primary font-semibold">{favorites.length} saved</span>}
          </p>
        </div>

        {favorites.length > 0 && (
          <Input 
            placeholder="Search favorites..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            leftIcon={Search}
            variant="outline"
            className="md:w-80"
            rightAction={searchTerm && (
              <Button variant="ghost" size="icon" onClick={() => setSearchTerm('')} className="w-7 h-7">
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          />
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <PromptCardSkeleton key={i} />)}
        </div>
      ) : favorites.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-32 bg-muted/30 rounded-2xl border border-border border-dashed"
        >
          <div className="w-20 h-20 bg-background rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/5">
            <Heart className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">No favorites yet</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-8">
            Browse the marketplace and heart the prompts you love to see them here.
          </p>
          <Link to={prefix("/explore")} className="btn-primary btn-lg">
            <Sparkles className="w-5 h-5" />
            Explore Marketplace
          </Link>
        </motion.div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-semibold">No results for "<span className="text-foreground">{searchTerm}</span>"</p>
          <Button variant="link" onClick={() => setSearchTerm('')} className="mt-3">Clear search</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map(prompt => (
                <motion.div
                  key={prompt.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                >
                  <PromptCard prompt={prompt} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {truncated > 0 && (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              {truncated} more favorite{truncated !== 1 ? 's' : ''} not shown — remove some to view older saves.
            </p>
          )}
        </>
      )}
    </div>
  );
}
