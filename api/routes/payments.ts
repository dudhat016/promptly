import { Router, json } from "express";
import { initFirebase } from "../lib/firebase";
import { PaymentService } from "../services/paymentService";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";

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

    const data: any = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to create Cashfree order");

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

export default router;
