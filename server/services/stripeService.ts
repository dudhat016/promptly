import admin from "firebase-admin";
import { initFirebase } from "../lib/firebase.js";
import { getStripe } from "../lib/stripe.js";
import { sendSuccessEmail, awardAffiliateCommission } from "../lib/payouts.js";
import { sendEmail } from "../lib/mailer.js";
import { getLangUrl } from "../lib/config.js";
import { calculateOrderBreakdown } from "../lib/calculations.js";

export class StripeService {
  static async createCheckoutSession(params: {
    userId: string;
    userEmail: string;
    planId: string;
    planName: string;
    billingCycle: string;
    amount: number;
    originalAmount?: number;
    couponDiscount?: number;
    couponCode?: string;
    referralCode?: string;
    couponId?: string;
  }): Promise<{ url: string }> {
    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe not configured — add STRIPE_SECRET_KEY env var");
    if (params.amount <= 0) throw new Error("Use direct activation for free plans");

    const metadata: Record<string, string> = {
      userId:         params.userId,
      planId:         params.planId,
      billingCycle:   params.billingCycle,
      originalAmount: String(params.originalAmount ?? params.amount),
      couponDiscount: String(params.couponDiscount ?? 0),
    };
    if (params.referralCode) metadata.referralCode = params.referralCode;
    if (params.couponId)     metadata.couponId     = params.couponId;
    if (params.couponCode)   metadata.couponCode   = params.couponCode;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: params.userEmail,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `Promptly ${params.planName}`,
            description: `${params.billingCycle === 'yearly' ? 'Annual' : 'Monthly'} subscription`,
          },
          unit_amount: Math.round(params.amount * 100),
        },
        quantity: 1,
      }],
      metadata,
      success_url: getLangUrl(`/checkout/verify?session_id={CHECKOUT_SESSION_ID}`),
      cancel_url: getLangUrl("/pricing"),
    });

    if (!session.url) throw new Error("Failed to create Stripe checkout session");
    return { url: session.url };
  }

  static async createTrialCheckout(params: {
    userId: string;
    userEmail: string;
    planId: string;
    planName: string;
    billingCycle: string;
    amount: number;
    trialDays: number;
    originalAmount?: number;
    couponDiscount?: number;
    couponCode?: string;
    couponId?: string;
  }): Promise<{ url: string }> {
    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe not configured — add STRIPE_SECRET_KEY env var");

    const metadata: Record<string, string> = {
      userId:         params.userId,
      planId:         params.planId,
      billingCycle:   params.billingCycle,
      isTrial:        "true",
      trialDays:      String(params.trialDays),
      originalAmount: String(params.originalAmount ?? params.amount),
      couponDiscount: String(params.couponDiscount ?? 0),
    };
    if (params.couponId)   metadata.couponId   = params.couponId;
    if (params.couponCode) metadata.couponCode = params.couponCode;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_collection: "always",
      customer_email: params.userEmail,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `Promptly ${params.planName}`,
            description: `${params.billingCycle === 'yearly' ? 'Annual' : 'Monthly'} subscription — ${params.trialDays}-day free trial`,
          },
          unit_amount: Math.round(params.amount * 100),
          recurring: { interval: params.billingCycle === 'yearly' ? 'year' : 'month' },
        },
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: params.trialDays,
        metadata,
      },
      metadata,
      success_url: getLangUrl(`/checkout/verify?session_id={CHECKOUT_SESSION_ID}`),
      cancel_url: getLangUrl("/pricing"),
    });

    if (!session.url) throw new Error("Failed to create Stripe trial checkout session");
    return { url: session.url };
  }

  static async verifySession(sessionId: string): Promise<Record<string, any>> {
    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe not configured");

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Trial subscription: card collected but no charge yet
    if (session.mode === "subscription" && session.payment_status === "no_payment_required") {
      const result = await StripeService.activateTrialFromSession(session);
      return {
        status:       "TRIAL",
        planName:     result.planName,
        amount:       0,
        currency:     "USD",
        orderId:      sessionId,
        billingCycle: result.billingCycle,
        trialEndsAt:  result.trialEndsAt?.toISOString(),
        gateway:      "stripe",
      };
    }

    if (session.payment_status !== "paid") {
      return { status: "PENDING", planName: "", amount: 0, currency: "USD", orderId: sessionId };
    }

    const result = await StripeService.activateFromSession(session);
    return {
      status:          "PAID",
      planName:        result.planName,
      amount:          (session.amount_total ?? 0) / 100,
      currency:        (session.currency ?? "usd").toUpperCase(),
      orderId:         sessionId,
      productPrice:    result.breakdown?.productPrice,
      couponDiscount:  result.breakdown?.couponDiscount,
      discountedPrice: result.breakdown?.discountedPrice,
      taxAmount:       result.breakdown?.taxAmount,
      taxRate:         result.breakdown?.taxRate,
      billingCycle:    result.billingCycle,
      couponCode:      result.couponCode,
      gateway:         "stripe",
    };
  }

  static async activateFromSession(session: any): Promise<{ planName: string; alreadyProcessed?: boolean; breakdown?: any; billingCycle?: string; couponCode?: string; couponDiscount?: number }> {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");
    const db = firebase.db;

    const sessionId: string = session.id;
    const metadata = session.metadata || {};
    const { userId, planId, billingCycle, referralCode } = metadata;
    const couponId       = metadata.couponId       || '';
    const couponCode     = metadata.couponCode     || '';
    const couponDiscount = parseFloat(metadata.couponDiscount || '0');
    const originalAmount = parseFloat(metadata.originalAmount || '0');

    if (!userId || !planId) throw new Error("Missing metadata in Stripe session");

    // Idempotency: skip if already processed
    const existingSnap = await db.collection("orders")
      .where("stripeSessionId", "==", sessionId)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      return { planName: existingSnap.docs[0].data().planName || "", alreadyProcessed: true };
    }

    // Load plan
    const planSnap = await db.collection("plans").doc(planId).get();
    const plan = planSnap.exists ? planSnap.data() : null;
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const planNameLower = plan.name.toLowerCase();
    let status: "free" | "pro" | "enterprise" = "pro";
    if (planNameLower.includes("agency") || planNameLower.includes("enterprise") || planNameLower.includes("team")) {
      status = "enterprise";
    }
    const credits = plan.monthlyCredits ?? (status === "enterprise" ? 2500 : 500);

    const periodEnd = new Date();
    if (billingCycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const buyerTotal = (session.amount_total ?? 0) / 100;
    const shortId = sessionId.replace("cs_", "").slice(-8).toUpperCase();
    const orderId = `STRIPE_${shortId}`;

    // Load configs for breakdown calculation
    const [globalSnap, marketingSnap] = await Promise.all([
      db.collection("configs").doc("global").get(),
      db.collection("configs").doc("marketing").get(),
    ]);
    const taxRate            = Number(globalSnap.data()?.taxRate            ?? 0);
    const commissionRate     = Number(marketingSnap.data()?.referralCommission ?? 25);
    const platformFeePercent = Number(marketingSnap.data()?.platformFeePercent  ?? 0);

    // productPrice = original plan price (before coupon). Fall back to reverse-calculating
    // from buyerTotal only when metadata.originalAmount is absent (legacy sessions).
    const productPrice = originalAmount > 0
      ? originalAmount
      : taxRate > 0
        ? parseFloat(((buyerTotal + couponDiscount) / (1 + taxRate / 100)).toFixed(4))
        : buyerTotal + couponDiscount;

    const breakdown = calculateOrderBreakdown({
      productPrice,
      couponDiscount,
      taxRate,
      gatewayFeePercent: 2.9,
      gatewayFlatFee: 0.30,
      commissionRate,
      platformFeePercent,
      hasAffiliate: !!referralCode,
    });

    await db.collection("users").doc(userId).set({
      subscriptionStatus: status,
      activePlanId: planId,
      credits,
      monthlyLimit: credits,
      subscriptionGateway: "stripe",
      billingCycle: billingCycle || "monthly",
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
      autoPayEnabled: false,
      cancelAtPeriodEnd: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection("orders").add({
      userId,
      planId,
      planName:          plan.name,
      stripeSessionId:   sessionId,
      orderId,
      productPrice:      breakdown.productPrice,
      couponDiscount:    breakdown.couponDiscount,
      discountedPrice:   breakdown.discountedPrice,
      taxAmount:         breakdown.taxAmount,
      taxRate:           breakdown.taxRate,
      buyerTotal:        breakdown.buyerTotal,
      gatewayFee:        breakdown.gatewayFee,
      netAfterGateway:   breakdown.netAfterGateway,
      netRevenue:        breakdown.netRevenue,
      commissionRate:    breakdown.commissionRate,
      commissionAmount:  breakdown.commissionAmount,
      platformFeeAmount: breakdown.platformFeeAmount,
      affiliatePayout:   breakdown.affiliatePayout,
      adminKeeps:        breakdown.adminKeeps,
      hasAffiliate:      breakdown.hasAffiliate,
      ...(couponId   ? { couponId }   : {}),
      ...(couponCode ? { couponCode } : {}),
      amount:            breakdown.buyerTotal,
      currency:          "USD",
      billingCycle:      billingCycle || "monthly",
      status:            "paid",
      gateway:           "stripe",
      createdAt:         admin.firestore.FieldValue.serverTimestamp(),
    });

    if (couponId) {
      try {
        await db.runTransaction(async (tx) => {
          const couponRef = db.collection("coupons").doc(couponId);
          const snap = await tx.get(couponRef);
          if (!snap.exists) return;
          tx.update(couponRef, {
            usedCount: admin.firestore.FieldValue.increment(1),
            lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          tx.set(db.collection("coupon_redemptions").doc(), {
            couponId,
            couponCode,
            orderId,
            userId,
            redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
      } catch (err) {
        console.error("[Stripe] coupon redeem error:", err);
      }
    }

    const userSnap = await db.collection("users").doc(userId).get();
    const userData = userSnap.data();

    if (referralCode) {
      try {
        const refCode = userData?.referredBy || referralCode;
        if (refCode) {
          await awardAffiliateCommission(userId, buyerTotal, orderId, "USD", refCode, buyerTotal);
        }
      } catch (err) {
        console.error("[Stripe] affiliate commission error:", err);
      }
    }

    try {
      const email = userData?.email || session.customer_email || "";
      const name = userData?.displayName || "Creator";
      await sendSuccessEmail(email, name, plan.name, orderId, buyerTotal, "USD", billingCycle || "monthly");
    } catch (err) {
      console.error("[Stripe] confirmation email error:", err);
    }

    return { planName: plan.name, breakdown, billingCycle: billingCycle || "monthly", couponCode, couponDiscount };
  }

  static async activateTrialFromSession(session: any): Promise<{ planName: string; alreadyProcessed?: boolean; billingCycle?: string; trialEndsAt?: Date }> {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");
    const db = firebase.db;
    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe not configured");

    const sessionId: string = session.id;
    const metadata = session.metadata || {};
    const { userId, planId, billingCycle } = metadata;
    const couponId   = metadata.couponId   || '';
    const couponCode = metadata.couponCode || '';
    const trialDays  = parseInt(metadata.trialDays || '7', 10);

    if (!userId || !planId) throw new Error("Missing metadata in Stripe trial session");

    const existingSnap = await db.collection("orders")
      .where("stripeSessionId", "==", sessionId)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      return { planName: existingSnap.docs[0].data().planName || "", alreadyProcessed: true };
    }

    const planSnap = await db.collection("plans").doc(planId).get();
    const plan = planSnap.exists ? planSnap.data() : null;
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const planNameLower = plan.name.toLowerCase();
    let status: "free" | "pro" | "enterprise" = "pro";
    if (planNameLower.includes("agency") || planNameLower.includes("enterprise") || planNameLower.includes("team")) {
      status = "enterprise";
    }
    const credits = plan.monthlyCredits ?? (status === "enterprise" ? 2500 : 500);

    let trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
    const stripeSubscriptionId = (session.subscription as string) || '';

    if (stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        if ((sub as any).trial_end) trialEndsAt = new Date((sub as any).trial_end * 1000);
      } catch { /* keep fallback */ }
    }

    const shortId = sessionId.replace("cs_", "").slice(-8).toUpperCase();
    const orderId = `TRIAL_${shortId}`;

    await db.collection("users").doc(userId).set({
      subscriptionStatus:  status,
      activePlanId:        planId,
      credits,
      monthlyLimit:        credits,
      subscriptionGateway: "stripe",
      billingCycle:        billingCycle || "monthly",
      isTrial:             true,
      trialUsed:           true,
      trialEndsAt:         admin.firestore.Timestamp.fromDate(trialEndsAt),
      currentPeriodEnd:    admin.firestore.Timestamp.fromDate(trialEndsAt),
      stripeSubscriptionId,
      autoPayEnabled:      true,
      cancelAtPeriodEnd:   false,
      updatedAt:           admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection("orders").add({
      userId,
      planId,
      planName:            plan.name,
      stripeSessionId:     sessionId,
      stripeSubscriptionId,
      orderId,
      amount:              0,
      currency:            "USD",
      amountUsd:           0,
      billingCycle:        billingCycle || "monthly",
      status:              "trial",
      isTrial:             true,
      trialEndsAt:         admin.firestore.Timestamp.fromDate(trialEndsAt),
      gateway:             "stripe",
      createdAt:           admin.firestore.FieldValue.serverTimestamp(),
    });

    if (couponId) {
      try {
        await db.runTransaction(async (tx) => {
          const couponRef = db.collection("coupons").doc(couponId);
          const snap = await tx.get(couponRef);
          if (!snap.exists) return;
          tx.update(couponRef, {
            usedCount:  admin.firestore.FieldValue.increment(1),
            lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          tx.set(db.collection("coupon_redemptions").doc(), {
            couponId, couponCode, orderId, userId,
            redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
      } catch (err) {
        console.error("[Stripe] trial coupon redeem error:", err);
      }
    }

    try {
      const userSnap = await db.collection("users").doc(userId).get();
      const userData = userSnap.data();
      const email = userData?.email || session.customer_email || "";
      const name  = userData?.displayName || "Creator";
      await sendEmail(db, email, "trial_started", {
        name,
        plan:        plan.name,
        trial_days:  String(trialDays),
        trial_ends:  trialEndsAt.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      }, userId);
    } catch { /* non-blocking */ }

    return { planName: plan.name, billingCycle: billingCycle || "monthly", trialEndsAt };
  }

  static async handleTrialWillEnd(subscription: any): Promise<void> {
    const metadata = subscription.metadata || {};
    const userId = metadata.userId;
    const planId = metadata.planId || '';
    if (!userId) return;

    const firebase = await initFirebase();
    if (!firebase) return;
    const db = firebase.db;

    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) return;
    const userData = userSnap.data()!;

    const chargeDate = new Date(subscription.trial_end * 1000);
    const planSnap = await db.collection("plans").doc(planId || userData.activePlanId).get();
    const planName = planSnap.exists ? planSnap.data()!.name : "Pro";

    try {
      await sendEmail(db, userData.email || "", "trial_reminder", {
        name:        userData.displayName || "Creator",
        plan:        planName,
        charge_date: chargeDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      }, userId);
    } catch { /* non-blocking */ }
  }

  static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const firebase = await initFirebase();
    if (!firebase) return;

    await firebase.db.collection("users").doc(userId).set({
      subscriptionStatus:  "free",
      activePlanId:        null,
      isTrial:             false,
      stripeSubscriptionId: null,
      autoPayEnabled:      false,
      cancelAtPeriodEnd:   false,
      updatedAt:           admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  static async handleInvoiceSucceeded(invoice: any): Promise<void> {
    if (!invoice.subscription || !invoice.amount_paid || invoice.amount_paid === 0) return;

    const stripe = getStripe();
    if (!stripe) return;

    const firebase = await initFirebase();
    if (!firebase) return;
    const db = firebase.db;

    const subscriptionId = invoice.subscription as string;
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const metadata = (sub as any).metadata || {};
    const { userId, planId, billingCycle } = metadata;
    const couponId       = metadata.couponId       || '';
    const couponCode     = metadata.couponCode     || '';
    const couponDiscount = parseFloat(metadata.couponDiscount || '0');
    const originalAmount = parseFloat(metadata.originalAmount || '0');

    if (!userId || !planId) return;

    const existingSnap = await db.collection("orders")
      .where("stripeInvoiceId", "==", invoice.id)
      .limit(1)
      .get();
    if (!existingSnap.empty) return;

    const planSnap = await db.collection("plans").doc(planId).get();
    const plan = planSnap.exists ? planSnap.data() : null;
    if (!plan) return;

    const planNameLower = plan.name.toLowerCase();
    let subStatus: "free" | "pro" | "enterprise" = "pro";
    if (planNameLower.includes("agency") || planNameLower.includes("enterprise") || planNameLower.includes("team")) {
      subStatus = "enterprise";
    }
    const credits = plan.monthlyCredits ?? (subStatus === "enterprise" ? 2500 : 500);

    const periodEnd = new Date();
    if (billingCycle === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    const buyerTotal = invoice.amount_paid / 100;
    const shortId = invoice.id.replace("in_", "").slice(-8).toUpperCase();
    const orderId = `STRIPE_${shortId}`;

    const [globalSnap, marketingSnap] = await Promise.all([
      db.collection("configs").doc("global").get(),
      db.collection("configs").doc("marketing").get(),
    ]);
    const taxRate            = Number(globalSnap.data()?.taxRate            ?? 0);
    const commissionRate     = Number(marketingSnap.data()?.referralCommission ?? 25);
    const platformFeePercent = Number(marketingSnap.data()?.platformFeePercent  ?? 0);

    const productPrice = originalAmount > 0 ? originalAmount
      : taxRate > 0
        ? parseFloat(((buyerTotal + couponDiscount) / (1 + taxRate / 100)).toFixed(4))
        : buyerTotal + couponDiscount;

    const breakdown = calculateOrderBreakdown({
      productPrice,
      couponDiscount,
      taxRate,
      gatewayFeePercent: 2.9,
      gatewayFlatFee: 0.30,
      commissionRate,
      platformFeePercent,
      hasAffiliate: false,
    });

    await db.collection("users").doc(userId).set({
      subscriptionStatus: subStatus,
      activePlanId:       planId,
      credits,
      monthlyLimit:       credits,
      isTrial:            false,
      currentPeriodEnd:   admin.firestore.Timestamp.fromDate(periodEnd),
      autoPayEnabled:     true,
      updatedAt:          admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection("orders").add({
      userId,
      planId,
      planName:            plan.name,
      stripeInvoiceId:     invoice.id,
      stripeSubscriptionId: subscriptionId,
      orderId,
      productPrice:        breakdown.productPrice,
      couponDiscount:      breakdown.couponDiscount,
      discountedPrice:     breakdown.discountedPrice,
      taxAmount:           breakdown.taxAmount,
      taxRate:             breakdown.taxRate,
      buyerTotal:          breakdown.buyerTotal,
      gatewayFee:          breakdown.gatewayFee,
      netAfterGateway:     breakdown.netAfterGateway,
      netRevenue:          breakdown.netRevenue,
      commissionRate:      breakdown.commissionRate,
      commissionAmount:    breakdown.commissionAmount,
      platformFeeAmount:   breakdown.platformFeeAmount,
      affiliatePayout:     breakdown.affiliatePayout,
      adminKeeps:          breakdown.adminKeeps,
      hasAffiliate:        breakdown.hasAffiliate,
      ...(couponId   ? { couponId }   : {}),
      ...(couponCode ? { couponCode } : {}),
      amount:              buyerTotal,
      currency:            "USD",
      billingCycle:        billingCycle || "monthly",
      status:              "paid",
      gateway:             "stripe",
      fromTrial:           true,
      createdAt:           admin.firestore.FieldValue.serverTimestamp(),
    });

    const userSnap = await db.collection("users").doc(userId).get();
    const userData = userSnap.data();
    try {
      await sendSuccessEmail(
        userData?.email || invoice.customer_email || "",
        userData?.displayName || "Creator",
        plan.name,
        orderId,
        buyerTotal,
        "USD",
        billingCycle || "monthly"
      );
    } catch { /* non-blocking */ }
  }

  static async handleWebhook(rawBody: string | Buffer, signature: string, webhookSecret: string): Promise<{ received: boolean }> {
    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe not configured");

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        if (session.payment_status === "paid") {
          await StripeService.activateFromSession(session);
        } else if (session.mode === "subscription" && session.payment_status === "no_payment_required") {
          await StripeService.activateTrialFromSession(session);
        }
        break;
      }
      case "customer.subscription.trial_will_end":
        await StripeService.handleTrialWillEnd(event.data.object as any);
        break;
      case "customer.subscription.deleted":
        await StripeService.handleSubscriptionDeleted(event.data.object as any);
        break;
      case "invoice.payment_succeeded":
        await StripeService.handleInvoiceSucceeded(event.data.object as any);
        break;
    }

    return { received: true };
  }
}
