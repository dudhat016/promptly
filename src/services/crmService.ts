import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ActivityItem } from '../types';

export const CRMService = {
  logActivity: async (
    contactId: string, 
    type: ActivityItem['type'], 
    description: string, 
    metadata?: Record<string, any>
  ) => {
    try {
      await addDoc(collection(db, 'marketing_activities'), {
        contactId,
        type,
        description,
        metadata,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to log CRM activity:', err);
    }
  },

  getActivities: async (contactId: string) => {
    // This could be implemented with a query
  }
};
