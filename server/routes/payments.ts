import { Router, json } from "express";
import crypto from "crypto";
import { getLangUrl } from "../lib/config.js";
import { initFirebase } from "../lib/firebase.js";
import { PaymentService } from "../services/paymentService.js";
import { SubscriptionService } from "../services/subscriptionService.js";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// Cashfree Integration
router.post("/cashfree/create-order", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
    const { amount, currency, customerId, customerEmail, customerPhone } = req.body;

    // Security: Ensure the user can only create orders for themselves
    if (req.user?.uid !== customerId) {
      return res.status(403).json({ error: "Unauthorized order creation" });
    }

    // Cashfree requires order_amount as a number with at most 2 decimal places
    const parsedAmount = parseFloat(Number(amount).toFixed(2));
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid payment amount" });
    }

    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const appId = config?.cashfree?.appId || process.env.CASHFREE_APP_ID;
    const secretKey = config?.cashfree?.secretKey || process.env.CASHFREE_SECRET_KEY;
    const environment = config?.cashfree?.environment || process.env.CASHFREE_ENV || 'sandbox';

    if (!appId || !secretKey) return res.status(400).json({ error: "Cashfree credentials missing" });

    // Cashfree's JS checkout SDK always renders via api.cashfree.com regardless of mode.
    // Orders must be created on the same host; use api.cashfree.com for both test and live.
    const baseUrl = "https://api.cashfree.com/pg";

    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        order_amount: parsedAmount,
        order_currency: currency || "INR",
        customer_details: {
          customer_id: customerId,
          customer_email: customerEmail,
          customer_phone: customerPhone
        },
        order_meta: {
          return_url: `${getLangUrl('/checkout/verify')}?order_id={order_id}`
        },
        order_tags: {
          planId: req.body.planId || 'pro_plan',
          billingCycle: req.body.billingCycle || 'monthly'
        }
      })
    });

    const data: any = await response.json();
    if (!response.ok) throw new Error(data.message || data.type || JSON.stringify(data) || "Failed to create Cashfree order");

    res.json({ payment_session_id: data.payment_session_id, environment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generic Payment Verification
router.get("/verify", async (req, res) => {
  const { order_id } = req.query;
  if (!order_id) return res.status(400).json({ error: "Order ID is required" });

  try {
    const result = await PaymentService.verifyCashfreePayment(order_id as string);
    if (result.status === 'PAID') {
      return res.json({
        ...result,
        redirectUrl: `/checkout/success?order_id=${result.orderId}`
      });
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PayPal Integration
router.post("/paypal/verify", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { customerId } = req.body;

  // Security check
  if (req.user?.uid !== customerId) {
    return res.status(403).json({ error: "Unauthorized payment verification" });
  }

  try {
    const result = await PaymentService.verifyPaypalPayment(req.body);
    res.json({
      ...result,
      redirectUrl: `/checkout/success?order_id=${req.body.orderID}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Subscription Routes ───────────────────────────────────────────────────────

// Cashfree: Create subscription (auto-pay)
router.post("/cashfree/create-subscription", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const { customerId, customerEmail, customerPhone, customerName, planId, billingCycle, amount, currency } = req.body;

  if (req.user?.uid !== customerId) return res.status(403).json({ error: "Unauthorized" });

  try {
    const result = await SubscriptionService.createCashfreeSubscription({
      customerId, customerEmail, customerPhone, customerName, planId, billingCycle,
      amount: parseFloat(Number(amount).toFixed(2)),
      currency: currency || 'INR'
    });
    res.json(result);
  } catch (err: any) {
    console.error('[create-subscription] error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// Generic subscription verify (handles both cashfree and paypal subscription IDs)
router.get("/verify-subscription", async (req, res) => {
  const { subscription_id, paypal_sub_id, user_id } = req.query;
  if (!subscription_id) return res.status(400).json({ error: "subscription_id required" });

  try {
    const subId = subscription_id as string;

    if (subId.startsWith('PP_') && paypal_sub_id) {
      // PayPal subscription activation
      const uid = (subId.replace('PP_', '')) || (user_id as string);
      const result = await SubscriptionService.activatePaypalSubscription(paypal_sub_id as string, uid);
      return res.json(result);
    }

    // Cashfree subscription
    const result = await SubscriptionService.verifyCashfreeSubscription(subId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PayPal: Create subscription (auto-pay)
router.post("/paypal/create-subscription", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const { customerId, customerEmail, planId, billingCycle, amount } = req.body;

  if (req.user?.uid !== customerId) return res.status(403).json({ error: "Unauthorized" });

  try {
    const result = await SubscriptionService.createPaypalSubscription({
      customerId, customerEmail, planId, billingCycle, amount: parseFloat(amount)
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel subscription
router.post("/cancel-subscription", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const { customerId, subscriptionGateway, subscriptionId, paypalSubscriptionId } = req.body;

  if (req.user?.uid !== customerId) return res.status(403).json({ error: "Unauthorized" });

  try {
    if (subscriptionGateway === 'paypal' && paypalSubscriptionId) {
      await SubscriptionService.cancelPaypalSubscription(paypalSubscriptionId, customerId);
    } else if (subscriptionId) {
      await SubscriptionService.cancelCashfreeSubscription(subscriptionId, customerId);
    } else {
      // Manual cancel — just update Firestore
      const firebase = await initFirebase();
      if (firebase) {
        await firebase.db.collection("users").doc(customerId).update({
          cancelAtPeriodEnd: true,
          autoPayEnabled: false
        });
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Webhooks — raw body captured by express.json verify callback in server.ts
router.post("/webhook/cashfree", json(), async (req: any, res) => {
  try {
    // Cashfree signature: HMAC-SHA256(timestamp + rawBody, secretKey)
    const ts        = req.headers['x-webhook-timestamp'] as string;
    const signature = req.headers['x-webhook-signature'] as string;
    const rawBody   = req.rawBody || JSON.stringify(req.body);

    const firebase = await initFirebase();
    const configSnap = firebase ? await firebase.db.collection("configs").doc("payment").get() : null;
    const config = configSnap?.exists ? configSnap.data() : null;
    // Cashfree signs with the App Secret — no separate webhook secret needed
    const webhookSecret = config?.cashfree?.webhookSecret || process.env.CASHFREE_WEBHOOK_SECRET
      || config?.cashfree?.secretKey || process.env.CASHFREE_SECRET_KEY;

    if (webhookSecret && ts && signature) {
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(ts + rawBody)
        .digest('base64');
      if (expected !== signature) {
        console.warn('[Cashfree Webhook] Signature mismatch — rejected');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const result = await SubscriptionService.handleCashfreeWebhook(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("Cashfree webhook error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/webhook/paypal", json(), async (req: any, res) => {
  try {
    const result = await SubscriptionService.handlePaypalWebhook(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("PayPal webhook error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
