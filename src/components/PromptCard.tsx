import { addDoc, collection, doc, increment, updateDoc } from 'firebase/firestore';
import { ArrowRight, Bookmark, Copy, Check, Eye, Flag, Heart, Lock, MoreHorizontal, Sparkles, Unlock, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../hooks/useConfig';
import { usePath } from '../hooks/usePath';
import { useSavedPrompts } from '../hooks/useSavedPrompts';
import { api } from '../lib/api';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { Prompt } from '../types';
import Rating from './feedback/Rating';
import Button from './primitives/Button';
import ReportModal from './ReportModal';

interface PromptCardProps {
  prompt: Prompt;
  isUnlocked?: boolean;
  onQuickView?: (prompt: Prompt) => void;
}

export default function PromptCard({ prompt, isUnlocked: initialUnlocked = false, onQuickView }: PromptCardProps) {
  const { isFavorited, toggleFavorite, user, profile, isPro, isAdmin } = useAuth();
  const { config } = useConfig();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { prefix } = usePath();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isSaved, toggle: toggleSaved } = useSavedPrompts();
  const menuRef = useRef<HTMLDivElement>(null);

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    toast.success('Prompt copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [imgError, setImgError] = useState(false);

  const favorited = prompt.id ? isFavorited(prompt.id) : false;
  const isCreation = (prompt as any).isCreation;

  const isActuallyUnlocked = true;
  const isLocked = false;

  const category = !isCreation ? config.categories.find(c => c.id === prompt.categoryId) : null;
  const isCategoryLocked = false;

  const handleQuickUnlock = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !profile) {
      toast.error((config as any).msgSignInToUnlock || 'Sign in to unlock prompts');
      navigate(prefix('/login'));
      return;
    }

    setIsUnlocking(true);
    try {
      if (prompt.id) {
        const ref = doc(db, 'users', user.uid);
        const currentUnlocked = profile.unlockedPrompts || [];
        if (!currentUnlocked.includes(prompt.id)) {
          await updateDoc(ref, { unlockedPrompts: [...currentUnlocked, prompt.id] });
          await addDoc(collection(db, 'unlock_events'), {
            userId: user.uid,
            promptId: prompt.id,
            unlockedAt: new Date().toISOString()
          });
        }
      }
      toast.success((config as any).msgPromptUnlocked || 'Prompt unlocked!');
    } catch {
      toast.error((config as any).msgUnlockFailed || 'Failed to unlock prompt');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div
      onClick={() => onQuickView ? onQuickView(prompt) : navigate(prefix(`/prompt/${prompt.slug || prompt.id}`))}
      className="group relative flex flex-col h-full bg-card hover:bg-card/90 rounded-2xl border border-border/60 hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 cursor-pointer overflow-hidden"
    >
      {/* Thumbnail — ratio driven by admin storage config */}
      {(() => {
        const ratio = config.storage?.promptImageRatio ?? '16:9';
        const [rw, rh] = ratio.split(':').map(Number);
        const paddingTop = `${((rh / rw) * 100).toFixed(4)}%`;
        return (
          <div className="relative overflow-hidden bg-muted/60 shrink-0" style={{ paddingTop }}>
            {prompt.imageUrl && !imgError ? (
              <Link to={prefix(`/prompt/${prompt.slug || prompt.id}`)} className="absolute inset-0 block">
                <img
                  src={prompt.imageUrl}
                  alt={prompt.title}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </Link>
            ) : (
              <Link to={prefix(`/prompt/${prompt.slug || prompt.id}`)} className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary/20" />
              </Link>
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
            </>
          )}
        </div>

        {/* Top-right action buttons (Favorite + Options Menu) */}
        {!isCreation && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
            <Button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); prompt.id && toggleFavorite(prompt.id); }}
              variant={favorited ? 'primary' : 'ghost'}
              size="icon"
              className={cn(
                'w-8 h-8 backdrop-blur-md border border-white/10 shadow-lg',
                favorited ? 'bg-rose-500 hover:bg-rose-600 border-rose-500 shadow-rose-500/30' : 'bg-black/40 text-white/60 hover:bg-black/60'
              )}
            >
              <Heart className={cn('w-4 h-4', favorited && 'fill-current')} />
            </Button>

            <div
              ref={menuRef}
              className="relative"
              onClick={e => { e.preventDefault(); e.stopPropagation(); }}
            >
              <Button
                onClick={() => setMenuOpen(v => !v)}
                variant="ghost"
                size="icon"
                className="w-8 h-8 bg-black/40 backdrop-blur-md border border-white/10 text-white/60 hover:bg-black/60 shadow-lg"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>

              {menuOpen && (
                <div className="absolute top-full right-0 mt-1.5 min-w-[170px] bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-xl overflow-hidden z-30 py-1">
                  {user && prompt.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={Bookmark}
                      iconClassName={cn(isSaved(prompt.id!) && 'fill-current text-primary')}
                      onClick={() => {
                        setMenuOpen(false);
                        toggleSaved(prompt.id!, prompt.title, prompt.slug);
                      }}
                      className="w-full justify-start px-3.5 h-10 text-xs font-bold capitalize tracking-normal text-foreground hover:bg-muted/80 rounded-none whitespace-nowrap"
                    >
                      {isSaved(prompt.id!) ? t('promptCard.unsave') : t('promptCard.saveForLater')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={Flag}
                    onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                    className="w-full justify-start px-3.5 h-10 text-xs font-bold capitalize tracking-normal text-rose-500 hover:bg-rose-500/10 rounded-none whitespace-nowrap"
                  >
                    {t('promptCard.report')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
          </div>
        );
      })()}

      {/* Body */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex-1 mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Rating
              value={prompt.avgRating ?? (prompt.likesCount ? Math.min(5, 4.2 + (prompt.likesCount / 200)) : 4.5)}
              precision={0.5}
              readOnly
              size="sm"
            />
          </div>
          <Link to={prefix(`/prompt/${prompt.slug || prompt.id}`)} className="block group/title">
            <h3 className="font-semibold text-base leading-snug mb-1.5 text-foreground group-hover/title:text-primary group-hover:text-primary transition-colors line-clamp-1 font-display">
              {prompt.title}
            </h3>
          </Link>
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

          <div className="flex items-center gap-1.5">
            <Button
              as={isCreation ? 'a' : Link}
              {...(isCreation ? { href: prompt.imageUrl, target: '_blank' } : { to: prefix(`/prompt/${prompt.slug || prompt.id}`) })}
              variant="secondary"
              size="icon"
              className="w-8 h-8 hover:bg-primary hover:text-primary-foreground"
              title="Full Details"
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
          <p className="text-sm font-bold text-foreground mb-0.5">{t('promptCard.pro')} Members Only</p>
          <p className="text-xs text-muted-foreground mb-4 text-center">This collection is reserved for Pro subscribers.</p>
          <Button
            onClick={(e) => { e.preventDefault(); navigate(prefix('/pricing')); }}
            variant="primary"
            size="sm"
            fullWidth
            className="shadow-lg shadow-primary/20"
          >
            {t('pricing.upgrade')}
          </Button>
        </div>
      )}
    </div>
  );
}
