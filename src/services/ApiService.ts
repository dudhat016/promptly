import axios from 'axios';
import { auth } from '../lib/firebase';

const API_BASE_URL = '/api';

/**
 * Enterprise API Service
 * Centralizes network requests through server endpoints.
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

    // Handle global errors cleanly
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status !== 404) {
          const message = error.response?.data?.error || error.message;
          console.warn(`[ApiService] Network Warning:`, message);
        }
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
      return [];
    }
  }

  async getDocument<T>(collName: string, id: string): Promise<T | null> {
    try {
      const res = await this.instance.get(`/data/${collName}/${id}`);
      return res.data?.data || null;
    } catch {
      return null;
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
