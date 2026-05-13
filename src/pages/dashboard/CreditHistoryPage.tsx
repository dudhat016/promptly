import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import {
  Coins, ArrowUpRight, ArrowDownRight, Clock,
  ShieldCheck, Gift, Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { usePath } from '../../hooks/usePath';
import Timeline from '../../components/data/Timeline';
import Skeleton from '../../components/feedback/Skeleton';
import { cn } from '../../lib/utils';

interface Transaction {
  id: string;
  type: 'unlock' | 'topup' | 'reward' | 'admin_grant' | 'admin_deduct';
  amount: number;
  promptTitle?: string;
  reason?: string;
  balanceAfter?: number;
  createdAt: any;
}

const TX_CONFIG: Record<Transaction['type'], { label: (tx: Transaction) => string; icon: React.ElementType; color: string; sign: '+' | '-' }> = {
  unlock:       { label: tx => `Unlocked: ${tx.promptTitle || 'Prompt'}`, icon: ArrowDownRight, color: 'bg-rose-500/10 text-rose-500',     sign: '-' },
  topup:        { label: () => 'Credit Top-up',                           icon: ArrowUpRight,   color: 'bg-emerald-500/10 text-emerald-600', sign: '+' },
  reward:       { label: () => 'Reward Credits',                          icon: Gift,           color: 'bg-amber-500/10 text-amber-600',     sign: '+' },
  admin_grant:  { label: tx => `Admin Grant${tx.reason ? `: ${tx.reason}` : ''}`,   icon: ShieldCheck, color: 'bg-primary/10 text-primary',    sign: '+' },
  admin_deduct: { label: tx => `Admin Deduct${tx.reason ? `: ${tx.reason}` : ''}`,  icon: ShieldCheck, color: 'bg-rose-500/10 text-rose-500',  sign: '-' },
};

function formatDate(ts: any): string {
  if (!ts) return 'Recent';
  try {
    const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recent';
  }
}

export default function CreditHistoryPage() {
  const { user, profile, isPro } = useAuth();
  const { prefix } = usePath();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'credits_history'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(50),
        );
        const snap = await getDocs(q);
        setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      } catch (err) {
        console.error('Error fetching credit history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [user]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs mb-2">
            <Coins className="w-4 h-4" />
            Financial Ledger
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Transaction History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor your credit usage and balance movements.
            {transactions.length > 0 && <span className="ml-1 text-primary font-semibold">{transactions.length} records</span>}
          </p>
        </div>
        {!isPro && (
          <Link
            to={prefix("/pricing")}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm gradient-cta transition-all"
          >
            <Zap className="w-4 h-4" />
            Get More Credits
          </Link>
        )}
      </div>

      {/* Balance card */}
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-4 mb-6 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Zap className="w-7 h-7" />
        </div>
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Current Balance</p>
          <p className="text-4xl font-black text-foreground leading-none mt-1">
            {isPro ? '∞' : (profile?.credits ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{isPro ? 'Pro — unlimited access' : 'credits remaining'}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Total Used</p>
          <p className="text-2xl font-bold text-foreground mt-1">{profile?.totalUsedCredits ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">all time</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-32 bg-muted/30 rounded-2xl border border-border border-dashed"
        >
          <div className="w-20 h-20 bg-background rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/5">
            <Clock className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">No transactions yet</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-8">
            Your credit usage and top-ups will appear here as you interact with the platform.
          </p>
          <Link
            to={prefix("/explore")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm gradient-cta transition-all"
          >
            <Coins className="w-4 h-4" />
            Explore Prompts
          </Link>
        </motion.div>
      ) : (
        <Timeline
          items={transactions.map(tx => {
            const config = TX_CONFIG[tx.type] ?? TX_CONFIG['topup'];
            return {
              id: tx.id,
              title: config.label(tx),
              timestamp: formatDate(tx.createdAt),
              icon: config.icon as any,
              color: config.sign === '+' ? 'success' : 'error',
              description: (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    {tx.balanceAfter !== undefined && `Ledger Balance: ${tx.balanceAfter}`}
                  </span>
                  <span className={cn(
                    "text-xl font-black tabular-nums",
                    config.sign === '+' ? 'text-emerald-600' : 'text-rose-500'
                  )}>
                    {config.sign}{tx.amount}
                  </span>
                </div>
              )
            };
          })}
        />
      )}
    </div>
  );
}
