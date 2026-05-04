import { Link, useNavigate } from 'react-router-dom';
import { Prompt } from '../types';
import { Heart, Zap, Copy, ExternalLink, Tag, Eye, ChevronRight, Lock, Unlock } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { doc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { useState } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PromptCardProps {
  prompt: Prompt;
  isUnlocked?: boolean;
}

export default function PromptCard({ prompt, isUnlocked: initialUnlocked = false }: PromptCardProps) {
  const { isFavorited, toggleFavorite, user, profile, isPro, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isUnlocking, setIsUnlocking] = useState(false);
  
  const favorited = prompt.id ? isFavorited(prompt.id) : false;
  
  const isActuallyUnlocked = initialUnlocked || 
                            !prompt.isPaid || 
                            isPro || 
                            isAdmin || 
                            (profile?.unlockedPrompts || []).includes(prompt.id!);

  const isLocked = prompt.isPaid && !isActuallyUnlocked;

  const handleQuickUnlock = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !profile) {
      toast.error("Please login to unlock prompts.");
      navigate('/login');
      return;
    }

    if ((profile.credits || 0) < 1) {
      toast.error("Not enough credits! Upgrade to Pro for unlimited access.", {
        icon: '💳'
      });
      navigate('/pricing');
      return;
    }

    setIsUnlocking(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      await updateDoc(userRef, {
        credits: increment(-1),
        unlockedPrompts: Array.from(new Set([...(profile.unlockedPrompts || []), prompt.id!])),
        totalUsedCredits: increment(1)
      });

      // Log Transaction
      await addDoc(collection(db, 'credits_history'), {
        userId: user.uid,
        type: 'unlock',
        promptId: prompt.id,
        promptTitle: prompt.title,
        amount: 1,
        createdAt: new Date()
      });

      toast.success("Prompt Unlocked! Ready to use.", {
        icon: '🔓',
        style: { borderRadius: '1rem', background: 'var(--card)', color: 'var(--foreground)', fontWeight: 'bold', border: '1px solid var(--border)' }
      });
      
    } catch (err) {
      console.error("Quick unlock error:", err);
      toast.error("Failed to unlock. Please try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative bg-card rounded-2xl border border-border p-5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col overflow-hidden"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              {prompt.model}
            </span>
            {prompt.isPaid && (
              <span className={cn(
                "flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ring-1",
                isActuallyUnlocked ? "bg-green-500/10 text-green-500 ring-green-500/20" : "bg-amber-500/10 text-amber-500 ring-amber-500/20"
              )}>
                {isActuallyUnlocked ? <Unlock className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                {isActuallyUnlocked ? 'Unlocked' : 'Premium'}
              </span>
            )}
          </div>
          <button 
            onClick={() => prompt.id && toggleFavorite(prompt.id)}
            className={cn(
              "p-2 rounded-full transition-colors",
              favorited ? "text-destructive bg-destructive/10" : "text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10"
            )}
          >
            <Heart className={cn("w-5 h-5", favorited && "fill-current")} />
          </button>
        </div>

        <Link to={`/prompt/${prompt.slug || prompt.id}`} className="block flex-grow">
          <h3 className="font-bold text-lg leading-tight mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {prompt.title}
          </h3>
          <p className={cn(
            "text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3 transition-all",
            isLocked && "blur-[4px] select-none opacity-40"
          )}>
            {isLocked ? "This is a premium formula and expert engineered AI prompt that contains secret parameters and optimized blueprints for high performance generation." : prompt.description}
          </p>
        </Link>

        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-muted-foreground/60 group/item">
              <Heart className={cn("w-3 h-3", favorited && "fill-destructive text-destructive")} />
              <span className={cn("text-[11px] font-bold", favorited && "text-destructive")}>
                {prompt.likesCount || 0}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground/60">
              <Eye className="w-3 h-3" />
              <span className="text-[11px] font-bold">{prompt.viewsCount || 0}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLocked && (
              <button 
                onClick={handleQuickUnlock}
                disabled={isUnlocking}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter hover:opacity-90 transition-all flex items-center gap-1 shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isUnlocking ? '...' : (
                  <>
                    <Zap className="w-3 h-3 fill-current" />
                    Unlock
                  </>
                )}
              </button>
            )}
            <Link 
              to={`/prompt/${prompt.slug || prompt.id}`}
              className="p-2 rounded-lg bg-muted border border-border text-muted-foreground/60 hover:bg-foreground hover:text-background hover:border-foreground transition-all font-bold text-xs flex items-center gap-1"
            >
              View
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Locked Overlay */}
      {isLocked && (prompt.categoryId?.includes('wedding') || prompt.categoryId?.includes('baby')) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-background/60 backdrop-blur-[4px]">
          <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20 mb-4 transform group-hover:scale-110 transition-transform">
            <Lock className="w-4 h-4" />
          </div>
          <h4 className="font-black text-foreground text-center leading-tight mb-1 text-sm uppercase tracking-tighter">Exclusive Niche</h4>
          <p className="text-[10px] text-muted-foreground text-center font-medium mb-4">Pro Plan Required</p>
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate('/pricing'); }}
            className="bg-foreground text-background px-6 py-2 rounded-xl text-[10px] font-bold shadow-lg hover:bg-primary hover:text-primary-foreground transition-all w-full text-center uppercase"
          >
            Upgrade Plan
          </button>
        </div>
      )}
    </motion.div>
  );
}
