import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Global Conversion Tracking Component
 * Provides a simple API to track custom events and page views.
 */
export const trackEvent = (eventName: string, params: Record<string, any> = {}) => {
  // 1. Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }

  // 2. Facebook Pixel
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('trackCustom', eventName, params);
  }

  // 3. Console log for dev
  if (import.meta.env.DEV) {
    console.log(`[Tracking] ${eventName}`, params);
  }
};

export default function ConversionTracking() {
  const location = useLocation();
  const { user } = useAuth();

  // Track Page Views on route change
  useEffect(() => {
    trackEvent('page_view', {
      page_path: location.pathname + location.search,
      user_id: user?.uid || 'guest'
    });
  }, [location, user]);

  return null;
}
