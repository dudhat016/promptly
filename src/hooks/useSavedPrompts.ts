import {
  collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface SavedPromptEntry {
  promptId: string;
  title: string;
  slug: string;
  savedAt: any;
}

export function useSavedPrompts() {
  const { user } = useAuth();
  const [saved, setSaved]   = useState<SavedPromptEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'users', user!.uid, 'saved_prompts'));
        setSaved(snap.docs.map(d => d.data() as SavedPromptEntry));
      } catch {
        setSaved([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.uid]);

  const isSaved = (promptId: string) => saved.some(s => s.promptId === promptId);

  async function toggle(promptId: string, title: string, slug: string) {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'saved_prompts', promptId);
    if (isSaved(promptId)) {
      await deleteDoc(ref).catch(() => {});
      setSaved(prev => prev.filter(s => s.promptId !== promptId));
      toast.success('Removed from queue');
    } else {
      const entry: SavedPromptEntry = { promptId, title, slug, savedAt: serverTimestamp() };
      await setDoc(ref, entry).catch(() => {});
      setSaved(prev => [...prev, entry]);
      toast.success('Saved to queue!');
    }
  }

  return { saved, loading, isSaved, toggle };
}
