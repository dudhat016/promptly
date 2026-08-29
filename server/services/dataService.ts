import { initFirebase } from '../lib/firebase.js';



export class DataService {
  private static async getDb() {
    const firebase = await initFirebase();
    if (!firebase) return null;
    return firebase.db;
  }

  static async getCollection(collectionName: string) {
    try {
      const db = await DataService.getDb();
      if (!db) return [];
      const snap = await db.collection(collectionName).get();
      return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (err: any) {
      console.warn(`⚠️ getCollection("${collectionName}") fallback:`, err.message);
      return [];
    }
  }

  static async getDocument(collectionName: string, id: string) {
    try {
      const db = await DataService.getDb();
      if (!db) return null;
      const doc = await db.collection(collectionName).doc(id).get();
      if (!doc.exists) return null;
      return { ...doc.data(), id: doc.id };
    } catch (err: any) {
      console.warn(`⚠️ getDocument("${collectionName}", "${id}") fallback:`, err.message);
      return null;
    }
  }

  static async createDocument(collectionName: string, data: any) {
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
    const db = await DataService.getDb();
    if (!db) throw new Error('Database connection failed');
    await db.collection(collectionName).doc(id).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  }

  static async deleteDocument(collectionName: string, id: string) {
    const db = await DataService.getDb();
    if (!db) throw new Error('Database connection failed');
    await db.collection(collectionName).doc(id).delete();
    return { success: true };
  }
}
