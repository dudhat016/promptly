import {
  arrayUnion, addDoc, collection, getDocs, query, where, orderBy,
  limit, doc, getDoc, Timestamp, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import {
  BarChart3, Bell, Bot, Check, Clock, Code2, Copy, CreditCard,
  Database, Download, ExternalLink, FolderKanban, Flame, Gift, Heart,
  History, LayoutGrid, MailCheck, PlusCircle, RefreshCw, ShieldCheck, Sparkles,
  Star, Trophy, User, Zap, ArrowRight, AlertCircle,
} from 'lucide-react';
import { calculatePromptScore, getAffinityProfile } from '../lib/affinity';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PromptCard from '../components/PromptCard';
import Button from '../components/primitives/Button';
import Progress from '../components/feedback/Progress';
import Spinner from '../components/feedback/Spinner';
import Badge from '../components/primitives/Badge';
import Card from '../components/primitives/Card';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../hooks/useConfig';
import { useNotifications } from '../hooks/useNotifications';
import { db, auth } from '../lib/firebase';
import { usePath } from '../hooks/usePath';
import { useStreak } from '../hooks/useStreak';

import ProfileCompletionCard from '../components/dashboard/ProfileCompletionCard';
import FollowingFeedCard from '../components/dashboard/FollowingFeedCard';
import { EmailService } from '../services/emailService';
import { Prompt } from '../types';
import { toast } from 'react-hot-toast';

const parseDate = (date: any): Date => {
  if (!date) return new Date();
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === 'object' && date.seconds) return new Date(date.seconds * 1000);
  const parsed = new Date(date);
  return parsed.toString() !== 'Invalid Date' ? parsed : new Date();
};

export default function DashboardPage() {
  const { user, profile, loading: authLoading, isPro, isAdmin } = useAuth();
  const { config } = useConfig();
  const { prefix } = usePath();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'library' | 'favorites'>(
    (searchParams.get('tab') as any) === 'favorites' ? 'favorites' : 'library'
  );
  const [myPrompts, setMyPrompts]         = useState<Prompt[]>([]);
  const [favorites, setFavorites]         = useState<Prompt[]>([]);
  const [forYouPrompts, setForYouPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading]             = useState(true);
  const [verifCooldown, setVerifCooldown] = useState(() => {
    const sent = parseInt(localStorage.getItem('verifEmailSentAt') || '0', 10);
    const elapsed = Math.floor((Date.now() - sent) / 1000);
    return Math.max(0, 60 - elapsed);
  });

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // My prompts
        const promptsSnap = await getDocs(query(collection(db, 'prompts'), where('creatorId', '==', user.uid)));
        setMyPrompts(promptsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt)));

        // Favorites
        const favSnap = await getDocs(collection(db, 'users', user.uid, 'favorites'));
        const favIds  = favSnap.docs.map(d => d.data().promptId);
        if (favIds.length > 0) {
          const pSnap = await getDocs(query(collection(db, 'prompts'), where('__name__', 'in', favIds.slice(0, 10))));
          setFavorites(pSnap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt)));
        }





        // For You prompts — scored by affinity profile seeded at onboarding
        if (profile?.interests?.length) {
          try {
            const affinityProfile = getAffinityProfile();
            const fySnap = await getDocs(
              query(collection(db, 'prompts'), where('status', '==', 'approved'), limit(40))
            );
            const fyAll = fySnap.docs
              .map(d => ({ ...d.data(), id: d.id } as Prompt))
              .filter(p => p.moderationStatus !== 'hidden');
            const fyScored = fyAll
              .map(p => ({ p, score: calculatePromptScore(p, affinityProfile) }))
              .filter(x => x.score > 0)
              .sort((a, b) => b.score - a.score)
              .slice(0, 6)
              .map(x => x.p);
            setForYouPrompts(fyScored);
          } catch { /* optional */ }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'favorites') setActiveTab('favorites');
    else if (tab === 'library') setActiveTab('library');
  }, [searchParams]);

  const handleTabChange = (tab: 'library' | 'favorites') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };



  const { unreadCount } = useNotifications();
  const { streak, longest, isNewRecord } = useStreak();
  // Tick down the email verification cooldown
  useEffect(() => {
    if (verifCooldown <= 0) return;
    const id = setInterval(() => setVerifCooldown(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [verifCooldown]);



  if (authLoading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner size="md" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Email Verification Banner ── */}
      {user && !user.emailVerified && (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-amber-700 flex-1">
            Please verify your email address to unlock all features.
          </p>
          {verifCooldown > 0 ? (
            <span className="flex items-center gap-1.5 text-amber-600 font-semibold text-xs whitespace-nowrap">
              <MailCheck className="w-4 h-4" /> Sent — resend in {verifCooldown}s
            </span>
          ) : (
            <button
              onClick={async () => {
                if (!auth.currentUser) return;
                try {
                  await sendEmailVerification(auth.currentUser);
                  localStorage.setItem('verifEmailSentAt', String(Date.now()));
                  setVerifCooldown(60);
                  toast.success('Verification email sent!');
                } catch (err: any) {
                  if (err?.code === 'auth/too-many-requests') {
                    toast.error('Too many attempts — please wait a minute before trying again.');
                    setVerifCooldown(60);
                  } else {
                    toast.error('Failed to send verification email.');
                  }
                }
              }}
              className="text-amber-700 font-semibold underline underline-offset-2 hover:text-amber-800 whitespace-nowrap"
            >
              Resend email
            </button>
          )}
        </div>
      )}

      {/* ── Welcome Banner ── */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <Sparkles className="w-64 h-64 text-primary rotate-12" />
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            {profile?.photoURL ? (
              <img src={profile.photoURL} className="w-14 h-14 rounded-xl object-cover border border-border shrink-0" alt="" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
                {profile?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Hello, {profile?.displayName?.split(' ')[0] || 'Creator'}!
              </h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">

                {streak > 1 && (
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                    isNewRecord
                      ? 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400'
                      : 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400'
                  }`}>
                    <Flame className="w-3 h-3" />
                    {streak}-day streak
                    {isNewRecord && <Trophy className="w-3 h-3 ml-0.5" />}
                  </span>
                )}
                <span className="text-muted-foreground text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Joined {profile?.createdAt ? parseDate(profile.createdAt).toLocaleDateString() : 'recently'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button as={Link} to={prefix('/explore')} variant="outline" size="sm" leftIcon={LayoutGrid}>
              Explore
            </Button>
            <Button as={Link} to={prefix('/dashboard/library/submit')} variant="outline" size="sm" leftIcon={PlusCircle}>
              New Prompt
            </Button>

            {isAdmin && (
              <Button as={Link} to={prefix('/admin')} variant="outline" size="sm" leftIcon={ShieldCheck}>
                Admin
              </Button>
            )}
          </div>
        </div>
      </div>


      {/* ── Nudge Banners ── */}
      {!profile?.displayName && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm">
          <User className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-amber-700 dark:text-amber-400 font-medium flex-1">
            Complete your profile to personalise your experience.
          </span>
          <Link to={prefix('/settings/profile')} className="text-xs font-bold text-amber-600 dark:text-amber-300 hover:underline shrink-0">
            Set up →
          </Link>
        </div>
      )}
      {unreadCount > 0 && (
        <Link
          to={prefix('/dashboard/notifications')}
          className="flex items-center gap-3 px-4 py-3 bg-primary/8 border border-primary/15 rounded-xl text-sm hover:bg-primary/12 transition-colors"
        >
          <Bell className="w-4 h-4 text-primary shrink-0" />
          <span className="text-foreground font-medium flex-1">
            You have <span className="font-bold text-primary">{unreadCount}</span> unread notification{unreadCount !== 1 ? 's' : ''}.
          </span>
          <span className="text-xs font-bold text-primary shrink-0">View →</span>
        </Link>
      )}



      {/* ── Profile Completion ── */}
      {profile && user && (
        <div className="max-w-xl">
          <ProfileCompletionCard profile={profile} userId={user.uid} />
        </div>
      )}

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: Database,
            label: 'Vault Access',
            value: '∞',
            sub: 'Unlimited prompts',
            accent: 'bg-amber-500/10 text-amber-500',
            progress: null,
          },
          {
            icon: LayoutGrid,
            label: 'My Prompts',
            value: loading ? '—' : myPrompts.length,
            sub: 'Your submitted prompts',
            accent: 'bg-purple-500/10 text-purple-500',
            href: prefix('/dashboard/library'),
          },

        ].map(card => {
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.accent}`}>
                  <card.icon className="w-4 h-4" />
                </div>
                <span className="text-lg font-bold text-foreground">{card.value}</span>
              </div>
              {card.progress && (
                <Progress value={card.progress.value} max={card.progress.max} size="xs" variant={card.progress.variant} />
              )}
              <div>
                <p className="text-xs font-semibold text-foreground">{card.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</p>
              </div>
            </>
          );
          return card.href ? (
            <Link
              key={card.label}
              to={card.href}
              className="bg-card border border-border rounded-xl p-4 space-y-2 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              {inner}
            </Link>
          ) : (
            <div key={card.label} className="bg-card border border-border rounded-xl p-4 space-y-2">
              {inner}
            </div>
          );
        })}
      </div>

      {/* ── For You ── */}
      {profile?.interests?.length && (forYouPrompts.length > 0 || loading) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Recommended For You
              </h3>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {profile.interests.slice(0, 5).map(tag => (
                  <span key={tag} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <Link to={prefix('/explore')} className="text-xs font-bold text-primary hover:underline shrink-0">
              View all →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-44 bg-muted/40 rounded-xl animate-pulse" />
                ))
              : forYouPrompts.slice(0, 3).map(p => (
                  <PromptCard key={p.id} prompt={p} isUnlocked={(profile?.unlockedPrompts || []).includes(p.id!)} />
                ))
            }
          </div>
        </div>
      )}

      {/* ── Following Feed ── */}
      {(profile?.following?.length ?? 0) > 0 && (
        <FollowingFeedCard following={profile?.following ?? []} />
      )}



      {/* ── Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          <TabButton active={activeTab === 'library'} onClick={() => handleTabChange('library')} icon={LayoutGrid}>
            My Library
          </TabButton>
          <TabButton active={activeTab === 'favorites'} onClick={() => handleTabChange('favorites')} icon={Heart}>
            Favorites ({loading ? '—' : favorites.length})
          </TabButton>
        </div>
        {activeTab === 'library' && (
          <Button as={Link} to={prefix('/explore')} variant="outline" size="sm" rightIcon={ArrowRight}>
            Explore Marketplace
          </Button>
        )}
      </div>

      {/* ── Prompt Grid ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'library' && (
          <motion.div key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-48 bg-muted/40 rounded-xl animate-pulse" />
                ))
              : myPrompts.length > 0
                ? myPrompts.map(p => <PromptCard key={p.id} prompt={p} />)
                : (
                  <EmptyState
                    icon={History}
                    title="Your library is empty"
                    desc="Prompts you publish to the marketplace will appear here."
                    onBtnClick={() => navigate(prefix('/explore'))}
                    btnText="Explore Marketplace"
                  />
                )
            }
          </motion.div>
        )}

        {activeTab === 'favorites' && (
          <motion.div key="favorites" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-48 bg-muted/40 rounded-xl animate-pulse" />
                ))
              : favorites.length > 0
                ? favorites.map(p => (
                    <PromptCard key={p.id} prompt={p} isUnlocked={(profile?.unlockedPrompts || []).includes(p.id!)} />
                  ))
                : (
                  <EmptyState
                    icon={Heart}
                    title="No favorites yet"
                    desc="Browse the marketplace and save prompts you love."
                    onBtnClick={() => navigate(prefix('/explore'))}
                    btnText="Browse Prompts"
                  />
                )
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }: any) {
  return (
    <Button onClick={onClick} variant={active ? 'white' : 'ghost'} size="sm" leftIcon={Icon}
      className={active ? 'shadow-sm' : ''}>
      {children}
    </Button>
  );
}

function EmptyState({ icon: Icon, title, desc, onBtnClick, btnText }: any) {
  return (
    <div className="col-span-full py-16 bg-muted/30 border border-border border-dashed rounded-xl text-center">
      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4 text-muted-foreground">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">{desc}</p>
      <Button onClick={onBtnClick} variant="primary">{btnText}</Button>
    </div>
  );
}
