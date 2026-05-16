import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  BookOpen, CheckCircle, Clock, Copy, Eye, Heart,
  Plus, TrendingUp, XCircle, Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PromptCard from '../../components/PromptCard';
import PromptCardSkeleton from '../../components/PromptCardSkeleton';
import Button from '../../components/primitives/Button';
import { useAuth } from '../../hooks/useAuth';
import { usePath } from '../../hooks/usePath';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { Prompt } from '../../types';

type TabKey = 'all' | 'approved' | 'pending' | 'rejected';

const STATUS_CONFIG = {
  pending:  { icon: Clock,        label: 'Under Review', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  approved: { icon: CheckCircle,  label: 'Published',    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  rejected: { icon: XCircle,      label: 'Rejected',     className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

function StatusBadge({ status }: { status?: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border', cfg.className)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function StatChip({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-3 bg-card border border-border rounded-xl min-w-[90px]">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-lg font-bold text-foreground tabular-nums">{value.toLocaleString()}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
    </div>
  );
}

function PromptStats({ prompt }: { prompt: Prompt }) {
  const stats = [
    { icon: Eye,   value: prompt.viewsCount  || 0, label: 'views'  },
    { icon: Heart, value: prompt.likesCount  || 0, label: 'likes'  },
    { icon: Copy,  value: prompt.copiesCount || 0, label: 'copies' },
  ];
  return (
    <div className="flex items-center gap-3 mt-2 px-1">
      {stats.map(({ icon: Icon, value, label }) => (
        <span key={label} className="flex items-center gap-1 text-xs text-muted-foreground">
          <Icon className="w-3 h-3" />
          <span className="font-semibold tabular-nums">{value.toLocaleString()}</span>
          <span className="hidden sm:inline">{label}</span>
        </span>
      ))}
    </div>
  );
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',      label: 'All'          },
  { key: 'approved', label: 'Published'    },
  { key: 'pending',  label: 'Under Review' },
  { key: 'rejected', label: 'Rejected'     },
];

export default function DashboardLibrary() {
  const { user } = useAuth();
  const { prefix } = usePath();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const q = query(collection(db, 'prompts'), where('creatorId', '==', user.uid));
        const qSnap = await getDocs(q);
        setPrompts(qSnap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const approvedPrompts = useMemo(() => prompts.filter(p => p.status === 'approved'), [prompts]);
  const pendingPrompts  = useMemo(() => prompts.filter(p => p.status === 'pending'),  [prompts]);
  const rejectedPrompts = useMemo(() => prompts.filter(p => p.status === 'rejected'), [prompts]);

  const totalViews  = useMemo(() => approvedPrompts.reduce((s, p) => s + (p.viewsCount  || 0), 0), [approvedPrompts]);
  const totalLikes  = useMemo(() => approvedPrompts.reduce((s, p) => s + (p.likesCount  || 0), 0), [approvedPrompts]);
  const totalCopies = useMemo(() => approvedPrompts.reduce((s, p) => s + (p.copiesCount || 0), 0), [approvedPrompts]);

  const topPrompt = useMemo(() =>
    approvedPrompts.length > 1
      ? [...approvedPrompts].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))[0]
      : null,
    [approvedPrompts]
  );

  const visiblePrompts = useMemo(() => {
    if (activeTab === 'approved') return approvedPrompts;
    if (activeTab === 'pending')  return pendingPrompts;
    if (activeTab === 'rejected') return rejectedPrompts;
    return prompts;
  }, [activeTab, prompts, approvedPrompts, pendingPrompts, rejectedPrompts]);

  const tabCount = (key: TabKey) => {
    if (key === 'all')      return prompts.length;
    if (key === 'approved') return approvedPrompts.length;
    if (key === 'pending')  return pendingPrompts.length;
    if (key === 'rejected') return rejectedPrompts.length;
    return 0;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs mb-2">
            <BookOpen className="w-4 h-4" />
            My Contributions
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">My Creations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Prompts you've submitted to the marketplace.
          </p>
        </div>
        <Button
          as={Link}
          to={prefix('/dashboard/library/submit')}
          variant="primary"
          size="sm"
          leftIcon={Plus}
          className="shrink-0 shadow-sm shadow-primary/20"
        >
          Submit Prompt
        </Button>
      </div>

      {/* Analytics Strip (only when there are approved prompts) */}
      {!loading && approvedPrompts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-3 mb-8"
        >
          <StatChip icon={BookOpen}    value={approvedPrompts.length} label="Published"  />
          <StatChip icon={Eye}         value={totalViews}             label="Total Views" />
          <StatChip icon={Heart}       value={totalLikes}             label="Total Likes" />
          <StatChip icon={Copy}        value={totalCopies}            label="Total Copies" />
          {topPrompt && (
            <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
              <TrendingUp className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Top Prompt</p>
                <p className="text-xs font-bold text-foreground truncate max-w-[160px]">{topPrompt.title}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Tabs */}
      {!loading && prompts.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border w-fit mb-6">
          {TABS.map(({ key, label }) => {
            const count = tabCount(key);
            if (key !== 'all' && count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
                  activeTab === key
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
                {key !== 'all' && (
                  <span className={cn(
                    'text-[10px] font-black px-1.5 py-0.5 rounded-full',
                    key === 'pending'  ? 'bg-amber-500/15 text-amber-600' :
                    key === 'rejected' ? 'bg-rose-500/15 text-rose-600'   :
                                         'bg-emerald-500/15 text-emerald-600'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <PromptCardSkeleton key={i} />)}
        </div>
      ) : visiblePrompts.length > 0 ? (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {visiblePrompts.map(p => (
            <div key={p.id} className="relative">
              <PromptCard prompt={p} />
              {/* Status badge overlay for non-approved */}
              {p.status && p.status !== 'approved' && (
                <div className="absolute top-3 left-3 z-20">
                  <StatusBadge status={p.status} />
                </div>
              )}
              {/* Top-performing badge */}
              {topPrompt && p.id === topPrompt.id && (
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  <TrendingUp className="w-3 h-3" /> Top
                </div>
              )}
              {/* Per-prompt stats */}
              {p.status === 'approved' && <PromptStats prompt={p} />}
              {/* Rejection reason */}
              {p.status === 'rejected' && p.rejectionReason && (
                <div className="mt-2 p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg">
                  <p className="text-xs text-rose-600 font-medium">
                    <span className="font-bold">Rejection reason:</span> {p.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          ))}
        </motion.div>
      ) : prompts.length === 0 ? (
        <div className="py-24 bg-muted/30 rounded-2xl border border-border border-dashed text-center">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">No submissions yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            Submit a prompt to the marketplace. It'll appear here after our team reviews it.
          </p>
          <Button as={Link} to={prefix('/dashboard/library/submit')} variant="primary" leftIcon={Plus}>
            Submit Your First Prompt
          </Button>
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground">
          <Zap className="w-8 h-8 mx-auto mb-3 text-muted-foreground/20" />
          <p className="font-semibold">No {activeTab === 'pending' ? 'pending' : activeTab === 'rejected' ? 'rejected' : ''} prompts</p>
        </div>
      )}
    </div>
  );
}
