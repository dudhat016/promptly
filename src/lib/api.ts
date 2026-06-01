import { auth } from './firebase';

type ApiResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Typed API client with automatic Firebase auth token attachment,
 * 401 token refresh, and error normalization.
 *
 * Usage:
 *   const result = await api.post<CreateCheckoutResponse>('/payments/checkout', body);
 *   if (result.success) { ... } else { toast.error(result.error); }
 */
class ApiClient {
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };

    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken(/* forceRefresh */ false);
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[ApiClient] Failed to get auth token:', err);
    }

    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retries = 1
  ): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders();

      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Auto-retry on 401 with refreshed token (once)
      if (res.status === 401 && retries > 0) {
        const user = auth.currentUser;
        if (user) {
          await user.getIdToken(true); // Force refresh
          return this.request<T>(method, path, body, retries - 1);
        }
      }

      const data = await res.json();
      return data as ApiResponse<T>;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      };
    }
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body);
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}

export const api = new ApiClient();
export default api;
