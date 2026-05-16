import admin from "firebase-admin";

// ─── TAGS ─────────────────────────────────────────────────────────────────────

export const SEED_TAGS = [
  {
    id: "new_user",
    name: "New User",
    color: "#6366f1",
    description: "Joined in the last 7 days — in active onboarding window",
  },
  {
    id: "activated",
    name: "Activated",
    color: "#10b981",
    description: "Has unlocked or used at least one prompt — reached first value moment",
  },
  {
    id: "power_user",
    name: "Power User",
    color: "#f59e0b",
    description: "High engagement: regularly unlocks and uses prompts",
  },
  {
    id: "pro_subscriber",
    name: "Pro Subscriber",
    color: "#8b5cf6",
    description: "Active paying Pro subscriber",
  },
  {
    id: "free_user",
    name: "Free User",
    color: "#64748b",
    description: "On free plan — upgrade conversion target",
  },
  {
    id: "trial_user",
    name: "Trial User",
    color: "#06b6d4",
    description: "Currently in a free trial period",
  },
  {
    id: "at_risk",
    name: "At Risk",
    color: "#f97316",
    description: "Low recent engagement — potential churn signal",
  },
  {
    id: "win_back_candidate",
    name: "Win-Back",
    color: "#ef4444",
    description: "Inactive for 30+ days — win-back sequence target",
  },
  {
    id: "prompt_creator",
    name: "Prompt Creator",
    color: "#84cc16",
    description: "Has submitted at least one prompt to the marketplace",
  },
  {
    id: "affiliate",
    name: "Affiliate",
    color: "#d946ef",
    description: "Enrolled in the Promptly affiliate / referral program",
  },
  {
    id: "newsletter_subscriber",
    name: "Newsletter",
    color: "#0ea5e9",
    description: "Confirmed double opt-in newsletter subscriber",
  },
  {
    id: "high_value",
    name: "High Value",
    color: "#eab308",
    description: "Multiple purchases or long-term subscriber — high LTV",
  },
  {
    id: "vip",
    name: "VIP",
    color: "#a855f7",
    description: "Top-tier user — manually assigned, white-glove treatment",
  },
];

// ─── SEGMENTS ─────────────────────────────────────────────────────────────────

export const SEED_SEGMENTS = [
  {
    id: "seg_active_pro",
    name: "Active Pro Subscribers",
    description: "All contacts with an active Pro subscription — billing & upsell list",
    matchType: "and",
    filters: [
      { field: "subscriptionStatus", operator: "equals", value: "pro" },
      { field: "tags",               operator: "contains", value: "pro_subscriber" },
    ],
  },
  {
    id: "seg_free_users",
    name: "Free Users — Upgrade Targets",
    description: "Active free-plan users who haven't converted — primary upgrade audience",
    matchType: "and",
    filters: [
      { field: "subscriptionStatus", operator: "equals", value: "free" },
      { field: "tags",               operator: "contains", value: "free_user" },
    ],
  },
  {
    id: "seg_new_this_week",
    name: "New This Week",
    description: "Users who joined in the last 7 days — onboarding sequence target",
    matchType: "and",
    filters: [
      { field: "tags", operator: "contains", value: "new_user" },
    ],
  },
  {
    id: "seg_at_risk",
    name: "At-Risk Users",
    description: "Low-engagement users showing early churn signals",
    matchType: "and",
    filters: [
      { field: "tags", operator: "contains", value: "at_risk" },
    ],
  },
  {
    id: "seg_win_back",
    name: "Win-Back Candidates",
    description: "Inactive 30+ days — win-back campaign and reactivation offers",
    matchType: "and",
    filters: [
      { field: "tags", operator: "contains", value: "win_back_candidate" },
    ],
  },
  {
    id: "seg_newsletter",
    name: "Newsletter Subscribers",
    description: "Confirmed double opt-in subscribers — weekly digest list",
    matchType: "and",
    filters: [
      { field: "tags", operator: "contains", value: "newsletter_subscriber" },
    ],
  },
  {
    id: "seg_creators",
    name: "Prompt Creators",
    description: "Users who have submitted prompts — creator-focused communication",
    matchType: "and",
    filters: [
      { field: "tags", operator: "contains", value: "prompt_creator" },
    ],
  },
  {
    id: "seg_affiliates",
    name: "Affiliates",
    description: "Active affiliate program members — commission and referral updates",
    matchType: "and",
    filters: [
      { field: "tags", operator: "contains", value: "affiliate" },
    ],
  },
  {
    id: "seg_high_value",
    name: "High-Value Users",
    description: "Long-term or multi-purchase subscribers — retention priority list",
    matchType: "and",
    filters: [
      { field: "subscriptionStatus", operator: "equals", value: "pro" },
      { field: "tags",               operator: "contains", value: "high_value" },
    ],
  },
  {
    id: "seg_unsubscribed",
    name: "Unsubscribed",
    description: "Users who opted out — suppression list, do not contact",
    matchType: "and",
    filters: [
      { field: "subscriptionStatus", operator: "equals", value: "cancelled" },
    ],
  },
];

// ─── AUTOMATION FLOWS ────────────────────────────────────────────────────────

function step(type: string, params: Record<string, any>) {
  return { id: Math.random().toString(36).substr(2, 9), type, params };
}

export const SEED_FLOWS = [
  // ── 1. Welcome Onboarding Sequence ──────────────────────────────────────────
  {
    id: "flow_welcome_onboarding",
    name: "Welcome Onboarding Sequence",
    description: "4-email drip that moves new signups to first value moment and upgrades",
    trigger: { type: "user_signup" },
    active: true,
    steps: [
      step("send_email", { templateId: "welcome" }),
      step("wait",       { duration: 1, unit: "days" }),
      step("send_email", { templateId: "onboarding_d1_nudge" }),
      step("wait",       { duration: 2, unit: "days" }),
      step("send_email", { templateId: "onboarding_d3_prompt" }),
      step("wait",       { duration: 4, unit: "days" }),
      step("send_email", { templateId: "onboarding_d7_expiry" }),
      step("add_tag",    { tagId: "at_risk" }),
    ],
  },

  // ── 2. Pro Welcome & Activation ─────────────────────────────────────────────
  {
    id: "flow_pro_welcome",
    name: "Pro Welcome & Activation",
    description: "Onboards new Pro subscribers, highlights features, builds sticky habit",
    trigger: { type: "subscription_payment_received" },
    active: true,
    steps: [
      step("send_email", { templateId: "purchase_confirmation" }),
      step("add_tag",    { tagId: "pro_subscriber" }),
      step("remove_tag", { tagId: "free_user" }),
      step("remove_tag", { tagId: "trial_user" }),
      step("wait",       { duration: 2, unit: "days" }),
      step("send_email", { templateId: "onboarding_complete" }),
      step("wait",       { duration: 5, unit: "days" }),
      step("recommend_prompt", { category: "all" }),
      step("add_tag",    { tagId: "activated" }),
    ],
  },

  // ── 3. Subscription Renewed — Gratitude & Retention ─────────────────────────
  {
    id: "flow_renewal",
    name: "Subscription Renewed",
    description: "Thanks the user on each renewal and surfaces new prompts to reinforce value",
    trigger: { type: "subscription_renewed" },
    active: true,
    steps: [
      step("send_email",       { templateId: "subscription_renewed" }),
      step("wait",             { duration: 3, unit: "days" }),
      step("recommend_prompt", { category: "all" }),
      step("add_tag",          { tagId: "high_value" }),
    ],
  },

  // ── 4. Trial Started → Conversion ───────────────────────────────────────────
  {
    id: "flow_trial_conversion",
    name: "Trial Conversion Sequence",
    description: "Guides trial users to upgrade before expiry with escalating urgency",
    trigger: { type: "subscription_payment_received" },
    active: false,
    steps: [
      step("send_email", { templateId: "trial_started" }),
      step("add_tag",    { tagId: "trial_user" }),
      step("wait",       { duration: 3, unit: "days" }),
      step("send_email", { templateId: "onboarding_d3_prompt" }),
      step("wait",       { duration: 4, unit: "days" }),
      step("send_email", { templateId: "trial_expiry" }),
      step("wait",       { duration: 3, unit: "days" }),
      step("send_email", { templateId: "onboarding_d7_expiry" }),
    ],
  },

  // ── 5. Subscription Cancelled — Recovery ────────────────────────────────────
  {
    id: "flow_cancellation_recovery",
    name: "Post-Cancellation Recovery",
    description: "Engages churned users with empathy, feedback ask, and win-back offer",
    trigger: { type: "subscription_cancelled" },
    active: true,
    steps: [
      step("send_email", { templateId: "subscription_ended" }),
      step("add_tag",    { tagId: "win_back_candidate" }),
      step("remove_tag", { tagId: "pro_subscriber" }),
      step("wait",       { duration: 3, unit: "days" }),
      step("send_email", { templateId: "low_credits" }),
      step("wait",       { duration: 7, unit: "days" }),
      step("recommend_prompt", { category: "all" }),
    ],
  },

  // ── 6. Win-Back Campaign ─────────────────────────────────────────────────────
  {
    id: "flow_win_back",
    name: "Win-Back Campaign",
    description: "3-touch re-engagement for users tagged as win-back candidates",
    trigger: { type: "tag_added", value: "win_back_candidate" },
    active: true,
    steps: [
      step("wait",             { duration: 1, unit: "days" }),
      step("send_email",       { templateId: "onboarding_d7_expiry" }),
      step("wait",             { duration: 4, unit: "days" }),
      step("recommend_prompt", { category: "all" }),
      step("wait",             { duration: 7, unit: "days" }),
      step("send_email",       { templateId: "low_credits" }),
    ],
  },

  // ── 7. Newsletter Welcome Sequence ──────────────────────────────────────────
  {
    id: "flow_newsletter_welcome",
    name: "Newsletter Welcome Sequence",
    description: "Welcomes confirmed newsletter subscribers and delivers first value",
    trigger: { type: "contact_created" },
    active: true,
    steps: [
      step("add_tag",          { tagId: "newsletter_subscriber" }),
      step("wait",             { duration: 3, unit: "days" }),
      step("recommend_prompt", { category: "all" }),
      step("wait",             { duration: 7, unit: "days" }),
      step("send_email",       { templateId: "newsletter_welcome" }),
    ],
  },

  // ── 8. Affiliate Activation ──────────────────────────────────────────────────
  {
    id: "flow_affiliate_activation",
    name: "Affiliate Activation",
    description: "Activates new affiliates with their link, commission details, and tips",
    trigger: { type: "affiliate_commison" },
    active: true,
    steps: [
      step("send_email", { templateId: "affiliate_join" }),
      step("add_tag",    { tagId: "affiliate" }),
      step("wait",       { duration: 3, unit: "days" }),
      step("send_email", { templateId: "affiliate_commission_unlocked" }),
    ],
  },

  // ── 9. Credit Limit Reached → Upsell ─────────────────────────────────────────
  {
    id: "flow_limit_reached",
    name: "Credit Limit Upsell",
    description: "Fires when a user exhausts their monthly credits — tags them and sends a timed upgrade sequence",
    trigger: { type: "limit_reached" },
    active: true,
    steps: [
      step("add_tag",      { tagId: "at_risk" }),
      step("wait",         { duration: 2, unit: "days" }),
      step("send_email",   { templateId: "low_credits" }),
      step("wait",         { duration: 3, unit: "days" }),
      step("recommend_prompt", { count: 3, strategy: "trending" }),
    ],
  },

  // ── 10. Prompt Favourited ─────────────────────────────────────────────────────
  {
    id: "flow_prompt_favorited",
    name: "Prompt Favourited",
    description: "When a user favourites a prompt — tags as activated and recommends similar content",
    trigger: { type: "prompt_favorite" },
    active: false,
    steps: [
      step("add_tag",          { tagId: "activated" }),
      step("wait",             { duration: 1, unit: "days" }),
      step("recommend_prompt", { count: 3, strategy: "similar" }),
    ],
  },
];

// ─── EMAIL TEMPLATES (production-ready copy) ─────────────────────────────────

export const SEED_TEMPLATES: Array<{
  type: string;
  subject: string;
  body: string;
}> = [
  // ── Auth ────────────────────────────────────────────────────────────────────

  {
    type: "welcome",
    subject: "You're in, {{name}} — your AI toolkit is ready",
    body: `Hi {{name}},

Welcome to Promptly — the AI prompt marketplace trusted by marketers, developers, and creators who want better results from AI, faster.

Here's what you can do right now:

→ [Explore top prompts]({{app_url}}/en/explore) — browse thousands of battle-tested prompts across 20+ categories
→ [Try a free prompt]({{app_url}}/en/explore) — your free credits are waiting, no card needed
→ [See what Pro unlocks]({{app_url}}/en/pricing) — unlimited access, priority support, new prompts every week

**Why Promptly?**

Most people spend 30–60 minutes crafting a single AI prompt that actually works. Our prompts are already optimised — copy, customise, and get results in seconds.

If you have any questions, just reply to this email. A real person will respond.

— The Promptly Team`,
  },

  {
    type: "login_alert",
    subject: "New login to your Promptly account",
    body: `Hi {{name}},

We noticed a new sign-in to your Promptly account on {{time}}.

If this was you, everything is fine — no action needed.

If you don't recognise this login, secure your account immediately:

→ [Change my password now]({{app_url}}/en/settings/security)
→ [Review account activity]({{app_url}}/en/settings/security)

For your security, we recommend using a strong, unique password and enabling two-factor authentication.

— The Promptly Team`,
  },

  {
    type: "password_reset",
    subject: "Reset your Promptly password (link expires in {{expiry}})",
    body: `Hi {{name}},

We received a request to reset the password on your Promptly account.

→ [Reset my password]({{reset_link}})

This link expires in **{{expiry}}**. If you didn't request this, you can safely ignore this email — your account password has not been changed.

For security, never share this link with anyone. Promptly staff will never ask for it.

— The Promptly Team`,
  },

  // ── Onboarding ───────────────────────────────────────────────────────────────

  {
    type: "onboarding_complete",
    subject: "Your personalised Promptly feed is live, {{name}}",
    body: `Hi {{name}},

Your Promptly profile is set up and your personalised "For You" feed is now live.

Based on your interests:
{{interests}}

Every prompt you explore, unlock, or favourite teaches the feed more about what you need. The more you use it, the better it gets.

**Your next step:** unlock your first prompt and see how much faster you can work with AI.

→ [Open my feed]({{app_url}}/en/explore)

The average Promptly user saves 3–5 hours a week on AI prompt engineering. Let's get you there.

— The Promptly Team`,
  },

  {
    type: "onboarding_d1_nudge",
    subject: "{{name}}, one prompt could change how you work with AI",
    body: `Hi {{name}},

You signed up yesterday but haven't unlocked a prompt yet.

That's fair — life gets busy. But here's the thing: most people who try their first Promptly prompt tell us it was their "aha moment" with AI.

You have free credits ready to use. Unlocking one prompt takes 10 seconds.

→ [Find a prompt that fits you]({{explore_link}})

Not sure where to start? Our most popular categories right now:
→ **Marketing** — ad copy, email sequences, social media
→ **Coding** — code review, documentation, debugging
→ **Writing** — blog posts, scripts, SEO content

Pick one. You'll be glad you did.

— The Promptly Team`,
  },

  {
    type: "onboarding_d3_prompt",
    subject: "How Promptly users save 5+ hours a week (real examples)",
    body: `Hi {{name}},

Three days in — here's how creators like you are already using Promptly:

→ **Sarah (marketer)** writes a full email sequence in 20 minutes instead of 3 hours
→ **James (developer)** reviews code and writes documentation 4x faster
→ **Priya (content creator)** plans and writes a week of social content in one session

The difference? They're using prompts that have been refined by thousands of professionals, not starting from scratch every time.

You have access to the same prompts. Here's where to start:

→ [Browse {{category}} prompts — your top interest]({{explore_link}})

**Pro tip:** use the "Copy" button to paste any prompt directly into ChatGPT, Claude, or Gemini. No editing required.

— The Promptly Team`,
  },

  {
    type: "onboarding_d7_expiry",
    subject: "{{credits_left}} credits left — don't let them expire on {{expiry_date}}",
    body: `Hi {{name}},

Quick heads-up: you have **{{credits_left}} credits** remaining and they expire on **{{expiry_date}}**.

That's {{credits_left}} prompts you could unlock today — for free.

Here's what you can do right now:

→ [Use your free credits before they expire]({{app_url}}/en/explore)
→ [Upgrade to Pro for unlimited access]({{app_url}}/en/pricing)

**Why Pro?**
Pro members never run out of credits. They get unlimited unlocks, access to every premium prompt, monthly credit refresh, and priority support.

Plans start from less than a coffee a week.

→ [See Pro plans]({{app_url}}/en/pricing)

Don't let the free credits go to waste. Use them — then decide if Pro is right for you.

— The Promptly Team`,
  },

  // ── Billing ──────────────────────────────────────────────────────────────────

  {
    type: "purchase_confirmation",
    subject: "You're now on Promptly {{plan}} ⚡ — here's what's unlocked",
    body: `Hi {{name}},

Your payment was successful. Welcome to **{{plan}}**.

**Order summary**
Plan: {{plan}}
Amount: {{currency}} {{amount}}
Billing: {{billing_cycle}}
Order ID: {{order_id}}

**What's unlocked for you right now:**

→ Unlimited prompt unlocks — no credit limits, ever
→ Every premium category — marketing, coding, writing, sales, and more
→ New prompts added weekly — first access for Pro members
→ Priority email support — real responses within 4 hours
→ Full prompt source access — see and customise every prompt

**Your first step:** explore a premium prompt that you couldn't access before.

→ [Start exploring Pro prompts]({{app_url}}/en/explore)
→ [View your invoice]({{app_url}}/en/settings/billing)

Thank you for trusting Promptly. If you need anything, just reply to this email.

— The Promptly Team`,
  },

  {
    type: "trial_started",
    subject: "Your Promptly Pro trial is live — here's what to do first",
    body: `Hi {{name}},

Your free trial is active. You now have full Pro access until **{{trial_end_date}}**.

**What's available during your trial:**

→ Unlimited prompt unlocks across all categories
→ Every premium prompt in the library
→ AI model integrations and prompt variables
→ Full prompt source with copy-to-clipboard

**Three things to do today:**

→ [Unlock a prompt in your main use case]({{app_url}}/en/explore)
→ [Browse the Marketing category]({{app_url}}/en/explore) — most popular with new users
→ [Check the Coding prompts]({{app_url}}/en/explore) — saves the most time per session

You'll get a reminder before your trial ends. No charges until then.

If you decide Pro isn't right for you, you can cancel any time — no questions asked.

— The Promptly Team`,
  },

  {
    type: "subscription_renewed",
    subject: "Your Promptly {{plan}} renewed — thanks for sticking with us",
    body: `Hi {{name}},

Your **{{plan}}** subscription has been renewed successfully.

Amount charged: {{currency}} {{amount}}
Next renewal: {{next_renewal}}

No action needed. Your access continues without interruption.

**This month on Promptly:**

→ New prompts added across 8 categories this month
→ Improved prompt search with smarter filtering
→ Faster template rendering across all AI integrations

→ [Explore what's new]({{app_url}}/en/explore)
→ [Manage billing]({{app_url}}/en/settings/billing)

Thank you for being a Promptly Pro member. If you ever have feedback, just reply — we read every message.

— The Promptly Team`,
  },

  {
    type: "subscription_ended",
    subject: "Your Promptly Pro access has ended, {{name}}",
    body: `Hi {{name}},

Your Pro subscription has ended and your account has moved back to the Free plan.

**What this means:**
→ Premium prompts are no longer accessible
→ Credit unlocks are limited to the free tier
→ Priority support is no longer available

**What you can still do:**
→ Access all free prompts in the library
→ Keep any prompts you previously unlocked
→ Rejoin Pro at any time — your history is saved

If you cancelled because of cost, we have flexible plans — including a lighter option at a reduced rate.

→ [Reactivate Pro]({{app_url}}/en/pricing)

If something wasn't right and you'd like to share feedback, reply to this email. We genuinely want to know.

We hope to see you back soon.

— The Promptly Team`,
  },

  // ── Dunning ──────────────────────────────────────────────────────────────────

  {
    type: "dunning_attempt_1",
    subject: "Action needed: Your Promptly payment didn't go through",
    body: `Hi {{name}},

We tried to process your subscription payment of **\${{amount}}** but it was unsuccessful.

Your Pro access is still active while we sort this out — but we need you to update your payment method to avoid any interruption.

→ [Update my payment method]({{billing_url}})

Common reasons for failed payments:
→ Card expired or replaced
→ Billing address mismatch
→ Insufficient funds or daily limit

This can usually be fixed in under a minute. Click the link above to update your details.

If you believe this is a mistake, just reply to this email and we'll look into it immediately.

— The Promptly Team`,
  },

  {
    type: "dunning_attempt_2",
    subject: "Second notice: Pro access ending soon — payment required",
    body: `Hi {{name}},

This is our second attempt to notify you about a failed payment of **\${{amount}}**.

Your Pro access will end on **{{retry_date}}** unless your payment method is updated.

→ [Update payment now — takes 60 seconds]({{billing_url}})

Once you update your card, your subscription renews automatically and you keep uninterrupted access. Nothing else changes.

If you're having trouble with billing, reply to this email and we'll find a solution together.

— The Promptly Team`,
  },

  {
    type: "dunning_attempt_3",
    subject: "Final notice: Promptly Pro ends {{cancel_date}} without action",
    body: `Hi {{name}},

This is our final notice. After three unsuccessful payment attempts, your Pro subscription will be **cancelled on {{cancel_date}}** unless your payment is resolved today.

After that date:
→ Your account reverts to the Free plan
→ Premium prompts become inaccessible
→ Monthly credits stop refreshing

→ [Resolve payment now]({{billing_url}})

We don't want to lose you as a Pro member. If there's anything we can do to help — a different payment method, a short grace period, or a question about billing — reply to this email right now.

— The Promptly Team`,
  },

  {
    type: "dunning_recovered",
    subject: "You're all set — Promptly Pro is fully restored ✓",
    body: `Hi {{name}},

Your payment was processed successfully. Your **{{plan}}** subscription is fully active again.

No further action needed. Everything is back to normal — unlimited access, priority support, and monthly credit refresh are all live.

→ [Continue where you left off]({{app_url}}/en/explore)

Thank you for sorting this out. If you ever have any billing questions, we're always here — just reply to this email.

— The Promptly Team`,
  },

  // ── Nudge ────────────────────────────────────────────────────────────────────

  {
    type: "low_credits",
    subject: "You're running low — {{credits_remaining}} credits left, {{name}}",
    body: `Hi {{name}},

Just a heads-up: you only have **{{credits_remaining}} credit{{credits_remaining}} left** on your Promptly account.

Once they're gone, you won't be able to unlock new prompts on the Free plan.

**Your options:**

→ [Upgrade to Pro — unlimited unlocks]({{app_url}}/en/pricing)
→ [Use remaining credits now]({{app_url}}/en/explore)

Pro members never worry about running out. For less than a coffee a week, you get unlimited access to every prompt in the library.

If now isn't the right time, that's completely fine — your account stays active, you just won't be able to unlock new prompts.

— The Promptly Team`,
  },

  {
    type: "trial_expiry",
    subject: "Your Promptly trial ends {{urgency_label}} — keep your access",
    body: `Hi {{name}},

Your free trial ends **{{urgency_label}}** ({{trial_end_date}}).

After that, your account reverts to Free and you lose access to:
→ Unlimited prompt unlocks
→ Premium prompt categories
→ Monthly credit refresh
→ Priority support

**Upgrade now and keep everything:**

→ [Activate Pro — from $X/month]({{app_url}}/en/pricing)

If cost is a concern, we have flexible plans — and an annual option that saves 40%.

If Pro isn't right for you, your account stays active on the Free plan — no hard feelings, and no pressure.

— The Promptly Team`,
  },

  {
    type: "renewal_reminder",
    subject: "Your Promptly Pro renews in {{days_left}} days — {{renewal_date}}",
    body: `Hi {{name}},

Just a friendly reminder: your Pro subscription renews on **{{renewal_date}}** (in {{days_left}} day{{days_left}}).

If everything looks good, no action is needed. You'll be charged automatically and your access continues without interruption.

If you'd like to:
→ [Update your payment method]({{app_url}}/en/settings/billing)
→ [Change your billing cycle]({{app_url}}/en/settings/billing)
→ [Review or cancel your plan]({{app_url}}/en/settings/billing)

Visit your billing settings anytime. We always send this reminder 3 days before renewal so you're never surprised.

— The Promptly Team`,
  },

  // ── Newsletter ───────────────────────────────────────────────────────────────

  {
    type: "newsletter_confirm",
    subject: "One click to confirm your Promptly newsletter",
    body: `Hi {{name}},

You're almost in. One click confirms your subscription to the Promptly newsletter.

→ [Confirm my subscription]({{confirm_link}})

**What you'll get:**
→ New AI prompts curated every week
→ Workflow tips from power users
→ AI tool roundups and comparisons
→ Early access to new Promptly features

No spam. Unsubscribe any time with a single click.

If you didn't sign up for this newsletter, you can safely ignore this email — nothing will be sent without confirmation.

— The Promptly Team`,
  },

  {
    type: "newsletter_welcome",
    subject: "You're in the Promptly newsletter — here's what to expect",
    body: `Hi {{name}},

Welcome to the Promptly newsletter. Confirmed and live.

**What you'll receive:**

→ **Weekly prompt picks** — the best new prompts added to the library each week
→ **AI workflow tips** — practical techniques from our most active users
→ **Tool spotlights** — honest takes on the AI tools worth your time
→ **Behind the scenes** — how top creators are using AI in their work

We send once a week, typically on Tuesday mornings. You can unsubscribe at any time — no hard feelings.

In the meantime, explore the library:

→ [Browse Promptly]({{app_url}}/en/explore)

— The Promptly Team

[Unsubscribe]({{unsubscribe_link}})`,
  },

  {
    type: "new_prompt",
    subject: "New this week: {{prompt_title}}",
    body: `Hi {{name}},

This week's featured prompt is live and it's one of our best.

**{{prompt_title}}**

{{prompt_description}}

This is the kind of prompt that takes 2 minutes to set up and saves hours every time you use it. Real professionals in {{category}} are already using it.

→ [See the full prompt]({{prompt_url}})
→ [Browse more {{category}} prompts]({{app_url}}/en/explore)

If this isn't useful for your work, just ignore it — but we think you'll like it.

— The Promptly Team

[Unsubscribe]({{unsubscribe_link}})`,
  },

  // ── Affiliate ────────────────────────────────────────────────────────────────

  {
    type: "affiliate_join",
    subject: "Your Promptly affiliate account is live — here's your link",
    body: `Hi {{name}},

Your affiliate account is active. You're now set up to earn recurring commissions for every Pro subscriber you refer to Promptly.

**Your referral link:**
→ {{app_url}}?ref={{referral_code}}

**How it works:**
→ Share your link with your audience, newsletter, or social channels
→ When someone signs up and subscribes to Pro, you earn a commission
→ Commissions are recurring — you earn every time they renew
→ Track clicks, conversions, and earnings in your dashboard

→ [Open affiliate dashboard]({{app_url}}/en/affiliate)

**Tips from our top affiliates:**
→ Write a short "how I use Promptly" post — authentic content converts best
→ Share a specific prompt that saved you time — it makes the value concrete
→ Add your link to your email signature for passive referrals

If you have any questions about payouts or the program, reply to this email.

— The Promptly Team`,
  },

  {
    type: "affiliate_commission_unlocked",
    subject: "\${{amount}} in Promptly commissions just unlocked 💰",
    body: `Hi {{name}},

Great news — **\${{amount}} in commission** has just cleared the lock period and is now available for withdrawal.

**Your total available balance: \${{total_balance}}**

You can request a payout at any time once your balance reaches the minimum withdrawal threshold. Payouts are processed within 2–3 business days.

→ [Request payout]({{app_url}}/en/affiliate)
→ [View all earnings]({{app_url}}/en/affiliate)

Keep up the great work. Every referral compounds — recurring subscribers mean recurring commissions.

— The Promptly Team`,
  },

  {
    type: "affiliate_first_conversion",
    subject: "🎉 Your first referral just paid — you earned \${{commission}}!",
    body: `Hi {{name}},

Congratulations — your first referred user just upgraded to Pro and you've earned your very first commission of **\${{commission}}**!

This is the start of your recurring revenue stream. Every time your referred users renew, you earn again.

Your commission is in a 14-day holding period while we confirm the payment — after that it'll be available to withdraw.

→ [View your affiliate dashboard]({{app_url}}/en/affiliate)

Keep sharing your referral link and watch it compound. Here's to many more!

— The Promptly Team`,
  },

  {
    type: "affiliate_withdrawal_approved",
    subject: "Your withdrawal of \${{amount}} has been approved ✅",
    body: `Hi {{name}},

Great news — your withdrawal request of **\${{amount}}** has been approved and is on its way.

**Transaction reference:** {{transaction_ref}}
**Payout method:** {{payout_method}}

Funds typically arrive within 2–3 business days depending on your payment provider. If you don't receive your payment within 5 business days, reply to this email and our team will look into it.

→ [View your affiliate dashboard]({{app_url}}/en/affiliate)

Thank you for being a Promptly affiliate — your referrals help us grow and we're grateful for it.

— The Promptly Team`,
  },

  {
    type: "affiliate_withdrawal_rejected",
    subject: "Update on your withdrawal request",
    body: `Hi {{name}},

We've reviewed your withdrawal request of **\${{amount}}** and unfortunately we're unable to process it at this time.

**Reason:** {{reason}}

Your balance has been returned to your affiliate account and remains available for a future withdrawal request. Please review the reason above, update your payout details if needed, and resubmit.

→ [Update payout details]({{app_url}}/en/affiliate)
→ [Resubmit withdrawal]({{app_url}}/en/affiliate)

If you believe this was an error or have questions, please reply to this email and our team will assist you.

— The Promptly Team`,
  },
];

// ─── SEED FUNCTION ────────────────────────────────────────────────────────────

export async function seedMarketingData(
  db: admin.firestore.Firestore,
  options: { force?: boolean } = {}
): Promise<{ tags: number; segments: number; flows: number; templates: number }> {
  const now = new Date().toISOString();
  let tags = 0, segments = 0, flows = 0, templates = 0;

  console.log("[seedMarketing] starting — force:", options.force);

  // ── Tags ──────────────────────────────────────────────────────────────────
  for (const tag of SEED_TAGS) {
    const ref = db.collection("marketing_tags").doc(tag.id);
    const snap = await ref.get();
    if (!snap.exists || options.force) {
      await ref.set({ ...tag, createdAt: now, updatedAt: now }, { merge: true });
      tags++;
    }
  }
  console.log("[seedMarketing] tags done:", tags);

  // ── Segments ──────────────────────────────────────────────────────────────
  for (const seg of SEED_SEGMENTS) {
    const ref = db.collection("marketing_segments").doc(seg.id);
    const snap = await ref.get();
    if (!snap.exists || options.force) {
      await ref.set({
        ...seg,
        contactEmails: [],
        contactCount: 0,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
      segments++;
    }
  }
  console.log("[seedMarketing] segments done:", segments);

  // ── Automation Flows ──────────────────────────────────────────────────────
  for (const flow of SEED_FLOWS) {
    const ref = db.collection("marketing_automations").doc(flow.id);
    const snap = await ref.get();
    if (!snap.exists || options.force) {
      await ref.set({ ...flow, createdAt: now, updatedAt: now }, { merge: true });
      flows++;
    }
  }
  console.log("[seedMarketing] flows done:", flows);

  // ── Email Templates ───────────────────────────────────────────────────────
  for (const tpl of SEED_TEMPLATES) {
    const ref = db.collection("templates").doc(tpl.type);
    const snap = await ref.get();
    if (!snap.exists || options.force) {
      await ref.set({
        id:        tpl.type,
        type:      tpl.type,
        subject:   tpl.subject,
        body:      tpl.body,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
      templates++;
    }
  }
  console.log("[seedMarketing] templates done:", templates);

  return { tags, segments, flows, templates };
}
