/**
 * Client-side seed utilities for Firestore collections.
 * Each function is idempotent: it skips documents that already exist.
 */
import {
  addDoc, collection, doc, getDocs, serverTimestamp, setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Badges ────────────────────────────────────────────────────────────────

const SEED_BADGES = [
  {
    id: 'first_unlock',
    name: 'First Unlock',
    description: 'Unlocked your first premium prompt',
    iconName: 'Unlock',
    colorClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
    hint: 'Unlock any premium prompt',
    conditionType: 'unlocks',
    conditionThreshold: 1,
    isActive: true,
    order: 0,
  },
  {
    id: 'power_prompter',
    name: 'Power Prompter',
    description: 'Unlocked 10 or more premium prompts',
    iconName: 'Zap',
    colorClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    hint: 'Unlock 10 premium prompts',
    conditionType: 'power_unlocks',
    conditionThreshold: 10,
    isActive: true,
    order: 1,
  },
  {
    id: 'first_creation',
    name: 'First Creation',
    description: 'Submitted your first prompt to the marketplace',
    iconName: 'Star',
    colorClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    hint: 'Submit a prompt to the marketplace',
    conditionType: 'prompts',
    conditionThreshold: 1,
    isActive: true,
    order: 2,
  },
  {
    id: 'top_creator',
    name: 'Top Creator',
    description: 'Your prompts earned 100+ total views',
    iconName: 'Trophy',
    colorClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    hint: 'Get 100 total views on your prompts',
    conditionType: 'views',
    conditionThreshold: 100,
    isActive: true,
    order: 3,
  },
  {
    id: 'social_butterfly',
    name: 'Social',
    description: 'Following 5 or more creators',
    iconName: 'Users',
    colorClass: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
    hint: 'Follow 5 creators',
    conditionType: 'following',
    conditionThreshold: 5,
    isActive: true,
    order: 4,
  },
  {
    id: 'streak_7',
    name: '7-Day Streak',
    description: 'Visited Promptly 7 days in a row',
    iconName: 'Flame',
    colorClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    hint: 'Visit 7 days in a row',
    conditionType: 'streak',
    conditionThreshold: 7,
    isActive: true,
    order: 5,
  },
  {
    id: 'pro_member',
    name: 'Pro Member',
    description: 'Upgraded to a Pro subscription',
    iconName: 'Crown',
    colorClass: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    hint: 'Upgrade to Pro',
    conditionType: 'subscription_pro',
    conditionThreshold: 0,
    isActive: true,
    order: 6,
  },
  {
    id: 'connector',
    name: 'Connector',
    description: 'Referred at least one friend',
    iconName: 'Gift',
    colorClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
    hint: 'Refer a friend via your referral link',
    conditionType: 'referrals',
    conditionThreshold: 1,
    isActive: true,
    order: 7,
  },
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'One of the first users on Promptly',
    iconName: 'Rocket',
    colorClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    hint: 'Joined during early access',
    conditionType: 'early_adopter',
    conditionThreshold: 1748736000000, // 2025-06-01 UTC
    isActive: true,
    order: 8,
  },
  {
    id: 'profile_complete',
    name: 'All Set',
    description: 'Completed 100% of your profile',
    iconName: 'CheckCircle',
    colorClass: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
    hint: 'Complete all profile steps',
    conditionType: 'manual',
    conditionThreshold: 0,
    isActive: true,
    order: 9,
  },
] as const;

export async function seedBadges(): Promise<{ created: number; skipped: number }> {
  const existing = await getDocs(collection(db, 'badges'));
  const existingIds = new Set(existing.docs.map(d => d.id));
  let created = 0;
  let skipped = 0;
  for (const badge of SEED_BADGES) {
    if (existingIds.has(badge.id)) { skipped++; continue; }
    await setDoc(doc(db, 'badges', badge.id), { ...badge, createdAt: serverTimestamp() });
    created++;
  }
  return { created, skipped };
}

// ─── CRM Tags ──────────────────────────────────────────────────────────────

const SEED_TAGS = [
  { id: 'free_user',    name: 'Free User',    description: 'Users on the free plan',             color: '#6b7280' },
  { id: 'pro_user',     name: 'Pro User',     description: 'Active Pro subscribers',             color: '#f59e0b' },
  { id: 'new_signup',   name: 'New Signup',   description: 'Joined in the last 7 days',          color: '#10b981' },
  { id: 'active',       name: 'Active',       description: 'Logged in within the last 14 days',  color: '#3b82f6' },
  { id: 'at_risk',      name: 'At Risk',      description: 'Low engagement, possible churn',     color: '#ef4444' },
  { id: 'churned',      name: 'Churned',      description: 'Cancelled or lapsed subscription',   color: '#991b1b' },
  { id: 'affiliate',    name: 'Affiliate',    description: 'Enrolled in the partner program',    color: '#8b5cf6' },
  { id: 'power_user',   name: 'Power User',   description: 'Unlocked 10+ prompts',               color: '#f97316' },
  { id: 'trial',        name: 'Trial',        description: 'Currently on a free trial',          color: '#06b6d4' },
  { id: 'vip',          name: 'VIP',          description: 'High-value or long-term subscriber', color: '#d97706' },
  { id: 'badge:first_creation', name: 'Badge: First Creation', description: 'Earned the First Creation badge', color: '#2563eb' },
  { id: 'badge:pro_member',     name: 'Badge: Pro Member',     description: 'Earned the Pro Member badge',     color: '#ca8a04' },
] as const;

export async function seedCRMTags(): Promise<{ created: number; skipped: number }> {
  const existing = await getDocs(collection(db, 'marketing_tags'));
  const existingIds = new Set(existing.docs.map(d => d.id));
  let created = 0;
  let skipped = 0;
  for (const tag of SEED_TAGS) {
    if (existingIds.has(tag.id)) { skipped++; continue; }
    await setDoc(doc(db, 'marketing_tags', tag.id), {
      ...tag,
      createdAt: serverTimestamp(),
    });
    created++;
  }
  return { created, skipped };
}

// ─── CRM Contacts ──────────────────────────────────────────────────────────

const SEED_CONTACTS = [
  {
    email: 'alex.chen@example.com',
    displayName: 'Alex Chen',
    tags: ['pro_user', 'active', 'power_user', 'badge:pro_member'],
    status: 'active',
    subscriptionStatus: 'pro',
    leadScore: 92,
    notes: 'Power user — 14 prompts unlocked, active affiliate.',
  },
  {
    email: 'priya.sharma@example.com',
    displayName: 'Priya Sharma',
    tags: ['free_user', 'new_signup', 'active'],
    status: 'active',
    subscriptionStatus: 'free',
    leadScore: 45,
    notes: 'Signed up via referral. Good onboarding completion.',
  },
  {
    email: 'james.wu@example.com',
    displayName: 'James Wu',
    tags: ['free_user', 'at_risk', 'churned'],
    status: 'unsubscribed',
    subscriptionStatus: 'free',
    leadScore: 12,
    notes: 'Last login was 45 days ago. Unsubscribed from emails.',
  },
  {
    email: 'sofia.reyes@example.com',
    displayName: 'Sofia Reyes',
    tags: ['pro_user', 'affiliate', 'vip', 'badge:first_creation'],
    status: 'active',
    subscriptionStatus: 'pro',
    leadScore: 98,
    notes: 'Top affiliate — 22 referrals. Published 6 prompts.',
  },
  {
    email: 'liam.okafor@example.com',
    displayName: 'Liam Okafor',
    tags: ['trial', 'new_signup'],
    status: 'active',
    subscriptionStatus: 'free',
    leadScore: 60,
    notes: 'On 7-day trial. Good session length.',
  },
] as const;

export async function seedCRMContacts(): Promise<{ created: number; skipped: number }> {
  const existing = await getDocs(collection(db, 'marketing_contacts'));
  const existingEmails = new Set(existing.docs.map(d => d.data().email as string));
  let created = 0;
  let skipped = 0;
  for (const contact of SEED_CONTACTS) {
    if (existingEmails.has(contact.email)) { skipped++; continue; }
    await addDoc(collection(db, 'marketing_contacts'), {
      ...contact,
      lastActivity: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    created++;
  }
  return { created, skipped };
}

// ─── CRM Segments ──────────────────────────────────────────────────────────

const SEED_SEGMENTS = [
  {
    name: 'Pro Subscribers',
    description: 'All users with an active Pro subscription',
    matchType: 'and',
    filters: [{ field: 'subscriptionStatus', operator: 'equals', value: 'pro' }],
  },
  {
    name: 'Active Free Users',
    description: 'Free users who have been active in the last 14 days',
    matchType: 'and',
    filters: [
      { field: 'subscriptionStatus', operator: 'equals', value: 'free' },
      { field: 'status', operator: 'equals', value: 'active' },
    ],
  },
  {
    name: 'Churn Risk',
    description: 'Users tagged as at-risk or who haven\'t logged in for 30+ days',
    matchType: 'or',
    filters: [
      { field: 'tags', operator: 'contains', value: 'at_risk' },
      { field: 'tags', operator: 'contains', value: 'churned' },
    ],
  },
  {
    name: 'Affiliate Partners',
    description: 'Users enrolled in the partner / affiliate program',
    matchType: 'and',
    filters: [{ field: 'tags', operator: 'contains', value: 'affiliate' }],
  },
  {
    name: 'VIP Users',
    description: 'High-value Pro users with a lead score above 85',
    matchType: 'and',
    filters: [
      { field: 'tags', operator: 'contains', value: 'vip' },
      { field: 'leadScore', operator: 'greater_than', value: 85 },
    ],
  },
] as const;

export async function seedCRMSegments(): Promise<{ created: number; skipped: number }> {
  const existing = await getDocs(collection(db, 'marketing_segments'));
  const existingNames = new Set(existing.docs.map(d => d.data().name as string));
  let created = 0;
  let skipped = 0;
  for (const segment of SEED_SEGMENTS) {
    if (existingNames.has(segment.name)) { skipped++; continue; }
    await addDoc(collection(db, 'marketing_segments'), {
      ...segment,
      createdAt: serverTimestamp(),
    });
    created++;
  }
  return { created, skipped };
}

// ─── Automations ───────────────────────────────────────────────────────────

const SEED_AUTOMATIONS = [
  {
    name: 'Welcome Series',
    trigger: { type: 'user_signup' },
    active: true,
    steps: [
      { id: 's1', type: 'send_email', params: { templateId: 'welcome', delay: 0 } },
      { id: 's2', type: 'wait',       params: { days: 1 } },
      { id: 's3', type: 'send_email', params: { templateId: 'onboarding_complete', delay: 0 } },
      { id: 's4', type: 'add_tag',    params: { tag: 'new_signup' } },
    ],
  },
  {
    name: 'Trial Expiry Warning',
    trigger: { type: 'subscription_cancelled' },
    active: true,
    steps: [
      { id: 's1', type: 'send_email', params: { templateId: 'renewal_reminder', delay: 0 } },
      { id: 's2', type: 'wait',       params: { days: 3 } },
      { id: 's3', type: 'add_tag',    params: { tag: 'at_risk' } },
    ],
  },
  {
    name: 'Badge Earned Celebration',
    trigger: { type: 'tag_added', value: 'badge:pro_member' },
    active: true,
    steps: [
      { id: 's1', type: 'send_email', params: { templateId: 'badge_earned', delay: 0 } },
      { id: 's2', type: 'add_tag',    params: { tag: 'vip' } },
    ],
  },
  {
    name: 'Re-engagement Campaign',
    trigger: { type: 'limit_reached' },
    active: false,
    steps: [
      { id: 's1', type: 'wait',       params: { days: 7 } },
      { id: 's2', type: 'send_email', params: { templateId: 'renewal_reminder', delay: 0 } },
      { id: 's3', type: 'add_tag',    params: { tag: 'at_risk' } },
    ],
  },
  {
    name: 'Affiliate Commission',
    trigger: { type: 'affiliate_commison' },
    active: true,
    steps: [
      { id: 's1', type: 'send_email',     params: { templateId: 'affiliate_join', delay: 0 } },
      { id: 's2', type: 'notify_user',    params: { message: 'You earned a commission!' } },
      { id: 's3', type: 'add_tag',        params: { tag: 'affiliate' } },
    ],
  },
] as const;

export async function seedAutomations(): Promise<{ created: number; skipped: number }> {
  const existing = await getDocs(collection(db, 'marketing_automations'));
  const existingNames = new Set(existing.docs.map(d => d.data().name as string));
  let created = 0;
  let skipped = 0;
  for (const automation of SEED_AUTOMATIONS) {
    if (existingNames.has(automation.name)) { skipped++; continue; }
    await addDoc(collection(db, 'marketing_automations'), {
      ...automation,
      createdAt: serverTimestamp(),
    });
    created++;
  }
  return { created, skipped };
}

// ─── Email Templates ────────────────────────────────────────────────────────

const SEED_EMAIL_TEMPLATES = [
  {
    id: 'badge_earned',
    name: 'Badge Earned',
    type: 'badge_earned',
    group: 'nudge',
    subject: '🏅 You just earned the {{badge_name}} badge!',
    body: `Hi {{name}},

Congratulations — you've just earned the **{{badge_name}}** badge on Promptly!

> {{badge_description}}

Keep exploring and unlocking prompts to earn more achievements. Check your full badge collection on your dashboard.

[View My Badges]({{dashboard_url}})

Cheers,
The Promptly Team`,
    variables: ['name', 'badge_name', 'badge_description', 'dashboard_url'],
  },
  {
    id: 'welcome',
    name: 'Welcome Email',
    type: 'welcome',
    group: 'onboarding',
    subject: 'Welcome to Promptly, {{name}}! 🚀',
    body: `Hi {{name}},

Welcome to Promptly — the AI prompt marketplace built for creators and power users.

Here's how to get started:
1. Browse the **Explore** page to discover top prompts
2. Set up your **AI Integration** with your API keys
3. Submit your first prompt to start earning

[Start Exploring]({{dashboard_url}})

Cheers,
The Promptly Team`,
    variables: ['name', 'dashboard_url'],
  },
  {
    id: 'login_alert',
    name: 'Login Alert',
    type: 'login_alert',
    group: 'auth',
    subject: 'New sign-in to your Promptly account',
    body: `Hi there,

We detected a new sign-in to your Promptly account at **{{time}}**.

If this was you, no action is needed. If you don't recognise this login, please reset your password immediately.

[Reset Password]({{reset_url}})

Stay secure,
The Promptly Team`,
    variables: ['time', 'reset_url'],
  },
  {
    id: 'renewal_reminder',
    name: 'Renewal Reminder',
    type: 'renewal_reminder',
    group: 'dunning',
    subject: 'Your Promptly Pro subscription is ending soon',
    body: `Hi {{name}},

Your Promptly Pro subscription is ending soon. Don't lose access to premium prompts, unlimited credits, and Pro-only features.

[Renew My Subscription]({{billing_url}})

Questions? Reply to this email — we're here to help.

The Promptly Team`,
    variables: ['name', 'billing_url'],
  },
  {
    id: 'affiliate_join',
    name: 'Affiliate Welcome',
    type: 'affiliate_join',
    group: 'affiliate',
    subject: 'Your Promptly Partner referral code is ready',
    body: `Hi {{name}},

You're now a Promptly Partner! Share your referral code and earn commission on every Pro subscription.

**Your referral code:** {{referral_code}}

[View Your Dashboard]({{affiliate_url}})

Happy sharing,
The Promptly Team`,
    variables: ['name', 'referral_code', 'affiliate_url'],
  },
  {
    id: 'onboarding_complete',
    name: 'Onboarding Complete',
    type: 'onboarding_complete',
    group: 'onboarding',
    subject: 'Your Promptly workspace is ready',
    body: `Hi {{name}},

Your workspace is set up and tailored to your interests:

{{interests}}

Ready to start? Browse prompts matched to your profile on the Explore page.

[Go to Explore]({{explore_url}})

The Promptly Team`,
    variables: ['name', 'interests', 'explore_url'],
  },
  {
    id: 'prompt_warning',
    name: 'Content Warning',
    type: 'prompt_warning',
    group: 'nudge',
    subject: '⚠️ Community guidelines reminder for "{{prompt_title}}"',
    body: `Hi {{name}},

Your prompt **"{{prompt_title}}"** has received a community report. After review, no action was taken — however, we want to remind you of our content guidelines to avoid future issues.

Please ensure your prompts are:
- Original and not misleading
- Free from harmful, illegal, or inappropriate content
- Categorised correctly

[Review Your Prompts]({{dashboard_url}})

Thanks for contributing to Promptly.

The Moderation Team`,
    variables: ['name', 'prompt_title', 'dashboard_url'],
  },
  {
    id: 'prompt_hidden',
    name: 'Prompt Hidden',
    type: 'prompt_hidden',
    group: 'nudge',
    subject: '🔒 Your prompt "{{prompt_title}}" has been removed from Explore',
    body: `Hi {{name}},

After reviewing multiple community reports, we've temporarily hidden your prompt **"{{prompt_title}}"** from the Explore marketplace.

You can still access and edit it from your dashboard. If you believe this was in error, please reply to this email and we'll review it.

[View Your Library]({{dashboard_url}})

The Moderation Team`,
    variables: ['name', 'prompt_title', 'dashboard_url'],
  },
  {
    id: 'prompt_approved',
    name: 'Prompt Approved',
    type: 'prompt_approved',
    group: 'nudge',
    subject: '🎉 Your prompt "{{prompt_title}}" is now live!',
    body: `Hi {{name}},

Great news — your prompt has been reviewed and approved!

**"{{prompt_title}}"** is now live on the Promptly marketplace as a **{{prompt_type}}** prompt.

Creators and AI power users can now discover and use your work. Share it on social media to get more views and earn more from the Partner Program.

[View Your Prompt Library]({{dashboard_url}})

Keep creating,
The Promptly Team`,
    variables: ['name', 'prompt_title', 'prompt_type', 'dashboard_url'],
  },
  {
    id: 'prompt_rejected',
    name: 'Prompt Needs Revision',
    type: 'prompt_rejected',
    group: 'nudge',
    subject: '📝 Your prompt "{{prompt_title}}" needs a few changes',
    body: `Hi {{name}},

Thanks for submitting your prompt to Promptly. After review, our team found a few things to improve before it can go live.

**Prompt:** {{prompt_title}}
**Feedback:** {{rejection_reason}}

Please update your prompt and resubmit — we'd love to feature it on the marketplace.

[Edit Your Prompt]({{dashboard_url}})

Any questions? Just reply to this email.

The Promptly Team`,
    variables: ['name', 'prompt_title', 'rejection_reason', 'dashboard_url'],
  },
  {
    id: 'trial_expired',
    name: 'Trial Expired',
    type: 'trial_expired',
    group: 'billing',
    subject: 'Your Promptly free trial has ended',
    body: `Hi {{name}},

Your free trial has ended and your account has been moved to the Free plan.

You still have access to Promptly — but premium prompts, unlimited unlocks, and Pro-only features are now locked.

Upgrade to Pro any time to get full access back instantly.

→ Reactivate Pro: {{app_url}}/pricing

We hope you enjoyed your trial. If you have any questions, just reply to this email.

— The Promptly Team`,
    variables: ['name', 'app_url'],
  },
  {
    id: 'weekly_digest',
    name: 'Weekly Creator Digest',
    type: 'weekly_digest',
    group: 'newsletter',
    subject: '📬 Your Promptly weekly digest — {{week}}',
    body: `Hi {{name}},

Here's what's happening on Promptly this week:

## 🔥 Top Prompts This Week
{{top_prompts}}

## 📊 Your Progress
- Credits used this week: **{{credits_used}}**
- Prompts viewed: **{{prompts_viewed}}**
- Current streak: **{{streak}} days** 🔥

## 💡 Featured Prompt
**{{featured_title}}** — {{featured_description}}
[Explore it]({{featured_url}})

---
Keep building, keep creating.

[Go to Dashboard]({{dashboard_url}}) · [Unsubscribe]({{unsubscribe_url}})

The Promptly Team`,
    variables: ['name', 'week', 'top_prompts', 'credits_used', 'prompts_viewed', 'streak', 'featured_title', 'featured_description', 'featured_url', 'dashboard_url', 'unsubscribe_url'],
  },
] as const;

export async function seedEmailTemplates(): Promise<{ created: number; skipped: number }> {
  const existing = await getDocs(collection(db, 'templates'));
  const existingIds = new Set(existing.docs.map(d => d.id));
  let created = 0;
  let skipped = 0;
  for (const tpl of SEED_EMAIL_TEMPLATES) {
    if (existingIds.has(tpl.id)) { skipped++; continue; }
    await setDoc(doc(db, 'templates', tpl.id), {
      ...tpl,
      lastUpdated: serverTimestamp(),
    });
    created++;
  }
  return { created, skipped };
}

// ─── Seed all ──────────────────────────────────────────────────────────────

export async function seedAll(): Promise<Record<string, { created: number; skipped: number }>> {
  const [badges, tags, contacts, segments, automations, emailTemplates] = await Promise.all([
    seedBadges(),
    seedCRMTags(),
    seedCRMContacts(),
    seedCRMSegments(),
    seedAutomations(),
    seedEmailTemplates(),
  ]);
  return { badges, tags, contacts, segments, automations, emailTemplates };
}
