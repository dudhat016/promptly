import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { ArrowRight, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { usePath } from '../../hooks/usePath';
import { Prompt } from '../../types';

interface Props {
  following: string[];
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hrs  < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function toDate(val: any): Date {
  if (!val) return new Date();
  if (val?.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

export default function FollowingFeedCard({ following }: Props) {
  const { prefix } = usePath();
  const [feed, setFeed]           = useState<Prompt[]>([]);
  const [names, setNames]         = useState<Record<string, string>>({});
  const [avatars, setAvatars]     = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!following?.length) { setLoading(false); return; }
    const batch = following.slice(0, 10);
    getDocs(
      query(
        collection(db, 'prompts'),
        where('creatorId', 'in', batch),
        where('status', '==', 'approved'),
        limit(20)
      )
    ).then(snap => {
      const all = snap.docs.map(d => ({ ...d.data(), id: d.id } as Prompt));
      all.sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime());
      setFeed(all.slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [following.join(',')]);

  // Fetch creator display data once feed is ready
  useEffect(() => {
    const ids = [...new Set(feed.map(p => p.creatorId).filter(Boolean))];
    if (!ids.length) return;
    getDocs(
      query(collection(db, 'users'), where('__name__', 'in', ids))
    ).then(snap => {
      const nameMap: Record<string, string> = {};
      const avatarMap: Record<string, string> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        nameMap[d.id]   = data.displayName || data.username || 'Creator';
        avatarMap[d.id] = data.photoURL || '';
      });
      setNames(nameMap);
      setAvatars(avatarMap);
    }).catch(() => {});
  }, [feed]);

  const isEmpty = !following?.length;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          Following Feed
        </h3>
        {!isEmpty && (
          <Link
            to={prefix('/explore')}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            Explore <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {isEmpty ? (
        <div className="py-6 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Follow creators to see their latest prompts here.</p>
          <Link to={prefix('/explore')} className="text-xs font-bold text-primary hover:underline inline-block">
            Discover creators →
          </Link>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-muted/60 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-3/4 bg-muted/60 rounded animate-pulse" />
                <div className="h-2 w-1/2 bg-muted/40 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : feed.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No new prompts from creators you follow yet.
          </p>
          <Link to={prefix('/explore')} className="text-xs font-bold text-primary hover:underline mt-2 inline-block">
            Find more creators →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {feed.map(p => {
            const createdAt = toDate(p.createdAt);
            const name   = names[p.creatorId]   || 'Creator';
            const avatar = avatars[p.creatorId] || '';
            return (
              <Link
                key={p.id}
                to={prefix(`/prompt/${p.slug || p.id}`)}
                className="flex items-start gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-colors group"
              >
                {avatar ? (
                  <img src={avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground leading-tight">
                    <span className="font-semibold text-foreground">{name}</span>
                    {' '}published a prompt
                  </p>
                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors mt-0.5">
                    {p.title}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5 tabular-nums">
                  {timeAgo(createdAt)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
