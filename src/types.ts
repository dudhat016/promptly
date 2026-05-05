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
  activePlanId?: string;
  createdAt: string;
  referralCode?: string;
  referredBy?: string;
  affiliateEarnings?: number;
  trialUsed?: boolean;
  trialEndsAt?: any;
  favorites?: string[];
  referralsCount?: number;
  credits?: number;
  totalUsedCredits?: number;
  monthlyLimit?: number;
  unlockedPrompts?: string[];
  lastCreditsRewardAt?: any;
  lastActiveAt?: any;
  affinityProfile?: Record<string, number>;
}

export interface Tag {
  id: string;
  name: string;
  description?: string;
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
    type: 'tag_added' | 'user_signup' | 'subscription_changed' | 'prompt_favorite' | 'limit_reached' | 'list_applied' | 'list_removed' | 'tag_apply' | 'tag_remove' | 'contact_created' | 'form_submited' | 'subscription_payment_recived' | 'subscription_cancled' | 'user_login' | 'new_register' | 'affiliate_commison';
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
  name: string;
  type: string;
  subject: string;
  body: string;
  lastUpdated: any;
  variables: string[]; // List of available placeholders like {{name}}, {{email}}
}

export interface PermissionSet {
  canViewPremium: boolean;
  canCopyPrompts: boolean;
  canExportData: boolean;
  canUseAIBuilder: boolean;
  canCreateCollections: boolean;
  canAccessPremiumModels: boolean;
  canUseAPI: boolean;
  canRemoveWatermarks: boolean;
  hasPrioritySupport: boolean;
  canCustomBrandEmails: boolean;
  maxDailyPrompts: number;
  maxFavorites: number;
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: PermissionSet;
  createdAt: any;
}

export interface AccessConfig {
  id: 'access_levels';
  groups: PermissionGroup[];
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
  permissionGroupId: string; // Linked to PermissionGroup.id
  limits: {
    dailyPrompts: number;
    favorites: number;
  };
}

export interface AppConfig {
  id: 'global';
  activePromotion: 'trial' | 'yearly_bonus' | 'none';
  freeTrialEnabled: boolean;
  freeTrialDays: number;
  yearlyIncentiveType: 'months' | 'percent';
  yearlyIncentiveValue: number;
  vaultLimit: number;
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
  processedAt: any;
}
export interface AIModel {
  id: string;
  name: string;
  provider: string; // e.g. OpenAI, Anthropic
  version: string;
  description?: string;
  icon?: string;
  createdAt: any;
}

export interface Prompt {
  id?: string;
  slug: string;
  title: string;
  description: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  content: string;
  imageUrl?: string;
  isPaid: boolean;
  categoryId: string;
  creatorId: string;
  model: string; // This can be the Model ID
  tags: string[];
  likesCount: number;
  viewsCount?: number;
  copiesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  isPremium?: boolean;
}

export interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  coverImage?: string;
  authorId: string;
  status: 'draft' | 'published';
  tags: string[];
  viewsCount?: number;
  publishedAt?: any;
  createdAt: any;
  updatedAt: any;
}

