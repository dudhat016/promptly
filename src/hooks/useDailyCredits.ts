import { doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

const DAILY_BONUS = 3;
const MS_IN_DAY   = 24 * 60 * 60 * 1000;

function lastRewardMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'string') return new Date(val).getTime();
  if (val?.seconds)            return val.seconds * 1000;
  if (val?.toDate)             return val.toDate().getTime();
  return 0;
}

export function useDailyCredits() {
  const { user, profile } = useAuth();
  const [collected, setCollected] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;

    const last = lastRewardMs(profile.lastCreditsRewardAt);
    const now  = Date.now();
    if (now - last < MS_IN_DAY) return; // already collected today

    // Deduplicate across StrictMode double-fires
    const key = `daily_credits_${user.uid}_${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    updateDoc(doc(db, 'users', user.uid), {
      credits: increment(DAILY_BONUS),
      lastCreditsRewardAt: serverTimestamp(),
    }).then(() => {
      setCollected(true);
      toast.success(`🎁 Daily bonus: +${DAILY_BONUS} credits collected!`, { duration: 4000 });
    }).catch(() => {});
  }, [user?.uid, profile?.lastCreditsRewardAt]);

  return { collected, amount: DAILY_BONUS };
}
