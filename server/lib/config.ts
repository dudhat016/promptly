/**
 * Returns the canonical app base URL from the environment.
 * Always strips a trailing slash and forces HTTPS in production.
 */
export function getAppUrl(): string {
  const raw = process.env.APP_URL || 'http://localhost:5173';
  const url = raw.replace(/\/$/, ''); // strip trailing slash
  // Force HTTPS unless explicitly running localhost
  if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
    return url.replace(/^http:\/\//, 'https://');
  }
  return url;
}
