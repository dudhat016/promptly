import admin from "firebase-admin";
import { initFirebase } from "../lib/firebase";
import { getStripe } from "../lib/stripe";
import { awardAffiliateCommission, sendSuccessEmail } from "../lib/payouts";

export class PaymentService {
  /**
   * Verified a payment from Cashfree and upgrades user account
   */
  static async verifyCashfreePayment(orderId: string) {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const appId = config?.cashfree?.appId || process.env.CASHFREE_APP_ID;
    const secretKey = config?.cashfree?.secretKey || process.env.CASHFREE_SECRET_KEY;
    const environment = config?.cashfree?.environment || process.env.CASHFREE_ENV || 'sandbox';

    const baseUrl = environment === 'production' ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

    const response = await fetch(`${baseUrl}/orders/${orderId}`, {
      headers: {
        'x-client-id': appId!,
        'x-client-secret': secretKey!,
        'x-api-version': '2023-08-01'
      }
    });

    const data: any = await response.json();

    if (data.order_status === 'PAID') {
      const customerId = data.customer_details.customer_id;
      const planId = data.order_tags?.planId || 'pro_plan';
      const billingCycle = data.order_tags?.billingCycle || 'monthly';

      const planSnap = await firebase.db.collection("plans").doc(planId).get();
      const planData = planSnap.exists ? planSnap.data() : { monthlyCredits: 500, name: 'Pro' };
      const planCredits = planData.monthlyCredits ?? planData.credits ?? 500;

      const userRef = firebase.db.collection("users").doc(customerId);
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() : null;

      const expiryDate = new Date();
      if (billingCycle === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      else expiryDate.setMonth(expiryDate.getMonth() + 1);

      await userRef.update({
        subscriptionStatus: planId === 'free' ? 'free' : 'pro',
        activePlanId: planId,
        credits: planCredits,
        monthlyLimit: planCredits,
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(expiryDate),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await firebase.db.collection("orders").doc(data.order_id).set({
        orderId: data.order_id,
        userId: customerId,
        userEmail: data.customer_details.customer_email,
        planId: planId,
        planName: planData.name,
        amount: data.order_amount,
        currency: data.order_currency,
        status: 'completed',
        billingCycle: billingCycle,
        gateway: 'cashfree',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      if (userData?.referredBy) {
        await awardAffiliateCommission(customerId, data.order_amount, data.order_id, data.order_currency, userData.referredBy);
      }

      sendSuccessEmail(data.customer_details.customer_email, userData?.displayName || 'Creator', planData.name);

      return {
        status: 'PAID',
        orderId: data.order_id,
        planName: planData.name,
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
  }) {
    const { orderID, planId, billingCycle, customerId, customerEmail } = payload;
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const clientId = config?.paypal?.clientId || process.env.VITE_PAYPAL_CLIENT_ID;
    const clientSecret = config?.paypal?.clientSecret || process.env.PAYPAL_CLIENT_SECRET;
    const environment = config?.paypal?.environment || 'sandbox';

    const authUrl = environment === 'production' ? "https://api-m.paypal.com/v1/oauth2/token" : "https://api-m.sandbox.paypal.com/v1/oauth2/token";
    const captureUrl = environment === 'production' ? `https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture` : `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`;

    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
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
      const planSnap = await firebase.db.collection("plans").doc(planId).get();
      const planData = planSnap.exists ? planSnap.data() : { monthlyCredits: 500, name: 'Pro' };
      const planCredits = planData.monthlyCredits ?? planData.credits ?? 500;

      const userRef = firebase.db.collection("users").doc(customerId);
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() : null;

      const expiryDate = new Date();
      if (billingCycle === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      else expiryDate.setMonth(expiryDate.getMonth() + 1);

      await userRef.update({
        subscriptionStatus: planId === 'free' ? 'free' : 'pro',
        activePlanId: planId,
        credits: planCredits,
        monthlyLimit: planCredits,
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(expiryDate),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await firebase.db.collection("orders").doc(orderID).set({
        orderId: orderID,
        userId: customerId,
        userEmail: customerEmail,
        planId: planId,
        planName: planData.name,
        amount: captureData.purchase_units[0].payments.captures[0].amount.value,
        currency: captureData.purchase_units[0].payments.captures[0].amount.currency_code,
        status: 'completed',
        billingCycle: billingCycle,
        gateway: 'paypal',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      if (userData?.referredBy) {
        await awardAffiliateCommission(customerId, captureData.purchase_units[0].payments.captures[0].amount.value, orderID, captureData.purchase_units[0].payments.captures[0].amount.currency_code, userData.referredBy);
      }

      sendSuccessEmail(customerEmail, userData?.displayName || 'Creator', planData.name);

      return {
        status: 'COMPLETED',
        planName: planData.name
      };
    }

    throw new Error(`PayPal payment ${captureData.status}`);
  }
}
