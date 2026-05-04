import { arrayUnion, collection, addDoc, doc, getDoc, getDocs, increment, limit, query, orderBy, Timestamp, updateDoc, where } from 'firebase/firestore';
import { ArrowLeft, Check, ChevronRight, Clock, Copy, Eye, Heart, Lock, User, Zap, Twitter, Linkedin, Share2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ShareModal from '../components/ShareModal';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { db } from '../lib/firebase';
import { Prompt, UserProfile, AIModel } from '../types';
import { useSEO } from '../hooks/useSEO';
import { useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { recordPromptInteraction } from '../lib/affinity';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  try {
    if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
    if (typeof date === 'object' && date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    const parsed = new Date(date);
    return parsed.toString() !== 'Invalid Date' ? parsed.toLocaleDateString() : 'N/A';
  } catch (err) {
    return 'N/A';
  }
};

export default function PromptDetailPage() {
  const { slug } = useParams();
  const { user, profile, isPro, isAdmin, loading: authLoading, toggleFavorite, isFavorited } = useAuth();
  const { permissions, loading: permsLoading } = usePermissions();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [relatedPrompts, setRelatedPrompts] = useState<Prompt[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [category, setCategory] = useState<any | null>(null);
  const [config, setConfig] = useState<any | null>(null);

  const isLiked = prompt?.id ? isFavorited(prompt.id) : false;

  const seoMeta = useMemo(() => {
    if (!prompt) return null;
    return {
      title: prompt.metaTitle || `${prompt.title} - Expert Prompt Marketplace`,
      description: prompt.metaDescription || prompt.description,
      keywords: prompt.metaKeywords || (prompt.tags || []).join(', '),
      author: creator?.displayName || 'Premium Creator',
      tags: prompt.tags,
      ogImage: 'https://promptly.com/og-image.png',
    };
  }, [prompt, creator]);

  useSEO(seoMeta || 'explore');

  useEffect(() => {
    if (prompt) {
      const schema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": prompt.title,
        "description": prompt.description,
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "price": prompt.isPaid ? "Subscription" : "0",
          "priceCurrency": "USD"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": prompt.likesCount || 12
        }
      };
      const script = document.createElement('script');
      script.type = "application/ld+json";
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
      return () => {
        document.head.removeChild(script);
      };
    }
  }, [prompt]);

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
          const pData = { id: docSnap.id, ...docSnap.data() } as Prompt;
          
          // SECURITY: Proactively scrub content from the main document
          // The real formula must ONLY come from the private subcollection
          const alreadyUnlocked = (profile?.unlockedPrompts || []).includes(pData.id!);
          const hasAccess = isPro || isAdmin || alreadyUnlocked || !pData.isPaid;
          
          // Scrub initial content to prevent inspection leaks
          if (!hasAccess) {
            delete pData.content;
          }

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
          recordPromptInteraction(pData, 1);

          try {
            const recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
            const filtered = recent.filter((p: any) => p.id !== pData.id);
            const updated = [{ id: pData.id, slug: pData.slug, title: pData.title, model: pData.model }, ...filtered].slice(0, 5);
            localStorage.setItem('recentlyViewed', JSON.stringify(updated));
          } catch (e) {}

          const vSnap = await getDocs(query(collection(db, 'prompts', pData.id!, 'versions'), orderBy('updatedAt', 'desc')));
          setVersions(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));

          if (pData.creatorId) {
            const creatorDoc = await getDoc(doc(db, 'users', pData.creatorId));
            if (creatorDoc.exists()) setCreator({ uid: creatorDoc.id, ...creatorDoc.data() } as UserProfile);
          }

          const relatedQ = query(collection(db, 'prompts'), where('categoryId', '==', pData.categoryId || 'general'), limit(3));
          const relatedSnap = await getDocs(relatedQ);
          setRelatedPrompts(relatedSnap.docs.map(d => ({ id: d.id, ...d.data() } as Prompt)).filter(p => p.id !== pData.id));

          const mSnap = await getDocs(collection(db, 'models'));
          setModels(mSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AIModel)));

          if (pData.categoryId) {
            const catSnap = await getDoc(doc(db, 'categories', pData.categoryId));
            if (catSnap.exists()) setCategory({ id: catSnap.id, ...catSnap.data() });
          }

          const configSnap = await getDoc(doc(db, 'configs', 'global'));
          if (configSnap.exists()) setConfig(configSnap.data());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPrompt();
  }, [slug, profile]);

  useEffect(() => {
    if (!prompt) return;
    const interval = setInterval(() => {
      if (!document.hidden) recordPromptInteraction(prompt, 1, false);
    }, 10000);
    return () => clearInterval(interval);
  }, [prompt]);

  const handleLikeClick = async () => {
    if (!user || !prompt?.id) { navigate('/login'); return; }
    await toggleFavorite(prompt.id);
    if (prompt) {
      if (!isLiked) recordPromptInteraction(prompt, 5);
      setPrompt({ ...prompt, likesCount: isLiked ? (prompt.likesCount || 1) - 1 : (prompt.likesCount || 0) + 1 });
    }
  };

  const handleCopy = async () => {
    if (!prompt || !user || !profile) { toast.error("Please login."); navigate('/login'); return; }
    if (!permissions.canCopyPrompts) { toast.error("Upgrade to Pro to copy!"); return; }
    const isPro = profile.subscriptionStatus !== 'free';
    if (!isPro && (profile.credits || 0) <= 0) { toast.error("Out of credits!"); return; }

    try {
      if (!isPro) await updateDoc(doc(db, 'users', user.uid), { credits: increment(-1), totalUsedCredits: increment(1) });
      await updateDoc(doc(db, 'prompts', prompt.id!), { copiesCount: increment(1) });
      navigator.clipboard.writeText(prompt.content);
      setCopied(true);
      recordPromptInteraction(prompt, 10);
      toast.success("Prompt copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { toast.error("Copy failed."); }
  };

  const handleUnlock = async () => {
    if (!prompt || !user || !profile) { navigate('/login'); return; }
    const unlockedCount = (profile.unlockedPrompts || []).length;
    const vaultLimit = config?.vaultLimit || 10;
    
    if (!isPro && !isAdmin && unlockedCount >= vaultLimit) {
      toast.error(`Vault full! Upgrade for more than ${vaultLimit} prompts.`, { icon: '🗄️' });
      return;
    }

    if ((profile.credits || 0) <= 0) { toast.error("No credits left!"); return; }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        credits: increment(-1),
        totalUsedCredits: increment(1),
        unlockedPrompts: arrayUnion(prompt.id!)
      });

      await addDoc(collection(db, 'credits_history'), {
        userId: user.uid,
        type: 'unlock',
        promptId: prompt.id,
        promptTitle: prompt.title,
        amount: 1,
        createdAt: new Date()
      });
      
      const privateDoc = await getDoc(doc(db, 'prompts', prompt.id!, 'private', 'content'));
      if (privateDoc.exists()) setPrompt({ ...prompt, content: privateDoc.data().formula });
      toast.success("Unlocked! Ready to use.");
    } catch (err) { toast.error("Unlock failed."); }
  };

  const isUnlocked = !!(prompt && (!prompt.isPaid || isPro || isAdmin || (profile?.unlockedPrompts || []).includes(prompt.id!)));
  const isCategoryLocked = !!(category?.isPremium && !isPro && !isAdmin);

  if (loading || authLoading || permsLoading) return <div className="container mx-auto px-4 py-32 text-center text-muted-foreground">Initializing formula...</div>;
  if (!prompt) return <div className="container mx-auto px-4 py-32 text-center text-foreground font-black">Prompt not found.</div>;

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl min-h-screen">
      <button
        onClick={() => navigate('/explore')}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors group text-sm font-bold"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Library
      </button>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/20">
                  {models.find(m => m.id === prompt.model)?.name || prompt.model}
                </span>
                <div className="flex items-center gap-4 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{prompt.viewsCount || 0}</span>
                  </div>
                  <span>{formatDate(prompt.updatedAt || prompt.createdAt)}</span>
                </div>
              </div>
              <button
                onClick={handleLikeClick}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 border-2 ${isLiked ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-card text-muted-foreground/40 border-border hover:border-muted-foreground/20'}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                {prompt.likesCount || 0}
              </button>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-foreground mb-6 leading-[1.1] tracking-tight">
              {prompt.title}
            </h1>

            <p className={cn(
              "text-lg text-muted-foreground mb-8 leading-relaxed font-medium transition-all",
              !isUnlocked && "blur-[5px] select-none opacity-40"
            )}>
              {isUnlocked ? prompt.description : "🔒 UNLOCK PREMIUM BLUEPRINT: This expert-engineered AI formula and its optimized parameters are reserved for authorized users. Unlock this asset now, upgrade to Pro, or purchase credits to reveal the full blueprints and technical logic."}
            </p>

            <div className="flex flex-wrap gap-2 mb-12">
              {prompt.tags.map(tag => (
                <Link 
                  key={tag} 
                  to={`/explore?q=${tag}`}
                  className="bg-muted text-muted-foreground px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all"
                >
                  #{tag}
                </Link>
              ))}
            </div>

            <div className="relative group mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">The Formula</h3>
                </div>
                {isUnlocked && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-xs font-black hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy Formula'}
                  </button>
                )}
              </div>

              <div className={isUnlocked ? "" : "blur-[10px] pointer-events-none select-none overflow-hidden h-[400px] rounded-[2.5rem] border border-border opacity-30"}>
                <div className="bg-card rounded-[2.5rem] p-8 md:p-12 text-foreground font-mono text-sm leading-loose border border-border shadow-2xl min-h-[400px]">
                  <ReactMarkdown>
                    {isUnlocked 
                      ? (prompt.content || "") 
                      : `### [PREMIUM BLUEPRINT LOCKED]
--model v6.0 --parameter [HIDDEN]
--logic [ENCRYPTED_FLOW]
--system-prompt [REDACTED_FOR_SECURITY]
--optimization-layer [SECURE_BLUEPRINT]

1. [HIDDEN_STEP_A]
2. [HIDDEN_STEP_B]
3. [HIDDEN_STEP_C]

This premium AI formula is protected by the Promptly secure content layer.
Unlock this blueprint, upgrade to Pro, or purchase credits to reveal the full engineering logic.`}
                  </ReactMarkdown>
                </div>
              </div>

              {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card rounded-[3rem] border border-border p-10 shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
                    
                    <div className="mb-8">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-2xl font-black text-foreground mb-3 tracking-tighter">
                        {isCategoryLocked ? 'Exclusive Vault' : 'Premium Asset'}
                      </h3>
                      <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-6">
                        {isCategoryLocked 
                          ? `This collection is reserved for professional Pro members only.`
                          : 'Unlock this expert-engineered formula to reveal the full technical parameters and AI blueprints.'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {!isCategoryLocked && (
                        <button
                          onClick={handleUnlock}
                          className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                        >
                          <Zap className="w-4 h-4 fill-current" />
                          Unlock for 1 Credit
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/pricing')}
                        className="w-full bg-foreground text-background font-black py-4 rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Upgrade to Pro
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 py-8 border-t border-border">
              <button 
                onClick={() => setIsShareModalOpen(true)}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-muted text-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all shadow-sm border border-border"
              >
                <Share2 className="w-5 h-5" />
                Spread the Word
              </button>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-8">
          <div className="bg-card rounded-[2.5rem] border border-border p-8 shadow-sm">
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Creator
            </h4>
            <div className="flex items-center gap-4 mb-8">
              {creator?.photoURL ? (
                <img src={creator.photoURL} className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-border" alt="" />
              ) : (
                <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground/40 font-black text-lg">
                  {creator?.displayName?.charAt(0) || 'C'}
                </div>
              )}
              <div>
                <div className="font-black text-foreground text-lg leading-tight mb-1">{creator?.displayName || 'Designer'}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-primary">
                  {creator?.subscriptionStatus === 'pro' ? 'Verified Expert' : 'Creator'}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-xs font-bold text-muted-foreground">Model</span>
                <span className="text-xs font-black text-foreground">{models.find(m => m.id === prompt.model)?.name || prompt.model}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-xs font-bold text-muted-foreground">Category</span>
                <span className="text-xs font-black text-foreground">{prompt.categoryId}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-xs font-bold text-muted-foreground">Standard</span>
                <span className="text-xs font-black text-green-500 uppercase">Production Ready</span>
              </div>
            </div>
          </div>

          <div className="bg-foreground text-background rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
            <Zap className="w-32 h-32 absolute -right-8 -bottom-8 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
            <div className="relative z-10">
              <h4 className="text-2xl font-black mb-4 tracking-tighter">Unlimited Access?</h4>
              <p className="opacity-60 text-sm mb-8 leading-relaxed font-medium">Get lifetime access to our entire 5,000+ prompt database and pro engineering lab.</p>
              <button
                onClick={() => navigate('/pricing')}
                className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:opacity-90 transition-all text-sm"
              >
                Go Pro Now
              </button>
            </div>
          </div>

          {versions.length > 0 && (
            <div className="bg-card rounded-[2.5rem] border border-border p-8 shadow-sm">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-8 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Evolution
              </h4>
              <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                {versions.map((v, idx) => (
                  <div key={v.id} className="relative pl-8">
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-card shadow-sm ${idx === 0 ? 'bg-primary' : 'bg-muted'}`} />
                    <p className="text-[10px] font-black text-foreground uppercase tracking-widest mb-1">
                      {idx === 0 ? 'Latest v2.0' : `v${versions.length - idx}.0`}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground mb-3 opacity-60">{formatDate(v.updatedAt)}</p>
                    <p className="text-[11px] text-muted-foreground font-medium italic leading-relaxed">"{v.changeLog}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {relatedPrompts.length > 0 && (
        <div className="mt-24 border-t border-border pt-20">
          <h2 className="text-4xl font-black text-foreground mb-12 tracking-tight">Similar <span className="text-primary">Formulas</span></h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {relatedPrompts.map(p => (
              <Link
                key={p.id}
                to={`/prompt/${p.slug}`}
                className="group bg-card rounded-[2.5rem] border border-border p-8 hover:border-primary/40 hover:shadow-2xl transition-all flex flex-col"
              >
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {p.model}
                  </span>
                  {p.isPaid && <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />}
                </div>
                <h3 className="font-black text-xl mb-3 text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-tight">{p.title}</h3>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-8 flex-grow font-medium leading-relaxed">{p.description}</p>
                <div className="flex items-center justify-between text-muted-foreground/40">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5" />
                      <span className="text-xs font-black">{p.likesCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-xs font-black">{p.viewsCount || 0}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {prompt && (
        <ShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)}
          title={prompt.title}
          url={window.location.href}
          referralCode={profile?.referralCode}
        />
      )}
    </div>
  );
}

function Terminal(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}
