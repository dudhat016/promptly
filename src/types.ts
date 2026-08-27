export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface HeaderMenuItem {
  id: string;
  label: string;
  type: 'category' | 'tag' | 'page' | 'custom';
  url: string;
  target?: '_self' | '_blank';
  order: number;
  children?: HeaderMenuItem[];
}

export interface NotifPrefs {
  securityAlerts: boolean;  // login alerts, password reset — locked on
  onboarding: boolean;       // welcome, onboarding emails, new prompt published
  newsletter: boolean;       // newsletter broadcasts
  promotions: boolean;       // promotional offers and deals
  productUpdates: boolean;   // feature announcements
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
  createdAt: string;
  staffRole?: string;
  favorites?: string[];
  unlockedPrompts?: string[];
  lastActiveAt?: any;
  suspended?: boolean;
  followerCount?: number;
  following?: string[];
  affinityProfile?: Record<string, number>;
  phoneNumber?: string;
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
  notificationPrefs?: Partial<NotifPrefs>;
  currentStreak?: number;
  // ── Public creator profile ──
  username?: string;
  bio?: string;
  website?: string;
  location?: string;
  expertiseTags?: string[];
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    github?: string;
    youtube?: string;
    linkedin?: string;
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
  userId?: string;
  tags: string[];
  status: 'active' | 'unsubscribed' | 'bounced' | 'pending_confirm';
  lastActivity: any;
  createdAt: any;
  customFields?: Record<string, string>;
  notes?: string;
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
    type: 'tag_added' | 'tag_remove' | 'user_signup' | 'user_login' | 'contact_created' | 'prompt_favorite' | 'list_applied' | 'list_removed' | 'form_submited';
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
  categoryId: string;
  creatorId: string;
  creatorName?: string;
  creatorRole?: 'user' | 'staff' | 'admin';
  model: string; // This can be the Model ID
  tags: string[];
  likesCount: number;
  viewsCount?: number;
  copiesCount?: number;
  avgRating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
  sampleOutput?: string;
  usageGuide?: string;
  // Submission workflow
  status?: 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  previousRejectionReason?: string;
  resubmissionCount?: number;
  // Moderation
  reportCount?: number;
  moderationStatus?: 'active' | 'flagged' | 'hidden';
}

export interface PromptReview {
  id: string;
  promptId: string;
  promptTitle?: string;
  promptSlug?: string;
  userId: string;
  displayName: string;
  photoURL?: string | null;
  rating: number;
  comment: string;
  createdAt: any;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  reviewedAt?: any;
  reviewedBy?: string;
}

export interface PromptCollection {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  promptIds: string[];
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
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
  | 'marketing'
  | 'permissions'
  | 'roles'
  | 'activity'
  | 'settings'
  | 'emails'
  | 'reports'
  | 'content'
  | 'reviews';

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
