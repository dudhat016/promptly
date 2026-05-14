import admin from "firebase-admin";
import { initFirebase } from "../lib/firebase.js";
import nodemailer from "nodemailer";

export class MarketingService {
  /**
   * Generates sitemap XML content
   */
  static async generateSitemap() {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const promptsSnap = await firebase.db.collection("prompts").where("status", "==", "published").get();
    const baseUrl = process.env.VITE_SITE_URL || 'https://promptly.ai';
    
    const urls = promptsSnap.docs.map(doc => {
      const data = doc.data();
      return `
  <url>
    <loc>${baseUrl}/prompt/${data.slug}</loc>
    <lastmod>${new Date(data.updatedAt?.seconds * 1000 || Date.now()).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/explore</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  ${urls.join('')}
</urlset>`;
  }

  /**
   * Sends a marketing email campaign
   */
  static async sendCampaign(payload: { subject: string; html: string; targetAll?: boolean; segmentId?: string }) {
    const { subject, html, targetAll, segmentId } = payload;
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const configSnap = await firebase.db.collection("configs").doc("email").get();
    if (!configSnap.exists) throw new Error("Email configuration not found");

    const config = configSnap.data()!;
    if (config.provider !== 'smtp') throw new Error("SMTP provider not active");

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: parseInt(config.smtpPort),
      secure: config.smtpSecure,
      auth: { user: config.smtpUser, pass: config.smtpPass },
      connectionTimeout: 10000,
    });

    let targetEmails: string[] = [];

    if (!targetAll && segmentId) {
      const segSnap = await firebase.db.collection("marketing_segments").doc(segmentId).get();
      if (segSnap.exists) {
        const seg = segSnap.data()!;
        const usersSnap = await firebase.db.collection("users")
          .where("subscriptionStatus", "==", seg.filter?.subscriptionStatus ?? "free")
          .get();
        targetEmails = usersSnap.docs.map(d => d.data().email).filter(Boolean);
      }
    } else {
      const usersSnap = await firebase.db.collection("users").get();
      targetEmails = usersSnap.docs.map(d => d.data().email).filter(Boolean);
    }

    let sent = 0;
    const errors: string[] = [];
    const logBatch = firebase.db.batch();

    for (const email of targetEmails) {
      try {
        await transporter.sendMail({
          from: `"${config.fromName}" <${config.fromEmail}>`,
          to: email,
          subject,
          html,
        });
        sent++;
        const logRef = firebase.db.collection("email_logs").doc();
        logBatch.set(logRef, {
          to: email,
          subject,
          type: 'campaign',
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (err: any) {
        errors.push(`${email}: ${err.message}`);
        const logRef = firebase.db.collection("email_logs").doc();
        logBatch.set(logRef, {
          to: email,
          subject,
          type: 'campaign',
          status: 'failed',
          error: err.message,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    await logBatch.commit();
    return { sent, total: targetEmails.length, errors };
  }

  /**
   * Tests SMTP connection
   */
  static async testSmtp() {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const configSnap = await firebase.db.collection("configs").doc("email").get();
    if (!configSnap.exists) throw new Error("Email configuration not found");

    const config = configSnap.data();
    if (config?.provider !== 'smtp') throw new Error("SMTP provider not active");

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: parseInt(config.smtpPort),
      secure: config.smtpSecure,
      auth: { user: config.smtpUser, pass: config.smtpPass },
      connectionTimeout: 10000,
    });

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: config.fromEmail,
      subject: "🚀 SMTP Connection Test - Success!",
      text: "Your SMTP connection is working perfectly.",
      html: `<h1 style="color: #4f46e5;">Connection Success!</h1><p>Your SMTP connection is active and secured.</p>`
    });

    return { messageId: info.messageId };
  }
}
