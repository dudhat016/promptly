import axios from 'axios';
import { auth, db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

const API_BASE_URL = '/api';

/**
 * Enterprise API Service
 * Centralizes all network requests to ensure consistent headers,
 * error handling, graceful fallbacks, and data synchronization.
 */
class ApiService {
  private instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Inject auth token if available
    this.instance.interceptors.request.use(async (config) => {
      const token = await auth.currentUser?.getIdToken?.().catch(() => null);
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Handle global errors without throwing unhandled exceptions
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.error || error.message;
        console.warn(`[ApiService] Network Warning:`, message);
        return Promise.reject(error);
      }
    );
  }

  // --- Generic Data Operations ---
  
  async getCollection<T>(collName: string): Promise<T[]> {
    try {
      const res = await this.instance.get(`/data/${collName}`);
      return res.data?.data || [];
    } catch {
      // Fallback directly to Firebase Client SDK if API route fails
      try {
        const snap = await getDocs(collection(db, collName));
        return snap.docs.map(d => ({ ...d.data(), id: d.id })) as T[];
      } catch (clientErr) {
        console.warn(`[ApiService] Firestore client fallback failed for ${collName}:`, clientErr);
        return [];
      }
    }
  }

  async getDocument<T>(collName: string, id: string): Promise<T | null> {
    try {
      const res = await this.instance.get(`/data/${collName}/${id}`);
      return res.data?.data || null;
    } catch {
      // Fallback directly to Firebase Client SDK if API route fails
      try {
        const snap = await getDoc(doc(db, collName, id));
        if (snap.exists()) {
          return { ...snap.data(), id: snap.id } as T;
        }
        return null;
      } catch (clientErr) {
        console.warn(`[ApiService] Firestore client fallback failed for ${collName}/${id}:`, clientErr);
        return null;
      }
    }
  }

  async createDocument<T>(collName: string, data: Partial<T>): Promise<string> {
    const res = await this.instance.post<{ id: string }>(`/data/${collName}`, data);
    return res.data.id;
  }

  async updateDocument<T>(collName: string, id: string, data: Partial<T>): Promise<void> {
    await this.instance.patch(`/data/${collName}/${id}`, data);
  }

  async deleteDocument(collName: string, id: string): Promise<void> {
    await this.instance.delete(`/data/${collName}/${id}`);
  }

  // --- Specialized Operations ---

  async detectLocation() {
    return this.instance.get('/location/detect').catch(() => ({ data: { country: 'US' } }));
  }

  async submitSupportTicket(data: any) {
    return this.instance.post('/support/tickets', data);
  }
}

export const apiService = new ApiService();
