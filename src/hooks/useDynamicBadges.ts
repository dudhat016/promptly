import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { BadgeDefinition } from '../types';

interface UseDynamicBadgesResult {
  badges: BadgeDefinition[];
  loading: boolean;
}

export function useDynamicBadges(): UseDynamicBadgesResult {
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'badges'),
            where('isActive', '==', true),
            orderBy('order', 'asc')
          )
        );
        setBadges(snap.docs.map(d => ({ id: d.id, ...d.data() } as BadgeDefinition)));
      } catch {
        // Silently fall back to hardcoded badge defs in caller
      } finally {
        setLoading(false);
      }
    }
    fetchBadges();
  }, []);

  return { badges, loading };
}
