import { 
  collection, 
  getDocs, 
  query, 
  QueryConstraint, 
  doc, 
  getDoc,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Advanced Firestore Service Layer with In-Memory Caching.
 * 
 * This service centralizes all database interactions and implements a simple
 * Time-To-Live (TTL) cache to prevent redundant API calls during a user session.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

class FirestoreService {
  /**
   * Helper to generate a unique cache key based on path and query
   */
  private generateKey(path: string, constraints: any[] = []): string {
    return `${path}:${JSON.stringify(constraints)}`;
  }

  /**
   * Fetch a collection with optional query constraints and caching.
   */
  async getCollection<T>(
    collectionName: string, 
    constraints: QueryConstraint[] = [],
    useCache = true
  ): Promise<T[]> {
    const cacheKey = this.generateKey(collectionName, constraints);
    
    if (useCache) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < DEFAULT_TTL) {
        return cached.data;
      }
    }

    try {
      const ref = collection(db, collectionName);
      const q = query(ref, ...constraints);
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) as T[];
      
      if (useCache) {
        cache.set(cacheKey, { data, timestamp: Date.now() });
      }
      
      return data;
    } catch (error) {
      console.error(`[FirestoreService] Error fetching collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Fetch a single document with caching.
   */
  async getDocument<T>(path: string, id: string, useCache = true): Promise<T | null> {
    const fullPath = `${path}/${id}`;
    
    if (useCache) {
      const cached = cache.get(fullPath);
      if (cached && Date.now() - cached.timestamp < DEFAULT_TTL) {
        return cached.data;
      }
    }

    try {
      const docRef = doc(db, path, id);
      const snap = await getDoc(docRef);
      
      if (!snap.exists()) return null;
      
      const data = { id: snap.id, ...snap.data() } as any as T;
      
      if (useCache) {
        cache.set(fullPath, { data, timestamp: Date.now() });
      }
      
      return data;
    } catch (error) {
      console.error(`[FirestoreService] Error fetching document ${fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate specific cache keys or clear everything.
   */
  clearCache(path?: string) {
    if (path) {
      for (const key of cache.keys()) {
        if (key.startsWith(path)) cache.delete(key);
      }
    } else {
      cache.clear();
    }
  }
}

export const firestoreService = new FirestoreService();
