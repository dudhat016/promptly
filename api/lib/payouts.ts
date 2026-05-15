import admin from "firebase-admin";
import { initFirebase } from "./firebase.js";
import { sendEmail } from "./mailer.js";

export async function sendSuccessEmail(
  email: string,
  name: string,
  planName: string,
  orderId?: string,
  amount?: number,
  currency?: string,
  billingCycle?: string
) {
  try {
    const firebase = await initFirebase();
    if (!firebase) return;

    const currencyCode = currency || "USD";
    const displayAmount = amount
      ? `${currencyCode === "INR" ? "₹" : "$"}${amount}`
      : "";

    await sendEmail(firebase.db, email, "purchase_confirmation", {
      name,
      plan:          planName,
      amount:        displayAmount,
      currency:      currencyCode,
      order_id:      orderId     || "",
      billing_cycle: billingCycle || "monthly",
    });

    console.log(`[Email] Purchase confirmation sent to ${email} (order: ${orderId ?? "n/a"})`);
  } catch (err) {
    console.error("[Email] Failed to send purchase confirmation:", err);
  }
}

export async function awardAffiliateCommission(
  customerId: string,
  orderAmount: any,
  orderId: string,
  currency: string,
  referralCode: string,
  amountUsd: number,       // always USD-normalized amount
  exchangeRateAtOrder: number = 1,
) {
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

    // 3. All fee/commission math is done in USD for consistent accounting.
    //    Native amount is stored for reference only.
    const grossNative = parseFloat(Number(orderAmount).toFixed(4));
    const grossUsd    = parseFloat(Number(amountUsd).toFixed(4));

    const paymentFeeUsd      = parseFloat((grossUsd * paymentFeePercent).toFixed(4));
    const netAfterFeesUsd    = grossUsd - paymentFeeUsd;
    const grossCommissionUsd = parseFloat((netAfterFeesUsd * commissionPercent).toFixed(4));
    const platformFeeUsd     = parseFloat((grossCommissionUsd * platformFeePercent).toFixed(4));
    const netCommissionUsd   = parseFloat(Math.max(0, grossCommissionUsd - platformFeeUsd).toFixed(4));

    // 4. Lock period
    const lockUntil = new Date();
    lockUntil.setDate(lockUntil.getDate() + lockDays);

    await db.collection("referral_commissions").add({
      referrerId:        referrerDoc.id,
      buyerId:           customerId,
      orderId,
      // Native amounts (what the gateway charged)
      grossSaleAmount:   grossNative,
      currency,
      exchangeRateAtOrder,
      // USD-normalized amounts (used for all accounting and payouts)
      grossSaleAmountUsd:  grossUsd,
      paymentFeeUsd,
      platformFeeUsd,
      grossCommissionUsd,
      netCommissionUsd,
      // Rates
      commissionRate:    commissionPercent  * 100,
      paymentFeeRate:    paymentFeePercent  * 100,
      platformFeeRate:   platformFeePercent * 100,
      // Status
      status: 'pending',
      lockUntil: admin.firestore.Timestamp.fromDate(lockUntil),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 5. Increment pendingEarnings in USD (consistent for all gateways)
    await referrerDoc.ref.update({
      pendingEarnings: admin.firestore.FieldValue.increment(netCommissionUsd),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 6. First-conversion email — only when this is the referrer's first paid commission
    const existingSnap = await db.collection("referral_commissions")
      .where("referrerId", "==", referrerDoc.id)
      .limit(2).get();
    if (existingSnap.size === 1) {
      const referrer = referrerDoc.data();
      if (referrer.email) {
        await sendEmail(db, referrer.email, "affiliate_first_conversion", {
          name:       referrer.displayName || "Creator",
          commission: netCommissionUsd.toFixed(2),
        }).catch(() => {});
      }
    }

    console.log(`[Affiliate] Queued $${netCommissionUsd.toFixed(2)} USD commission for ${referrerDoc.id} (native: ${grossNative} ${currency}, rate: ${exchangeRateAtOrder}, locks until ${lockUntil.toDateString()})`);
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
    // Use netCommissionUsd (new field). Fall back to legacy netCommission for old records.
    const amount = Number(data.netCommissionUsd ?? data.netCommission ?? 0);
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
