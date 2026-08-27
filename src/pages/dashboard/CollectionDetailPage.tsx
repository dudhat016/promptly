import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowLeft, BookMarked, FolderOpen, Globe, Lock, Search, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PromptCard from '../../components/PromptCard';
import PromptCardSkeleton from '../../components/PromptCardSkeleton';
import Button from '../../components/primitives/Button';
import Input from '../../components/primitives/Input';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';
import { Prompt, PromptCollection } from '../../types';

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { prefix } = usePath();
  const navigate = useNavigate();

  const [col, setCol] = useState<PromptCollection | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      try {
        let colData: PromptCollection | null = null;

        // 1. Direct doc ID match
        const docRef = doc(db, 'collections', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          colData = { id: docSnap.id, ...docSnap.data() } as PromptCollection;
        } else {
          // 2. Match by slugified name or slug field
          const allColsSnap = await getDocs(collection(db, 'collections'));
          const targetSlug = slugify(id);
          const matchDoc = allColsSnap.docs.find(d => {
            const data = d.data();
            const colNameSlug = slugify(data.name || '');
            return colNameSlug === targetSlug || data.slug === id || d.id === id;
          });
          if (matchDoc) {
            colData = { id: matchDoc.id, ...matchDoc.data() } as PromptCollection;
          }
        }

        if (colData) {
          setCol(colData);

          const promptIds = colData.promptIds || [];
          if (promptIds.length > 0) {
            // Batch fetch prompt documents (up to 30)
            const pRef = collection(db, 'prompts');
            const pQuery = query(pRef, where('__name__', 'in', promptIds.slice(0, 30)));
            const pSnap = await getDocs(pQuery);
            const fetched = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Prompt));
            setPrompts(fetched);
          }
        }
      } catch (err) {
        console.error('Error fetching collection detail:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const filteredPrompts = prompts.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-40 bg-muted rounded-lg animate-pulse" />
        <div className="h-24 bg-muted rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <PromptCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!col) {
    return (
      <div className="text-center py-32 bg-muted/30 rounded-2xl border border-border border-dashed">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 text-muted-foreground/40">
          <FolderOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Collection Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
          This collection may have been removed or is unavailable.
        </p>
        <Button variant="primary" onClick={() => navigate(prefix('/dashboard/collections'))}>
          Back to Collections
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={prefix('/dashboard/collections')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Collections
        </Link>
        <span className="text-muted-foreground/30">•</span>
        <span className="text-xs font-semibold text-foreground truncate">{col.name}</span>
      </div>

      {/* Collection Header Card */}
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <BookMarked className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Collection</span>
              {col.isPublic ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <Globe className="w-3 h-3" /> Public
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  <Lock className="w-3 h-3" /> Private
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{col.name}</h1>
            {col.description && (
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">{col.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold text-muted-foreground px-3 py-1.5 rounded-xl bg-muted border border-border">
              {prompts.length} {prompts.length === 1 ? 'prompt' : 'prompts'}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Prompt List */}
      {prompts.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-foreground">Prompts in this collection</h2>
          <Input
            placeholder="Search prompts in collection..."
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
        </div>
      )}

      {prompts.length === 0 ? (
        <div className="text-center py-24 bg-muted/30 rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 text-muted-foreground/30">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">No prompts in this collection yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            Explore the marketplace and save prompts to this collection.
          </p>
          <Button variant="primary" leftIcon={Sparkles} onClick={() => navigate(prefix('/explore'))}>
            Explore Prompts
          </Button>
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-semibold">No prompts found for "<span className="text-foreground">{searchTerm}</span>"</p>
          <Button variant="link" onClick={() => setSearchTerm('')} className="mt-2">Clear search</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPrompts.map(prompt => (
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
      )}
    </div>
  );
}
