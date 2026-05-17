import { api } from '../lib/api';

// Thin client — all actual sending and template resolution happens server-side.
// These methods mirror the old interface so call sites don't change.

async function send(type: string, variables: Record<string, string> = {}) {
  try {
    await api.post('/email/send', { type, variables });
  } catch (err) {
    // Non-fatal — email failure must never break the user flow
    console.warn(`[EmailService] Failed to send ${type}:`, err);
  }
}

export const EmailService = {
  async sendWelcomeEmail(_userId: string, _email: string, name: string) {
    await send('welcome', { name });
  },

  async sendLoginEmail(_userId: string, _email: string) {
    await send('login_alert', { time: new Date().toLocaleString() });
  },

  async sendAffiliateJoinEmail(_userId: string, _email: string, code: string) {
    await send('affiliate_join', { referral_code: code });
  },

  async sendNewPromptEmail(_userId: string, _email: string, promptTitle: string) {
    await send('new_prompt', { title: promptTitle });
  },

  async sendSubscriptionEndingEmail(_userId: string, _email: string) {
    await send('renewal_reminder', {});
  },

  async sendOnboardingCompleteEmail(
    _userId: string,
    _email: string,
    name: string,
    interests: string[]
  ) {
    const interestList = interests
      .map(i => `• ${i.charAt(0).toUpperCase() + i.slice(1)}`)
      .join('\n');
    await send('onboarding_complete', { name, interests: interestList });
  },

  async sendBadgeEarnedEmail(
    _userId: string,
    _email: string,
    badgeName: string,
    badgeDescription: string
  ) {
    await send('badge_earned', { badge_name: badgeName, badge_description: badgeDescription });
  },

  async sendPromptApprovedEmail(
    creatorId: string,
    creatorEmail: string,
    displayName: string,
    promptTitle: string,
    isPaid: boolean
  ) {
    try {
      await api.post('/email/send-to', {
        to: creatorEmail,
        type: 'prompt_approved',
        userId: creatorId,
        variables: {
          name: displayName,
          prompt_title: promptTitle,
          prompt_type: isPaid ? 'premium' : 'free',
          dashboard_url: `${window.location.origin}/dashboard/library`,
        },
      });
    } catch (err) {
      console.warn('[EmailService] prompt_approved send failed:', err);
    }
  },

  async sendPromptRejectedEmail(
    creatorId: string,
    creatorEmail: string,
    displayName: string,
    promptTitle: string,
    reason: string
  ) {
    try {
      await api.post('/email/send-to', {
        to: creatorEmail,
        type: 'prompt_rejected',
        userId: creatorId,
        variables: {
          name: displayName,
          prompt_title: promptTitle,
          rejection_reason: reason,
          dashboard_url: `${window.location.origin}/dashboard/library`,
        },
      });
    } catch (err) {
      console.warn('[EmailService] prompt_rejected send failed:', err);
    }
  },

  async sendPromptWarningEmail(
    creatorId: string,
    creatorEmail: string,
    displayName: string,
    promptTitle: string
  ) {
    try {
      await api.post('/email/send-to', {
        to: creatorEmail,
        type: 'prompt_warning',
        userId: creatorId,
        variables: { name: displayName, prompt_title: promptTitle, dashboard_url: `${window.location.origin}/dashboard/library` },
      });
    } catch (err) {
      console.warn('[EmailService] prompt_warning send failed:', err);
    }
  },

  async sendPromptHiddenEmail(
    creatorId: string,
    creatorEmail: string,
    displayName: string,
    promptTitle: string
  ) {
    try {
      await api.post('/email/send-to', {
        to: creatorEmail,
        type: 'prompt_hidden',
        userId: creatorId,
        variables: { name: displayName, prompt_title: promptTitle, dashboard_url: `${window.location.origin}/dashboard/library` },
      });
    } catch (err) {
      console.warn('[EmailService] prompt_hidden send failed:', err);
    }
  },

  async sendPromptSubmittedEmail(_userId: string, promptTitle: string) {
    await send('prompt_submitted', {
      prompt_title: promptTitle,
      dashboard_url: `${window.location.origin}/dashboard/library`,
    });
  },

  // Generic send for template-picker usage in admin
  async sendEmailWithTemplate(
    _userId: string,
    email: string,
    templateId: string,
    variables: Record<string, string>
  ) {
    try {
      await api.post('/email/send-to', { to: email, type: templateId, variables });
    } catch (err) {
      console.warn(`[EmailService] Template send failed for ${templateId}:`, err);
    }
  },
};
