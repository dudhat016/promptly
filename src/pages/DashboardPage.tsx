import {
  collection, getDocs, query, where, orderBy, limit, doc, getDoc, Timestamp
} from 'firebase/firestore';
import {
  Bell, Check, Clock, Copy, Database, ExternalLink, Gift, Heart,
  History, LayoutGrid, PlusCircle, RefreshCw, ShieldCheck, Sparkles, TrendingUp,
  User, Zap, ArrowRight, CreditCard, Star
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PromptCard from '../components/PromptCard';
import Button from '../components/primitives/Button';
import Progress from '../components/feedback/Progress';
import Badge from '../components/primitives/Badge';
import { useAuth } from '../hooks/useAuth';
import { useConfig } from '../hooks/useConfig';
import { useNotifications } from '../hooks/useNotifications';
import { db } from '../lib/firebase';
import { usePath } from '../hooks/usePath';
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
  const [myPrompts, setMyPrompts]     = useState<Prompt[]>([]);
  const [favorites, setFavorites]     = useState<Prompt[]>([]);
  const [loading, setLoading]         = useState(true);
  const [referralCount, setReferralCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [orders, setOrders]           = useState<any[]>([]);
  const [copied, setCopied]           = useState(false);
  const [planData, setPlanData]       = useState<any>(null);

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

        // Referral count
        const refCode = profile?.referralCode;
        if (refCode) {
          const refSnap = await getDocs(query(collection(db, 'referrals'), where('referrerId', '==', user.uid)));
          setReferralCount(refSnap.size);
        }

        // Recent activity (credit history)
        try {
          const actSnap = await getDocs(
            query(collection(db, 'credits_history'), where('userId', '==', user.uid),
              orderBy('createdAt', 'desc'), limit(5))
          );
          setRecentActivity(actSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch { /* optional */ }

        // Orders
        try {
          const ordSnap = await getDocs(query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(3)));
          setOrders(ordSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch { /* optional */ }

        // Active plan details
        if (profile?.activePlanId) {
          try {
            const planSnap = await getDoc(doc(db, 'plans', profile.activePlanId));
            if (planSnap.exists()) setPlanData({ id: planSnap.id, ...planSnap.data() });
          } catch { /* optional */ }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, profile?.referralCode, profile?.activePlanId]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'favorites') setActiveTab('favorites');
    else if (tab === 'library') setActiveTab('library');
  }, [searchParams]);

  const handleTabChange = (tab: 'library' | 'favorites') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}${prefix('/')}?ref=${profile?.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const { unreadCount } = useNotifications();

  const creditsUsed   = (profile?.monthlyLimit || 50) - (profile?.credits || 0);
  const creditsTotal  = profile?.monthlyLimit || 50;
  const creditsPct    = Math.round((creditsUsed / creditsTotal) * 100);
  const creditsLow    = creditsPct >= 80;
  const vaultUsed     = isPro ? null : (profile?.unlockedPrompts || []).length;
  const vaultMax      = isPro ? null : (config?.vaultLimit || 10);
  const nextBilling   = profile?.currentPeriodEnd?.toDate ? profile.currentPeriodEnd.toDate() : null;
  const earnings      = profile?.affiliateEarnings || 0;
  const referralCode  = profile?.referralCode || '';

  if (authLoading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">

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
                <Badge variant={isPro ? 'warning' : 'default'} size="sm" dot={isPro}>
                  {profile?.subscriptionStatus?.toUpperCase() || 'FREE'} Plan
                </Badge>
                <span className="text-muted-foreground text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Joined {profile?.createdAt ? parseDate(profile.createdAt).toLocaleDateString() : 'recently'}
                </span>
                {nextBilling && (
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Renews {nextBilling.toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button as={Link} to={prefix('/explore')} variant="outline" size="sm" leftIcon={LayoutGrid}>
              Explore
            </Button>
            <Button as={Link} to={prefix('/dashboard/submit')} variant="outline" size="sm" leftIcon={PlusCircle}>
              New Prompt
            </Button>
            {isPro ? (
              <Button as={Link} to={prefix('/settings/billing')} variant="outline" size="sm" leftIcon={CreditCard}>
                Manage Plan
              </Button>
            ) : (
              <Button as={Link} to={prefix('/pricing')} variant="primary" size="sm" leftIcon={Zap}>
                Upgrade to Pro
              </Button>
            )}
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
          to={prefix('/notifications')}
          className="flex items-center gap-3 px-4 py-3 bg-primary/8 border border-primary/15 rounded-xl text-sm hover:bg-primary/12 transition-colors"
        >
          <Bell className="w-4 h-4 text-primary shrink-0" />
          <span className="text-foreground font-medium flex-1">
            You have <span className="font-bold text-primary">{unreadCount}</span> unread notification{unreadCount !== 1 ? 's' : ''}.
          </span>
          <span className="text-xs font-bold text-primary shrink-0">View →</span>
        </Link>
      )}

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: Zap,
            label: 'Credits Left',
            value: profile?.credits ?? 0,
            sub: `${creditsPct}% used of ${creditsTotal}`,
            accent: creditsLow ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary',
            progress: { value: creditsUsed, max: creditsTotal, variant: creditsLow ? 'error' : 'default' as any },
            href: prefix('/dashboard/usage'),
          },
          {
            icon: Database,
            label: isPro ? 'Vault Access' : 'Vault Used',
            value: isPro ? '∞' : `${vaultUsed}/${vaultMax}`,
            sub: isPro ? 'Unlimited prompts' : `${Math.max(0, (vaultMax || 10) - (vaultUsed || 0))} slots free`,
            accent: 'bg-amber-500/10 text-amber-500',
            progress: !isPro ? { value: vaultUsed || 0, max: vaultMax || 10, variant: 'warning' as any } : null,
            href: prefix('/dashboard/vault'),
          },
          {
            icon: LayoutGrid,
            label: 'My Prompts',
            value: loading ? '—' : myPrompts.length,
            sub: 'Your submitted prompts',
            accent: 'bg-purple-500/10 text-purple-500',
            href: prefix('/dashboard/library'),
          },
          {
            icon: Gift,
            label: earnings > 0 ? 'Referral Earnings' : 'Referrals',
            value: earnings > 0 ? `₹${earnings}` : referralCount,
            sub: earnings > 0 ? `${referralCount} friend${referralCount !== 1 ? 's' : ''} referred` : `Share & earn commissions`,
            accent: 'bg-emerald-500/10 text-emerald-500',
            href: prefix('/dashboard/affiliate'),
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

      {/* ── AI Twin Studio Teaser ── */}
      <div className="bg-gradient-to-r from-violet-500/10 via-primary/5 to-transparent border border-violet-500/20 rounded-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">AI Twin Studio</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Train a personal AI on your style and generate custom prompts automatically.</p>
        </div>
        <Button as={Link} to={prefix('/dashboard/twin-studio')} variant="outline" size="sm" rightIcon={ArrowRight} className="shrink-0">
          Try it
        </Button>
      </div>

      {/* ── Middle Row: Referral + Plan ── */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Referral Widget */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Gift className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Referral Program</h3>
                <p className="text-[11px] text-muted-foreground">Earn on every friend who subscribes</p>
              </div>
            </div>
            {earnings > 0 && (
              <Badge variant="success" size="sm">₹{earnings} earned</Badge>
            )}
          </div>

          {referralCode ? (
            <>
              <div className="flex gap-2">
                <div className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 font-mono text-sm font-bold text-foreground tracking-widest">
                  {referralCode}
                </div>
                <button
                  onClick={copyReferralLink}
                  className="px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Copy referral link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => window.open(`${window.location.origin}${prefix('/')}?ref=${referralCode}`, '_blank')}
                  className="px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Open referral link"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Friends', value: referralCount },
                  { label: 'Earned', value: `₹${earnings}` },
                  { label: 'Commission', value: '25%' },
                ].map(s => (
                  <div key={s.label} className="bg-muted/40 rounded-lg py-2.5">
                    <p className="text-base font-bold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {earnings > 0 && (
                <Button
                  as={Link}
                  to={prefix('/settings/affiliate')}
                  variant="outline"
                  size="sm"
                  fullWidth
                  rightIcon={ArrowRight}
                >
                  View Earnings & Withdraw
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Your referral code will appear once your account is set up.</p>
          )}
        </div>

        {/* Plan & Billing Status */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPro ? 'bg-amber-500/10' : 'bg-muted'}`}>
                <Star className={`w-4 h-4 ${isPro ? 'text-amber-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {planData?.name || profile?.subscriptionStatus || 'Free'} Plan
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {nextBilling
                    ? `${profile?.autoPayEnabled ? 'Renews' : 'Expires'} ${nextBilling.toLocaleDateString()}`
                    : isPro ? 'Active subscription' : 'No active subscription'}
                </p>
              </div>
            </div>
            <Badge variant={isPro ? 'warning' : 'default'} size="sm">
              {profile?.subscriptionStatus?.toUpperCase() || 'FREE'}
            </Badge>
          </div>

          {/* Credit meter */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>Monthly credits</span>
              <span className={creditsLow ? 'text-rose-500 font-bold' : ''}>
                {creditsUsed} / {creditsTotal} used
              </span>
            </div>
            <Progress
              value={creditsUsed}
              max={creditsTotal}
              size="sm"
              variant={creditsLow ? 'error' : creditsPct >= 60 ? 'warning' : 'default'}
            />
            {creditsLow && !isPro && (
              <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Running low — upgrade to get more credits
              </p>
            )}
          </div>

          {/* Vault meter */}
          {!isPro && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Prompt vault</span>
                <span>{vaultUsed} / {vaultMax} slots</span>
              </div>
              <Progress value={vaultUsed || 0} max={vaultMax || 10} size="sm" variant="warning" />
            </div>
          )}

          {/* Recent orders */}
          {orders.length > 0 && (
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent Orders</p>
              {orders.slice(0, 2).map(o => (
                <div key={o.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{o.planName || o.plan || 'Subscription'}</span>
                  <span className="font-bold text-foreground">
                    {o.currency === 'INR' ? '₹' : '$'}{o.amount}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!isPro ? (
            <Button as={Link} to={prefix('/pricing')} variant="primary" size="sm" fullWidth leftIcon={Zap}>
              Upgrade to Pro
            </Button>
          ) : (
            <Button as={Link} to={prefix('/settings/billing')} variant="outline" size="sm" fullWidth leftIcon={CreditCard}>
              Manage Subscription
            </Button>
          )}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" /> Recent Activity
          </h3>
          {recentActivity.length > 0 && (
            <Link to={prefix('/dashboard/credits')} className="text-xs font-bold text-primary hover:underline">
              View all
            </Link>
          )}
        </div>
        {recentActivity.length > 0 ? (
          <div className="space-y-2">
            {recentActivity.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs
                    ${a.type === 'unlock' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {a.type === 'unlock' ? <Database className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{a.promptTitle || a.description || 'Credit used'}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {a.createdAt ? parseDate(a.createdAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold ${a.delta > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {a.delta > 0 ? '+' : ''}{a.delta || -1}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No activity yet.</p>
            <Link to={prefix('/explore')} className="text-xs font-bold text-primary hover:underline mt-1 inline-block">
              Explore prompts to get started →
            </Link>
          </div>
        )}
      </div>

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
