export type EmailGroup = 'auth' | 'onboarding' | 'nudge' | 'newsletter';

// Maps to NotifPrefs keys; null = always send (system-critical, bypasses pref check)
export type NotifPrefKey =
  | 'securityAlerts' | 'onboarding'
  | 'nudges' | 'newsletter' | 'promotions' | 'productUpdates';

export interface EmailVar {
  name: string;
  description: string;
  example: string;
}

export interface EmailTypeDefinition {
  type: string;
  name: string;
  group: EmailGroup;
  prefKey: NotifPrefKey | null;  // null = always send (bypasses user pref check)
  dedupWindowMs?: number;        // if set, duplicate sends within this window are suppressed server-side
  variables: EmailVar[];
  defaultSubject: string;
  defaultBody: string;
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

const welcome: EmailTypeDefinition = {
  type: 'welcome',
  name: 'Welcome Email',
  group: 'auth',
  prefKey: 'onboarding',
  dedupWindowMs: 7 * 24 * 60 * 60 * 1000, // 7 days — should only ever be sent once
  variables: [
    { name: 'name',    description: 'User display name',  example: 'Sarah' },
    { name: 'email',   description: 'User email address', example: 'sarah@example.com' },
    { name: 'app_url', description: 'App base URL',       example: 'https://aipromptcopypaste.in' },
  ],
  defaultSubject: 'Welcome to Promptly, {{name}}!',
  defaultBody: `Hi {{name}},

Welcome to Promptly — your AI prompt marketplace.

Start exploring thousands of battle-tested prompts for marketing, coding, creativity, and more. Every prompt is crafted to get better results from AI models instantly.

→ Explore Prompts: {{app_url}}/explore

If you have any questions, just reply to this email — we're here to help.

— The Promptly Team`,
};

const login_alert: EmailTypeDefinition = {
  type: 'login_alert',
  name: 'Login Alert',
  group: 'auth',
  prefKey: 'securityAlerts',
  dedupWindowMs: 8 * 60 * 60 * 1000, // 8 hours — one alert per session window
  variables: [
    { name: 'name',    description: 'User display name',             example: 'Sarah' },
    { name: 'email',   description: 'User email',                    example: 'sarah@example.com' },
    { name: 'time',    description: 'Login timestamp',               example: 'May 15, 2026 at 10:30 AM' },
    { name: 'browser', description: 'Browser used',                  example: 'Chrome on Windows 10/11' },
    { name: 'ip',      description: 'IP address of the login',       example: '203.0.113.42' },
  ],
  defaultSubject: 'New login to your Promptly account',
  defaultBody: `Hi {{name}},

A new login was detected for your Promptly account.

**Time:** {{time}}
**Device:** {{browser}}
**IP Address:** {{ip}}

If this was you, no action is needed.

If you don't recognise this login, secure your account immediately by changing your password.

→ Secure my account: {{app_url}}/settings/security

— The Promptly Team`,
};

const password_reset: EmailTypeDefinition = {
  type: 'password_reset',
  name: 'Password Reset',
  group: 'auth',
  prefKey: null,
  variables: [
    { name: 'name',       description: 'User display name',        example: 'Sarah' },
    { name: 'reset_link', description: 'One-time reset URL',       example: 'https://...' },
    { name: 'expiry',     description: 'Link expiry (e.g. 1 hour)', example: '1 hour' },
  ],
  defaultSubject: '🔐 Reset your Promptly password',
  defaultBody: `Hi {{name}},

We received a request to reset the password for your Promptly account.

Click the button below to choose a new password. This link expires in {{expiry}}.

→ Reset Password: {{reset_link}}

If you didn't request a password reset, you can safely ignore this email — your account is secure.

— The Promptly Team`,
};

// ─── ONBOARDING ──────────────────────────────────────────────────────────────

const onboarding_complete: EmailTypeDefinition = {
  type: 'onboarding_complete',
  name: 'Onboarding Complete',
  group: 'onboarding',
  prefKey: 'onboarding',
  dedupWindowMs: 7 * 24 * 60 * 60 * 1000, // 7 days — once per user
  variables: [
    { name: 'name',      description: 'User display name',           example: 'Sarah' },
    { name: 'interests', description: 'User interests bullet list',  example: '• Marketing\n• Coding' },
    { name: 'app_url',   description: 'App base URL',                example: 'https://aipromptcopypaste.in' },
  ],
  defaultSubject: 'Your personalised Promptly feed is ready, {{name}}!',
  defaultBody: `Hi {{name}},

Your Promptly profile is all set up. Your personalised "For You" feed is now live based on your interests:

{{interests}}

Every prompt you view, copy, or unlock teaches the feed more about what you need — just like your favourite content app.

→ See your feed: {{app_url}}/explore

— The Promptly Team`,
};

const onboarding_d1_nudge: EmailTypeDefinition = {
  type: 'onboarding_d1_nudge',
  name: 'Onboarding Day 1 Nudge',
  group: 'onboarding',
  prefKey: 'onboarding',
  dedupWindowMs: 30 * 24 * 60 * 60 * 1000, // 30 days — effectively once-per-user
  variables: [
    { name: 'name',         description: 'User display name',  example: 'Sarah' },
    { name: 'explore_link', description: 'Link to explore page', example: 'https://aipromptcopypaste.in/explore' },
  ],
  defaultSubject: '{{name}}, your first prompt is waiting',
  defaultBody: `Hi {{name}},

You signed up yesterday but haven't unlocked a prompt yet — you're one click away from something great.

We've picked a few prompts based on your interests. Unlocking one takes just 1 credit (you have plenty).

→ Find your first prompt: {{explore_link}}

— The Promptly Team`,
};

const onboarding_d3_prompt: EmailTypeDefinition = {
  type: 'onboarding_d3_prompt',
  name: 'Onboarding Day 3 — Personalised Pick',
  group: 'onboarding',
  prefKey: 'onboarding',
  dedupWindowMs: 30 * 24 * 60 * 60 * 1000, // 30 days — effectively once-per-user
  variables: [
    { name: 'name',         description: 'User display name',       example: 'Sarah' },
    { name: 'category',     description: 'Top interest category',   example: 'Marketing' },
    { name: 'explore_link', description: 'Link to explore page',    example: 'https://aipromptcopypaste.in/explore' },
  ],
  defaultSubject: 'Top {{category}} prompts picked for you',
  defaultBody: `Hi {{name}},

We've curated the best {{category}} prompts from our library — these are the ones professionals use every day.

These prompts save hours of back-and-forth with AI models. Copy, customise, and get results instantly.

→ Explore {{category}} prompts: {{explore_link}}

— The Promptly Team`,
};

// ─── NEWSLETTER ──────────────────────────────────────────────────────────────

const newsletter_confirm: EmailTypeDefinition = {
  type: 'newsletter_confirm',
  name: 'Newsletter Confirm Subscription',
  group: 'newsletter',
  prefKey: null,
  variables: [
    { name: 'name',         description: 'Subscriber name',     example: 'Sarah' },
    { name: 'confirm_link', description: 'Confirmation URL',    example: 'https://...' },
    { name: 'app_url',      description: 'App base URL',        example: 'https://aipromptcopypaste.in' },
  ],
  defaultSubject: 'Confirm your Promptly newsletter subscription',
  defaultBody: `Hi {{name}},

Thanks for subscribing to the Promptly newsletter! Click below to confirm your subscription.

→ Confirm subscription: {{confirm_link}}

If you didn't subscribe to this newsletter, you can safely ignore this email.

— The Promptly Team`,
};

const newsletter_welcome: EmailTypeDefinition = {
  type: 'newsletter_welcome',
  name: 'Newsletter Welcome',
  group: 'newsletter',
  prefKey: 'newsletter',
  variables: [
    { name: 'name',             description: 'Subscriber name',    example: 'Sarah' },
    { name: 'unsubscribe_link', description: 'Unsubscribe URL',    example: 'https://...' },
    { name: 'app_url',          description: 'App base URL',       example: 'https://aipromptcopypaste.in' },
  ],
  defaultSubject: "You're subscribed to the Promptly newsletter",
  defaultBody: `Hi {{name}},

Welcome to the Promptly newsletter! You'll receive regular tips, new prompt releases, and AI workflow ideas.

Expect to hear from us weekly. No spam — unsubscribe any time.

→ Explore Promptly: {{app_url}}/explore

— The Promptly Team`,
};

const new_prompt: EmailTypeDefinition = {
  type: 'new_prompt',
  name: 'New Prompt Published',
  group: 'auth',
  prefKey: 'onboarding',
  variables: [
    { name: 'name',  description: 'Creator name',    example: 'Sarah' },
    { name: 'title', description: 'Prompt title',    example: 'SEO Blog Writer' },
    { name: 'app_url', description: 'App base URL',  example: 'https://aipromptcopypaste.in' },
  ],
  defaultSubject: 'Your prompt "{{title}}" is live on Promptly!',
  defaultBody: `Hi {{name}},

Great work — your prompt "{{title}}" has been published and is now live in the Promptly marketplace.

Other creators can discover and unlock your prompt. You'll earn credits when they do.

→ View your prompt: {{app_url}}/explore

— The Promptly Team`,
};

// ─── MODERATION & BADGES ────────────────────────────────────────────────────

const prompt_submitted: EmailTypeDefinition = {
  type: 'prompt_submitted',
  name: 'Prompt Received',
  group: 'onboarding',
  prefKey: 'onboarding',
  dedupWindowMs: 5 * 60 * 1000, // 5 minutes — prevents double-send on accidental double-submit
  variables: [
    { name: 'name',          description: 'Creator name',   example: 'Sarah' },
    { name: 'prompt_title',  description: 'Prompt title',   example: 'SEO Blog Writer' },
    { name: 'dashboard_url', description: 'Dashboard link', example: 'https://aipromptcopypaste.in/dashboard/library' },
  ],
  defaultSubject: '✅ We received your prompt — review in progress',
  defaultBody: `Hi {{name}},

Thanks for submitting **"{{prompt_title}}"** to Promptly!

Our team reviews submissions within 24–48 hours. You'll get an email as soon as it's approved or if we need any changes.

You can track the status in your Creator Library at any time.

→ [View My Library]({{dashboard_url}})

— The Promptly Team`,
};

const prompt_approved: EmailTypeDefinition = {
  type: 'prompt_approved',
  name: 'Prompt Approved',
  group: 'onboarding',
  prefKey: null, // always send — important transactional
  variables: [
    { name: 'name',          description: 'Creator name',   example: 'Sarah' },
    { name: 'prompt_title',  description: 'Prompt title',   example: 'SEO Blog Writer' },
    { name: 'prompt_type',   description: 'free or premium', example: 'premium' },
    { name: 'dashboard_url', description: 'Dashboard link', example: 'https://aipromptcopypaste.in/dashboard/library' },
  ],
  defaultSubject: '🎉 Your prompt "{{prompt_title}}" is now live!',
  defaultBody: `Hi {{name}},

Great news — **"{{prompt_title}}"** has been approved and is live on the marketplace as a **{{prompt_type}}** prompt!

Share it on social media to drive views and earn through the Partner Program.

→ [View Your Library]({{dashboard_url}})

— The Promptly Team`,
};

const prompt_rejected: EmailTypeDefinition = {
  type: 'prompt_rejected',
  name: 'Prompt Needs Revision',
  group: 'onboarding',
  prefKey: null, // always send — important transactional
  variables: [
    { name: 'name',             description: 'Creator name',      example: 'Sarah' },
    { name: 'prompt_title',     description: 'Prompt title',      example: 'SEO Blog Writer' },
    { name: 'rejection_reason', description: 'Feedback from admin', example: 'Content too short' },
    { name: 'dashboard_url',    description: 'Dashboard link',    example: 'https://aipromptcopypaste.in/dashboard/library' },
  ],
  defaultSubject: '📝 Your prompt "{{prompt_title}}" needs a few changes',
  defaultBody: `Hi {{name}},

Thanks for submitting your prompt. After review, our team found a few things to improve.

**Prompt:** {{prompt_title}}
**Feedback:** {{rejection_reason}}

Please update your prompt and resubmit — we'd love to feature it.

→ [Edit in Dashboard]({{dashboard_url}})

— The Promptly Team`,
};

const prompt_warning: EmailTypeDefinition = {
  type: 'prompt_warning',
  name: 'Content Guidelines Reminder',
  group: 'nudge',
  prefKey: 'nudges',
  variables: [
    { name: 'name',          description: 'Creator name',   example: 'Sarah' },
    { name: 'prompt_title',  description: 'Prompt title',   example: 'SEO Blog Writer' },
    { name: 'dashboard_url', description: 'Dashboard link', example: 'https://aipromptcopypaste.in/dashboard/library' },
  ],
  defaultSubject: '⚠️ Community guidelines reminder for "{{prompt_title}}"',
  defaultBody: `Hi {{name}},

Your prompt **"{{prompt_title}}"** received a community report. No action was taken, but please review our content guidelines to avoid future issues.

→ [View Your Prompts]({{dashboard_url}})

— The Moderation Team`,
};

const prompt_hidden: EmailTypeDefinition = {
  type: 'prompt_hidden',
  name: 'Prompt Hidden',
  group: 'nudge',
  prefKey: 'nudges',
  variables: [
    { name: 'name',          description: 'Creator name',   example: 'Sarah' },
    { name: 'prompt_title',  description: 'Prompt title',   example: 'SEO Blog Writer' },
    { name: 'dashboard_url', description: 'Dashboard link', example: 'https://aipromptcopypaste.in/dashboard/library' },
  ],
  defaultSubject: '🔒 Your prompt "{{prompt_title}}" has been removed from Explore',
  defaultBody: `Hi {{name}},

Following multiple community reports, **"{{prompt_title}}"** has been temporarily hidden from the marketplace. You can still access and edit it from your dashboard. Reply to this email if you think this was an error.

→ [View Your Library]({{dashboard_url}})

— The Moderation Team`,
};

// ─── REGISTRY ────────────────────────────────────────────────────────────────

export const EMAIL_TYPES: Record<string, EmailTypeDefinition> = {
  welcome,
  login_alert,
  password_reset,
  onboarding_complete,
  onboarding_d1_nudge,
  onboarding_d3_prompt,
  newsletter_confirm,
  newsletter_welcome,
  new_prompt,
  prompt_submitted,
  prompt_approved,
  prompt_rejected,
  prompt_warning,
  prompt_hidden,
};

export const EMAIL_TYPE_LIST = Object.values(EMAIL_TYPES);

export const EMAIL_GROUPS: Record<EmailGroup, string> = {
  auth:        'Authentication',
  onboarding:  'Onboarding',
  nudge:       'Nudge',
  newsletter:  'Newsletter',
};
