import { addDoc, arrayUnion, collection, doc, getDoc, getDocs, increment, limit, query, updateDoc, where } from 'firebase/firestore';
import { ArrowLeft, BookOpen, Check, ChevronRight, Copy, Eye, Flag, Heart, Lock, Share2, ShieldCheck, Sparkles, Star, Terminal, User, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import NeuralAdBanner from '../components/NeuralAdBanner';
import ReportModal from '../components/ReportModal';
import Schema from '../components/SEO/Schema';
import ShareModal from '../components/ShareModal';
import UpgradeModal from '../components/UpgradeModal';
import Breadcrumbs from '../components/navigation/Breadcrumbs';
import Button from '../components/primitives/Button';
import PageContainer from '../components/layout/PageContainer';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../hooks/useConfig';
import { usePath } from '../hooks/usePath';
import { usePermissions } from '../hooks/usePermissions';
import { useSEO } from '../hooks/useSEO';
import { INTERACTION_WEIGHTS, recordPromptInteraction } from '../lib/affinity';
import { db } from '../lib/firebase';
import { cn, formatDate } from '../lib/utils';
import { Prompt, UserProfile } from '../types';
import { generateSmartDescription, generateSmartKeywords } from '../utils/seo';

// ── helpers ────────────────────────────────────────────────────────────────────

const UNLOCK_PERKS = [
  'Full prompt text with all variables',
  'Optimized system prompt + parameters',
  'Step-by-step usage guide',
  'Copy-to-clipboard in one click',
];

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
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [relatedPrompts, setRelatedPrompts] = useState<Prompt[]>([]);
  const [category, setCategory] = useState<any | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  const unlockedKey = JSON.stringify(profile?.unlockedPrompts || []);
  const isLiked = prompt?.id ? isFavorited(prompt.id) : false;
  const hasNoCredits = user && profile && (profile.credits || 0) <= 0 && !isPro && !isAdmin;

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
          const alreadyUnlocked = (profile?.unlockedPrompts || []).includes(pData.id!);
          const hasAccess = isPro || isAdmin || alreadyUnlocked || !pData.isPaid;

          if (!hasAccess) delete pData.content;

          if (hasAccess) {
            try {
              const privateDoc = await getDoc(doc(db, 'prompts', pData.id!, 'private', 'content'));
              if (privateDoc.exists()) pData.content = privateDoc.data().formula;
            } catch (secErr) {
              console.warn("Secure content unavailable.", secErr);
            }
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
    if (!prompt) return;
    const interval = setInterval(() => {
      if (!document.hidden) recordPromptInteraction(prompt, INTERACTION_WEIGHTS.VIEW, false);
    }, 60000);
    return () => clearInterval(interval);
  }, [prompt?.id]);

  const handleLikeClick = async () => {
    if (!user || !prompt?.id) { navigate(prefix('/login')); return; }
    await toggleFavorite(prompt.id);
    if (prompt) {
      if (!isLiked) recordPromptInteraction(prompt, INTERACTION_WEIGHTS.LIKE);
      setPrompt({ ...prompt, likesCount: isLiked ? (prompt.likesCount || 1) - 1 : (prompt.likesCount || 0) + 1 });
    }
  };

  const handleCopy = async () => {
    if (!prompt || !user || !profile) { toast.error("Please login."); navigate(prefix('/login')); return; }

    // 1. Check permissions — admin and pro always bypass
    if (!permissions.canCopyPrompts && !isAdmin && !isPro) { setIsUpgradeModalOpen(true); return; }

    const alreadyUnlocked = (profile?.unlockedPrompts || []).includes(prompt.id!);
    const userIsPro = isPro || isAdmin;

    // 2. If it's a paid prompt, not unlocked, and not a pro/admin user, charge a credit
    if (prompt.isPaid && !alreadyUnlocked && !userIsPro) {
      if ((profile.credits || 0) <= 0) {
        setIsUpgradeModalOpen(true);
        return;
      }
      // If they have credits, auto-unlock it
      try {
        await handleUnlock();
      } catch (e) {
        return; // handleUnlock shows toast
      }
    }

    // 3. For pro/admin: silently add to vault on first copy of a paid prompt
    if (prompt.isPaid && !alreadyUnlocked && userIsPro) {
      updateDoc(doc(db, 'users', user.uid), { unlockedPrompts: arrayUnion(prompt.id!) }).catch(() => {});
    }

    // 4. Perform Copy
    try {
      await updateDoc(doc(db, 'prompts', prompt.id!), { copiesCount: increment(1) });
      navigator.clipboard.writeText(prompt.content || '');
      setCopied(true);
      recordPromptInteraction(prompt, INTERACTION_WEIGHTS.COPY);
      toast.success("Prompt copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { toast.error("Copy failed."); }
  };

  const handleUnlock = async () => {
    if (!prompt || !user || !profile) { navigate(prefix('/login')); return; }
    if (hasNoCredits) { setIsUpgradeModalOpen(true); return; }
    const unlockedCount = (profile.unlockedPrompts || []).length;
    const vaultLimit = config?.vaultLimit || 10;

    if (!isPro && !isAdmin && unlockedCount >= vaultLimit) {
      toast.error(`Vault full! Upgrade for more than ${vaultLimit} prompts.`);
      setIsUpgradeModalOpen(true);
      return;
    }

    try {
      if (!isPro && !isAdmin) {
        await updateDoc(doc(db, 'users', user.uid), {
          credits: increment(-1), totalUsedCredits: increment(1), unlockedPrompts: arrayUnion(prompt.id!)
        });
        await addDoc(collection(db, 'credits_history'), {
          userId: user.uid, type: 'unlock', promptId: prompt.id, promptTitle: prompt.title, amount: 1, createdAt: new Date()
        });
      } else {
        await updateDoc(doc(db, 'users', user.uid), { unlockedPrompts: arrayUnion(prompt.id!) });
      }

      recordPromptInteraction(prompt, INTERACTION_WEIGHTS.UNLOCK);
      const privateDoc = await getDoc(doc(db, 'prompts', prompt.id!, 'private', 'content'));
      if (privateDoc.exists()) setPrompt({ ...prompt, content: privateDoc.data().formula });
      toast.success("Unlocked! Ready to use.");
    } catch (err) { toast.error("Unlock failed."); }
  };

  const isUnlocked = !!(prompt && (!prompt.isPaid || isPro || isAdmin || (profile?.unlockedPrompts || []).includes(prompt.id!)));
  const isCategoryLocked = !!(category?.isPremium && !isPro && !isAdmin);
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
            { name: 'Library', item: prefix('/explore') },
            { name: category?.name || 'Category', item: prefix(`/explore?category=${prompt.categoryId}`) },
            { name: prompt.title, item: prefix(`/prompt/${prompt.slug}`) }
          ]}
        />
      )}
      <PageContainer className="py-12" ignoreCustomizer>
        <Breadcrumbs
          items={[
            { name: 'Library', item: prefix('/explore') },
            { name: category?.name || 'Category', item: prefix(`/explore?category=${prompt.categoryId}`) },
            { name: prompt.title, item: prefix(`/prompt/${prompt.slug}`) }
          ]}
        />

        <Button
          onClick={() => navigate(prefix('/explore'))}
          variant="ghost"
          size="sm"
          leftIcon={ArrowLeft}
          className="mb-8 font-bold"
        >
          Back to Library
        </Button>

        <div className="grid lg:grid-cols-3 gap-12">

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
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
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
              {prompt!.imageUrl && (
                <div className="mb-10 rounded-2xl overflow-hidden border border-border aspect-[16/9] md:aspect-[21/9]">
                  <img src={prompt!.imageUrl} className="w-full h-full object-cover" alt={prompt!.title} />
                </div>
              )}

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
                    {isUnlocked && prompt!.content && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                        {(prompt!.content.match(/(\[[\w\s.,!?'-]+\]|\{\{[\w\s.,!?'-]+\}\})/g) || []).length} variables
                      </span>
                    )}
                  </div>
                   {isUnlocked && (
                     <Button
                       onClick={handleCopy}
                       variant={copied ? 'success' : 'secondary'}
                       size="sm"
                       leftIcon={copied ? Check : Copy}
                     >
                       {copied ? 'Copied!' : 'Copy Formula'}
                     </Button>
                   )}
                </div>

                {/* Formula content */}
                <div className={cn(
                  "rounded-2xl p-8 md:p-10 min-h-[300px] bg-muted border border-border",
                  !isUnlocked && "blur-[10px] pointer-events-none select-none overflow-hidden h-[300px] opacity-20"
                )}>
                  {isUnlocked
                    ? <HighlightedFormula content={prompt!.content || ''} />
                    : <pre className="font-mono text-sm leading-loose text-foreground/40 whitespace-pre-wrap">
                        {"### [PREMIUM BLUEPRINT LOCKED]\n--model v6.0 --parameter [HIDDEN]\n--logic [ENCRYPTED_FLOW]\n--system-prompt [REDACTED]\n\n1. [HIDDEN_STEP_A]\n2. [HIDDEN_STEP_B]\n3. [HIDDEN_STEP_C]"}
                      </pre>
                  }
                </div>

                {/* ── Locked overlay ── */}
                {!isUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl p-8 max-w-sm w-full text-center relative overflow-hidden bg-background border border-primary/25"
                      style={{ boxShadow: '0 0 40px rgba(139,92,246,0.1)' }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-0.5"
                        style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)' }} />

                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <Lock className="w-6 h-6 text-violet-400" />
                      </div>

                      {/* Context-aware heading */}
                      <h3 className="text-xl font-bold text-foreground mb-1.5">
                        {hasNoCredits
                          ? "You're out of credits"
                          : isCategoryLocked
                          ? 'Pro Members Only'
                          : 'Unlock This Prompt'}
                      </h3>
                      <p className="text-sm mb-5 text-muted-foreground">
                        {hasNoCredits
                          ? 'Upgrade to Pro for unlimited access — no credits needed.'
                          : isCategoryLocked
                          ? 'This collection is reserved for Pro subscribers.'
                          : 'Use 1 credit to unlock permanently, or go Pro for unlimited.'}
                      </p>

                      {/* Perks */}
                      <ul className="space-y-2 mb-5 text-left">
                        {UNLOCK_PERKS.map(perk => (
                          <li key={perk} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                            <div className="w-4 h-4 rounded-md flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
                              <Check className="w-2.5 h-2.5 text-violet-400" />
                            </div>
                            {perk}
                          </li>
                        ))}
                      </ul>

                      {/* Urgency + social proof */}
                      <div className="flex items-center justify-between mb-5 px-1 text-xs text-muted-foreground/60">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                          {(prompt!.copiesCount || 0) + 12} used this week
                        </span>
                        <span className="flex -space-x-1">
                          {['V', 'A', 'K'].map(l => (
                            <span key={l} className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border"
                              style={{ background: 'rgba(139,92,246,0.2)', borderColor: 'rgba(139,92,246,0.3)', color: 'rgb(167,139,250)' }}>{l}</span>
                          ))}
                          <span className="ml-2 self-center">{(prompt!.likesCount || 0) + 42} creators</span>
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {!isCategoryLocked && !hasNoCredits && (
                          <Button
                            onClick={handleUnlock}
                            variant="primary"
                            fullWidth
                            size="lg"
                            leftIcon={Zap}
                          >
                            Unlock for 1 Credit
                          </Button>
                        )}
                        <Button
                          onClick={() => setIsUpgradeModalOpen(true)}
                          variant={hasNoCredits || isCategoryLocked ? 'primary' : 'secondary'}
                          fullWidth
                          size="lg"
                          leftIcon={Sparkles}
                        >
                          {hasNoCredits || isCategoryLocked ? 'Go Pro — Unlimited Access' : 'Upgrade to Pro — Unlimited'}
                        </Button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>

              {/* ── Sample Output ── */}
              {isUnlocked && prompt!.sampleOutput && (
                <div className="mb-10 rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center gap-2 px-6 py-4 bg-muted border-b border-border">
                    <Star className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sample Output</h3>
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                      AI Generated
                    </span>
                  </div>
                  <div className="p-6 bg-card">
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{prompt!.sampleOutput}</p>
                  </div>
                </div>
              )}

              {/* ── Usage Guide ── */}
              {isUnlocked && prompt!.usageGuide && (
                <div className="mb-10 rounded-2xl border border-border overflow-hidden">
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
                {!isPro && (
                  <Button
                    onClick={() => setIsUpgradeModalOpen(true)}
                    variant="primary"
                    size="lg"
                    leftIcon={Zap}
                    className="w-full sm:w-auto"
                  >
                    Go Pro — Unlimited Access
                  </Button>
                )}
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
                const isOfficial = prompt!.creatorRole === 'admin' || prompt!.creatorRole === 'staff';
                const displayName = prompt!.creatorName || creator?.displayName || 'Creator';
                const avatarLetter = displayName.charAt(0).toUpperCase();
                return (
                  <div className="flex items-center gap-3 mb-5">
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
                      <div className="font-bold text-foreground">{displayName}</div>
                      <div className="text-xs font-semibold flex items-center gap-1 text-primary">
                        {isOfficial ? (
                          <><ShieldCheck className="w-3 h-3" /> Official Content</>
                        ) : creator?.subscriptionStatus === 'pro' ? (
                          'Verified Expert'
                        ) : (
                          'Creator'
                        )}
                      </div>
                    </div>
                  </div>
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

            {/* Upgrade CTA — sticky sidebar */}
            {!isPro && (
              <div className="rounded-2xl p-6 relative overflow-hidden"
                style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)' }} />
                <div className="relative z-10">
                  <div className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Pro Plan</div>
                  <h4 className="text-lg font-bold text-foreground mb-1.5">Unlimited Access</h4>
                  <p className="text-sm mb-4 leading-relaxed text-muted-foreground">
                    Get every prompt. Copy without limits. Cancel anytime.
                  </p>
                  <ul className="space-y-1.5 mb-5">
                    {['5,000+ expert prompts', 'Unlimited copies', 'New prompts weekly'].map(item => (
                      <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => setIsUpgradeModalOpen(true)}
                    variant="primary"
                    fullWidth
                    size="lg"
                    leftIcon={Sparkles}
                  >
                    See Plans
                  </Button>
                </div>
              </div>
            )}

            {/* Credits meter (free users) */}
            {user && !isPro && !isAdmin && (
              <div className="rounded-xl p-4 bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">Credits remaining</span>
                  <span className={`text-sm font-bold ${(profile?.credits || 0) === 0 ? 'text-rose-500' : 'text-foreground'}`}>
                    {profile?.credits || 0}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${(profile?.credits || 0) === 0 ? 'bg-destructive' : 'gradient-cta'}`}
                    style={{
                      width: `${Math.min(100, ((profile?.credits || 0) / (profile?.monthlyLimit || 50)) * 100)}%`,
                    }}
                  />
                </div>
                {(profile?.credits || 0) === 0 && (
                   <Button
                    onClick={() => setIsUpgradeModalOpen(true)}
                    variant="primary"
                    fullWidth
                    size="sm"
                  >
                    Upgrade for Unlimited
                  </Button>
                )}
              </div>
            )}
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
                <Link key={p.id} to={prefix(`/prompt/${p.slug}`)}
                  className="group rounded-2xl p-6 flex flex-col transition-all bg-card border border-border hover:border-primary/20 hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-widest bg-muted text-muted-foreground border border-border">
                      {p.model}
                    </span>
                    {p.isPaid && <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />}
                  </div>
                  <h3 className="font-bold text-base mb-2 text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-sm line-clamp-2 mb-5 flex-grow leading-relaxed text-muted-foreground">
                    {p.description}
                  </p>
                  <div className="flex items-center justify-between text-muted-foreground/50">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs font-bold">
                        <Heart className="w-3.5 h-3.5" /> {p.likesCount || 0}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold">
                        <Eye className="w-3.5 h-3.5" /> {p.viewsCount || 0}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-primary/50" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

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
          referralCode={profile?.referralCode}
        />
      )}

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

      {prompt && (
        <ReportModal
          prompt={prompt}
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
}
