import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useSiteContent(id: string) {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      try {
        const snap = await getDoc(doc(db, 'site_content', id));
        if (snap.exists()) {
          setContent(snap.data());
        }
      } catch (err) {
        console.error(`Error fetching site content (${id}):`, err);
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [id]);

  return { content, loading };
}
