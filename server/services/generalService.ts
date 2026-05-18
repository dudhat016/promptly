import * as ftp from "basic-ftp";
import fs from "fs";
import path from "path";
import { initFirebase } from "../lib/firebase.js";
import { getSmtpTransport } from "../lib/mailer.js";
import { getStripe } from "../lib/stripe.js";
import { getLangUrl } from "../lib/config.js";

export class GeneralService {
  static async uploadFtp(file: any, folder: string): Promise<{ url: string }> {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const configSnap = await firebase.db.collection("configs").doc("storage").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const ftpHost    = config?.host      || process.env.FTP_SERVER;
    const ftpUser    = config?.user      || process.env.FTP_USERNAME;
    const ftpPass    = config?.password  || process.env.FTP_PASSWORD;
    const baseFolder = config?.folder    || process.env.FTP_FOLDER   || "promptly/public/";
    const publicUrl  = config?.publicUrl || process.env.FTP_PUBLIC_URL || "";
    const secure     = config?.secure === "true";

    if (!ftpHost || !ftpUser || !ftpPass) throw new Error("FTP credentials not configured");

    const client = new ftp.Client();
    try {
      await client.access({ host: ftpHost, user: ftpUser, password: ftpPass, secure });

      const ext        = path.extname(file.originalFilename || file.path || "");
      const filename   = `${Date.now()}${ext}`;
      const subPath    = folder ? `${folder}/` : "";
      const remotePath = `${baseFolder}${subPath}${filename}`;

      await client.uploadFrom(file.path, remotePath);

      const url = publicUrl
        ? `${publicUrl.replace(/\/$/, "")}/${subPath}${filename}`
        : remotePath;

      return { url };
    } finally {
      client.close();
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
  }

  static async testFtp(params: {
    host?: string;
    user?: string;
    password?: string;
    secure?: boolean;
  }): Promise<{ ok: boolean; message: string }> {
    const client = new ftp.Client();
    try {
      await client.access({
        host:     params.host     || process.env.FTP_SERVER,
        user:     params.user     || process.env.FTP_USERNAME,
        password: params.password || process.env.FTP_PASSWORD,
        secure:   params.secure === true,
      });
      return { ok: true, message: "FTP connection successful" };
    } catch (err: any) {
      return { ok: false, message: err.message };
    } finally {
      client.close();
    }
  }

  static async testEmail(): Promise<{ ok: boolean; message: string }> {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const smtp = await getSmtpTransport(firebase.db);
    if (!smtp) throw new Error("SMTP not configured");

    await smtp.transport.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to: smtp.fromEmail,
      subject: "Promptly — Test Email",
      text: "If you see this, your SMTP configuration is working correctly.",
    });

    return { ok: true, message: `Test email sent to ${smtp.fromEmail}` };
  }

  static async createStripeCheckout(params: {
    userId: string;
    userEmail: string;
    planId?: string;
    billingCycle?: string;
    amount?: number;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<{ url: string }> {
    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe not configured");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: params.userEmail,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: params.planId || "Promptly Plan" },
          unit_amount: Math.round((params.amount ?? 0) * 100),
        },
        quantity: 1,
      }],
      metadata: {
        userId: params.userId,
        planId: params.planId || "",
        billingCycle: params.billingCycle || "one_time",
      },
      success_url: params.successUrl || getLangUrl("/checkout/verify?session_id={CHECKOUT_SESSION_ID}"),
      cancel_url:  params.cancelUrl  || getLangUrl("/pricing"),
    });

    if (!session.url) throw new Error("Failed to create Stripe checkout session");
    return { url: session.url };
  }
}
