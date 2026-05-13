import * as ftp from "basic-ftp";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import Stripe from "stripe";
import { initFirebase } from "../lib/firebase";
import { getFirestore } from "firebase-admin/firestore";

export class GeneralService {
  /**
   * Tests FTP connection
   */
  static async testFtp(config: any) {
    const client = new ftp.Client();
    try {
      await client.access({
        host: config.host,
        user: config.username,
        password: config.password,
        secure: false
      });
      return { success: true };
    } finally {
      client.close();
    }
  }

  /**
   * Handles FTP file upload
   */
  static async uploadFtp(file: any, folder: string) {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const db = getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)');
    const configSnap = await db.collection('configs').doc('ftp').get();
    const config = configSnap.exists ? configSnap.data() : null;

    if (config && !config.enabled) {
      throw new Error("FTP Storage is disabled in settings.");
    }

    const ftpHost = config?.host || process.env.FTP_SERVER;
    const ftpUser = config?.username || process.env.FTP_USERNAME;
    const ftpPass = config?.password || process.env.FTP_PASSWORD;
    
    if (!ftpHost || !ftpUser || !ftpPass) {
      throw new Error("Missing FTP configuration");
    }

    let ftpPath = config?.path || process.env.FTP_FOLDER || "promptly/public/";
    const ftpEndpoint = config?.endpoint || "https://techworldproduct.com/promptly/public/";

    if (folder) {
      ftpPath = `${ftpPath.endsWith('/') ? ftpPath : ftpPath + '/'}${folder}/`;
    }

    // Path sanitization
    if (ftpPath.startsWith('public_html/public_html/')) {
      ftpPath = ftpPath.replace('public_html/public_html/', 'public_html/');
    }
    if (ftpPath.startsWith('public_html/')) {
      ftpPath = ftpPath.replace('public_html/', '');
    }

    const client = new ftp.Client();
    try {
      await client.access({ host: ftpHost, user: ftpUser, password: ftpPass, secure: false });
      await client.ensureDir(ftpPath);

      const originalName = path.basename(file.originalFilename).trim();
      const safeName = originalName
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');

      await client.uploadFrom(file.path, safeName);

      const baseUrl = ftpEndpoint.endsWith('/') ? ftpEndpoint : ftpEndpoint + '/';
      const finalEndpoint = folder ? `${baseUrl}${folder}/` : baseUrl;
      const publicUrl = encodeURI(`${finalEndpoint}${safeName}`);

      return {
        success: true,
        url: publicUrl,
        name: file.originalFilename
      };
    } finally {
      client.close();
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
  }

  /**
   * Tests email configuration
   */
  static async testEmail() {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const db = getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)');
    const configSnap = await db.collection("configs").doc("email").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const smtpHost = config?.smtpHost || process.env.SMTP_HOST;
    const smtpPort = parseInt(config?.smtpPort || process.env.SMTP_PORT || "465");
    const smtpSecure = config?.smtpSecure !== undefined ? config.smtpSecure : (process.env.SMTP_SECURE === 'true');
    const smtpUser = config?.smtpUser || process.env.SMTP_USER;
    const smtpPass = config?.smtpPass || process.env.SMTP_PASS;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'Promptly'}" <${smtpUser}>`,
      to: smtpUser,
      subject: "SMTP Configuration Test",
      text: "If you are reading this, your SMTP settings are working perfectly!",
    });

    return { success: true };
  }

  /**
   * Creates a Stripe checkout session
   */
  static async createStripeCheckout(payload: { priceId: string; userId: string; userEmail: string }) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: payload.priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.APP_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:5173'}/pricing`,
      customer_email: payload.userEmail,
      metadata: { userId: payload.userId },
    });
    return { id: session.id };
  }
}
