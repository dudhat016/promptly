import admin from "firebase-admin";
import { initFirebase } from "./firebase.js";
import { sendEmail } from "./mailer.js";
import { sendPayPalPayout } from "./paypalPayouts.js";

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

/**
 * Auto-pay eligible affiliates via PayPal Payouts API.
 * Only runs when autoPayoutsEnabled === true in configs/marketing.
 * Only pays affiliates who have a paypalEmail saved in their payoutMethods.
 * Flagged / fraud-risk accounts are skipped — they still need manual approval.
 */
export async function triggerAutoPayouts(): Promise<{
  processed: number; succeeded: number; failed: number; skipped: number;
}> {
  const firebase = await initFirebase();
  if (!firebase) return { processed: 0, succeeded: 0, failed: 0, skipped: 0 };
  const db = firebase.db;

  const marketingSnap = await db.collection("configs").doc("marketing").get();
  const config = marketingSnap.exists ? marketingSnap.data() : {};

  if (!config?.autoPayoutsEnabled) {
    console.log('[AutoPayout] Disabled via config — skipping');
    return { processed: 0, succeeded: 0, failed: 0, skipped: 0 };
  }

  const minAmount      = Number(config?.minWithdrawalAmount ?? 20);
  const fraudThreshold = Number(config?.fraudScoreThreshold ?? 70);

  // Firestore can't filter on nested field + numeric range in one query, so filter in memory.
  const usersSnap = await db.collection("users")
    .where("affiliateEarnings", ">=", minAmount)
    .get();

  let processed = 0, succeeded = 0, failed = 0, skipped = 0;

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();

    // Auto-payout only supports PayPal for now
    const paypalEmail = user.payoutMethods?.paypalEmail;
    if (!paypalEmail) { skipped++; continue; }

    // Skip if there's already a pending/processing payout
    const existingSnap = await db.collection("payouts")
      .where("userId", "==", userDoc.id)
      .where("status", "in", ["pending", "processing"])
      .limit(1).get();
    if (!existingSnap.empty) { skipped++; continue; }

    // Fraud scoring — same logic as manual withdraw route
    const createdAt = user.createdAt?.toDate
      ? user.createdAt.toDate()
      : new Date(user.createdAt || Date.now());
    const accountAgeDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    let fraudScore = 0;
    if (accountAgeDays < 7)  fraudScore += 40;
    if (accountAgeDays < 2)  fraudScore += 30;
    if (!user.photoURL || !user.displayName) fraudScore += 10;
    if (fraudScore >= fraudThreshold) { skipped++; continue; }

    const amount = Number(user.affiliateEarnings);
    processed++;

    // Create payout record in 'processing' state before calling PayPal
    const payoutRef = await db.collection("payouts").add({
      userId:        userDoc.id,
      userEmail:     user.email || '',
      userName:      user.displayName || '',
      amount,
      currency:      'USD',
      payoutMethod:  'paypal',
      payoutDetails: { paypalEmail },
      status:        'processing',
      riskScore:     fraudScore,
      riskLevel:     'low_risk',
      autoTriggered: true,
      requestedAt:   admin.firestore.FieldValue.serverTimestamp(),
      processedAt:   null,
      transactionRef: null,
    });

    const result = await sendPayPalPayout({
      payoutId:       payoutRef.id,
      recipientEmail: paypalEmail,
      amount,
      currency:       'USD',
      note:           `Your Promptly affiliate commission of $${amount.toFixed(2)}`,
    });

    if (result.success) {
      await db.runTransaction(async tx => {
        const userRef  = db.collection("users").doc(userDoc.id);
        const freshSnap = await tx.get(userRef);
        if (!freshSnap.exists) return;

        tx.update(payoutRef, {
          status:         'completed',
          transactionRef: result.batchId || 'paypal_batch',
          processedAt:    admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(userRef, {
          affiliateEarnings: admin.firestore.FieldValue.increment(-amount),
          withdrawnAmount:   admin.firestore.FieldValue.increment(amount),
          updatedAt:         admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      if (user.email) {
        await sendEmail(db, user.email, 'affiliate_withdrawal_approved', {
          name:            user.displayName || 'Creator',
          amount:          amount.toFixed(2),
          method:          'PayPal',
          transaction_ref: result.batchId || 'auto-processed',
        }).catch(() => {});
      }

      console.log(`[AutoPayout] Sent $${amount} to ${paypalEmail} (batch: ${result.batchId})`);
      succeeded++;
    } else {
      await payoutRef.update({
        status:      'failed',
        adminNote:   result.error || 'Auto-payout failed',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.error(`[AutoPayout] Failed for ${userDoc.id}: ${result.error}`);
      failed++;
    }
  }

  console.log(`[AutoPayout] Done — processed:${processed} succeeded:${succeeded} failed:${failed} skipped:${skipped}`);
  return { processed, succeeded, failed, skipped };
}
