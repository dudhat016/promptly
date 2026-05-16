import rateLimit from 'express-rate-limit';

/**
 * Pre-configured rate limiters for sensitive endpoints.
 * Prevents brute-force attacks on auth and checkout flows.
 */

/** General API rate limit — 100 requests per 15 minutes */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/** Auth endpoints — 10 attempts per 15 minutes */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
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
  message: {
    success: false,
    error: 'Too many submissions. Please try again later.',
    code: 'CONTACT_RATE_LIMIT',
  },
});
