import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove, collection, query, where, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { Prompt, UserProfile } from '../types';
import { Lock, Copy, Check, Share2, Zap, ArrowLeft, ChevronRight, User, Heart, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';

// Utility to handle Firestore timestamps or ISO strings
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

import { MOCK_PROMPTS } from '../constants/mocks';

export default function PromptDetailPage() {
  const { id } = useParams();
  const { user, profile, isPro, loading: authLoading, toggleFavorite, isFavorited } = useAuth();
  const { permissions, loading: permsLoading } = usePermissions();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [relatedPrompts, setRelatedPrompts] = useState<Prompt[]>([]);

  const isLiked = id ? isFavorited(id) : false;

  useEffect(() => {
    async function fetchPrompt() {
      if (!id) return;
      try {
        const docRef = doc(db, 'prompts', id);
        
        // Only increment view if it's not a preview from mock data
        await updateDoc(docRef, {
          viewsCount: increment(1)
        }).catch(() => { /* Handle missing field or mock doc gracefully */ });

        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const pData = { id: docSnap.id, ...docSnap.data() } as Prompt;
          setPrompt(pData);
          
          // Fetch creator info
          if (pData.creatorId) {
            const creatorDoc = await getDoc(doc(db, 'users', pData.creatorId));
            if (creatorDoc.exists()) {
              setCreator({ uid: creatorDoc.id, ...creatorDoc.data() } as UserProfile);
            }
          }

          // Fetch related prompts
          const q = query(
            collection(db, 'prompts'),
            where('categoryId', '==', pData.categoryId || 'general'),
            limit(3)
          );
          const relatedSnap = await getDocs(q);
          setRelatedPrompts(
            relatedSnap.docs
              .map(d => ({ id: d.id, ...d.data() } as Prompt))
              .filter(p => p.id !== id)
          );
        } else {
          // If not in DB, check mock data (for preview)
          const mock = MOCK_PROMPTS.find(p => p.id === id);
          if (mock) {
            setPrompt(mock);
            setRelatedPrompts(MOCK_PROMPTS.filter(p => p.id !== id).slice(0, 3));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPrompt();
  }, [id]);

  const handleLikeClick = async () => {
    if (!user || !id) {
      navigate('/login');
      return;
    }
    await toggleFavorite(id);
    // Refresh prompt to get updated like count if needed, or just update locally
    if (prompt) {
      setPrompt({
        ...prompt,
        likesCount: isLiked ? (prompt.likesCount || 1) - 1 : (prompt.likesCount || 0) + 1
      });
    }
  };

  const handleCopy = () => {
    if (!prompt) return;
    if (!permissions.canCopyPrompts) {
      alert("Your current plan does not allow prompt copying. Please upgrade!");
      return;
    }
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUnlocked = prompt && (!prompt.isPaid || permissions.canViewPremium);

  if (loading || authLoading || permsLoading) return <div className="container mx-auto px-4 py-24 text-center">Loading...</div>;
  if (!prompt) return <div className="container mx-auto px-4 py-24 text-center">Prompt not found.</div>;

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-8 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Explore
      </button>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                  {prompt.model}
                </span>
                <div className="flex items-center gap-4 text-slate-400 text-sm font-medium">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>{prompt.viewsCount || 0} views</span>
                  </div>
                  <span>Updated: {formatDate(prompt.updatedAt || prompt.createdAt)}</span>
                </div>
              </div>
              <button 
                onClick={handleLikeClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 border-2 ${isLiked ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                {prompt.likesCount || 0}
              </button>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
              {prompt.title}
            </h1>
            
            <p className="text-lg text-slate-600 mb-10 leading-relaxed">
              {prompt.description}
            </p>

            <div className="relative group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Prompt Content</h3>
                {isUnlocked && (
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all active:scale-95"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Prompt'}
                  </button>
                )}
              </div>

              <div className={isUnlocked ? "" : "blur-sm pointer-events-none select-none overflow-hidden h-64"}>
                <div className="bg-slate-900 rounded-[2rem] p-8 md:p-10 text-slate-100 font-mono text-sm leading-loose border border-slate-800 shadow-2xl">
                  <ReactMarkdown>{prompt.content}</ReactMarkdown>
                </div>
              </div>

              {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 rounded-[2rem] backdrop-blur-sm border-2 border-dashed border-indigo-200">
                  <div className="bg-white p-10 rounded-3xl shadow-2xl shadow-indigo-500/10 text-center max-w-sm mx-auto border border-slate-100">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Lock className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">Premium Content</h3>
                    <p className="text-slate-500 mb-8">This prompt is part of our Pro collection. Upgrade your plan to see the full content.</p>
                    <button 
                      onClick={() => navigate('/pricing')}
                      className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      Unlock with Pro
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Sidebar Info */}
        <div className="flex flex-col gap-8">
          <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
            <h4 className="font-bold mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              Creator Details
            </h4>
            <div className="flex items-center gap-4 mb-6">
              {creator?.photoURL ? (
                <img src={creator.photoURL} className="w-12 h-12 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold">
                  <User className="w-6 h-6" />
                </div>
              )}
              <div>
                <div className="font-bold text-slate-900 line-clamp-1">{creator?.displayName || creator?.email?.split('@')[0] || 'Premium Creator'}</div>
                <div className="text-sm text-slate-500">
                  {creator?.subscriptionStatus === 'pro' ? 'Verified Expert' : 'Prompt Designer'}
                </div>
              </div>
            </div>
            {creator && (
              <Link 
                to={`/user/${creator.uid}`}
                className="block w-full py-4 text-center rounded-2xl border border-slate-100 text-slate-900 font-bold hover:bg-slate-50 transition-all mb-4"
              >
                View Profile
              </Link>
            )}
            <div className="flex flex-wrap gap-2">
              {prompt.tags.map(tag => (
                <span key={tag} className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-xs font-medium">#{tag}</span>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20">
            <h4 className="font-bold text-xl mb-4">Why upgrade?</h4>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-2 text-sm text-indigo-100">
                <Check className="w-4 h-4 mt-0.5 shrink-0" />
                Access 5,000+ premium prompts
              </li>
              <li className="flex items-start gap-2 text-sm text-indigo-100">
                <Check className="w-4 h-4 mt-0.5 shrink-0" />
                No daily prompt builder limits
              </li>
              <li className="flex items-start gap-2 text-sm text-indigo-100">
                <Check className="w-4 h-4 mt-0.5 shrink-0" />
                Early access to GPT-5 prompts
              </li>
            </ul>
            <button 
              onClick={() => navigate('/pricing')}
              className="w-full bg-white text-indigo-600 font-black py-4 rounded-2xl hover:bg-slate-50 transition-all"
            >
              Get Pro Access
            </button>
          </div>
        </div>
      </div>

      {/* Related Prompts */}
      {relatedPrompts.length > 0 && (
        <div className="mt-24 border-t border-slate-100 pt-16">
          <h2 className="text-3xl font-black text-slate-900 mb-8">Related <span className="text-indigo-600">Prompts</span></h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {relatedPrompts.map(p => (
              <Link 
                key={p.id} 
                to={`/prompt/${p.id}`}
                className="group bg-white rounded-3xl border border-slate-100 p-6 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex flex-col"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    {p.model}
                  </span>
                  {p.isPaid && <Zap className="w-3 h-3 text-amber-500 fill-current" />}
                </div>
                <h3 className="font-bold text-lg mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{p.title}</h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-6 flex-grow">{p.description}</p>
                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      <span className="text-xs font-bold">{p.likesCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span className="text-xs font-bold">{p.viewsCount || 0}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
