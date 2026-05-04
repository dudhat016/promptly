import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Coins, ArrowUpRight, ArrowDownRight, Clock, Search, Filter } from 'lucide-react';
import { motion } from 'motion/react';

interface Transaction {
  id: string;
  type: 'unlock' | 'topup' | 'reward';
  amount: number;
  promptTitle?: string;
  createdAt: any;
}

export default function CreditHistoryPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      try {
        const historyRef = collection(db, 'credits_history');
        const q = query(
          historyRef, 
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      } catch (err) {
        console.error("Error fetching credit history:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-12">
        <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs mb-2">
          <Coins className="w-4 h-4" />
          Financial Ledger
        </div>
        <h1 className="text-4xl font-black tracking-tight text-foreground">Transaction History</h1>
        <p className="text-muted-foreground text-lg">Monitor your credit usage and balance movements.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-2xl w-full" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border rounded-[2.5rem]">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-1">No transactions yet</h3>
          <p className="text-muted-foreground">Your credit usage will appear here once you start unlocking prompts.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="divide-y divide-border">
            {transactions.map((tx) => (
              <motion.div 
                key={tx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 hover:bg-muted/50 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    tx.type === 'unlock' ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'
                  }`}>
                    {tx.type === 'unlock' ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">
                      {tx.type === 'unlock' ? `Unlocked: ${tx.promptTitle}` : 'Credit Top-up'}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Recent'}
                    </p>
                  </div>
                </div>
                <div className={`text-lg font-black ${
                  tx.type === 'unlock' ? 'text-destructive' : 'text-green-600'
                }`}>
                  {tx.type === 'unlock' ? '-' : '+'}{tx.amount}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
