import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
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

  async logEmail(notification: Omit<EmailNotification, 'id' | 'sentAt' | 'status'>) {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notification,
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
      template.content || 'Thank you for joining our community {{name}}! Explore thousands of AI prompts and start building your library today.',
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
      template.content || 'A new login was detected for your account on {{time}}. If this wasn\'t you, please secure your account.',
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
      template.content || 'Congratulations! Your affiliate code "{{code}}" is now active. Start sharing and earn recurring commissions.',
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
      template.content || 'Great job! Your prompt "{{title}}" has been successfully published to Promptly.',
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
      template.content || 'Your Pro subscription will expire soon for {{email}}. Renew now to maintain uninterrupted access.',
      { email }
    );

    await this.logEmail({
      type: 'subs_ending',
      recipientEmail: email,
      recipientId: userId,
      subject,
      content
    });
  }
};
