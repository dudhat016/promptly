import { api } from '../lib/api';
import { ActivityItem } from '../types';

export const CRMService = {
  logActivity: async (
    contactId: string, 
    type: ActivityItem['type'], 
    description: string, 
    metadata?: Record<string, any>
  ) => {
    try {
      await api.post('/marketing/activity', {
        contactId,
        type,
        description,
        metadata,
      });
    } catch (err) {
      console.error('Failed to log CRM activity:', err);
    }
  },

  getActivities: async (_contactId: string) => {
    // Queries handled via server API
  }
};
