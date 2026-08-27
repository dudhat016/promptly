/**
 * Shared API types between backend and frontend.
 * Import in both api/routes and src/lib/api.ts.
 */

// ─── Base Response ──────────────────────────────────────────
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: { field: string; message: string }[];
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Auth ───────────────────────────────────────────────────
export interface ResetPasswordRequest {
  email: string;
}



// ─── Support ────────────────────────────────────────────────
export interface CreateTicketRequest {
  subject: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
}

export interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

// ─── Marketing ──────────────────────────────────────────────
export interface Contact {
  id: string;
  email: string;
  name?: string;
  tags: string[];
  createdAt: string;
}
