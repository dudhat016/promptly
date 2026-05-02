export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin';
  subscriptionStatus: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  referralCode?: string;
  referredBy?: string;
  affiliateEarnings?: number;
  trialUsed?: boolean;
  favorites?: string[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: any;
}

export interface Contact {
  id: string;
  email: string;
  displayName: string;
  tags: string[]; // List of tag IDs
  status: 'active' | 'unsubscribed' | 'bounced';
  lastActivity: any;
  createdAt: any;
  customFields: Record<string, string>;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  matchType: 'and' | 'or';
  filters: {
    field: string;
    operator: 'equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than';
    value: any;
  }[];
  createdAt: any;
}

export interface AutomationFlow {
  id: string;
  name: string;
  trigger: {
    type: 'tag_added' | 'user_signup' | 'subscription_changed' | 'prompt_favorite' | 'limit_reached';
    value?: string;
  };
  steps: {
    id: string;
    type: 'wait' | 'send_email' | 'add_tag' | 'remove_tag' | 'notify_user' | 'condition' | 'webhook' | 'ab_test' | 'recommend_prompt';
    params: any;
  }[];
  active: boolean;
  createdAt: any;
}

export interface EmailTemplate {
  id: string;
  type: string;
  subject: string;
  content: string;
  lastUpdated: any;
  variables: string[]; // List of available placeholders like {{name}}, {{email}}
}

export interface PermissionSet {
  canViewPremium: boolean;
  canCopyPrompts: boolean;
  canExportData: boolean;
  canUseAIBuilder: boolean;
  canCreateCollections: boolean;
  maxDailyPrompts: number;
  maxFavorites: number;
}

export interface AccessConfig {
  id: 'access_levels';
  free: PermissionSet;
  pro: PermissionSet;
  enterprise: PermissionSet;
  lastUpdated: any;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  isPopular?: boolean;
  accessLevel: 'free' | 'pro' | 'enterprise';
  limits: {
    dailyPrompts: number;
    favorites: number;
  };
}

export interface AppConfig {
  id: 'global';
  freeTrialEnabled: boolean;
  freeTrialDays: number;
  lastUpdated: any;
}

export interface EmailNotification {
  id: string;
  type: 'welcome' | 'login' | 'affiliate_join' | 'new_prompt' | 'offer' | 'subs_ending';
  recipientEmail: string;
  recipientId?: string;
  subject: string;
  content: string;
  data?: any;
  sentAt: any;
  status: 'sent' | 'failed' | 'scheduled';
}

export interface Payout {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  status: 'paid';
  processedAt: string;
}
export interface Prompt {
  id?: string;
  title: string;
  description: string;
  content: string;
  isPaid: boolean;
  categoryId: string;
  creatorId: string;
  model: string;
  tags: string[];
  likesCount: number;
  viewsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}
