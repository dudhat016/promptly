import { Router, json } from "express";
import { initFirebase } from "../lib/firebase";
import { getStripe } from "../lib/stripe";
import { awardAffiliateCommission, sendSuccessEmail } from "../lib/payouts";
import admin from "firebase-admin";

const router = Router();

// Cashfree Integration
router.post("/cashfree/create-order", json(), async (req, res) => {
  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
    const { amount, currency, customerId, customerEmail, customerPhone } = req.body;
    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const appId = config?.cashfree?.appId || process.env.CASHFREE_APP_ID;
    const secretKey = config?.cashfree?.secretKey || process.env.CASHFREE_SECRET_KEY;
    const environment = config?.cashfree?.environment || process.env.CASHFREE_ENV || 'sandbox';

    if (!appId || !secretKey) return res.status(400).json({ error: "Cashfree credentials missing" });

    const baseUrl = environment === 'production' ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        order_amount: amount,
        order_currency: currency || "INR",
        customer_details: {
          customer_id: customerId,
          customer_email: customerEmail,
          customer_phone: customerPhone
        },
        order_meta: {
          return_url: `${(process.env.APP_URL || 'http://localhost:5173').replace('http://', 'https://')}/checkout/verify?order_id={order_id}`
        },
        order_tags: {
          planId: req.body.planId || 'pro_plan',
          billingCycle: req.body.billingCycle || 'monthly'
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to create Cashfree order");

    res.json({ payment_session_id: data.payment_session_id, environment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generic Payment Verification
router.get("/verify", async (req, res) => {
  const { order_id } = req.query;
  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const appId = config?.cashfree?.appId || process.env.CASHFREE_APP_ID;
    const secretKey = config?.cashfree?.secretKey || process.env.CASHFREE_SECRET_KEY;
    const environment = config?.cashfree?.environment || process.env.CASHFREE_ENV || 'sandbox';

    const baseUrl = environment === 'production' ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

    const response = await fetch(`${baseUrl}/orders/${order_id}`, {
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01'
      }
    });

    const data = await response.json();

    if (data.order_status === 'PAID') {
      const customerId = data.customer_details.customer_id;
      const planId = data.order_tags?.planId || 'pro_plan';
      const billingCycle = data.order_tags?.billingCycle || 'monthly';

      const planSnap = await firebase.db.collection("plans").doc(planId).get();
      const planData = planSnap.exists ? planSnap.data() : { credits: 500, name: 'Pro' };
      const creditsToAdd = planData.credits || 0;

      const userRef = firebase.db.collection("users").doc(customerId);
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() : null;

      const expiryDate = new Date();
      if (billingCycle === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      else expiryDate.setMonth(expiryDate.getMonth() + 1);

      await userRef.update({
        subscriptionStatus: planId === 'free' ? 'free' : 'pro',
        activePlanId: planId,
        credits: (userData?.credits || 0) + creditsToAdd,
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

      return res.json({
        status: 'PAID',
        planName: planData.name,
        creditsAdded: creditsToAdd,
        redirectUrl: `/checkout/success?order_id=${data.order_id}`
      });
    }

    res.json({ status: data.order_status, message: "Payment pending or failed" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PayPal Integration
router.post("/paypal/verify", async (req, res) => {
  const { orderID, planId, billingCycle, customerId, customerEmail } = req.body;
  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
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
    const captureData = await captureRes.json();

    if (captureData.status === 'COMPLETED') {
      const planSnap = await firebase.db.collection("plans").doc(planId).get();
      const planData = planSnap.exists ? planSnap.data() : { credits: 500, name: 'Pro' };
      const creditsToAdd = planData.credits || 0;

      const userRef = firebase.db.collection("users").doc(customerId);
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() : null;

      const expiryDate = new Date();
      if (billingCycle === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      else expiryDate.setMonth(expiryDate.getMonth() + 1);

      await userRef.update({
        subscriptionStatus: planId === 'free' ? 'free' : 'pro',
        activePlanId: planId,
        credits: (userData?.credits || 0) + creditsToAdd,
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(expiryDate),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Save Order Record
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

      return res.json({
        status: 'COMPLETED',
        planName: planData.name,
        redirectUrl: `/checkout/success?order_id=${orderID}`
      });
    }

    res.status(400).json({ status: captureData.status, message: "Payment failed" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
