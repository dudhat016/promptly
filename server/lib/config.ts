/**
 * Returns the canonical app base URL from the environment.
 * Always strips a trailing slash and forces HTTPS in production.
 */
export function getAppUrl(): string {
  // APP_URL = manually set production domain (e.g. https://promptly.ai)
  // VERCEL_URL = auto-injected by Vercel platform (hostname only, no https://)
  const raw = process.env.APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'http://localhost:5173';
  // Extract just the origin — strip any accidental path suffix (e.g. "/en") from APP_URL
  try {
    const parsed = new URL(raw);
    const origin = `${parsed.protocol}//${parsed.host}`;
    return !origin.includes('localhost') && !origin.includes('127.0.0.1')
      ? origin.replace(/^http:\/\//, 'https://')
      : origin;
  } catch {
    const url = raw.replace(/\/$/, '');
    return !url.includes('localhost') && !url.includes('127.0.0.1')
      ? url.replace(/^http:\/\//, 'https://')
      : url;
  }
}

/**
 * Returns the app display name (e.g. "Promptly").
 * Override via APP_NAME env var for white-label deployments.
 */
export function getAppName(): string {
  return process.env.APP_NAME || 'Promptly';
}

/**
 * Returns the default language code (e.g. "en").
 * Override via DEFAULT_LANG env var if needed.
 */
export function getDefaultLang(): string {
  return process.env.DEFAULT_LANG || 'en';
}

/**
 * Builds a full UI URL including the default language prefix.
 * Use this for all server-side redirects that point to app pages.
 * e.g. getLangUrl('/checkout/verify') → 'https://app.com/en/checkout/verify'
 */
export function getLangUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${getAppUrl()}/${getDefaultLang()}${cleanPath}`;
}
