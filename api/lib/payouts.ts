import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { initFirebase } from "./firebase";

export async function sendSuccessEmail(email: string, name: string, planName: string) {
  try {
    const firebase = await initFirebase();
    if (!firebase) return;

    const configSnap = await firebase.db.collection("configs").doc("email").get();
    if (!configSnap.exists) return;

    const config = configSnap.data();
    if (config?.provider !== 'smtp') return;

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: parseInt(config.smtpPort),
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      }
    });

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: email,
      subject: `🚀 Welcome to Promptly ${planName}!`,
      html: `
        <div style="font-family: sans-serif; padding: 40px; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 24px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
            <h1 style="color: #4f46e5; margin-bottom: 24px;">Welcome to the Inner Circle, ${name}!</h1>
            <p style="font-size: 16px; line-height: 1.6; color: #475569;">Your <strong>${planName}</strong> subscription is now active. You have full access to our premium AI prompt library and advanced engineering tools.</p>
            <div style="margin-top: 32px; padding: 24px; background: #f1f5f9; border-radius: 16px;">
              <p style="margin: 0; font-weight: bold; color: #1e293b;">Next Steps:</p>
              <ul style="margin: 12px 0 0 0; color: #475569; padding-left: 20px;">
                <li>Explore the Premium Vault</li>
                <li>Set up your Creator Profile</li>
                <li>Start earning via our Affiliate Program</li>
              </ul>
            </div>
            <div style="margin-top: 32px; padding-top: 32px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px; text-align: center;">
              Sent with 💜 from the Promptly Team
            </div>
          </div>
        </div>
      `
    });
    console.log(`[Email] Success notification sent to ${email}`);
  } catch (err) {
    console.error("Failed to send success email:", err);
  }
}

export async function awardAffiliateCommission(customerId: string, orderAmount: any, orderId: string, currency: string, referralCode: string) {
  try {
    const db = admin.firestore();

    // 1. Fetch commission config (rate + fee deductions)
    const marketingSnap = await db.collection("configs").doc("marketing").get();
    const marketingConfig = marketingSnap.exists ? marketingSnap.data() : {};
    const commissionPercent = Number(marketingConfig?.referralCommission ?? 25) / 100;
    const paymentFeePercent = Number(marketingConfig?.paymentFeePercent ?? 2) / 100;
    const platformFeePercent = Number(marketingConfig?.platformFeePercent ?? 0) / 100;

    // 2. Find Referrer
    const referrerSnap = await db.collection("users")
      .where("referralCode", "==", referralCode)
      .limit(1)
      .get();

    if (referrerSnap.empty) return;

    const referrerDoc = referrerSnap.docs[0];
    const gross = Number(orderAmount);

    // Net after payment gateway fee, then apply commission, then deduct platform fee
    const paymentFee = gross * paymentFeePercent;
    const netAfterFees = gross - paymentFee;
    const grossCommission = netAfterFees * commissionPercent;
    const platformFee = grossCommission * platformFeePercent;
    const commissionAmount = Math.max(0, grossCommission - platformFee);

    // 3. Award Earnings
    await referrerDoc.ref.update({
      affiliateEarnings: admin.firestore.FieldValue.increment(commissionAmount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 4. Log Transaction with full fee breakdown
    await db.collection("referral_commissions").add({
      referrerId: referrerDoc.id,
      buyerId: customerId,
      orderId: orderId,
      grossSaleAmount: gross,
      paymentFee: parseFloat(paymentFee.toFixed(4)),
      platformFee: parseFloat(platformFee.toFixed(4)),
      grossCommission: parseFloat(grossCommission.toFixed(4)),
      netCommission: parseFloat(commissionAmount.toFixed(4)),
      commissionRate: commissionPercent * 100,
      paymentFeeRate: paymentFeePercent * 100,
      platformFeeRate: platformFeePercent * 100,
      currency: currency,
      status: 'awarded',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[Affiliate] Awarded ${commissionAmount.toFixed(2)} ${currency} to ${referrerDoc.id} for order ${orderId} (gross: ${gross}, paymentFee: ${paymentFee.toFixed(2)}, platformFee: ${platformFee.toFixed(2)})`);
  } catch (err) {
    console.error("Affiliate Commission Error:", err);
  }
}
