import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type AnalyticsEvent = 
  | 'view_prompt'
  | 'copy_prompt'
  | 'unlock_prompt'
  | 'start_checkout'
  | 'complete_checkout'
  | 'ai_generate'
  | 'referral_visit';

interface EventMetadata {
  [key: string]: any;
}

/**
 * Neural Insight Engine
 * Tracks user behavioral events to Firestore for administrative analysis.
 */
export async function trackEvent(
  eventName: AnalyticsEvent, 
  userId?: string, 
  metadata: EventMetadata = {}
) {
  try {
    await addDoc(collection(db, 'analytics'), {
      event: eventName,
      userId: userId || 'anonymous',
      metadata,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      path: window.location.pathname
    });
    
    // 2. Facebook Pixel Funnel Integration
    if ((window as any).fbq) {
      switch (eventName) {
        case 'start_checkout':
          (window as any).fbq('track', 'InitiateCheckout', {
            content_name: metadata.planName,
            value: metadata.amount,
            currency: metadata.currency || 'USD'
          });
          break;
        case 'complete_checkout':
          (window as any).fbq('track', 'Purchase', {
            value: metadata.amount,
            currency: metadata.currency || 'USD',
            content_name: metadata.planName
          });
          break;
        case 'view_prompt':
          (window as any).fbq('track', 'ViewContent', {
            content_name: metadata.title,
            content_category: metadata.category
          });
          break;
      }
    }

    // Optional: Log to console for development
    if (import.meta.env.DEV) {
      console.log(`📊 [Analytics] Event: ${eventName}`, metadata);
    }
  } catch (err) {
    console.error("❌ [Analytics] Failed to track event:", err);
  }
}
