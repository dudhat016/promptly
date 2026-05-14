import { initFirebase } from "../lib/firebase.js";
import nodemailer from "nodemailer";

export class AuthService {
  /**
   * Generates and sends a password reset email
   */
  static async sendPasswordResetEmail(email: string) {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const link = await firebase.auth.generatePasswordResetLink(email, {
      url: process.env.APP_URL || 'http://localhost:5173/login'
    });

    const configSnap = await firebase.db.collection("configs").doc("email").get();
    if (configSnap.exists) {
      const config = configSnap.data();
      if (config?.provider === 'smtp') {
        const transporter = nodemailer.createTransport({
          host: config.smtpHost,
          port: parseInt(config.smtpPort),
          secure: config.smtpSecure,
          auth: { user: config.smtpUser, pass: config.smtpPass }
        });

        await transporter.sendMail({
          from: `"${config.fromName}" <${config.fromEmail}>`,
          to: email,
          subject: "🔐 Secure Your Promptly Account",
          html: `
            <div style="font-family: sans-serif; padding: 40px; background: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 24px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                <h1 style="color: #4f46e5; margin-bottom: 24px;">Reset Your Password</h1>
                <p style="font-size: 16px; line-height: 1.6; color: #475569;">We received a request to reset your password. Click the button below to secure your account:</p>
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${link}" style="background: #4f46e5; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">Secure My Account</a>
                </div>
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
              </div>
            </div>
          `
        });
      }
    }

    return { message: "Reset link sent successfully" };
  }
}
