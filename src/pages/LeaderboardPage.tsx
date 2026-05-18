import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import {
  Award, Copy, Eye, Heart, Trophy, Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { usePath } from '../hooks/usePath';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';

type LeaderTab = 'views' | 'likes' | 'copies' | 'creators';

interface PromptRow {
  id: string;
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  model?: string;
  creatorName?: string;
  viewsCount?: number;
  likesCount?: number;
  copiesCount?: number;
  isPaid?: boolean;
}

interface CreatorRow {
  id: string;
  displayName: string;
  username?: string;
  photoURL?: string;
  followerCount?: number;
  promptCount?: number;
  bio?: string;
}

const MEDAL: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' };

const TAB_CONFIG: { key: LeaderTab; label: string; icon: React.ElementType; field?: string }[] = [
  { key: 'views',    label: 'Most Viewed',  icon: Eye,    field: 'viewsCount'   },
  { key: 'likes',    label: 'Most Liked',   icon: Heart,  field: 'likesCount'   },
  { key: 'copies',   label: 'Most Copied',  icon: Copy,   field: 'copiesCount'  },
  { key: 'creators', label: 'Top Creators', icon: Users                          },
];

function PromptRankRow({ prompt, rank }: { prompt: PromptRow; rank: number }) {
  const { prefix } = usePath();
  return (
    <Link
      to={prefix(`/prompt/${prompt.slug || prompt.id}`)}
      className="group flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
    >
      {/* Rank */}
      <div className="w-10 text-center shrink-0">
        {rank < 3
          ? <span className="text-xl">{MEDAL[rank]}</span>
          : <span className="text-base font-black text-muted-foreground/50">#{rank + 1}</span>
        }
      </div>

      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
        {prompt.imageUrl
          ? <img src={prompt.imageUrl} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-xs font-bold uppercase">AI</div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">{prompt.title}</p>
          {prompt.isPaid && (
            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">Pro</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{prompt.creatorName || 'Creator'}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 shrink-0 text-xs font-bold text-muted-foreground">
        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-primary/50" />{(prompt.viewsCount ?? 0).toLocaleString()}</span>
        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-400" />{(prompt.likesCount ?? 0).toLocaleString()}</span>
        <span className="hidden sm:flex items-center gap-1"><Copy className="w-3.5 h-3.5 text-emerald-500" />{(prompt.copiesCount ?? 0).toLocaleString()}</span>
      </div>
    </Link>
  );
}

function CreatorRankRow({ creator, rank }: { creator: CreatorRow; rank: number }) {
  const { prefix } = usePath();
  return (
    <Link
      to={prefix(`/creator/${creator.id}`)}
      className="group flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
    >
      {/* Rank */}
      <div className="w-10 text-center shrink-0">
        {rank < 3
          ? <span className="text-xl">{MEDAL[rank]}</span>
          : <span className="text-base font-black text-muted-foreground/50">#{rank + 1}</span>
        }
      </div>

      {/* Avatar */}
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
        {creator.photoURL
          ? <img src={creator.photoURL} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-lg font-black text-muted-foreground/40">
              {(creator.displayName || '?').charAt(0).toUpperCase()}
            </div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">{creator.displayName}</p>
        {creator.username && (
          <p className="text-xs text-muted-foreground truncate">@{creator.username}</p>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 shrink-0 text-xs font-bold text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-primary/50" />{(creator.followerCount ?? 0).toLocaleString()} followers</span>
        {creator.promptCount !== undefined && (
          <span className="hidden sm:flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-amber-400" />{creator.promptCount} prompts</span>
        )}
      </div>
    </Link>
  );
}

function SkeletonRows({ count = 10 }: { count?: number }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/50 last:border-0 animate-pulse">
          <div className="w-10 h-6 bg-muted rounded" />
          <div className="w-12 h-12 bg-muted rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/5" />
            <div className="h-3 bg-muted rounded w-2/5" />
          </div>
          <div className="w-32 h-4 bg-muted rounded hidden sm:block" />
        </div>
      ))}
    </>
  );
}

export default function LeaderboardPage() {
  useSEO({ title: 'Leaderboard', description: 'Top prompts and creators on Promptly ranked by views, likes, and copies.' });
  const { prefix } = usePath();
  const [tab, setTab] = useState<LeaderTab>('views');
  const [promptRows, setPromptRows] = useState<Record<string, PromptRow[]>>({ views: [], likes: [], copies: [] });
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState<Record<LeaderTab, boolean>>({ views: true, likes: true, copies: true, creators: true });

  useEffect(() => {
    fetchPrompts('viewsCount', 'views');
    fetchPrompts('likesCount', 'likes');
    fetchPrompts('copiesCount', 'copies');
    fetchCreators();
  }, []);

  async function fetchPrompts(field: string, key: 'views' | 'likes' | 'copies') {
    try {
      const q = query(
        collection(db, 'prompts'),
        where('status', '==', 'approved'),
        orderBy(field, 'desc'),
        limit(10),
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as PromptRow));
      setPromptRows(prev => ({ ...prev, [key]: rows }));
    } catch { /* non-fatal */ } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  }

  async function fetchCreators() {
    try {
      const q = query(
        collection(db, 'users'),
        orderBy('followerCount', 'desc'),
        limit(10),
      );
      const snap = await getDocs(q);
      setCreators(snap.docs.map(d => ({ id: d.id, ...d.data() } as CreatorRow)));
    } catch { /* non-fatal */ } finally {
      setLoading(prev => ({ ...prev, creators: false }));
    }
  }

  const currentRows = tab === 'creators' ? null : (promptRows[tab] ?? []);
  const isLoading = loading[tab];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-16 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest">
          <Trophy className="w-3.5 h-3.5" />
          Rankings
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Leaderboard</h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          The most popular prompts and top creators — updated in real time.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center justify-center gap-1 p-1 bg-muted rounded-xl border border-border flex-wrap">
        {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all',
              tab === key
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Podium header for top 3 */}
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          <span className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
            {TAB_CONFIG.find(t => t.key === tab)?.label}
          </span>
        </div>

        {isLoading ? (
          <SkeletonRows />
        ) : tab === 'creators' ? (
          creators.length === 0
            ? <p className="text-center text-sm text-muted-foreground py-16">No creators found.</p>
            : creators.map((c, i) => <CreatorRankRow key={c.id} creator={c} rank={i} />)
        ) : (
          currentRows!.length === 0
            ? <p className="text-center text-sm text-muted-foreground py-16">No prompts found.</p>
            : currentRows!.map((p, i) => <PromptRankRow key={p.id} prompt={p} rank={i} />)
        )}
      </div>

      {/* CTA */}
      <p className="text-center text-xs text-muted-foreground">
        Want to appear here?{' '}
        <Link to={prefix('/dashboard/library/submit')} className="text-primary font-semibold hover:underline">
          Submit your prompt
        </Link>{' '}
        or{' '}
        <Link to={prefix('/explore')} className="text-primary font-semibold hover:underline">
          explore the marketplace.
        </Link>
      </p>
    </div>
  );
}
