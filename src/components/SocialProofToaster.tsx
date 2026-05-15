import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Sparkles, UserPlus, Copy } from 'lucide-react';
import { useMarketing } from '../hooks/useMarketing';

interface ActivityItem {
  id: string;
  type: 'unlock' | 'purchase' | 'join' | 'copy';
  name: string;
  detail: string;
}

const ICON_MAP = {
  unlock:   { Icon: Sparkles,   color: 'text-primary',       bg: 'bg-primary/10' },
  purchase: { Icon: ShoppingBag, color: 'text-emerald-500',  bg: 'bg-emerald-500/10' },
  join:     { Icon: UserPlus,    color: 'text-sky-500',       bg: 'bg-sky-500/10' },
  copy:     { Icon: Copy,        color: 'text-amber-500',     bg: 'bg-amber-500/10' },
};

const FIRST_NAMES = ['Alex', 'Sarah', 'Mike', 'Emma', 'David', 'Chris', 'Elena', 'Justin', 'Sophia', 'James', 'Nina', 'Omar', 'Priya', 'Luca'];

function pickName(idx: number) { return FIRST_NAMES[idx % FIRST_NAMES.length]; }

function actionLabel(type: ActivityItem['type'], detail: string, template?: string) {
  if (template) return template.replace('{detail}', detail);
  switch (type) {
    case 'unlock':   return `just unlocked "${detail}"`;
    case 'purchase': return `just subscribed to ${detail}`;
    case 'join':     return 'just joined the platform';
    case 'copy':     return `just copied "${detail}"`;
  }
}

export default function SocialProofToaster() {
  const { marketingConfig } = useMarketing();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const intervalMs  = (marketingConfig as any).socialProofIntervalMs  ?? 15000;
  const visibleMs   = (marketingConfig as any).socialProofVisibleMs   ?? 5000;
  const unlockTpl   = (marketingConfig as any).socialProofUnlockTpl   ?? '';
  const purchaseTpl = (marketingConfig as any).socialProofPurchaseTpl ?? '';
  const joinTpl     = (marketingConfig as any).socialProofJoinTpl     ?? '';

  useEffect(() => {
    if (hasFetched) return;

    async function fetchActivity() {
      try {
        const [unlockSnap, orderSnap, userSnap] = await Promise.all([
          getDocs(query(collection(db, 'credits_history'), orderBy('createdAt', 'desc'), limit(6))),
          getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(4))),
          getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(4))),
        ]);

        const combined: ActivityItem[] = [];

        unlockSnap.docs.forEach((d, i) => {
          const data = d.data();
          if (data.type === 'unlock') {
            combined.push({ id: d.id, type: 'unlock', name: pickName(i), detail: data.promptTitle || 'a premium prompt' });
          } else if (data.type === 'copy') {
            combined.push({ id: d.id, type: 'copy', name: pickName(i + 2), detail: data.promptTitle || 'a prompt' });
          }
        });

        orderSnap.docs.forEach((d, i) => {
          const data = d.data();
          if (data.status === 'paid' || data.status === 'completed') {
            combined.push({ id: d.id, type: 'purchase', name: pickName(i + 6), detail: data.planName || 'Pro' });
          }
        });

        userSnap.docs.forEach((d, i) => {
          combined.push({ id: d.id, type: 'join', name: d.data().displayName?.split(' ')[0] || pickName(i + 10), detail: '' });
        });

        // Shuffle so types interleave
        const shuffled = combined.sort(() => Math.random() - 0.5);
        if (shuffled.length > 0) setActivities(shuffled);
        setHasFetched(true);
      } catch {
        // Silently fail — social proof is non-critical
      }
    }
    fetchActivity();
  }, [hasFetched]);

  useEffect(() => {
    if (activities.length === 0) return;

    const showNext = () => {
      setIsVisible(true);
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setCurrentIdx(prev => (prev + 1) % activities.length), 800);
      }, visibleMs);
    };

    const id = setInterval(showNext, intervalMs);
    return () => clearInterval(id);
  }, [activities, intervalMs, visibleMs]);

  if (activities.length === 0) return null;

  const current = activities[currentIdx];
  const { Icon, color, bg } = ICON_MAP[current.type];
  const tplMap = { unlock: unlockTpl, purchase: purchaseTpl, join: joinTpl, copy: '' };

  return (
    <div className="fixed bottom-6 left-6 z-[60] pointer-events-none hidden sm:block">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key={current.id + currentIdx}
            initial={{ opacity: 0, x: -40, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="bg-card/90 backdrop-blur-xl border border-border p-4 rounded-xl shadow-2xl flex items-center gap-3.5 max-w-[300px] pointer-events-auto"
          >
            <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium leading-snug">
                <span className="text-foreground font-bold">{current.name}</span>{' '}
                {actionLabel(current.type, current.detail, tplMap[current.type])}
              </p>
              <p className="text-[10px] text-muted-foreground/50 font-medium mt-0.5">Just now</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
