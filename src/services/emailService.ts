import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EmailNotification, EmailTemplate } from '../types';

export const EmailService = {
  async getTemplate(type: string): Promise<Partial<EmailTemplate>> {
    try {
      const docRef = doc(db, 'templates', type);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as EmailTemplate;
      }
    } catch (err) {
      console.error('Error fetching template:', err);
    }
    return {};
  },

  replaceVariables(content: string, variables: Record<string, string>) {
    let result = content;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  },

  wrapWithBranding(content: string, recipientEmail: string) {
    const baseUrl = window.location.origin;
    const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;
    
    const header = `
<div style="background: #f8fafc; padding: 40px 20px; font-family: sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <div style="background: #4f46e5; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.025em;">PROMPTLY</h1>
      <p style="color: #c7d2fe; margin: 5px 0 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase; tracking: 0.1em;">Premium AI Prompt Marketplace</p>
    </div>
    <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
`;

    const footer = `
    </div>
    <div style="background: #f1f5f9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <div style="margin-bottom: 20px;">
        <a href="#" style="color: #64748b; text-decoration: none; margin: 0 10px; font-size: 12px; font-weight: 700;">Twitter</a>
        <a href="#" style="color: #64748b; text-decoration: none; margin: 0 10px; font-size: 12px; font-weight: 700;">Discord</a>
        <a href="#" style="color: #64748b; text-decoration: none; margin: 0 10px; font-size: 12px; font-weight: 700;">LinkedIn</a>
      </div>
      <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2026 Promptly AI. All rights reserved.</p>
      <p style="color: #94a3b8; font-size: 11px; margin: 5px 0 0 0;">123 Innovation Way, San Francisco, CA 94103</p>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
          You are receiving this email because you signed up for Promptly.
          <br />
          <a href="${unsubscribeUrl}" style="color: #4f46e5; text-decoration: underline; font-weight: 700;">Unsubscribe from these emails</a>
        </p>
      </div>
    </div>
  </div>
</div>
`;

    return `${header}${content.replace(/\n/g, '<br />')}${footer}`;
  },

  async logEmail(notification: Omit<EmailNotification, 'id' | 'sentAt' | 'status'>) {
    try {
      // 1. Check if user is unsubscribed
      const q = query(collection(db, 'marketing_contacts'), where('email', '==', notification.recipientEmail));
      const snap = await getDocs(q);
      
      if (!snap.empty && snap.docs[0].data().status === 'unsubscribed') {
        console.warn(`[Email Blocked] User ${notification.recipientEmail} is unsubscribed.`);
        return;
      }

      // 2. Wrap in branded layout
      const brandedContent = this.wrapWithBranding(notification.content, notification.recipientEmail);

      await addDoc(collection(db, 'notifications'), {
        ...notification,
        content: brandedContent,
        sentAt: serverTimestamp(),
        status: 'sent'
      });
      console.log(`[Email Simulated] Sent ${notification.type} to ${notification.recipientEmail}`);
    } catch (err) {
      console.error('Failed to log email notification:', err);
    }
  },

  async sendWelcomeEmail(userId: string, email: string, name: string) {
    const template = await this.getTemplate('welcome');
    const subject = template.subject || 'Welcome to Promptly!';
    const content = this.replaceVariables(
      template.body || 'Thank you for joining our community {{name}}! Explore thousands of AI prompts and start building your library today.',
      { name, email }
    );

    await this.logEmail({
      type: 'welcome',
      recipientEmail: email,
      recipientId: userId,
      subject,
      content
    });
  },

  async sendLoginEmail(userId: string, email: string) {
    const template = await this.getTemplate('login');
    const subject = template.subject || 'New Login Detected';
    const content = this.replaceVariables(
      template.body || 'A new login was detected for your account on {{time}}. If this wasn\'t you, please secure your account.',
      { email, time: new Date().toLocaleString() }
    );

    await this.logEmail({
      type: 'login',
      recipientEmail: email,
      recipientId: userId,
      subject,
      content
    });
  },

  async sendAffiliateJoinEmail(userId: string, email: string, code: string) {
    const template = await this.getTemplate('affiliate_join');
    const subject = template.subject || 'Your Affiliate Account is Active!';
    const content = this.replaceVariables(
      template.body || 'Congratulations! Your affiliate code "{{code}}" is now active. Start sharing and earn recurring commissions.',
      { email, code }
    );

    await this.logEmail({
      type: 'affiliate_join',
      recipientEmail: email,
      recipientId: userId,
      subject,
      content
    });
  },

  async sendNewPromptEmail(userId: string, userEmail: string, promptTitle: string) {
    const template = await this.getTemplate('new_prompt');
    const subject = template.subject || 'Your Prompt is Live!';
    const content = this.replaceVariables(
      template.body || 'Great job! Your prompt "{{title}}" has been successfully published to Promptly.',
      { email: userEmail, title: promptTitle }
    );

    await this.logEmail({
      type: 'new_prompt',
      recipientEmail: userEmail,
      recipientId: userId,
      subject,
      content,
      data: { promptTitle }
    });
  },

  async sendSubscriptionEndingEmail(userId: string, email: string) {
    const template = await this.getTemplate('subs_ending');
    const subject = template.subject || 'Subscription Ending Soon';
    const content = this.replaceVariables(
      template.body || 'Your Pro subscription will expire soon for {{email}}. Renew now to maintain uninterrupted access.',
      { email }
    );

    await this.logEmail({
      type: 'subs_ending',
      recipientEmail: email,
      recipientId: userId,
      subject,
      content
    });
  },

  async sendOnboardingCompleteEmail(userId: string, email: string, name: string, interests: string[]) {
    const template = await this.getTemplate('onboarding_complete');
    const subject = template.subject || `Your personalized Promptly feed is ready, ${name}!`;
    const interestList = interests
      .map(i => `• ${i.charAt(0).toUpperCase() + i.slice(1)}`)
      .join('\n');
    const defaultBody = [
      `Hi {{name}},`,
      ``,
      `Your Promptly profile is set up and your "For You" feed is now personalised based on your interests:`,
      ``,
      `{{interests}}`,
      ``,
      `Every prompt you view, copy, or unlock teaches the feed more about what you need — just like your favourite social app.`,
      `Head to your dashboard to see what we've already lined up for you.`,
      ``,
      `— The Promptly Team`
    ].join('\n');

    const content = this.replaceVariables(template.body || defaultBody, {
      name,
      email,
      interests: interestList
    });

    await this.logEmail({
      type: 'onboarding_complete' as any,
      recipientEmail: email,
      recipientId: userId,
      subject,
      content,
      data: { interests: interests.join(','), name }
    });
  },

  async sendEmailWithTemplate(userId: string, email: string, templateId: string, variables: Record<string, string>) {
    const template = await this.getTemplate(templateId);
    if (!template.body) {
      console.warn(`Template ${templateId} not found or has no body`);
      return;
    }

    const subject = this.replaceVariables(template.subject || 'Notification', variables);
    const content = this.replaceVariables(template.body, variables);

    await this.logEmail({
      type: (template.id || templateId) as any,
      recipientEmail: email,
      recipientId: userId,
      subject,
      content,
      data: variables
    });
  }
};
