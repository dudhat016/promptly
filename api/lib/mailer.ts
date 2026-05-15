import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { EMAIL_TYPES } from "./emailTypes.js";

// ─── SMTP ─────────────────────────────────────────────────────────────────────

interface SmtpConfig {
  transport: nodemailer.Transporter;
  fromEmail: string;
  fromName: string;
}

export async function getSmtpTransport(db: admin.firestore.Firestore): Promise<SmtpConfig | null> {
  const snap = await db.collection("configs").doc("email").get();
  const c = snap.exists ? snap.data() : null;

  const host      = c?.smtpHost     || process.env.SMTP_HOST;
  const user      = c?.smtpUser     || process.env.SMTP_USER;
  const pass      = c?.smtpPass     || process.env.SMTP_PASS;
  const port      = parseInt(c?.smtpPort || process.env.SMTP_PORT || "587");
  const secure    = c?.smtpSecure   ?? (process.env.SMTP_SECURE === "true");
  const fromEmail = c?.fromEmail    || process.env.SMTP_FROM_EMAIL || process.env.FROM_EMAIL || "";
  const fromName  = c?.fromName     || process.env.SMTP_FROM_NAME  || "Promptly";

  if (!host || !user || !pass || !fromEmail) return null;

  return {
    transport: nodemailer.createTransport({ host, port, secure, auth: { user, pass } }),
    fromEmail,
    fromName,
  };
}

// ─── TEMPLATE RESOLUTION ─────────────────────────────────────────────────────

function substituteVars(str: string, vars: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export async function resolveTemplate(
  db: admin.firestore.Firestore,
  type: string,
  vars: Record<string, string>
): Promise<{ subject: string; bodyText: string }> {
  const typeInfo = EMAIL_TYPES[type];
  let subject  = typeInfo?.defaultSubject || "Notification from Promptly";
  let bodyText = typeInfo?.defaultBody    || "You have a new notification from Promptly.";

  try {
    const snap = await db.collection("templates").doc(type).get();
    if (snap.exists) {
      const data = snap.data()!;
      if (data.subject) subject  = data.subject;
      if (data.body)    bodyText = data.body;
    }
  } catch {
    // Use defaults — template lookup is best-effort
  }

  const appUrl = process.env.APP_URL || "https://promptly.com";
  const allVars = { app_url: appUrl, ...vars };

  return {
    subject:  substituteVars(subject,  allVars),
    bodyText: substituteVars(bodyText, allVars),
  };
}

// ─── BRANDED HTML WRAPPER ────────────────────────────────────────────────────

function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

function textToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map(para => {
      const line = para.trim();
      if (!line) return "";
      const withLinks = line.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" style="color:#6366f1;font-weight:700;">$1</a>');
      const withBold  = withLinks.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      const withArrow = withBold.replace(/^→\s+/gm, '<span style="color:#6366f1;font-weight:700;">→ </span>');
      return `<p style="color:#475569;margin:0 0 16px;line-height:1.7;font-size:14px;">${withArrow.replace(/\n/g, "<br />")}</p>`;
    })
    .filter(Boolean)
    .join("");
}

// Wrap tracked links — skip unsubscribe and already-wrapped tracking URLs
function injectClickTracking(html: string, appUrl: string, logId: string): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
    if (url.includes('/api/email/track') || url.includes('/api/email/unsubscribe')) return match;
    return `href="${appUrl}/api/email/track/click/${logId}?url=${encodeURIComponent(url)}"`;
  });
}

export function buildBrandedHtml(
  bodyContent: string,
  recipientEmail: string,
  appUrl: string,
  logId?: string
): string {
  const unsubscribeUrl = `${appUrl}/api/email/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;
  const innerHtml = isHtml(bodyContent) ? bodyContent : textToHtml(bodyContent);
  const trackingPixel = logId
    ? `<img src="${appUrl}/api/email/track/open/${logId}" width="1" height="1" style="display:block;" alt="" />`
    : '';

  let html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;">
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:40px 20px;background:#f8fafc;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">

      <!-- Header -->
      <div style="background:#4f46e5;padding:28px 32px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:900;letter-spacing:-0.025em;">PROMPTLY</h1>
        <p style="color:#c7d2fe;margin:4px 0 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Premium AI Prompt Marketplace</p>
      </div>

      <!-- Body -->
      <div style="padding:40px 32px;">
        ${innerHtml}
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:11px;margin:0 0 8px;">© ${new Date().getFullYear()} Promptly AI. All rights reserved.</p>
        <p style="color:#94a3b8;font-size:11px;margin:0 0 12px;">You received this because you have an account at <a href="${appUrl}" style="color:#6366f1;">${appUrl.replace(/https?:\/\//, "")}</a></p>
        <a href="${unsubscribeUrl}" style="color:#6366f1;font-size:11px;font-weight:700;text-decoration:underline;">Unsubscribe from emails</a>
      </div>

      ${trackingPixel}
    </div>
  </div>
</body>
</html>`;

  if (logId) html = injectClickTracking(html, appUrl, logId);
  return html;
}

// ─── BOUNCE DETECTION ────────────────────────────────────────────────────────

// SMTP response codes that indicate a permanent hard bounce
const HARD_BOUNCE_CODES = ['550', '551', '552', '553', '554', '5.1.1', '5.1.2', 'EENVELOPE'];

function isHardBounce(errMessage: string): boolean {
  return HARD_BOUNCE_CODES.some(code => errMessage.includes(code));
}

async function markBounced(db: admin.firestore.Firestore, email: string): Promise<void> {
  try {
    const snap = await db.collection("marketing_contacts")
      .where("email", "==", email).limit(1).get();
    if (!snap.empty) {
      await snap.docs[0].ref.update({
        status: "bounced",
        bouncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch { /* non-fatal */ }
}

// ─── MAIN SEND FUNCTION ───────────────────────────────────────────────────────

export interface SendResult {
  sent: boolean;
  reason?: string;
  messageId?: string;
  logId?: string;
}

export async function sendEmail(
  db: admin.firestore.Firestore,
  to: string,
  type: string,
  variables: Record<string, string>
): Promise<SendResult> {
  const appUrl = process.env.APP_URL || "https://promptly.com";

  // 1. Check unsubscribe / bounce suppression
  try {
    const contactSnap = await db.collection("marketing_contacts")
      .where("email", "==", to).limit(1).get();
    if (!contactSnap.empty) {
      const status = contactSnap.docs[0].data().status;
      if (status === "unsubscribed") return { sent: false, reason: "unsubscribed" };
      if (status === "bounced")      return { sent: false, reason: "bounced" };
    }
  } catch {
    // Non-fatal — proceed if CRM check fails
  }

  // 2. Resolve template (Firestore → default fallback)
  const { subject, bodyText } = await resolveTemplate(db, type, variables);

  // 3. Pre-create the log entry to get logId for tracking pixel
  const expireAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  let logRef: admin.firestore.DocumentReference | null = null;
  let logId: string | undefined;

  try {
    logRef = await db.collection("email_logs").add({
      recipientEmail: to,
      type,
      subject,
      status: "pending",
      opens: 0,
      clicks: 0,
      openedAt: null,
      clickedAt: null,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      expireAt: admin.firestore.Timestamp.fromDate(expireAt),
    });
    logId = logRef.id;
  } catch { /* non-fatal */ }

  // 4. Build branded HTML with tracking pixel + click wrapping
  const html = buildBrandedHtml(bodyText, to, appUrl, logId);

  // 5. Send via SMTP
  const smtp = await getSmtpTransport(db);
  if (!smtp) {
    await logRef?.update({ status: "failed", error: "smtp_not_configured" }).catch(() => {});
    return { sent: false, reason: "smtp_not_configured" };
  }

  let result: SendResult;
  try {
    const info = await smtp.transport.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to,
      subject,
      html,
    });
    result = { sent: true, messageId: info.messageId, logId };
  } catch (err: any) {
    console.error(`[Mailer] Failed to send ${type} to ${to}:`, err.message);
    result = { sent: false, reason: err.message, logId };

    // Auto-mark bounced contacts to suppress future sends
    if (isHardBounce(err.message)) {
      await markBounced(db, to);
    }
  }

  // 6. Update log with final status
  try {
    await logRef?.update({
      status: result.sent ? "sent" : "failed",
      error: result.reason || null,
    });
  } catch { /* non-fatal */ }

  return result;
}
