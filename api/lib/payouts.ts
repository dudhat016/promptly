import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { initFirebase } from "./firebase.js";

export async function sendSuccessEmail(
  email: string,
  name: string,
  planName: string,
  orderId?: string,
  amount?: number,
  currency?: string
) {
  try {
    const firebase = await initFirebase();
    if (!firebase) return;

    // Load SMTP config from Firestore, fall back to environment variables
    const configSnap = await firebase.db.collection("configs").doc("email").get();
    const firestoreConfig = configSnap.exists ? configSnap.data() : null;

    const smtpHost     = firestoreConfig?.smtpHost     || process.env.SMTP_HOST;
    const smtpPort     = firestoreConfig?.smtpPort     || process.env.SMTP_PORT     || '587';
    const smtpUser     = firestoreConfig?.smtpUser     || process.env.SMTP_USER;
    const smtpPass     = firestoreConfig?.smtpPass     || process.env.SMTP_PASS;
    const smtpSecure   = firestoreConfig?.smtpSecure   ?? (process.env.SMTP_SECURE === 'true');
    const fromEmail    = firestoreConfig?.fromEmail    || process.env.SMTP_FROM_EMAIL || process.env.FROM_EMAIL;
    const fromName     = firestoreConfig?.fromName     || process.env.SMTP_FROM_NAME  || process.env.FROM_NAME || 'Promptly';

    if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
      console.warn('[Email] SMTP not configured — skipping success email to', email);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass }
    });

    const currencySymbol = currency === 'INR' ? '₹' : '$';
    const amountLine = amount ? `<p style="margin:0;font-size:28px;font-weight:900;color:#4f46e5;">${currencySymbol}${amount}</p>` : '';
    const orderLine  = orderId ? `<p style="margin:4px 0 0;font-size:11px;color:#94a3b8;font-family:monospace;">Order: ${orderId}</p>` : '';

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: `You're now on ${planName} — Promptly`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px 20px;background:#f8fafc;">
          <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 10px 25px -5px rgba(0,0,0,0.08);">

            <!-- Header -->
            <div style="background:#4f46e5;padding:36px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#a5b4fc;">Subscription Confirmed</p>
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff;letter-spacing:-.5px;">You're now on ${planName}!</h1>
            </div>

            <!-- Body -->
            <div style="padding:40px;">
              <p style="margin:0 0 24px;font-size:16px;color:#475569;line-height:1.6;">
                Hi <strong style="color:#1e293b;">${name}</strong>, your upgrade is live. You now have full access to the premium AI prompt library and all professional engineering tools.
              </p>

              <!-- Receipt box -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:28px;text-align:center;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;">Amount Charged</p>
                ${amountLine}
                ${orderLine}
              </div>

              <!-- What's unlocked -->
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:.08em;">What's unlocked</p>
              <ul style="margin:0 0 32px;padding-left:20px;color:#475569;font-size:14px;line-height:1.8;">
                <li>Full access to 5,000+ premium AI prompts</li>
                <li>Priority model access (GPT-4o, Claude, Gemini)</li>
                <li>Unlimited favorites &amp; collections</li>
                <li>Affiliate program — earn 25% recurring commission</li>
                <li>Priority support</li>
              </ul>

              <a href="https://promptly.com/explore"
                 style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;letter-spacing:.03em;">
                Explore Premium Prompts &rarr;
              </a>
            </div>

            <!-- Footer -->
            <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                Sent with ♥ from the Promptly Team &nbsp;·&nbsp;
                <a href="https://promptly.com/settings/billing" style="color:#6366f1;">Manage subscription</a>
              </p>
            </div>
          </div>
        </div>
      `
    });

    console.log(`[Email] Success notification sent to ${email} (order: ${orderId ?? 'n/a'})`);
  } catch (err) {
    console.error('[Email] Failed to send success email:', err);
  }
}

export async function awardAffiliateCommission(customerId: string, orderAmount: any, orderId: string, currency: string, referralCode: string) {
  try {
    const firebase = await initFirebase();
    if (!firebase) return;
    const db = firebase.db;

    // 1. Fetch commission + lock-period config
    const marketingSnap = await db.collection("configs").doc("marketing").get();
    const marketingConfig = marketingSnap.exists ? marketingSnap.data() : {};
    const commissionPercent  = Number(marketingConfig?.referralCommission  ?? 25) / 100;
    const paymentFeePercent  = Number(marketingConfig?.paymentFeePercent   ?? 2)  / 100;
    const platformFeePercent = Number(marketingConfig?.platformFeePercent  ?? 0)  / 100;
    const lockDays           = Number(marketingConfig?.lockPeriodDays      ?? 14);

    // 2. Find Referrer
    const referrerSnap = await db.collection("users")
      .where("referralCode", "==", referralCode)
      .limit(1).get();

    if (referrerSnap.empty) return;

    const referrerDoc = referrerSnap.docs[0];
    const gross = Number(orderAmount);

    const paymentFee      = gross * paymentFeePercent;
    const netAfterFees    = gross - paymentFee;
    const grossCommission = netAfterFees * commissionPercent;
    const platformFee     = grossCommission * platformFeePercent;
    const commissionAmount = Math.max(0, grossCommission - platformFee);

    // 3. Lock period — commission goes into "pending" state, NOT credited yet
    const lockUntil = new Date();
    lockUntil.setDate(lockUntil.getDate() + lockDays);

    await db.collection("referral_commissions").add({
      referrerId: referrerDoc.id,
      buyerId: customerId,
      orderId,
      grossSaleAmount: gross,
      paymentFee:      parseFloat(paymentFee.toFixed(4)),
      platformFee:     parseFloat(platformFee.toFixed(4)),
      grossCommission: parseFloat(grossCommission.toFixed(4)),
      netCommission:   parseFloat(commissionAmount.toFixed(4)),
      commissionRate:      commissionPercent  * 100,
      paymentFeeRate:      paymentFeePercent  * 100,
      platformFeeRate:     platformFeePercent * 100,
      currency,
      // pending until lockUntil — auto-approved by processExpiredLocks()
      status: 'pending',
      lockUntil: admin.firestore.Timestamp.fromDate(lockUntil),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 4. Increment pendingEarnings (not spendable yet)
    await referrerDoc.ref.update({
      pendingEarnings: admin.firestore.FieldValue.increment(commissionAmount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[Affiliate] Queued ${commissionAmount.toFixed(2)} ${currency} for ${referrerDoc.id} (locks until ${lockUntil.toDateString()})`);
  } catch (err) {
    console.error("Affiliate Commission Error:", err);
  }
}

/**
 * Move commissions past their lock period from "pending" → "approved",
 * crediting affiliateEarnings on the user.
 * Call this from a daily cron or admin endpoint.
 */
export async function processExpiredLocks() {
  const firebase = await initFirebase();
  if (!firebase) return { processed: 0 };

  const db = firebase.db;
  const now = admin.firestore.Timestamp.now();

  const snap = await db.collection("referral_commissions")
    .where("status", "==", "pending")
    .where("lockUntil", "<=", now)
    .get();

  if (snap.empty) return { processed: 0 };

  const batch = db.batch();
  const creditMap: Record<string, number> = {};

  snap.docs.forEach(doc => {
    const data = doc.data();
    batch.update(doc.ref, { status: "approved", approvedAt: now });
    const amount = Number(data.netCommission ?? 0);
    creditMap[data.referrerId] = (creditMap[data.referrerId] ?? 0) + amount;
  });

  await batch.commit();

  // Credit affiliateEarnings and decrement pendingEarnings for each affected user
  for (const [uid, amount] of Object.entries(creditMap)) {
    await db.collection("users").doc(uid).update({
      affiliateEarnings: admin.firestore.FieldValue.increment(amount),
      pendingEarnings:   admin.firestore.FieldValue.increment(-amount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  console.log(`[Affiliate] processExpiredLocks: approved ${snap.size} commissions across ${Object.keys(creditMap).length} users`);
  return { processed: snap.size };
}
