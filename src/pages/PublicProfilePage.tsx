import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Prompt, UserProfile } from '../types';
import { User, LayoutGrid, Star, Calendar, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export default function PublicProfilePage() {
  const { uid } = useParams();
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (uid) {
      fetchUserData();
    }
  }, [uid]);

  async function fetchUserData() {
    try {
      // Fetch profile
      const profDoc = await getDoc(doc(db, 'users', uid!));
      if (profDoc.exists()) {
        setTargetProfile({ uid: profDoc.id, ...profDoc.data() } as UserProfile);
      }

      // Fetch user's prompts
      const q = query(
        collection(db, 'prompts'), 
        where('creatorId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setPrompts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Prompt)));
    } catch (err) {
      console.error("Error fetching public profile:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600"></div>
      </div>
    );
  }

  if (!targetProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <User className="w-16 h-16 text-slate-200 mb-4" />
        <h2 className="text-2xl font-black text-slate-900 mb-2">User Not Found</h2>
        <p className="text-slate-500 mb-6">The profile you are looking for does not exist or has been removed.</p>
        <Link to="/explore" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">Back to Explore</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {/* Profile Header */}
        <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-slate-100 shadow-sm mb-12 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-32 bg-indigo-600/5 -z-10" />
           <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
              <div className="relative shrink-0">
                <img 
                  src={targetProfile.photoURL || ''} 
                  className="w-24 h-24 md:w-32 md:h-32 rounded-3xl md:rounded-[2.5rem] bg-slate-100 border-4 border-white shadow-xl relative z-10 object-cover" 
                  alt="" 
                />
                {targetProfile.subscriptionStatus === 'pro' && (
                  <div className="absolute -top-3 -right-3 bg-amber-400 text-white p-2 rounded-2xl shadow-lg z-20 border-2 border-white">
                    <Zap className="w-5 h-5 fill-current" />
                  </div>
                )}
              </div>
              <div className="flex-grow text-center md:text-left">
                 <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                   <h1 className="text-3xl font-black text-slate-900 tracking-tight">{targetProfile.displayName || 'Anonymous User'}</h1>
                   {targetProfile.role === 'admin' && (
                     <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                       <ShieldCheck className="w-3 h-3" />
                       Staff
                     </span>
                   )}
                 </div>
                 <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-slate-500 font-medium">
                    <div className="flex items-center gap-2">
                       <Calendar className="w-4 h-4" />
                       <span>Joined {new Date(targetProfile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <LayoutGrid className="w-4 h-4" />
                       <span>{prompts.length} Prompts</span>
                    </div>
                 </div>
              </div>
              <div className="flex flex-col sm:flex-row md:flex-row gap-3 w-full sm:w-auto">
                 <button className="flex-grow sm:flex-grow-0 bg-slate-100 text-slate-600 font-black px-6 py-3 rounded-2xl hover:bg-slate-200 transition-all">Follow</button>
                 <button className="flex-grow sm:flex-grow-0 bg-indigo-600 text-white font-black px-6 py-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">Message</button>
              </div>
           </div>
        </div>

        {/* Content Tabs */}
        <div className="flex gap-4 md:gap-8 mb-8 border-b border-slate-200 overflow-x-auto scrollbar-hide">
           <button className="px-4 py-4 border-b-4 border-indigo-600 font-black text-slate-900 whitespace-nowrap">Shared Prompts</button>
           <button className="px-4 py-4 border-b-4 border-transparent font-bold text-slate-400 hover:text-slate-600 whitespace-nowrap">Stats</button>
           <button className="px-4 py-4 border-b-4 border-transparent font-bold text-slate-400 hover:text-slate-600 whitespace-nowrap">About</button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
           {prompts.map((prompt) => (
             <motion.div 
               key={prompt.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="group bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex flex-col"
             >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                    {prompt.model}
                  </span>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-xs font-black">{prompt.likesCount}</span>
                  </div>
                </div>
                <h3 className="font-black text-xl text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {prompt.title}
                </h3>
                <p className="text-slate-500 text-sm mb-6 line-clamp-2 leading-relaxed">
                  {prompt.description}
                </p>
                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                   <span className="text-xs font-bold text-slate-400">{new Date(prompt.createdAt).toLocaleDateString()}</span>
                   <Link 
                     to={`/prompt/${prompt.id}`}
                     className="bg-slate-900 text-white p-3 rounded-2xl group-hover:bg-indigo-600 transition-all active:scale-95"
                   >
                     <ArrowRight className="w-5 h-5" />
                   </Link>
                </div>
             </motion.div>
           ))}
           {prompts.length === 0 && (
             <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
               <LayoutGrid className="w-12 h-12 text-slate-100 mx-auto mb-4" />
               <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">This user hasn't shared any prompts yet.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
