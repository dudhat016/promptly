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
  hasCompletedOnboarding?: boolean;
  interests?: string[];
  preferredModel?: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin' | 'staff';
  subscriptionStatus: 'free' | 'pro' | 'enterprise';
  activePlanId?: string;
  subscriptionId?: string;
  subscriptionGateway?: 'cashfree' | 'paypal' | 'stripe';
  paypalSubscriptionId?: string;
  billingCycle?: 'monthly' | 'yearly';
  autoPayEnabled?: boolean;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: any;
  createdAt: string;
  referralCode?: string;
  referredBy?: string;
  staffRole?: string;
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
  suspended?: boolean;
  affinityProfile?: Record<string, number>;
  phoneNumber?: string;
  payoutMethods?: {
    upiId?: string;
    paypalEmail?: string;
    bankDetails?: string;
  };
  aiKeys?: {
    gemini?: string;
    openai?: string;
    anthropic?: string;
  };
  aiModels?: {
    gemini?: {
      chat?: string;
      text?: string;
      image?: string;
      video?: string;
    };
    openai?: {
      chat?: string;
      text?: string;
      image?: string;
    };
    anthropic?: {
      chat?: string;
      text?: string;
    };
  };
  aiProviders?: {
    chat?: 'gemini' | 'openai' | 'anthropic';
    text?: 'gemini' | 'openai' | 'anthropic';
    image?: 'gemini' | 'openai' | 'anthropic';
    video?: 'gemini' | 'openai' | 'anthropic';
  };
}

export interface Tag {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: any;
}

export interface ActivityItem {
  id: string;
  contactId: string;
  type: 'email_sent' | 'email_opened' | 'link_clicked' | 'tag_added' | 'tag_removed' | 'form_submitted' | 'subscription_changed' | 'login';
  description: string;
  metadata?: Record<string, any>;
  timestamp: any;
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
  leadScore?: number;
  lastEngagementAt?: any;
  prediction?: {
    churnRisk: 'low' | 'medium' | 'high';
    probability: number;
    updatedAt: any;
  };
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
  canCreateCollections: boolean;
  canAccessPremiumModels: boolean;
  canUseAPI: boolean;
  canRemoveWatermarks: boolean;
  hasPrioritySupport: boolean;
  canCustomBrandEmails: boolean;
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
  inrMonthlyPrice: number;
  inrYearlyPrice: number;
  features: string[];
  isPopular?: boolean;
  permissionGroupId: string; // Linked to PermissionGroup.id
  monthlyCredits: number;
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
  creatorName?: string;
  creatorRole?: 'user' | 'staff' | 'admin';
  model: string; // This can be the Model ID
  tags: string[];
  likesCount: number;
  viewsCount?: number;
  copiesCount?: number;
  createdAt: string;
  updatedAt: string;
  sampleOutput?: string;
  usageGuide?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  // Submission workflow
  status?: 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  // Moderation
  reportCount?: number;
  moderationStatus?: 'active' | 'flagged' | 'hidden';
}

export interface PromptReport {
  id?: string;
  promptId: string;
  promptTitle: string;
  promptCreatorId: string;
  reporterId: string | null;
  reason: 'spam' | 'harmful' | 'inappropriate' | 'copyright' | 'wrong_category' | 'duplicate' | 'other';
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  createdAt: any;
  reviewedBy?: string;
  reviewedAt?: any;
  adminNote?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  isPremium?: boolean;
}

export type AdminSection =
  | 'dashboard'
  | 'users'
  | 'prompts'
  | 'categories'
  | 'templates'
  | 'blog'
  | 'seo'
  | 'media'
  | 'ai_models'
  | 'inquiries'
  | 'tickets'
  | 'subscriptions'
  | 'revenue'
  | 'affiliates'
  | 'withdrawals'
  | 'marketing'
  | 'permissions'
  | 'roles'
  | 'activity'
  | 'settings'
  | 'emails'
  | 'reports';

export interface SectionPermission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface StaffRoleDefinition {
  id: string;
  name: string;
  description: string;
  color: string;
  sections: AdminSection[];
  sectionPermissions?: Partial<Record<AdminSection, SectionPermission>>;
  createdAt: any;
}

export interface StaffRolesConfig {
  roles: StaffRoleDefinition[];
  lastUpdated: any;
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
  authorName?: string;
  authorRole?: 'user' | 'staff' | 'admin';
  status: 'draft' | 'published';
  tags: string[];
  viewsCount?: number;
  publishedAt?: any;
  createdAt: any;
  updatedAt: any;
}
