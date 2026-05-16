/**
 * Returns the canonical app base URL from the environment.
 * Always strips a trailing slash and forces HTTPS in production.
 */
export function getAppUrl(): string {
  const raw = process.env.APP_URL || 'http://localhost:5173';
  const url = raw.replace(/\/$/, '');
  if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
    return url.replace(/^http:\/\//, 'https://');
  }
  return url;
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
