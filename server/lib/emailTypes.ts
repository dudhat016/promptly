export type EmailGroup = 'auth' | 'onboarding' | 'billing' | 'dunning' | 'affiliate' | 'nudge' | 'newsletter';

// Maps to NotifPrefs keys; null = always send (system-critical, bypasses pref check)
export type NotifPrefKey =
  | 'securityAlerts' | 'billing' | 'onboarding'
  | 'nudges' | 'affiliate' | 'newsletter' | 'promotions' | 'productUpdates';

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
    { name: 'app_url', description: 'App base URL',       example: 'https://promptly.com' },
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
    { name: 'app_url',   description: 'App base URL',                example: 'https://promptly.com' },
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
    { name: 'explore_link', description: 'Link to explore page', example: 'https://promptly.com/explore' },
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
    { name: 'explore_link', description: 'Link to explore page',    example: 'https://promptly.com/explore' },
  ],
  defaultSubject: 'Top {{category}} prompts picked for you',
  defaultBody: `Hi {{name}},

We've curated the best {{category}} prompts from our library — these are the ones professionals use every day.

These prompts save hours of back-and-forth with AI models. Copy, customise, and get results instantly.

→ Explore {{category}} prompts: {{explore_link}}

— The Promptly Team`,
};

const onboarding_d7_expiry: EmailTypeDefinition = {
  type: 'onboarding_d7_expiry',
  name: 'Onboarding Day 7 — Credits Expiry',
  group: 'onboarding',
  prefKey: 'onboarding',
  dedupWindowMs: 30 * 24 * 60 * 60 * 1000, // 30 days — effectively once-per-user
  variables: [
    { name: 'name',         description: 'User display name',    example: 'Sarah' },
    { name: 'credits_left', description: 'Remaining credits',    example: '43' },
    { name: 'expiry_date',  description: 'Trial end date',       example: 'May 22, 2026' },
    { name: 'app_url',      description: 'App base URL',         example: 'https://promptly.com' },
  ],
  defaultSubject: '{{credits_left}} credits left — use them before {{expiry_date}}',
  defaultBody: `Hi {{name}},

You have {{credits_left}} free credits remaining. They expire on {{expiry_date}}.

Use them to unlock prompts now — or upgrade to Pro for unlimited access before they run out.

→ Upgrade to Pro: {{app_url}}/pricing
→ Use credits now: {{app_url}}/explore

— The Promptly Team`,
};

// ─── BILLING ─────────────────────────────────────────────────────────────────

const purchase_confirmation: EmailTypeDefinition = {
  type: 'purchase_confirmation',
  name: 'Purchase Confirmation',
  group: 'billing',
  prefKey: 'billing',
  variables: [
    { name: 'name',         description: 'User display name',       example: 'Sarah' },
    { name: 'plan',         description: 'Plan name',               example: 'Pro' },
    { name: 'amount',       description: 'Amount paid',             example: '19.00' },
    { name: 'currency',     description: 'Currency code',           example: 'USD' },
    { name: 'order_id',     description: 'Order ID',                example: 'ORD-1234567890' },
    { name: 'billing_cycle',description: 'monthly or yearly',      example: 'monthly' },
    { name: 'app_url',      description: 'App base URL',            example: 'https://promptly.com' },
  ],
  defaultSubject: "You're now on {{plan}} — Promptly",
  defaultBody: `Hi {{name}},

Your payment was successful — welcome to {{plan}}!

Plan: {{plan}}
Amount: {{currency}} {{amount}}
Billing: {{billing_cycle}}
Order ID: {{order_id}}

Your account has been upgraded and you now have full access to all Pro features including unlimited prompts, priority support, and monthly credit refresh.

→ Start exploring: {{app_url}}/explore
→ View your invoice: {{app_url}}/settings/billing

Thank you for trusting Promptly.

— The Promptly Team`,
};

const subscription_renewed: EmailTypeDefinition = {
  type: 'subscription_renewed',
  name: 'Subscription Renewed',
  group: 'billing',
  prefKey: 'billing',
  variables: [
    { name: 'name',            description: 'User display name',    example: 'Sarah' },
    { name: 'plan',            description: 'Plan name',            example: 'Pro' },
    { name: 'amount',          description: 'Renewal amount',       example: '19.00' },
    { name: 'currency',        description: 'Currency code',        example: 'USD' },
    { name: 'next_renewal',    description: 'Next renewal date',    example: 'Jun 15, 2026' },
    { name: 'app_url',         description: 'App base URL',         example: 'https://promptly.com' },
  ],
  defaultSubject: 'Your Promptly {{plan}} has been renewed',
  defaultBody: `Hi {{name}},

Your {{plan}} subscription has been renewed successfully.

Amount charged: {{currency}} {{amount}}
Next renewal: {{next_renewal}}

No action needed — your access continues without interruption.

→ Manage billing: {{app_url}}/settings/billing

— The Promptly Team`,
};

const trial_started: EmailTypeDefinition = {
  type: 'trial_started',
  name: 'Free Trial Started',
  group: 'billing',
  prefKey: 'billing',
  variables: [
    { name: 'name',           description: 'User display name',   example: 'Sarah' },
    { name: 'trial_end_date', description: 'Trial expiry date',   example: 'May 22, 2026' },
    { name: 'app_url',        description: 'App base URL',        example: 'https://promptly.com' },
  ],
  defaultSubject: 'Your Promptly free trial has started',
  defaultBody: `Hi {{name}},

Your free trial is now active! You have full access to Promptly until {{trial_end_date}}.

During your trial you can:
• Unlock unlimited prompts
• Access all premium categories
• Use every AI model integration

→ Start exploring: {{app_url}}/explore

We'll send you a reminder before your trial ends.

— The Promptly Team`,
};

// ─── DUNNING ─────────────────────────────────────────────────────────────────

const dunning_attempt_1: EmailTypeDefinition = {
  type: 'dunning_attempt_1',
  name: 'Payment Failed — 1st Notice',
  group: 'dunning',
  prefKey: 'billing',
  variables: [
    { name: 'name',        description: 'User display name',    example: 'Sarah' },
    { name: 'amount',      description: 'Amount that failed',   example: '19.00' },
    { name: 'billing_url', description: 'Link to billing page', example: 'https://promptly.com/settings/billing' },
  ],
  defaultSubject: 'Action needed: Your Promptly payment failed',
  defaultBody: `Hi {{name}},

We were unable to process your subscription payment of \${{amount}}.

Your Pro access is still active — please update your payment method to avoid any interruption.

→ Update payment method: {{billing_url}}

If you believe this is an error, reply to this email and we'll help you sort it out.

— The Promptly Team`,
};

const dunning_attempt_2: EmailTypeDefinition = {
  type: 'dunning_attempt_2',
  name: 'Payment Failed — 2nd Notice',
  group: 'dunning',
  prefKey: 'billing',
  variables: [
    { name: 'name',        description: 'User display name',    example: 'Sarah' },
    { name: 'amount',      description: 'Amount that failed',   example: '19.00' },
    { name: 'retry_date',  description: 'Next retry date',      example: 'May 18, 2026' },
    { name: 'billing_url', description: 'Link to billing page', example: 'https://promptly.com/settings/billing' },
  ],
  defaultSubject: '2nd notice: Update your Promptly payment method',
  defaultBody: `Hi {{name}},

This is our second attempt to notify you about a failed payment of \${{amount}}.

Your Pro access will end on {{retry_date}} if payment is not resolved. Please update your card details now.

→ Update payment method: {{billing_url}}

— The Promptly Team`,
};

const dunning_attempt_3: EmailTypeDefinition = {
  type: 'dunning_attempt_3',
  name: 'Payment Failed — Final Notice',
  group: 'dunning',
  prefKey: 'billing',
  variables: [
    { name: 'name',        description: 'User display name',    example: 'Sarah' },
    { name: 'amount',      description: 'Amount that failed',   example: '19.00' },
    { name: 'cancel_date', description: 'Account downgrade date', example: 'May 22, 2026' },
    { name: 'billing_url', description: 'Link to billing page', example: 'https://promptly.com/settings/billing' },
  ],
  defaultSubject: 'Final notice: Your Promptly subscription ends {{cancel_date}}',
  defaultBody: `Hi {{name}},

This is your final notice. After three failed payment attempts, your Pro subscription will be cancelled on {{cancel_date}} unless payment is resolved today.

After that date your account will revert to the Free plan and you'll lose access to premium prompts.

→ Update payment method now: {{billing_url}}

— The Promptly Team`,
};

const dunning_recovered: EmailTypeDefinition = {
  type: 'dunning_recovered',
  name: 'Payment Recovered',
  group: 'dunning',
  prefKey: 'billing',
  variables: [
    { name: 'name',    description: 'User display name',  example: 'Sarah' },
    { name: 'plan',    description: 'Plan name',          example: 'Pro' },
    { name: 'app_url', description: 'App base URL',       example: 'https://promptly.com' },
  ],
  defaultSubject: "Payment recovered — you're back on {{plan}} · Promptly",
  defaultBody: `Hi {{name}},

Great news — your payment was processed successfully and your {{plan}} subscription is fully active again.

No further action is needed. Everything is back to normal.

→ Back to Promptly: {{app_url}}/explore

— The Promptly Team`,
};

const subscription_ended: EmailTypeDefinition = {
  type: 'subscription_ended',
  name: 'Subscription Ended (Dunning)',
  group: 'dunning',
  prefKey: 'billing',
  variables: [
    { name: 'name',        description: 'User display name',   example: 'Sarah' },
    { name: 'app_url',     description: 'App base URL',        example: 'https://promptly.com' },
  ],
  defaultSubject: 'Your Promptly subscription has ended',
  defaultBody: `Hi {{name}},

After multiple unsuccessful payment attempts, your Pro subscription has ended and your account has been moved to the Free plan.

You can reactivate your subscription at any time by visiting the pricing page and subscribing again.

→ Reactivate Pro: {{app_url}}/pricing

We hope to see you back soon.

— The Promptly Team`,
};

// ─── NUDGE ───────────────────────────────────────────────────────────────────

const low_credits: EmailTypeDefinition = {
  type: 'low_credits',
  name: 'Low Credits Nudge',
  group: 'nudge',
  prefKey: 'nudges',
  dedupWindowMs: 24 * 60 * 60 * 1000, // 24 hours — max once per day
  variables: [
    { name: 'name',              description: 'User display name',   example: 'Sarah' },
    { name: 'credits_remaining', description: 'Credits left',        example: '3' },
    { name: 'app_url',           description: 'App base URL',        example: 'https://promptly.com' },
  ],
  defaultSubject: '⚡ {{credits_remaining}} credits left on your Promptly account',
  defaultBody: `Hi {{name}},

You only have {{credits_remaining}} credit{{credits_remaining === '1' ? '' : 's'}} remaining on your Promptly account.

Don't lose your momentum — top up your credits or upgrade to Pro for unlimited access to the entire prompt library.

→ Upgrade to Pro: {{app_url}}/pricing
→ View credits: {{app_url}}/dashboard/credits

— The Promptly Team`,
};

const trial_expiry: EmailTypeDefinition = {
  type: 'trial_expiry',
  name: 'Trial Expiry Nudge',
  group: 'nudge',
  prefKey: 'nudges',
  variables: [
    { name: 'name',            description: 'User display name',  example: 'Sarah' },
    { name: 'days_left',       description: 'Days until expiry',  example: '2' },
    { name: 'urgency_label',   description: 'today/tomorrow/in N days', example: 'in 2 days' },
    { name: 'trial_end_date',  description: 'Trial end date',     example: 'May 17, 2026' },
    { name: 'app_url',         description: 'App base URL',       example: 'https://promptly.com' },
  ],
  defaultSubject: '⏳ Your Promptly trial ends {{urgency_label}} — keep your access',
  defaultBody: `Hi {{name}},

Your free trial ends {{urgency_label}} ({{trial_end_date}}).

After that you'll lose access to premium prompts and Pro-only features. Upgrade now to keep your access without any interruption.

As a Pro member you get: unlimited unlocks, all premium prompts, priority support, and new content every week.

→ Activate Pro Now: {{app_url}}/pricing

— The Promptly Team`,
};

const trial_expired: EmailTypeDefinition = {
  type: 'trial_expired',
  name: 'Trial Expired',
  group: 'billing',
  prefKey: 'billing',
  variables: [
    { name: 'name',    description: 'User display name', example: 'Sarah' },
    { name: 'app_url', description: 'App base URL',      example: 'https://promptly.com' },
  ],
  defaultSubject: 'Your Promptly free trial has ended',
  defaultBody: `Hi {{name}},

Your free trial has ended and your account has been moved to the Free plan.

You still have access to Promptly — but premium prompts, unlimited unlocks, and Pro-only features are now locked.

Upgrade to Pro any time to get full access back instantly.

→ Reactivate Pro: {{app_url}}/pricing

We hope you enjoyed your trial. If you have any questions, just reply to this email.

— The Promptly Team`,
};

const renewal_reminder: EmailTypeDefinition = {
  type: 'renewal_reminder',
  name: 'Renewal Reminder',
  group: 'nudge',
  prefKey: 'nudges',
  variables: [
    { name: 'name',         description: 'User display name',    example: 'Sarah' },
    { name: 'renewal_date', description: 'Renewal date',         example: 'May 18, 2026' },
    { name: 'days_left',    description: 'Days until renewal',   example: '3' },
    { name: 'app_url',      description: 'App base URL',         example: 'https://promptly.com' },
  ],
  defaultSubject: '📅 Your Promptly Pro renews on {{renewal_date}}',
  defaultBody: `Hi {{name}},

Just a heads-up — your Pro subscription renews on {{renewal_date}} (in {{days_left}} day{{days_left === '1' ? '' : 's'}}).

No action needed if everything looks good. If you'd like to update your payment method or manage your plan, visit billing settings.

→ Manage Billing: {{app_url}}/settings/billing

— The Promptly Team`,
};

// ─── AFFILIATE ───────────────────────────────────────────────────────────────

const affiliate_join: EmailTypeDefinition = {
  type: 'affiliate_join',
  name: 'Affiliate Welcome',
  group: 'affiliate',
  prefKey: 'affiliate',
  dedupWindowMs: 7 * 24 * 60 * 60 * 1000, // 7 days — sent once on registration
  variables: [
    { name: 'name',          description: 'User display name',      example: 'Sarah' },
    { name: 'email',         description: 'User email',             example: 'sarah@example.com' },
    { name: 'referral_code', description: 'Unique referral code',   example: 'SARAH123' },
    { name: 'app_url',       description: 'App base URL',           example: 'https://promptly.com' },
  ],
  defaultSubject: 'Your Promptly affiliate account is active!',
  defaultBody: `Hi {{name}},

Your affiliate account is live! You can now start earning recurring commissions for every user you refer to Promptly.

Your referral code: {{referral_code}}

Share this link with your audience:
→ {{app_url}}?ref={{referral_code}}

Every paid subscriber you refer earns you a commission. Track your earnings and request payouts in your affiliate dashboard.

→ Affiliate Dashboard: {{app_url}}/affiliate

— The Promptly Team`,
};

const affiliate_commission_unlocked: EmailTypeDefinition = {
  type: 'affiliate_commission_unlocked',
  name: 'Commission Unlocked',
  group: 'affiliate',
  prefKey: 'affiliate',
  variables: [
    { name: 'name',          description: 'Affiliate name',          example: 'Sarah' },
    { name: 'amount',        description: 'Commission amount (USD)', example: '5.70' },
    { name: 'total_balance', description: 'Total available balance', example: '42.50' },
    { name: 'app_url',       description: 'App base URL',            example: 'https://promptly.com' },
  ],
  defaultSubject: '💰 ${{amount}} commission unlocked in your Promptly account',
  defaultBody: `Hi {{name}},

Great news — \${{amount}} in commission has just been unlocked and is now available for withdrawal.

Your total available balance: \${{total_balance}}

You can request a payout at any time from your affiliate dashboard once you've reached the minimum withdrawal threshold.

→ Affiliate Dashboard: {{app_url}}/affiliate

— The Promptly Team`,
};

const affiliate_withdrawal_approved: EmailTypeDefinition = {
  type: 'affiliate_withdrawal_approved',
  name: 'Withdrawal Approved',
  group: 'affiliate',
  prefKey: 'affiliate',
  variables: [
    { name: 'name',            description: 'Affiliate name',         example: 'Sarah' },
    { name: 'amount',          description: 'Withdrawal amount (USD)', example: '42.50' },
    { name: 'method',          description: 'Payout method',          example: 'PayPal' },
    { name: 'transaction_ref', description: 'Transaction reference',  example: 'TXN-ABC123' },
    { name: 'app_url',         description: 'App base URL',           example: 'https://promptly.com' },
  ],
  defaultSubject: '✅ Your Promptly withdrawal of ${{amount}} has been sent',
  defaultBody: `Hi {{name}},

Your withdrawal request has been approved and \${{amount}} has been sent to your {{method}} account.

Transaction reference: {{transaction_ref}}

Please allow 1–3 business days for the funds to appear in your account depending on your payment provider.

→ View payout history: {{app_url}}/affiliate

— The Promptly Team`,
};

const affiliate_withdrawal_rejected: EmailTypeDefinition = {
  type: 'affiliate_withdrawal_rejected',
  name: 'Withdrawal Rejected',
  group: 'affiliate',
  prefKey: 'affiliate',
  variables: [
    { name: 'name',       description: 'Affiliate name',           example: 'Sarah' },
    { name: 'amount',     description: 'Requested amount (USD)',   example: '42.50' },
    { name: 'admin_note', description: 'Reason from admin',        example: 'Invalid PayPal address' },
    { name: 'app_url',    description: 'App base URL',             example: 'https://promptly.com' },
  ],
  defaultSubject: 'Your Promptly withdrawal request needs attention',
  defaultBody: `Hi {{name}},

Unfortunately, your withdrawal request of \${{amount}} could not be processed at this time.

Reason: {{admin_note}}

Please update your payout details and submit a new request from your affiliate dashboard.

→ Affiliate Dashboard: {{app_url}}/affiliate

If you have any questions, reply to this email and we'll help you right away.

— The Promptly Team`,
};

const affiliate_first_conversion: EmailTypeDefinition = {
  type: 'affiliate_first_conversion',
  name: 'First Referral Converted',
  group: 'affiliate',
  prefKey: 'affiliate',
  variables: [
    { name: 'name',       description: 'Affiliate name',          example: 'Sarah' },
    { name: 'commission', description: 'Commission earned (USD)', example: '5.70' },
    { name: 'app_url',    description: 'App base URL',            example: 'https://promptly.com' },
  ],
  defaultSubject: '🎉 You just earned your first Promptly commission!',
  defaultBody: `Hi {{name}},

Congratulations — someone just signed up through your referral link and subscribed to Pro!

You've earned your first commission of \${{commission}}. It will be available for withdrawal after the lock period ends.

Keep sharing your referral link to earn more. The more you refer, the more you earn.

→ Affiliate Dashboard: {{app_url}}/affiliate

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
    { name: 'app_url',      description: 'App base URL',        example: 'https://promptly.com' },
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
    { name: 'app_url',          description: 'App base URL',       example: 'https://promptly.com' },
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
    { name: 'app_url', description: 'App base URL',  example: 'https://promptly.com' },
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
    { name: 'dashboard_url', description: 'Dashboard link', example: 'https://promptly.com/dashboard/library' },
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
    { name: 'dashboard_url', description: 'Dashboard link', example: 'https://promptly.com/dashboard/library' },
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
    { name: 'dashboard_url',    description: 'Dashboard link',    example: 'https://promptly.com/dashboard/library' },
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
    { name: 'dashboard_url', description: 'Dashboard link', example: 'https://promptly.com/dashboard/library' },
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
    { name: 'dashboard_url', description: 'Dashboard link', example: 'https://promptly.com/dashboard/library' },
  ],
  defaultSubject: '🔒 Your prompt "{{prompt_title}}" has been removed from Explore',
  defaultBody: `Hi {{name}},

Following multiple community reports, **"{{prompt_title}}"** has been temporarily hidden from the marketplace. You can still access and edit it from your dashboard. Reply to this email if you think this was an error.

→ [View Your Library]({{dashboard_url}})

— The Moderation Team`,
};

const badge_earned: EmailTypeDefinition = {
  type: 'badge_earned',
  name: 'Badge Earned',
  group: 'nudge',
  prefKey: 'nudges',
  variables: [
    { name: 'name',              description: 'User name',          example: 'Sarah' },
    { name: 'badge_name',        description: 'Badge label',        example: 'First Unlock' },
    { name: 'badge_description', description: 'Badge description',  example: 'Unlocked your first premium prompt' },
    { name: 'dashboard_url',     description: 'Dashboard link',     example: 'https://promptly.com/dashboard' },
  ],
  defaultSubject: '🏅 You just earned the {{badge_name}} badge!',
  defaultBody: `Hi {{name}},

Congratulations — you've earned the **{{badge_name}}** badge!

> {{badge_description}}

Keep exploring to unlock more achievements.

→ [View My Dashboard]({{dashboard_url}})

— The Promptly Team`,
};

const weekly_digest: EmailTypeDefinition = {
  type: 'weekly_digest',
  name: 'Weekly Creator Digest',
  group: 'newsletter',
  prefKey: 'newsletter',
  variables: [
    { name: 'name',          description: 'User name',           example: 'Sarah' },
    { name: 'week',          description: 'Week label',          example: 'May 12, 2026' },
    { name: 'top_prompts',   description: 'Top prompts list',    example: '• SEO Writer\n• Cold Email' },
    { name: 'dashboard_url', description: 'Dashboard link',      example: 'https://promptly.com/dashboard' },
  ],
  defaultSubject: '📬 Your Promptly weekly digest — {{week}}',
  defaultBody: `Hi {{name}},

Here's your weekly Promptly digest for the week of **{{week}}**.

## 🔥 Top Prompts This Week
{{top_prompts}}

→ [Go to Dashboard]({{dashboard_url}})

— The Promptly Team`,
};

// ─── REGISTRY ────────────────────────────────────────────────────────────────

export const EMAIL_TYPES: Record<string, EmailTypeDefinition> = {
  welcome,
  login_alert,
  password_reset,
  onboarding_complete,
  onboarding_d1_nudge,
  onboarding_d3_prompt,
  onboarding_d7_expiry,
  purchase_confirmation,
  subscription_renewed,
  trial_started,
  trial_expired,
  dunning_attempt_1,
  dunning_attempt_2,
  dunning_attempt_3,
  dunning_recovered,
  subscription_ended,
  low_credits,
  trial_expiry,
  renewal_reminder,
  affiliate_join,
  affiliate_commission_unlocked,
  affiliate_withdrawal_approved,
  affiliate_withdrawal_rejected,
  affiliate_first_conversion,
  newsletter_confirm,
  newsletter_welcome,
  new_prompt,
  prompt_submitted,
  prompt_approved,
  prompt_rejected,
  prompt_warning,
  prompt_hidden,
  badge_earned,
  weekly_digest,
};

export const EMAIL_TYPE_LIST = Object.values(EMAIL_TYPES);

export const EMAIL_GROUPS: Record<EmailGroup, string> = {
  auth:        'Authentication',
  onboarding:  'Onboarding',
  billing:     'Billing',
  dunning:     'Dunning',
  affiliate:   'Affiliate',
  nudge:       'Nudge',
  newsletter:  'Newsletter',
};
