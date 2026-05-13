import { Request, Response, NextFunction } from 'express';

/**
 * Consistent API error response shape.
 * All API errors should go through this handler.
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: unknown;
}

/**
 * Custom error class for throwing structured API errors.
 */
export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(statusCode: number, message: string, code: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Global error handling middleware.
 * Place as the LAST middleware in the Express chain.
 *
 * Usage:
 *   app.use(errorHandler);
 */
export function errorHandler(
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(`[API Error] ${err.message}`, err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      details: err.details,
    } satisfies ApiErrorResponse);
  }

  // Unhandled errors
  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
    code: 'INTERNAL_ERROR',
  } satisfies ApiErrorResponse);
}
