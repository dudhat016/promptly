import { collection, doc, getDocs, deleteDoc } from 'firebase/firestore';
import { Bookmark, ArrowRight, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Button from '../../components/primitives/Button';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { SavedPromptEntry } from '../../hooks/useSavedPrompts';

export default function SavedPromptsPage() {
  const { user } = useAuth();
  const { prefix } = usePath();
  const [queue, setQueue]   = useState<SavedPromptEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'users', user!.uid, 'saved_prompts'));
        setQueue(snap.docs.map(d => d.data() as SavedPromptEntry));
      } catch { setQueue([]); }
      finally { setLoading(false); }
    }
    load();
  }, [user?.uid]);

  async function remove(promptId: string) {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'saved_prompts', promptId)).catch(() => {});
    setQueue(prev => prev.filter(s => s.promptId !== promptId));
    toast.success('Removed from queue');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Unlock Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Prompts you've saved to unlock later — {queue.length} in queue
          </p>
        </div>
        <Link to={prefix('/explore')} className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
          Browse more <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted/30 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl">
          <Bookmark className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
          <p className="font-bold text-foreground">Your queue is empty</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Save prompts to unlock later using the bookmark button on any prompt card.
          </p>
          <Link
            to={prefix('/explore')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Explore Prompts <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {queue.map(entry => (
              <motion.div
                key={entry.promptId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-card border border-border rounded-2xl p-4 flex items-start gap-3 hover:border-primary/30 transition-colors"
              >
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Bookmark className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{entry.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Link
                      to={prefix(`/prompt/${entry.slug}`)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      View prompt →
                    </Link>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(entry.promptId)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 w-8 h-8 shrink-0"
                  title="Remove from queue"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
