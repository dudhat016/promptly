/**
 * Google Analytics (GA4) Tracker Utility
 * Production-ready tracking helper for React Router SPA
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

/**
 * Initializes GA4 script dynamically if measurement ID is set
 */
export function initGA(measurementId?: string) {
  const id = measurementId || GA_MEASUREMENT_ID;
  if (!id || typeof window === 'undefined') return;

  // Prevent duplicate script injection
  if (document.getElementById('ga-script')) return;

  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id, {
    send_page_view: false, // We manually trigger pageviews on route changes
  });
}

/**
 * Tracks SPA Page Views in GA4
 */
export function trackPageView(url: string, title?: string) {
  if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) return;
  window.gtag('event', 'page_view', {
    page_location: url,
    page_title: title || document.title,
  });
}

/**
 * Tracks Custom Analytics Events
 */
export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

/**
 * Helper: Track Prompt Copy Action
 */
export function trackPromptCopy(promptId: string, title: string) {
  trackEvent('copy_prompt', 'Prompt Interaction', title);
}

/**
 * Helper: Track Search Query Action
 */
export function trackSearch(query: string) {
  trackEvent('search', 'User Engagement', query);
}
