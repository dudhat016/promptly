import { initFirebase } from '../lib/firebase.js';

const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in-memory cache for ultra-fast responses

function withTimeout<T>(promise: Promise<T>, timeoutMs = 1500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestore query timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export class DataService {
  private static async getDb() {
    const firebase = await initFirebase();
    if (!firebase) return null;
    return firebase.db;
  }

  static async getCollection(collectionName: string) {
    const cacheKey = `coll_${collectionName}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return cached.data;
    }

    try {
      const db = await DataService.getDb();
      if (!db) return [];

      const snap = await withTimeout(db.collection(collectionName).get(), 1500);
      const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      cache.set(cacheKey, { data, ts: Date.now() });
      return data;
    } catch (err: any) {
      console.warn(`⚠️ getCollection("${collectionName}") fallback:`, err.message);
      return cached?.data || [];
    }
  }

  static async getDocument(collectionName: string, id: string) {
    const cacheKey = `doc_${collectionName}_${id}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return cached.data;
    }

    try {
      const db = await DataService.getDb();
      if (!db) return null;

      const doc = await withTimeout(db.collection(collectionName).doc(id).get(), 1500);
      if (!doc.exists) {
        cache.set(cacheKey, { data: null, ts: Date.now() });
        return null;
      }
      const data = { ...doc.data(), id: doc.id };
      cache.set(cacheKey, { data, ts: Date.now() });
      return data;
    } catch (err: any) {
      console.warn(`⚠️ getDocument("${collectionName}", "${id}") fallback:`, err.message);
      return cached?.data || null;
    }
  }

  static async createDocument(collectionName: string, data: any) {
    cache.delete(`coll_${collectionName}`);
    const db = await DataService.getDb();
    if (!db) throw new Error('Database connection failed');
    const docRef = await db.collection(collectionName).add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { id: docRef.id };
  }

  static async updateDocument(collectionName: string, id: string, data: any) {
    cache.delete(`coll_${collectionName}`);
    cache.delete(`doc_${collectionName}_${id}`);
    const db = await DataService.getDb();
    if (!db) throw new Error('Database connection failed');
    await db.collection(collectionName).doc(id).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  }

  static async deleteDocument(collectionName: string, id: string) {
    cache.delete(`coll_${collectionName}`);
    cache.delete(`doc_${collectionName}_${id}`);
    const db = await DataService.getDb();
    if (!db) throw new Error('Database connection failed');
    await db.collection(collectionName).doc(id).delete();
    return { success: true };
  }
}
