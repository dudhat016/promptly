import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ShoppingBag, Sparkles } from 'lucide-react';

interface RecentActivity {
  id: string;
  userName: string;
  promptTitle: string;
  timeAgo: string;
}

export default function SocialProofToaster() {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    async function fetchRecentActivity() {
      try {
        const q = query(collection(db, 'credits_history'), orderBy('createdAt', 'desc'), limit(10));
        const snap = await getDocs(q);
        
        const names = ['Alex', 'Sarah', 'Mike', 'Emma', 'David', 'Chris', 'Elena', 'Justin', 'Sophia', 'James'];
        
        const data = snap.docs.map((doc, i) => ({
          id: doc.id,
          userName: names[i % names.length], // Privacy: use randomized names
          promptTitle: doc.data().promptTitle || 'a premium prompt',
          timeAgo: 'Just now'
        }));

        if (data.length > 0) {
          setActivities(data);
        }
      } catch (err) {
        console.error("Social proof error:", err);
      }
    }
    fetchRecentActivity();
  }, []);

  useEffect(() => {
    if (activities.length === 0) return;

    const showInterval = setInterval(() => {
      setIsVisible(true);
      
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          setCurrentIdx((prev) => (prev + 1) % activities.length);
        }, 1000); // Wait for exit animation
      }, 5000); // Stay visible for 5s

    }, 15000); // Show every 15s

    return () => clearInterval(showInterval);
  }, [activities]);

  if (activities.length === 0) return null;

  const current = activities[currentIdx];

  return (
    <div className="fixed bottom-6 left-6 z-[60] pointer-events-none hidden sm:block">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            className="bg-card/90 backdrop-blur-xl border border-border p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm pointer-events-auto"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                <span className="text-foreground font-black">{current.userName}</span> just unlocked
              </p>
              <p className="text-sm font-bold text-foreground truncate max-w-[200px]">
                {current.promptTitle}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
