import rateLimit from 'express-rate-limit';

const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

/**
 * Pre-configured rate limiters for sensitive endpoints.
 * Disables trustProxy validation warnings in serverless environments (Vercel).
 */

/** General API rate limit — 50,000 requests in dev, 2,000 in production */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 2000 : 50000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  skip: () => isVercel || process.env.NODE_ENV !== 'production',
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/** Auth endpoints — 10 attempts per 15 minutes */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isVercel ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  skip: () => isVercel,
  message: {
    success: false,
    error: 'Too many login attempts. Please wait 15 minutes.',
    code: 'AUTH_RATE_LIMIT',
  },
});

/** Checkout — 5 attempts per 15 minutes */
export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: {
    success: false,
    error: 'Too many checkout attempts. Please wait before trying again.',
    code: 'CHECKOUT_RATE_LIMIT',
  },
});

/** Contact/Support — 5 submissions per hour */
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: {
    success: false,
    error: 'Too many submissions. Please try again later.',
    code: 'CONTACT_RATE_LIMIT',
  },
});
