import { doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

interface StreakData {
  count: number;
  lastDate: string; // YYYY-MM-DD
  longest: number;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function useStreak() {
  const { user } = useAuth();
  const [streak, setStreak]       = useState(0);
  const [longest, setLongest]     = useState(0);
  const [isNewRecord, setNewRecord] = useState(false);

  useEffect(() => {
    if (!user) return;
    const key = `promptly_streak_${user.uid}`;
    const today = todayStr();
    const yesterday = yesterdayStr();

    let data: StreakData = { count: 1, lastDate: today, longest: 1 };
    try {
      const stored = localStorage.getItem(key);
      if (stored) data = JSON.parse(stored);
    } catch {}

    let newCount = data.count;

    if (data.lastDate === today) {
      // Already visited today — no change
    } else if (data.lastDate === yesterday) {
      // Consecutive day — extend streak
      newCount = data.count + 1;
    } else {
      // Gap — reset
      newCount = 1;
    }

    const newLongest = Math.max(data.longest ?? 1, newCount);
    const updated: StreakData = { count: newCount, lastDate: today, longest: newLongest };

    if (newCount !== data.count || data.lastDate !== today) {
      localStorage.setItem(key, JSON.stringify(updated));
      updateDoc(doc(db, 'users', user.uid), {
        currentStreak: newCount,
        lastActiveAt: new Date().toISOString(),
      }).catch(() => {});
    }

    setStreak(newCount);
    setLongest(newLongest);
    setNewRecord(newCount > (data.longest ?? 1) && newCount > 1);
  }, [user?.uid]);

  return { streak, longest, isNewRecord };
}
