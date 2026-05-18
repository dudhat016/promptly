import { randomBytes } from 'crypto';

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return {
    data,
    meta: { requestId: randomBytes(8).toString('hex'), ...meta },
  };
}

export function fail(code: string, message: string, param?: string) {
  return {
    error: { code, message, ...(param ? { param } : {}) },
  };
}
