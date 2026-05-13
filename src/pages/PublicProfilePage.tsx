import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePath } from '../hooks/usePath';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Prompt, UserProfile } from '../types';
import { User, LayoutGrid, Star, Calendar, ArrowRight, ShieldCheck, Zap, Mail, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import Button from '../components/primitives/Button';
import PageContainer from '../components/layout/PageContainer';

export default function PublicProfilePage() {
  const { uid } = useParams();
  const { prefix } = usePath();
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
      const profDoc = await getDoc(doc(db, 'users', uid!));
      if (profDoc.exists()) {
        setTargetProfile({ uid: profDoc.id, ...profDoc.data() } as UserProfile);
      }

      const q = query(
        collection(db, 'prompts'), 
        where('creatorId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setPrompts(snap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt)));
    } catch (err) {
      console.error("Error fetching public profile:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
      </div>
    );
  }

  if (!targetProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <User className="w-16 h-16 text-muted-foreground/20 mb-6" />
        <h2 className="text-3xl font-bold text-foreground mb-3 tracking-tight">Vault Not Found</h2>
        <p className="text-muted-foreground mb-10 max-w-sm">The creator profile you're searching for might have moved or been set to private.</p>
        <Button as={Link} to={prefix('/explore')} variant="primary" size="lg">
          Return to Library
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <PageContainer className="px-4 md:px-6" ignoreCustomizer>
        {/* Profile Header */}
        <div className="bg-card rounded-lg p-8 md:p-14 border border-border shadow-sm mb-16 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-40 bg-primary/5 -z-10" />
           <div className="flex flex-col md:flex-row items-center md:items-end gap-8 md:gap-12 relative z-10">
              <div className="relative shrink-0">
                {targetProfile.photoURL ? (
                  <img 
                    src={targetProfile.photoURL} 
                    className="w-32 h-32 md:w-40 md:h-40 rounded-xl md:rounded-lg bg-card border-4 border-card shadow-2xl object-cover" 
                    alt="" 
                  />
                ) : (
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl md:rounded-lg bg-muted border-4 border-card shadow-2xl flex items-center justify-center text-4xl font-bold text-muted-foreground/30">
                    {targetProfile.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                {targetProfile.subscriptionStatus === 'pro' && (
                  <div className="absolute -top-4 -right-4 bg-primary text-primary-foreground p-3 rounded-md shadow-xl z-20 border-4 border-card">
                    <Zap className="w-6 h-6 fill-current" />
                  </div>
                )}
              </div>
              <div className="flex-grow text-center md:text-left space-y-4">
                 <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                   <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tighter leading-none">{targetProfile.displayName || 'Anonymous Creator'}</h1>
                   {targetProfile.role === 'admin' && (
                     <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em] border border-primary/20">
                       <ShieldCheck className="w-3.5 h-3.5" />
                       Engineering Staff
                     </div>
                   )}
                 </div>
                 <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-muted-foreground font-bold text-sm">
                    <div className="flex items-center gap-2">
                       <Calendar className="w-4 h-4 opacity-50" />
                       <span>Active since {new Date(targetProfile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <LayoutGrid className="w-4 h-4 opacity-50" />
                       <span>{prompts.length} Verified Blueprints</span>
                    </div>
                 </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button variant="secondary" size="md" className="flex-grow sm:flex-grow-0">
                    Follow
                  </Button>
                  <Button variant="primary" size="md" leftIcon={MessageSquare} className="flex-grow sm:flex-grow-0">
                    Connect
                  </Button>
              </div>
           </div>
        </div>

        {/* Content Tabs */}
        <div className="flex gap-4 md:gap-12 mb-12 border-b border-border overflow-x-auto scrollbar-hide px-2">
           <Button variant="ghost" size="lg" className="px-2 py-4 border-b-4 border-primary rounded-none font-bold text-foreground whitespace-nowrap text-sm uppercase tracking-widest hover:bg-transparent">Shared Blueprint</Button>
           <Button variant="ghost" size="lg" className="px-2 py-4 border-b-4 border-transparent rounded-none font-bold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap text-sm uppercase tracking-widest hover:bg-transparent">Platform Stats</Button>
           <Button variant="ghost" size="lg" className="px-2 py-4 border-b-4 border-transparent rounded-none font-bold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap text-sm uppercase tracking-widest hover:bg-transparent">Engineering Logic</Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
           {prompts.map((prompt) => (
             <motion.div 
               key={prompt.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="group bg-card rounded-lg border border-border p-8 shadow-sm hover:shadow-2xl transition-all flex flex-col"
             >
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
                    {prompt.model}
                  </span>
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-xs font-bold">{prompt.likesCount}</span>
                  </div>
                </div>
                <h3 className="font-bold text-2xl text-foreground mb-4 group-hover:text-primary transition-colors line-clamp-1 tracking-tight leading-tight">
                  {prompt.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-8 line-clamp-2 leading-relaxed font-medium">
                  {prompt.description}
                </p>
                <div className="mt-auto pt-6 border-t border-border flex items-center justify-between">
                   <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">Engineered {new Date(prompt.createdAt).toLocaleDateString()}</span>
                    <Button 
                      as={Link}
                      to={prefix(`/prompt/${prompt.slug || prompt.id}`)}
                      variant="primary"
                      size="icon"
                      className="w-12 h-12 bg-foreground text-background hover:bg-primary hover:text-primary-foreground shadow-lg"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                </div>
             </motion.div>
           ))}
           {prompts.length === 0 && (
             <div className="col-span-full py-32 text-center bg-muted/30 rounded-xl border-2 border-dashed border-border">
               <div className="w-20 h-20 bg-card rounded-lg flex items-center justify-center mx-auto mb-6 shadow-sm">
                 <LayoutGrid className="w-10 h-10 text-muted-foreground/30" />
               </div>
               <h3 className="text-xl font-bold text-foreground mb-2">Vault Empty</h3>
               <p className="text-muted-foreground font-medium text-sm max-w-xs mx-auto opacity-60 uppercase tracking-widest leading-loose">No public blueprints have been synchronized yet.</p>
             </div>
           )}
        </div>
      </PageContainer>
    </div>
  );
}
