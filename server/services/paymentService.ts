import admin from "firebase-admin";
import { initFirebase } from "../lib/firebase.js";
import { calculateOrderBreakdown } from "../lib/calculations.js";
import { awardAffiliateCommission, sendSuccessEmail } from "../lib/payouts.js";
import { triggerFlow } from "./automationEngine.js";

async function fetchLiveExchangeRate(): Promise<number> {
  const APIS = [
    'https://open.er-api.com/v6/latest/USD',
    'https://api.exchangerate-api.com/v4/latest/USD',
  ];
  for (const url of APIS) {
    try {
      const res = await fetch(url);
      const data: any = await res.json();
      if (data?.rates?.INR) return data.rates.INR;
    } catch { /* try next */ }
  }
  return 83.5; // fallback
}

function toUsd(amount: number, currency: string, rate: number): number {
  if (currency === 'USD') return Math.round(amount * 100) / 100;
  // INR → USD
  return Math.round((amount / rate) * 100) / 100;
}

async function redeemCoupon(db: any, couponId: string, couponCode: string, orderId: string, userId: string) {
  if (!couponId) return;
  try {
    await db.runTransaction(async (tx: any) => {
      const ref  = db.collection("coupons").doc(couponId);
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      tx.update(ref, {
        usedCount:  admin.firestore.FieldValue.increment(1),
        lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      tx.set(db.collection("coupon_redemptions").doc(), {
        couponId, couponCode, orderId, userId,
        redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    console.error("[PaymentService] coupon redeem error:", err);
  }
}

export class PaymentService {
  static async verifyCashfreePayment(orderId: string) {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    if (!appId || !secretKey) throw new Error("Cashfree credentials not configured — set CASHFREE_APP_ID and CASHFREE_SECRET_KEY");

    // Cashfree uses api.cashfree.com for both sandbox and production order lookups
    const response = await fetch(`https://api.cashfree.com/pg/orders/${orderId}`, {
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
      },
    });

    const data: any = await response.json();

    if (data.order_status === 'PAID') {
      const customerId  = data.customer_details.customer_id;
      const planId      = data.order_tags?.planId      || 'pro_plan';
      const billingCycle = data.order_tags?.billingCycle || 'monthly';
      const couponId       = data.order_tags?.couponId       || '';
      const couponCode     = data.order_tags?.couponCode     || '';
      const couponDiscount = parseFloat(data.order_tags?.couponDiscount || '0');
      const originalAmount = parseFloat(data.order_tags?.originalAmount || '0');

      const [planSnap, globalSnap, marketingSnap] = await Promise.all([
        firebase.db.collection("plans").doc(planId).get(),
        firebase.db.collection("configs").doc("global").get(),
        firebase.db.collection("configs").doc("marketing").get(),
      ]);
      const planData = planSnap.data() ?? { monthlyCredits: 500, name: 'Pro' };
      const planCredits = planData.monthlyCredits ?? planData.credits ?? 500;
      const taxRate            = Number(globalSnap.data()?.taxRate             ?? 0);
      const commissionRate     = Number(marketingSnap.data()?.referralCommission ?? 25);
      const platformFeePercent = Number(marketingSnap.data()?.platformFeePercent  ?? 0);

      const userRef  = firebase.db.collection("users").doc(customerId);
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() : null;

      const expiryDate = new Date();
      if (billingCycle === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      else expiryDate.setMonth(expiryDate.getMonth() + 1);

      const exchangeRateAtOrder = await fetchLiveExchangeRate();
      const amountUsd = toUsd(data.order_amount, data.order_currency, exchangeRateAtOrder);

      // Use originalAmount (USD) when available; fall back to reverse-calc
      const productPrice = originalAmount > 0 ? originalAmount
        : taxRate > 0
          ? parseFloat(((amountUsd + couponDiscount) / (1 + taxRate / 100)).toFixed(4))
          : amountUsd + couponDiscount;

      const breakdown = calculateOrderBreakdown({
        productPrice,
        couponDiscount,
        taxRate,
        commissionRate,
        platformFeePercent,
        hasAffiliate: !!userData?.referredBy,
      });

      await userRef.update({
        subscriptionStatus: planId === 'free' ? 'free' : 'pro',
        activePlanId: planId,
        billingCycle,
        credits: planCredits,
        monthlyLimit: planCredits,
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(expiryDate),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await firebase.db.collection("orders").doc(data.order_id).set({
        orderId:           data.order_id,
        userId:            customerId,
        userEmail:         data.customer_details.customer_email,
        planId,
        planName:          planData.name,
        productPrice:      breakdown.productPrice,
        couponDiscount:    breakdown.couponDiscount,
        discountedPrice:   breakdown.discountedPrice,
        taxAmount:         breakdown.taxAmount,
        taxRate:           breakdown.taxRate,
        buyerTotal:        breakdown.buyerTotal,
        netRevenue:        breakdown.netRevenue,
        commissionAmount:  breakdown.commissionAmount,
        affiliatePayout:   breakdown.affiliatePayout,
        adminKeeps:        breakdown.adminKeeps,
        hasAffiliate:      breakdown.hasAffiliate,
        ...(couponId   ? { couponId }   : {}),
        ...(couponCode ? { couponCode } : {}),
        amount:            data.order_amount,
        currency:          data.order_currency,
        amountUsd,
        exchangeRateAtOrder,
        status:            'completed',
        billingCycle,
        gateway:           'cashfree',
        createdAt:         admin.firestore.FieldValue.serverTimestamp(),
      });

      const invoiceNumber = `INV-${Date.now()}`;
      await firebase.db.collection("invoices").add({
        invoiceNumber,
        orderId: data.order_id,
        userId: customerId,
        customerEmail: data.customer_details.customer_email,
        customerName: userData?.displayName || '',
        planId,
        planName: planData.name,
        amount: data.order_amount,
        currency: data.order_currency,
        amountUsd,
        exchangeRateAtOrder,
        billingCycle,
        gateway: 'cashfree',
        status: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await redeemCoupon(firebase.db, couponId, couponCode, data.order_id, customerId);

      if (userData?.referredBy) {
        await awardAffiliateCommission(customerId, data.order_amount, data.order_id, data.order_currency, userData.referredBy, amountUsd, exchangeRateAtOrder);
      }

      sendSuccessEmail(data.customer_details.customer_email, userData?.displayName || 'Creator', planData.name, data.order_id, data.order_amount, data.order_currency);

      triggerFlow(firebase.db, 'subscription_payment_received', customerId, {
        plan: planData.name, planId, amount: String(data.order_amount), currency: data.order_currency
      }).catch(err => console.error('[Automation] payment trigger failed:', err.message));

      return {
        status: 'PAID',
        orderId: data.order_id,
        planName: planData.name,
        amount: data.order_amount,
        currency: data.order_currency,
        amountUsd,
        creditsAdded: planCredits
      };
    }

    return { status: data.order_status, message: "Payment pending or failed" };
  }

  /**
   * Verify PayPal capture and upgrade account
   */
  static async verifyPaypalPayment(payload: {
    orderID: string;
    planId: string;
    billingCycle: string;
    customerId: string;
    customerEmail: string;
    couponId?: string;
    couponCode?: string;
    couponDiscount?: number;
    originalAmount?: number;
  }) {
    const { orderID, planId, billingCycle, customerId, customerEmail } = payload;
    const couponId       = payload.couponId       || '';
    const couponCode     = payload.couponCode     || '';
    const couponDiscount = payload.couponDiscount ?? 0;
    const originalAmount = payload.originalAmount ?? 0;
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;

    // Secrets come from env vars only — not stored in Firestore
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    // PayPal environment values: 'live' | 'sandbox' (not 'production')
    const environment = config?.paypal?.environment || process.env.PAYPAL_ENV || 'sandbox';

    if (!clientId || !clientSecret) throw new Error("PayPal credentials not configured — set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET");

    const basePaypalUrl = environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    const authUrl = `${basePaypalUrl}/v1/oauth2/token`;
    const captureUrl = `${basePaypalUrl}/v2/checkout/orders/${orderID}/capture`;

    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!authRes.ok) throw new Error(`PayPal auth failed (${authRes.status}) — check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET`);
    const { access_token } = await authRes.json();

    const captureRes = await fetch(captureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      }
    });
    const captureData: any = await captureRes.json();

    if (captureData.status === 'COMPLETED') {
      const [planSnap, globalSnap, marketingSnap] = await Promise.all([
        firebase.db.collection("plans").doc(planId).get(),
        firebase.db.collection("configs").doc("global").get(),
        firebase.db.collection("configs").doc("marketing").get(),
      ]);
      const planData = planSnap.data() ?? { monthlyCredits: 500, name: 'Pro' };
      const planCredits = planData.monthlyCredits ?? planData.credits ?? 500;
      const taxRate            = Number(globalSnap.data()?.taxRate             ?? 0);
      const commissionRate     = Number(marketingSnap.data()?.referralCommission ?? 25);
      const platformFeePercent = Number(marketingSnap.data()?.platformFeePercent  ?? 0);

      const userRef  = firebase.db.collection("users").doc(customerId);
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() : null;

      const expiryDate = new Date();
      if (billingCycle === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      else expiryDate.setMonth(expiryDate.getMonth() + 1);

      const ppCapture      = captureData.purchase_units[0].payments.captures[0];
      const nativeAmount   = parseFloat(ppCapture.amount.value);
      const nativeCurrency = ppCapture.amount.currency_code as string;
      const amountUsd      = Math.round(nativeAmount * 100) / 100;
      const exchangeRateAtOrder = 1;

      // productPrice: use originalAmount if provided, else reverse-calc
      const productPrice = originalAmount > 0 ? originalAmount
        : taxRate > 0
          ? parseFloat(((amountUsd + couponDiscount) / (1 + taxRate / 100)).toFixed(4))
          : amountUsd + couponDiscount;

      const breakdown = calculateOrderBreakdown({
        productPrice,
        couponDiscount,
        taxRate,
        gatewayFeePercent: 0,
        gatewayFlatFee: 0,
        commissionRate,
        platformFeePercent,
        hasAffiliate: !!userData?.referredBy,
      });

      await userRef.update({
        subscriptionStatus: planId === 'free' ? 'free' : 'pro',
        activePlanId: planId,
        billingCycle,
        credits: planCredits,
        monthlyLimit: planCredits,
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(expiryDate),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await firebase.db.collection("orders").doc(orderID).set({
        orderId:           orderID,
        userId:            customerId,
        userEmail:         customerEmail,
        planId,
        planName:          planData.name,
        productPrice:      breakdown.productPrice,
        couponDiscount:    breakdown.couponDiscount,
        discountedPrice:   breakdown.discountedPrice,
        taxAmount:         breakdown.taxAmount,
        taxRate:           breakdown.taxRate,
        buyerTotal:        breakdown.buyerTotal,
        netRevenue:        breakdown.netRevenue,
        commissionAmount:  breakdown.commissionAmount,
        affiliatePayout:   breakdown.affiliatePayout,
        adminKeeps:        breakdown.adminKeeps,
        hasAffiliate:      breakdown.hasAffiliate,
        ...(couponId   ? { couponId }   : {}),
        ...(couponCode ? { couponCode } : {}),
        amount:            nativeAmount,
        currency:          nativeCurrency,
        amountUsd,
        exchangeRateAtOrder,
        status:            'completed',
        billingCycle,
        gateway:           'paypal',
        createdAt:         admin.firestore.FieldValue.serverTimestamp(),
      });

      await firebase.db.collection("invoices").add({
        invoiceNumber: `INV-${Date.now()}`,
        orderId:       orderID,
        userId:        customerId,
        customerEmail,
        customerName:  userData?.displayName || '',
        planId,
        planName:      planData.name,
        amount:        nativeAmount,
        currency:      nativeCurrency,
        amountUsd,
        exchangeRateAtOrder,
        billingCycle,
        gateway:       'paypal',
        status:        'paid',
        paidAt:        admin.firestore.FieldValue.serverTimestamp(),
        createdAt:     admin.firestore.FieldValue.serverTimestamp(),
      });

      await redeemCoupon(firebase.db, couponId, couponCode, orderID, customerId);

      if (userData?.referredBy) {
        await awardAffiliateCommission(customerId, nativeAmount, orderID, nativeCurrency, userData.referredBy, amountUsd, exchangeRateAtOrder);
      }

      sendSuccessEmail(customerEmail, userData?.displayName || 'Creator', planData.name, orderID, nativeAmount, nativeCurrency);

      triggerFlow(firebase.db, 'subscription_payment_received', customerId, {
        plan: planData.name, planId, amount: String(nativeAmount), currency: nativeCurrency
      }).catch(err => console.error('[Automation] payment trigger failed:', err.message));

      return {
        status: 'COMPLETED',
        planName: planData.name,
        amountUsd,
      };
    }

    throw new Error(`PayPal payment ${captureData.status}`);
  }
}
