import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';

export interface FeaturedPromptConfig {
  promptId: string;
  promptTitle: string;
  promptSlug: string;
  description?: string;
  expiresAt: any; // Firestore Timestamp or ISO string
}

interface UseFeaturedPromptResult {
  featured: FeaturedPromptConfig | null;
  loading: boolean;
}

function toMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'string') return new Date(val).getTime();
  if (val?.seconds)            return val.seconds * 1000;
  if (val?.toDate)             return val.toDate().getTime();
  return 0;
}

export function useFeaturedPrompt(): UseFeaturedPromptResult {
  const [featured, setFeatured] = useState<FeaturedPromptConfig | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const snap = await getDoc(doc(db, 'configs', 'featured_prompt'));
        if (!snap.exists()) { setFeatured(null); return; }
        const data = snap.data() as FeaturedPromptConfig;
        // Only show if not expired
        if (toMs(data.expiresAt) > Date.now()) {
          setFeatured(data);
        } else {
          setFeatured(null);
        }
      } catch {
        setFeatured(null);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  return { featured, loading };
}
