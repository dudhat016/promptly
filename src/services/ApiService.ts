import axios from 'axios';
import { auth } from '../lib/firebase';

const API_BASE_URL = '/api';

/**
 * Enterprise API Service
 * Centralizes all network requests to ensure consistent headers,
 * error handling, and data synchronization.
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

    // Handle global errors
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.error || error.message;
        console.error(`[ApiService] Error:`, message);
        return Promise.reject(error);
      }
    );
  }

  // --- Generic Data Operations ---
  
  async getCollection<T>(collection: string): Promise<T[]> {
    const res = await this.instance.get(`/data/${collection}`);
    return res.data?.data || [];
  }

  async getDocument<T>(collection: string, id: string): Promise<T> {
    const res = await this.instance.get(`/data/${collection}/${id}`);
    return res.data?.data || null;
  }

  async createDocument<T>(collection: string, data: Partial<T>): Promise<string> {
    const res = await this.instance.post<{ id: string }>(`/data/${collection}`, data);
    return res.data.id;
  }

  async updateDocument<T>(collection: string, id: string, data: Partial<T>): Promise<void> {
    await this.instance.patch(`/data/${collection}/${id}`, data);
  }

  async deleteDocument(collection: string, id: string): Promise<void> {
    await this.instance.delete(`/data/${collection}/${id}`);
  }

  // --- Specialized Operations ---

  async detectLocation() {
    return this.instance.get('/location/detect');
  }

  async submitSupportTicket(data: any) {
    return this.instance.post('/support/tickets', data);
  }
}

export const apiService = new ApiService();
