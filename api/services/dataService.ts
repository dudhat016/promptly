import { initFirebase } from '../lib/firebase';

export class DataService {
  private static async getDb() {
    const firebase = await initFirebase();
    if (!firebase) throw new Error('Firebase not initialized');
    return firebase.db;
  }

  static async getCollection(collectionName: string) {
    const db = await DataService.getDb();
    const snap = await db.collection(collectionName).get();
    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  }

  static async getDocument(collectionName: string, id: string) {
    const db = await DataService.getDb();
    const doc = await db.collection(collectionName).doc(id).get();
    if (!doc.exists) return null;
    return { ...doc.data(), id: doc.id };
  }

  static async createDocument(collectionName: string, data: any) {
    const db = await DataService.getDb();
    const docRef = await db.collection(collectionName).add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { id: docRef.id };
  }

  static async updateDocument(collectionName: string, id: string, data: any) {
    const db = await DataService.getDb();
    await db.collection(collectionName).doc(id).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  }

  static async deleteDocument(collectionName: string, id: string) {
    const db = await DataService.getDb();
    await db.collection(collectionName).doc(id).delete();
    return { success: true };
  }
}
