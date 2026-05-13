import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { Clock, Database, Heart, LayoutGrid, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PromptCard from '../components/PromptCard';
import Button from '../components/primitives/Button';
import Progress from '../components/feedback/Progress';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../hooks/useConfig';
import { db } from '../lib/firebase';
import { usePath } from '../hooks/usePath';
import { Prompt } from '../types';
import { History } from 'lucide-react';

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
  const [myPrompts, setMyPrompts] = useState<Prompt[]>([]);
  const [favorites, setFavorites] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const q = query(collection(db, 'prompts'), where('creatorId', '==', user.uid));
        const qSnap = await getDocs(q);
        setMyPrompts(qSnap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt)));

        const favRef = collection(db, 'users', user.uid, 'favorites');
        const favSnap = await getDocs(favRef);
        const favPromptIds = favSnap.docs.map(d => d.data().promptId);

        if (favPromptIds.length > 0) {
          const pQuery = query(
            collection(db, 'prompts'),
            where('__name__', 'in', favPromptIds.slice(0, 10))
          );
          const pSnap = await getDocs(pQuery);
          setFavorites(pSnap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt)));
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

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Loading Dashboard...</div>;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-card rounded-lg p-8 border border-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Sparkles className="w-64 h-64 text-primary rotate-12" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <img
              src={profile?.photoURL || undefined}
              className="w-14 h-14 rounded-lg bg-muted object-cover border border-border"
              alt=""
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Hello, {profile?.displayName?.split(' ')[0] || 'Creator'}!
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${isPro ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                  {profile?.subscriptionStatus} Plan
                </span>
                <span className="text-muted-foreground text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'recently'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto lg:min-w-[280px]">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex justify-between items-start mb-3">
                <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center text-primary">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-foreground">{profile?.credits || 0}</span>
              </div>
              <Progress
                value={profile?.credits || 0}
                max={profile?.monthlyLimit || 50}
                size="xs"
                variant="default"
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Credits</span><span>{profile?.monthlyLimit || 50} max</span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex justify-between items-start mb-3">
                <div className="w-8 h-8 bg-amber-500/10 rounded-md flex items-center justify-center text-amber-500">
                  <Database className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-foreground">
                  {isPro ? '∞' : (profile?.unlockedPrompts || []).length}
                </span>
              </div>
              <Progress
                value={isPro ? 10 : (profile?.unlockedPrompts || []).length}
                max={isPro ? 10 : (config?.vaultLimit || 10)}
                size="xs"
                variant={(!isPro && (profile?.unlockedPrompts || []).length >= (config?.vaultLimit || 10) - 1) ? 'error' : 'warning'}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Vault</span><span>{isPro ? 'Unlimited' : `${config?.vaultLimit || 10} slots`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-muted rounded-md w-fit">
          <TabButton active={activeTab === 'library'} onClick={() => handleTabChange('library')} icon={LayoutGrid}>
            My Library
          </TabButton>
          <TabButton active={activeTab === 'favorites'} onClick={() => handleTabChange('favorites')} icon={Heart}>
            Favorites
          </TabButton>
          {isAdmin && (
            <Link
              to={prefix('/admin')}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-primary hover:bg-card transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </Link>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'library' && (
          <motion.div
            key="library"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {myPrompts.length > 0
              ? myPrompts.map(p => <PromptCard key={p.id} prompt={p} />)
              : (
                <EmptyState
                  icon={History}
                  title="Your library is empty"
                  desc="Prompts you publish to the marketplace will appear here."
                  onBtnClick={() => navigate(prefix('/explore'))}
                  btnText="Explore Marketplace"
                />
              )}
          </motion.div>
        )}

        {activeTab === 'favorites' && (
          <motion.div
            key="favorites"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {favorites.length > 0
              ? favorites.map(p => (
                  <PromptCard
                    key={p.id}
                    prompt={p}
                    isUnlocked={(profile?.unlockedPrompts || []).includes(p.id!)}
                  />
                ))
              : (
                <EmptyState
                  icon={Heart}
                  title="No favorites yet"
                  desc="Browse the marketplace and save prompts to your collection."
                  onBtnClick={() => navigate(prefix('/explore'))}
                  btnText="Explore Marketplace"
                />
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }: any) {
  return (
    <Button
      onClick={onClick}
      variant={active ? 'white' : 'ghost'}
      size="sm"
      leftIcon={Icon}
      className={active ? 'shadow-sm' : ''}
    >
      {children}
    </Button>
  );
}

function EmptyState({ icon: Icon, title, desc, onBtnClick, btnText }: any) {
  return (
    <div className="col-span-full py-20 bg-muted/30 border border-border border-dashed rounded-lg text-center">
      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4 text-muted-foreground">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">{desc}</p>
      <Button onClick={onBtnClick} variant="primary">{btnText}</Button>
    </div>
  );
}
