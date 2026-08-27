import { addDoc, arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, increment, limit, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { ArrowLeft, BookMarked, BookOpen, Check, Copy, Eye, Flag, FolderPlus, Heart, Lock, MessageSquare, Plus, Share2, ShieldCheck, Sparkles, Star, Terminal, Trash2, User, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Rating from '../components/feedback/Rating';
import PageContainer from '../components/layout/PageContainer';
import Breadcrumbs from '../components/navigation/Breadcrumbs';
import NeuralAdBanner from '../components/NeuralAdBanner';
import Button from '../components/primitives/Button';
import Textarea from '../components/primitives/Textarea';
import PromptCard from '../components/PromptCard';
import ReportModal from '../components/ReportModal';
import Schema from '../components/SEO/Schema';
import ShareModal from '../components/ShareModal';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../hooks/useConfig';
import { usePath } from '../hooks/usePath';
import { usePermissions } from '../hooks/usePermissions';
import { useSEO } from '../hooks/useSEO';
import { INTERACTION_WEIGHTS, recordPromptInteraction } from '../lib/affinity';
import { db } from '../lib/firebase';
import { cn, formatDate } from '../lib/utils';
import { Prompt, PromptCollection, PromptReview, UserProfile } from '../types';
import { generateSmartDescription, generateSmartKeywords } from '../utils/seo';

// ── helpers ────────────────────────────────────────────────────────────────────



const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Beginner',     color: 'text-emerald-600 dark:text-emerald-400', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
  intermediate: { label: 'Intermediate', color: 'text-amber-600 dark:text-amber-400',    bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  advanced:     { label: 'Advanced',     color: 'text-rose-600 dark:text-rose-400',      bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)'  },
};

/** Highlight [VAR], {{var}}, <var> placeholders in a prompt formula. */
function HighlightedFormula({ content }: { content: string }) {
  const VAR_RE = /(\[[\w\s.,!?'-]+\]|\{\{[\w\s.,!?'-]+\}\}|<[\w\s.,!?'-]+>)/g;
  const parts = content.split(VAR_RE);
  return (
    <pre className="font-mono text-sm leading-loose whitespace-pre-wrap break-words text-foreground/70">
      {parts.map((part, i) => {
        if (VAR_RE.test(part)) {
          VAR_RE.lastIndex = 0;
          return (
            <span key={i} title="Fill in this variable"
              className="inline-block px-1.5 py-0.5 rounded text-xs font-bold cursor-help"
              style={{ background: 'rgba(139,92,246,0.15)', color: 'rgb(167,139,250)', border: '1px solid rgba(139,92,246,0.2)' }}>
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </pre>
  );
}

// ── main component ─────────────────────────────────────────────────────────────

export default function PromptDetailPage() {
  const { slug } = useParams();
  const { user, profile, isPro, isAdmin, loading: authLoading, toggleFavorite, isFavorited } = useAuth();
  const { permissions, loading: permsLoading } = usePermissions();
  const navigate = useNavigate();
  const { prefix } = usePath();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [creator, setCreator] = useState<UserProfile | null>(null);
  const { config } = useConfig();
  const models = config.models;
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [userCollections, setUserCollections] = useState<PromptCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [relatedPrompts, setRelatedPrompts] = useState<Prompt[]>([]);
  const [category, setCategory] = useState<any | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [reviews, setReviews] = useState<PromptReview[]>([]);
  const [userReview, setUserReview] = useState<PromptReview | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const unlockedKey = JSON.stringify(profile?.unlockedPrompts || []);
  const isLiked = prompt?.id ? isFavorited(prompt.id) : false;


  // Load recently viewed from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      setRecentlyViewed(stored);
    } catch (e) {}
  }, [slug]);

  const seoMeta = useMemo(() => {
    if (!prompt) return null;
    return {
      title: prompt.metaTitle || `${prompt.title} - Expert Prompt Marketplace`,
      description: generateSmartDescription(prompt, 'prompt'),
      keywords: generateSmartKeywords(prompt),
      author: creator?.displayName || 'Premium Creator',
      tags: prompt.tags,
      ogImage: prompt.imageUrl || 'https://promptly.com/og-image.png',
    };
  }, [prompt, creator]);

  useSEO(seoMeta || 'explore');


  useEffect(() => {
    async function fetchPrompt() {
      try {
        const promptsRef = collection(db, 'prompts');
        const q = query(promptsRef, where('slug', '==', slug), limit(1));
        let querySnapshot = await getDocs(q);
        let docSnap;

        if (!querySnapshot.empty) {
          docSnap = querySnapshot.docs[0];
        } else {
          const directDoc = await getDoc(doc(db, 'prompts', slug!));
          if (directDoc.exists()) docSnap = directDoc;
        }

        if (docSnap) {
          // Always use Firestore document ID — prevent custom 'id' field in data from overriding it
          const pData = { ...docSnap.data(), id: docSnap.id } as Prompt;

          // Always ensure formula/content is loaded without security gating
          if (!pData.content) {
            try {
              const privateDoc = await getDoc(doc(db, 'prompts', pData.id!, 'private', 'content'));
              if (privateDoc.exists()) {
                pData.content = privateDoc.data().formula || privateDoc.data().content || privateDoc.data().prompt;
              }
            } catch (secErr) {
              console.warn("Private content unavailable.", secErr);
            }
          }

          if (!pData.content) {
            pData.content = (pData as any).formula || (pData as any).prompt || pData.description || '';
          }

          setPrompt(pData);
          await updateDoc(docSnap.ref, { viewsCount: increment(1) }).catch(() => {});
          recordPromptInteraction(pData, INTERACTION_WEIGHTS.VIEW);

          try {
            const recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
            const filtered = recent.filter((p: any) => p.id !== pData.id);
            const updated = [{ id: pData.id, slug: pData.slug, title: pData.title, model: pData.model }, ...filtered].slice(0, 6);
            localStorage.setItem('recentlyViewed', JSON.stringify(updated));
          } catch (e) {}

          if (pData.creatorId) {
            const creatorDoc = await getDoc(doc(db, 'users', pData.creatorId));
            if (creatorDoc.exists()) setCreator({ uid: creatorDoc.id, ...creatorDoc.data() } as UserProfile);
          }

          const relatedQ = query(collection(db, 'prompts'), where('categoryId', '==', pData.categoryId || 'general'), limit(4));
          const relatedSnap = await getDocs(relatedQ);
          setRelatedPrompts(relatedSnap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt)).filter(p => p.id !== pData.id).slice(0, 3));

          if (pData.categoryId) {
            const catSnap = await getDoc(doc(db, 'categories', pData.categoryId));
            if (catSnap.exists()) setCategory({ id: catSnap.id, ...catSnap.data() });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPrompt();
  }, [slug, unlockedKey, isPro, isAdmin, authLoading, permsLoading]);

  useEffect(() => {
    if (!prompt?.id) return;
    setReviewsLoading(true);
    getDocs(query(
      collection(db, 'prompts', prompt.id, 'reviews'),
      orderBy('createdAt', 'desc'),
      limit(30)
    )).then(snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as PromptReview));
      const mine = user ? all.find(r => r.userId === user.uid) ?? null : null;
      setUserReview(mine);
      setReviews(
        all
          .filter(r => r.userId !== user?.uid)
          .filter(r => r.moderationStatus === 'approved')
      );
    }).catch(() => {}).finally(() => setReviewsLoading(false));
  }, [prompt?.id, user?.uid]);

  useEffect(() => {
    if (!prompt) return;
    const interval = setInterval(() => {
      if (!document.hidden) recordPromptInteraction(prompt, INTERACTION_WEIGHTS.VIEW, false);
    }, 60000);
    return () => clearInterval(interval);
  }, [prompt?.id]);

  const openCollectionPicker = async () => {
    if (!user) { navigate(prefix('/login')); return; }
    setIsCollectionModalOpen(true);
    if (userCollections.length === 0) {
      setCollectionsLoading(true);
      try {
        const q = query(collection(db, 'collections'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        setUserCollections(snap.docs.map(d => ({ ...d.data(), id: d.id } as PromptCollection)));
      } catch {}
      finally { setCollectionsLoading(false); }
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !prompt?.id || myRating === 0) return;
    setSubmittingReview(true);
    try {
      const existing = await getDocs(
        query(collection(db, 'prompts', prompt.id, 'reviews'), where('userId', '==', user.uid))
      );
      if (!existing.empty) { toast.error('You already reviewed this prompt.'); return; }

      await addDoc(collection(db, 'prompts', prompt.id, 'reviews'), {
        promptId: prompt.id,
        promptTitle: prompt.title,
        promptSlug: prompt.slug,
        userId: user.uid,
        displayName: profile?.displayName || 'Anonymous',
        photoURL: profile?.photoURL ?? null,
        rating: myRating,
        comment: myComment.trim(),
        moderationStatus: 'pending',
        createdAt: serverTimestamp(),
      });

      const newReview: PromptReview = {
        id: 'pending',
        promptId: prompt.id,
        userId: user.uid,
        displayName: profile?.displayName || 'Anonymous',
        photoURL: profile?.photoURL ?? null,
        rating: myRating,
        comment: myComment.trim(),
        createdAt: new Date(),
      };
      setUserReview(newReview);
      setMyRating(0);
      setMyComment('');
      toast.success('Review submitted!');
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!user || !prompt?.id || !userReview || userReview.id === 'pending') return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'prompts', prompt.id, 'reviews', userReview.id));
      const newCount = Math.max(0, (prompt.reviewCount || 1) - 1);
      const newAvg = newCount === 0 ? 0 : parseFloat((((prompt.avgRating || 0) * (prompt.reviewCount || 1) - userReview.rating) / newCount).toFixed(1));
      await updateDoc(doc(db, 'prompts', prompt.id), {
        reviewCount: increment(-1),
        ...(newCount > 0 ? { avgRating: newAvg } : {}),
      });
      setUserReview(null);
      setPrompt({ ...prompt, reviewCount: newCount, avgRating: newCount > 0 ? newAvg : undefined });
      toast.success('Review deleted.');
    } catch {
      toast.error('Failed to delete review');
    }
  };

  const togglePromptInCollection = async (col: PromptCollection) => {
    if (!prompt?.id) return;
    const inCollection = col.promptIds.includes(prompt.id);
    const ref = doc(db, 'collections', col.id!);
    await updateDoc(ref, {
      promptIds: inCollection ? arrayRemove(prompt.id) : arrayUnion(prompt.id),
      updatedAt: new Date().toISOString(),
    });
    setUserCollections(prev => prev.map(c =>
      c.id === col.id
        ? { ...c, promptIds: inCollection ? c.promptIds.filter(id => id !== prompt.id) : [...c.promptIds, prompt.id!] }
        : c
    ));
    toast.success(inCollection ? 'Removed from collection' : 'Saved to collection');
  };

  const handleLikeClick = async () => {
    if (!user || !prompt?.id) { navigate(prefix('/login')); return; }
    await toggleFavorite(prompt.id);
    if (prompt) {
      if (!isLiked) recordPromptInteraction(prompt, INTERACTION_WEIGHTS.LIKE);
      setPrompt({ ...prompt, likesCount: isLiked ? (prompt.likesCount || 1) - 1 : (prompt.likesCount || 0) + 1 });
    }
  };

  const handleCopy = async () => {
    if (!prompt) return;

    try {
      if (prompt.id) {
        updateDoc(doc(db, 'prompts', prompt.id), { copiesCount: increment(1) }).catch(() => {});
      }
      const textToCopy = prompt.content || (prompt as any).formula || (prompt as any).prompt || prompt.description || '';
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      recordPromptInteraction(prompt, INTERACTION_WEIGHTS.COPY);
      toast.success("Prompt copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { toast.error("Copy failed."); }
  };



  const isUnlocked = true;
  const isCategoryLocked = false;
  const diffConfig = prompt?.difficulty ? DIFFICULTY_CONFIG[prompt.difficulty] : null;

  // Pre-filled share tweet text
  const tweetText = prompt
    ? `Just found this "${prompt.title}" prompt on Promptly — insane for ${prompt.tags?.[0] || 'AI'} workflows. Check it out:`
    : '';

  if (loading && !prompt) return (
    <div className="min-h-screen bg-background">
      <PageContainer ignoreCustomizer className="py-32 max-w-5xl">
        <div className="animate-pulse space-y-8 max-w-4xl mx-auto">
          <div className="h-10 w-2/3 rounded-xl bg-muted" />
          <div className="h-96 w-full rounded-2xl bg-muted" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-5 rounded-lg bg-muted" style={{ width: `${95 - i * 8}%` }} />)}
          </div>
        </div>
      </PageContainer>
    </div>
  );

  if (!prompt && !loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground font-bold uppercase tracking-widest">Prompt not found</p>
    </div>
  );

  // Block public access to pending/rejected prompts — only creator and admin can view
  const isReviewPending = prompt?.status === 'pending' || prompt?.status === 'rejected';
  const isCreator = user?.uid === prompt?.creatorId;
  if (isReviewPending && !isCreator && !isAdmin && !authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-sm mx-auto px-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-amber-500" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">
          {prompt?.status === 'rejected' ? 'Prompt Unavailable' : 'Under Review'}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {prompt?.status === 'rejected'
            ? 'This prompt was not approved for the marketplace.'
            : 'This prompt is currently being reviewed by our team and is not yet publicly available.'}
        </p>
        <Button onClick={() => navigate(prefix('/explore'))} variant="primary" size="md">
          Browse Marketplace
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {prompt && (
        <Schema
          type="Prompt"
          data={prompt}
          breadcrumbs={[
            { name: 'Library', item: prefix('/') },
            { name: category?.name || 'Category', item: prefix(`/?category=${prompt.categoryId}`) },
            { name: prompt.title, item: prefix(`/prompt/${prompt.slug}`) }
          ]}
        />
      )}
      <PageContainer className="pt-20 pb-12 md:pb-16" ignoreCustomizer>
        <Breadcrumbs
          items={[
            { name: 'Library', item: prefix('/') },
            { name: category?.name || 'Category', item: prefix(`/?category=${prompt.categoryId}`) },
            { name: prompt.title, item: prefix(`/prompt/${prompt.slug}`) }
          ]}
        />

        <Button
          onClick={() => navigate(prefix('/'))}
          variant="ghost"
          size="sm"
          leftIcon={ArrowLeft}
          className="mb-8 font-bold"
        >
          Back to Library
        </Button>

        <div className="grid lg:grid-cols-3 gap-8 md:gap-12">

          {/* ── Main column ── */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

              {/* ── Meta row ── */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Model badge */}
                  <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest"
                    style={{ background: 'rgba(139,92,246,0.12)', color: 'rgb(167,139,250)', border: '1px solid rgba(139,92,246,0.2)' }}>
                    {models.find(m => m.id === prompt!.model)?.name || prompt!.model}
                  </span>

                  {/* Difficulty badge */}
                  {diffConfig && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-widest ${diffConfig.color}`}
                      style={{ background: diffConfig.bg, border: `1px solid ${diffConfig.border}` }}>
                      {diffConfig.label}
                    </span>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground/60">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {prompt!.viewsCount || 0}
                    </span>
                    {(prompt!.copiesCount || 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3.5 h-3.5" /> {prompt!.copiesCount} copied
                      </span>
                    )}
                    <span>{formatDate(prompt!.updatedAt || prompt!.createdAt)}</span>
                  </div>
                </div>

                {/* Like button */}
                <Button
                  onClick={handleLikeClick}
                  variant={isLiked ? 'secondary' : 'ghost'}
                  size="sm"
                  leftIcon={Heart}
                  className={isLiked ? 'text-rose-500 bg-rose-500/10 border-rose-500/25' : 'text-muted-foreground border-border'}
                >
                  {prompt!.likesCount || 0} saves
                </Button>
              </div>

              {/* ── Title ── */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-5 md:mb-6 leading-[1.1] tracking-tight">
                {prompt!.title}
              </h1>

              {/* ── Description — blurred when locked ── */}
              <p className={cn(
                "text-lg mb-8 leading-relaxed transition-all text-muted-foreground",
                !isUnlocked && "blur-[5px] select-none opacity-30"
              )}>
                {isUnlocked
                  ? prompt!.description
                  : "Unlock this premium prompt to see the full description, parameters, and optimization guide."}
              </p>

              {/* ── Cover image ── */}
              {prompt!.imageUrl && (() => {
                const ratio = config.storage?.promptImageRatio ?? '16:9';
                const [rw, rh] = ratio.split(':').map(Number);
                const paddingTop = `${((rh / rw) * 100).toFixed(4)}%`;
                return (
                  <div className="mb-10 rounded-2xl overflow-hidden border border-border relative bg-muted/60" style={{ paddingTop }}>
                    <img src={prompt!.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt={prompt!.title} />
                  </div>
                );
              })()}

              {/* ── Tags ── */}
              <div className="flex flex-wrap gap-2 mb-10">
                {prompt!.tags.map(tag => (
                  <Link key={tag} to={prefix(`/explore?q=${tag}`)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all bg-muted text-muted-foreground border border-border hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>

              {/* ── Partial teaser (locked only) ── */}
              {!isUnlocked && prompt!.description && (
                <div className="mb-6 rounded-xl p-5 bg-card border border-border relative overflow-hidden">
                  <div className="absolute top-2 right-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Preview</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 pr-12">
                    {prompt!.description}
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent" />
                </div>
              )}

              {/* ── Formula block ── */}
              <div className="relative group mb-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">The Formula</h3>
                    {prompt!.content && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                        {(prompt!.content.match(/(\[[\w\s.,!?'-]+\]|\{\{[\w\s.,!?'-]+\}\})/g) || []).length} variables
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={handleCopy}
                    variant={copied ? 'success' : 'secondary'}
                    size="sm"
                    leftIcon={copied ? Check : Copy}
                  >
                    {copied ? 'Copied!' : 'Copy Formula'}
                  </Button>
                </div>

                {/* Formula content */}
                <div className="rounded-2xl p-8 md:p-10 min-h-[300px] bg-muted border border-border">
                  <HighlightedFormula content={prompt!.content || (prompt as any)!.formula || (prompt as any)!.prompt || prompt!.description || ''} />
                </div>
              </div>



              {/* ── Usage Guide ── */}
              {isUnlocked && prompt!.usageGuide && (
                <div className="rounded-2xl border border-border overflow-hidden mb-10">
                  <div className="flex items-center gap-2 px-6 py-4 bg-muted border-b border-border">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">How to Use This Prompt</h3>
                  </div>
                  <div className="p-6 bg-card prose prose-neutral dark:prose-invert prose-sm max-w-none
                    prose-p:text-muted-foreground prose-li:text-muted-foreground
                    prose-headings:text-foreground prose-strong:text-foreground">
                    {prompt!.usageGuide.split('\n').map((line, i) => (
                      <p key={i} className="text-sm leading-relaxed text-muted-foreground mb-2 last:mb-0">{line}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Action bar ── */}
              <div className="flex flex-col sm:flex-row items-center gap-3 py-8 border-t border-border">
                <Button
                  onClick={() => setIsShareModalOpen(true)}
                  variant="secondary"
                  size="lg"
                  leftIcon={Share2}
                  className="w-full sm:w-auto"
                >
                  Share & Earn
                </Button>
                <Button
                  onClick={openCollectionPicker}
                  variant="secondary"
                  size="lg"
                  leftIcon={BookMarked}
                  className="w-full sm:w-auto"
                >
                  Save to Collection
                </Button>
                <Button
                  onClick={() => setIsReportModalOpen(true)}
                  variant="ghost"
                  size="lg"
                  leftIcon={Flag}
                  className="w-full sm:w-auto text-muted-foreground hover:text-rose-500"
                >
                  Report
                </Button>
              </div>

              <NeuralAdBanner className="mt-4" />
            </motion.div>
          </div>

          {/* ── Sidebar ── */}
          <div className="flex flex-col gap-6">

            {/* Creator card */}
            <div className="rounded-2xl p-6 bg-card border border-border">
              <h4 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-muted-foreground">
                <User className="w-3.5 h-3.5 text-primary" /> Creator
              </h4>
              {(() => {
                const isOfficial = prompt!.creatorRole === 'admin' || prompt!.creatorRole === 'staff' || prompt!.creatorId === 'system';
                const displayName = prompt!.creatorName || creator?.displayName || 'Creator';
                const avatarLetter = displayName.charAt(0).toUpperCase();
                const CardWrapper = ({ children }: { children: React.ReactNode }) => (
                      <div className="flex items-center gap-3 mb-5">{children}</div>
                    );
                return (
                  <CardWrapper>
                    {isOfficial ? (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center gradient-cta shadow-md shadow-primary/20">
                        <ShieldCheck className="w-6 h-6 text-white" />
                      </div>
                    ) : creator?.photoURL ? (
                      <img src={creator.photoURL} className="w-12 h-12 rounded-xl object-cover border border-border" alt="" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-primary bg-primary/15">
                        {avatarLetter}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-foreground group-hover/creator:text-primary transition-colors">{displayName}</div>
                      <div className="text-xs font-semibold flex items-center gap-1 text-primary">
                        {isOfficial ? (
                          <><ShieldCheck className="w-3 h-3" /> Official Content</>
                        ) : (
                          'Creator'
                        )}
                      </div>
                    </div>
                  </CardWrapper>
                );
              })()}
              <div className="space-y-0.5">
                {[
                  { label: 'Model',    value: models.find(m => m.id === prompt!.model)?.name || prompt!.model },
                  { label: 'Category', value: prompt!.categoryId },
                  { label: 'Copied',   value: `${prompt!.copiesCount || 0} times` },
                  { label: 'Standard', value: 'Production Ready', valueClass: 'text-emerald-600 dark:text-emerald-400' },
                ].map(({ label, value, valueClass }) => (
                  <div key={label} className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
                    <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                    <span className={`text-xs font-bold text-foreground ${valueClass || ''}`}>{value}</span>
                  </div>
                ))}
              </div>

            </div>

            <NeuralAdBanner slot="sidebar-ad" format="rectangle" />




          </div>
        </div>

        {/* ── Related prompts ── */}
        {relatedPrompts.length > 0 && (
          <div className="mt-20 pt-12 border-t border-border">
            <h2 className="text-2xl font-bold text-foreground mb-8 tracking-tight">
              Similar{' '}
              <span className="gradient-text">
                Formulas
              </span>
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedPrompts.map(p => (
                <PromptCard key={p.id} prompt={p} />
              ))}
            </div>
          </div>
        )}

        {/* ── Community Reviews ── */}
        <div className="mt-12 pt-12 border-t border-border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs mb-2">
                <MessageSquare className="w-4 h-4" />
                Community
              </div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
                Reviews
                {(prompt!.reviewCount || 0) > 0 && (
                  <span className="text-base font-semibold text-muted-foreground">({prompt!.reviewCount})</span>
                )}
              </h2>
              {(prompt!.avgRating || 0) > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <Rating value={prompt!.avgRating!} readOnly size="sm" precision={0.5} />
                  <span className="text-sm font-semibold text-muted-foreground">{prompt!.avgRating!.toFixed(1)} / 5</span>
                </div>
              )}
            </div>
          </div>

          {/* Write a review — only for users who have unlocked the prompt */}
          {user && isUnlocked && !userReview && (
            <div className="bg-card border border-border rounded-2xl p-6 mb-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Write a Review</h3>
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Your Rating</p>
                <Rating value={myRating} onChange={setMyRating} size="lg" />
              </div>
              <Textarea
                label=""
                id="review-comment"
                name="review-comment"
                value={myComment}
                onChange={e => setMyComment(e.target.value)}
                placeholder="Share your experience — how did this prompt work for you?"
                rows={3}
              />
              <Button
                onClick={handleSubmitReview}
                isLoading={submittingReview}
                disabled={myRating === 0}
                variant="primary"
                size="sm"
                className="mt-4"
              >
                Submit Review
              </Button>
            </div>
          )}

          {/* Reviewer's own review */}
          {userReview && (
            <div className="bg-primary/[0.04] border border-primary/20 rounded-2xl p-5 mb-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {userReview.photoURL ? (
                    <img src={userReview.photoURL} className="w-9 h-9 rounded-xl object-cover border border-border" alt="" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center font-bold text-primary text-sm">
                      {(userReview.displayName || 'Y').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-foreground">Your Review</p>
                      {(userReview.moderationStatus === 'pending' || !userReview.moderationStatus) && userReview.id !== 'pending' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/20">
                          Under Review
                        </span>
                      )}
                      {userReview.moderationStatus === 'rejected' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-600 border border-rose-500/20">
                          Not Approved
                        </span>
                      )}
                    </div>
                    <Rating value={userReview.rating} readOnly size="sm" />
                  </div>
                </div>
                <button
                  onClick={handleDeleteReview}
                  className="p-1.5 rounded-md text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                  title="Delete review"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {userReview.comment && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed pl-12">{userReview.comment}</p>
              )}
            </div>
          )}

          {/* Review list */}
          {reviewsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex gap-4 p-5 rounded-2xl bg-muted/40">
                  <div className="w-9 h-9 rounded-xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/4 rounded bg-muted" />
                    <div className="h-3 w-3/4 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.length === 0 && !userReview ? (
            <div className="py-16 flex flex-col items-center text-center rounded-2xl border border-dashed border-border">
              <Star className="w-8 h-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">No reviews yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {isUnlocked ? 'Be the first to leave a review.' : 'Unlock this prompt to leave a review.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <div key={r.id} className="flex gap-4 p-5 rounded-2xl bg-card border border-border">
                  {r.photoURL ? (
                    <img src={r.photoURL} className="w-9 h-9 rounded-xl object-cover border border-border shrink-0 mt-0.5" alt="" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center font-bold text-foreground text-sm shrink-0 mt-0.5">
                      {(r.displayName || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-bold text-foreground truncate">{r.displayName}</p>
                      <span className="text-[10px] font-medium text-muted-foreground/50 shrink-0">
                        {(() => {
                          const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                        })()}
                      </span>
                    </div>
                    <Rating value={r.rating} readOnly size="sm" />
                    {r.comment && (
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Recently viewed ── */}
        {recentlyViewed.filter(p => p.id !== prompt?.id).length > 0 && (
          <div className="mt-12 pt-12 border-t border-border">
            <h2 className="text-lg font-bold text-foreground mb-5 tracking-tight">Continue Exploring</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {recentlyViewed.filter(p => p.id !== prompt?.id).map((p) => (
                <Link key={p.id} to={prefix(`/prompt/${p.slug}`)}
                  className="flex-none rounded-xl px-4 py-3 bg-card border border-border hover:border-primary/20 hover:bg-muted/30 transition-all group min-w-[200px] max-w-[240px]"
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">{p.model}</div>
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {p.title}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </PageContainer>

      {/* ── Modals ── */}
      {prompt && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title={prompt.title}
          url={window.location.href}
        />
      )}

      {prompt && (
        <ReportModal
          prompt={prompt}
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {/* Collection Picker Modal */}
      {isCollectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setIsCollectionModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-primary" /> Save to Collection
              </h3>
              <button onClick={() => setIsCollectionModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                ✕
              </button>
            </div>
            {collectionsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : userCollections.length === 0 ? (
              <div className="text-center py-8">
                <FolderPlus className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">No collections yet. Create one first.</p>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Plus}
                  onClick={() => { setIsCollectionModalOpen(false); navigate(prefix('/dashboard/collections')); }}
                >
                  Create Collection
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {userCollections.map(col => {
                  const saved = prompt?.id ? col.promptIds.includes(prompt.id) : false;
                  return (
                    <button
                      key={col.id}
                      onClick={() => togglePromptInCollection(col)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-3 rounded-xl border text-left transition-all',
                        saved
                          ? 'border-primary/30 bg-primary/5 text-primary'
                          : 'border-border bg-muted/30 hover:border-primary/20 hover:bg-muted/60 text-foreground'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{col.name}</p>
                        <p className="text-xs text-muted-foreground">{col.promptIds.length} prompts</p>
                      </div>
                      {saved && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
