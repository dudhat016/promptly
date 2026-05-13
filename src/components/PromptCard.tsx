import { Link, useNavigate } from 'react-router-dom';
import { Prompt } from '../types';
import { ArrowRight, Copy, Eye, Flag, Heart, Lock, MoreHorizontal, Sparkles, Unlock, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../hooks/useConfig';
import { cn } from '../lib/utils';
import { doc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { useState, useRef, useEffect } from 'react';
import { usePath } from '../hooks/usePath';
import Button from './primitives/Button';
import Rating from './feedback/Rating';
import ReportModal from './ReportModal';

const DIFFICULTY_DOT: Record<string, string> = {
  beginner:     'bg-emerald-500',
  intermediate: 'bg-amber-500',
  advanced:     'bg-rose-500',
};

interface PromptCardProps {
  prompt: Prompt;
  isUnlocked?: boolean;
}

export default function PromptCard({ prompt, isUnlocked: initialUnlocked = false }: PromptCardProps) {
  const { isFavorited, toggleFavorite, user, profile, isPro, isAdmin } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const { prefix } = usePath();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const favorited = prompt.id ? isFavorited(prompt.id) : false;
  const isCreation = (prompt as any).isCreation;
  
  const isActuallyUnlocked =
    isCreation ||
    initialUnlocked ||
    !prompt.isPaid ||
    isPro ||
    isAdmin ||
    (profile?.unlockedPrompts || []).includes(prompt.id!);
  const isLocked = !isCreation && prompt.isPaid && !isActuallyUnlocked;

  const category = !isCreation ? config.categories.find(c => c.id === prompt.categoryId) : null;
  const isCategoryLocked = !!(category?.isPremium && !isPro && !isAdmin);

  const handleQuickUnlock = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !profile) {
      toast.error('Sign in to unlock prompts');
      navigate(prefix('/login'));
      return;
    }
    if ((profile.credits || 0) < 1) {
      toast.error('Out of credits — upgrade to Pro');
      navigate(prefix('/pricing'));
      return;
    }

    setIsUnlocking(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        credits: increment(-1),
        unlockedPrompts: Array.from(new Set([...(profile.unlockedPrompts || []), prompt.id!])),
        totalUsedCredits: increment(1),
      });
      await addDoc(collection(db, 'credits_history'), {
        userId: user.uid,
        type: 'unlock',
        promptId: prompt.id,
        promptTitle: prompt.title,
        amount: 1,
        createdAt: new Date(),
      });
      toast.success('Prompt unlocked!');
    } catch {
      toast.error('Failed to unlock — try again');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col"
    >
      {/* Thumbnail */}
      <div className="block relative aspect-[16/9] overflow-hidden bg-muted shrink-0">
        {prompt.imageUrl ? (
          <img
            src={prompt.imageUrl}
            alt={prompt.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/8 via-primary/4 to-transparent flex items-center justify-center">
            <Zap className="w-8 h-8 text-primary/20" />
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {isCreation ? (
            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-primary text-primary-foreground shadow-lg">
              AI CREATION
            </span>
          ) : (
            <>
              {prompt.model && (
                <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-black/50 backdrop-blur-sm text-white/90 border border-white/10">
                  {prompt.model}
                </span>
              )}
              {prompt.isPaid && (
                <span className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold backdrop-blur-sm border',
                  isActuallyUnlocked
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/20'
                )}>
                  {isActuallyUnlocked ? <Unlock className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                  {isActuallyUnlocked ? 'Unlocked' : 'Pro'}
                </span>
              )}
            </>
          )}
        </div>

        {/* Favorite */}
        {!isCreation && (
          <Button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); prompt.id && toggleFavorite(prompt.id); }}
            variant={favorited ? 'primary' : 'ghost'}
            size="icon"
            className={cn(
              'absolute top-3 right-3 w-8 h-8 backdrop-blur-md border border-white/10 shadow-lg',
              favorited ? 'bg-rose-500 hover:bg-rose-600 border-rose-500 shadow-rose-500/30' : 'bg-black/40 text-white/60 hover:bg-black/60'
            )}
          >
            <Heart className={cn('w-4 h-4', favorited && 'fill-current')} />
          </Button>
        )}

        {/* Three-dot menu */}
        {!isCreation && (
          <div
            ref={menuRef}
            className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
          >
            <Button
              onClick={() => setMenuOpen(v => !v)}
              variant="ghost"
              size="icon"
              className="w-8 h-8 bg-black/40 backdrop-blur-md border border-white/10 text-white/60 hover:bg-black/60"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            {menuOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Report Prompt
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex-1 mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            {!isCreation && prompt.difficulty && DIFFICULTY_DOT[prompt.difficulty] && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                <span className={`w-1.5 h-1.5 rounded-full ${DIFFICULTY_DOT[prompt.difficulty]}`} />
                {prompt.difficulty}
              </span>
            )}
            <Rating 
              value={prompt.likesCount ? Math.min(5, 4.2 + (prompt.likesCount / 200)) : 4.5} 
              precision={0.5}
              readOnly 
              size="sm" 
            />
          </div>
          <h3 className="font-semibold text-base leading-snug mb-1.5 text-foreground group-hover:text-primary transition-colors line-clamp-1 font-display">
            {prompt.title}
          </h3>
          <p className={cn(
            'text-sm text-muted-foreground leading-relaxed line-clamp-2',
            isLocked && 'blur-sm select-none opacity-40'
          )}>
            {isLocked
              ? 'This premium prompt contains expert-engineered parameters and optimized blueprints.'
              : prompt.description}
          </p>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between pt-3.5 border-t border-border">
          <div className="flex items-center gap-3 text-muted-foreground">
            {!isCreation ? (
              <>
                <span className="flex items-center gap-1 text-xs font-medium">
                  <Heart className={cn('w-3.5 h-3.5', favorited && 'text-rose-500 fill-rose-500')} />
                  {prompt.likesCount || 0}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium">
                  <Eye className="w-3.5 h-3.5" />
                  {prompt.viewsCount || 0}
                </span>
              </>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60 flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> Visual Asset
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isLocked && !isCategoryLocked && (
              <Button
                onClick={handleQuickUnlock}
                isLoading={isUnlocking}
                variant="primary"
                size="sm"
                leftIcon={Zap}
                className="px-3 shadow-sm shadow-primary/25"
              >
                {isUnlocking ? '…' : 'Unlock'}
              </Button>
            )}
            <Button
              as={isCreation ? 'a' : Link}
              {...(isCreation ? { href: prompt.imageUrl, target: '_blank' } : { to: prefix(`/prompt/${prompt.slug || prompt.id}`) })}
              variant="secondary"
              size="icon"
              className="w-8 h-8 hover:bg-primary hover:text-primary-foreground"
            >
              {isCreation ? <Eye className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Report modal */}
      <ReportModal prompt={prompt} isOpen={reportOpen} onClose={() => setReportOpen(false)} />

      {/* Category-locked overlay */}
      {isCategoryLocked && isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-background/80 backdrop-blur-[3px]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center gradient-cta shadow-lg mb-3">
            <Lock className="w-4 h-4" />
          </div>
          <p className="text-sm font-bold text-foreground mb-0.5">Pro Members Only</p>
          <p className="text-xs text-muted-foreground mb-4 text-center">This collection is reserved for Pro subscribers.</p>
          <Button
            onClick={(e) => { e.preventDefault(); navigate(prefix('/pricing')); }}
            variant="primary"
            size="sm"
            fullWidth
            className="shadow-lg shadow-primary/20"
          >
            Upgrade to Pro
          </Button>
        </div>
      )}
    </motion.div>
  );
}
