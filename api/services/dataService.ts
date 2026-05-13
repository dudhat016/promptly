import { getFirestore } from 'firebase-admin/firestore';

export class DataService {
  static async getCollection(collectionName: string) {
    const db = getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)');
    const snap = await db.collection(collectionName).get();
    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  }

  static async getDocument(collectionName: string, id: string) {
    const db = getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)');
    const doc = await db.collection(collectionName).doc(id).get();
    if (!doc.exists) return null;
    return { ...doc.data(), id: doc.id };
  }

  static async createDocument(collectionName: string, data: any) {
    const db = getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)');
    const docRef = await db.collection(collectionName).add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { id: docRef.id };
  }

  static async updateDocument(collectionName: string, id: string, data: any) {
    const db = getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)');
    await db.collection(collectionName).doc(id).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  }

  static async deleteDocument(collectionName: string, id: string) {
    const db = getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)');
    await db.collection(collectionName).doc(id).delete();
    return { success: true };
  }
}
