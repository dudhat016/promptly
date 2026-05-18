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
  const url = raw.replace(/\/$/, '');
  if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
    return url.replace(/^http:\/\//, 'https://');
  }
  return url;
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
