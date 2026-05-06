import dotenv from "dotenv";
import express from "express";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import nodemailer from "nodemailer";
import path from "path";
import Stripe from "stripe";

dotenv.config();

import * as ftp from "basic-ftp";
import multiparty from "multiparty";

// Initialize Firebase Admin
const initFirebase = async () => {
  try {
    if (admin.apps.length > 0) {
      return {
        db: getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)'),
        auth: admin.auth()
      };
    }

    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountVar) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is missing");
    }

    const cleanVar = serviceAccountVar.trim().replace(/^["']|["']$/g, '');
    let serviceAccount: any;

    // Step 1: Parse the service account (JSON or Base64)
    if (cleanVar.startsWith('{')) {
      serviceAccount = JSON.parse(cleanVar);
    } else {
      const decoded = Buffer.from(cleanVar, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    }

    // Step 2: Fix private_key only if it contains literal \n (not real newlines)
    if (serviceAccount.private_key && !serviceAccount.private_key.includes('\n')) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    // Step 3: Initialize
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    // Neural Sweeper: Background Task to clean up expired subscriptions (Gap #1)
    setInterval(async () => {
      console.log("🧹 [Neural Sweeper] Starting daily subscription audit...");
      try {
        const db = getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)');
        const now = admin.firestore.Timestamp.now();
        
        const expiredUsers = await db.collection("users")
          .where("subscriptionStatus", "==", "pro")
          .where("currentPeriodEnd", "<", now)
          .get();

        if (expiredUsers.empty) {
          console.log("✅ [Neural Sweeper] No expired subscriptions found.");
          return;
        }

        const batch = db.batch();
        expiredUsers.docs.forEach(doc => {
          console.log(`📉 [Neural Sweeper] Demoting user ${doc.id} (Subscription Expired)`);
          batch.update(doc.ref, {
            subscriptionStatus: "free",
            activePlanId: "free",
            credits: 5, // Reset to base limit
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });

        await batch.commit();
        console.log(`✅ [Neural Sweeper] Successfully processed ${expiredUsers.size} demotions.`);
      } catch (err) {
        console.error("❌ [Neural Sweeper] Audit Error:", err);
      }
    }, 24 * 60 * 60 * 1000); // Run every 24 hours

    return {
      db: getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)'),
      auth: admin.auth()
    };
  } catch (e: any) {
    console.error("❌ Firebase Admin Init Error:", e.message);
    return null;
  }
};

// Auto-run init
initFirebase();

// Initialize Stripe
let stripeInstance: Stripe | null = null;
function getStripe() {
  if (!stripeInstance && process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
    });
  }
  return stripeInstance;
}

const app = express();
const PORT = 3001; // Match the port in your Vite proxy

// API Routes
app.get("/ping", (req, res) => {
  res.send("PONG - Server is Alive!");
});

app.get("/api/location", async (req, res) => {
  try {
    const response = await fetch('http://ip-api.com/json/');
    if (!response.ok) {
      throw new Error(`ip-api failed with ${response.status}`);
    }
    const data = await response.json();
    
    // Map ip-api format to what our frontend expects (or just pass everything)
    res.json({
      ...data,
      country: data.countryCode // ipapi.co used 'country', ip-api uses 'countryCode'
    });
  } catch (err: any) {
    console.error("Backend Location Error:", err.message);
    res.status(500).json({ error: "Failed to detect location", message: err.message });
  }
});

app.get("/api/health", async (req, res) => {
  const firebase = await initFirebase();
  res.json({
    status: "ok",
    firebase: firebase ? "connected" : "failed"
  });
});

// Stripe Webhook (needs raw body)
app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !sig || !webhookSecret) {
    return res.status(400).send("Webhook configuration missing");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;
    const firebase = await initFirebase();

    if (userId && firebase) {
      await firebase.db.collection("users").doc(userId).update({
        subscriptionStatus: "pro",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ User ${userId} upgraded to PRO`);
    }
  }
  res.json({ received: true });
});

// Email Test Route
app.post("/api/test-email", async (req, res) => {
  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
    const configSnap = await firebase.db.collection("configs").doc("email").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const smtpHost = config?.smtpHost || process.env.SMTP_HOST;
    const smtpPort = parseInt(config?.smtpPort || process.env.SMTP_PORT || "465");
    const smtpSecure = config?.smtpSecure !== undefined ? config.smtpSecure : (process.env.SMTP_SECURE === 'true');
    const smtpUser = config?.smtpUser || process.env.SMTP_USER;
    const smtpPass = config?.smtpPass || process.env.SMTP_PASS;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"${config?.fromName}" <${config?.fromEmail}>`,
      to: config?.fromEmail,
      subject: "🚀 SMTP Connection Test",
      text: "Connection Success!"
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/upload-ftp", async (req, res) => {
  const form = new multiparty.Form();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Failed to parse upload" });

    const { folder = "" } = fields;
    const subfolder = folder?.[0] || "";
    const file = files.file;

    if (file && !file[0]) return res.status(400).json({ error: "No file uploaded" });
    const uploadFile = file[0];

    try {
      await initFirebase();
    } catch (dbErr: any) {
      return res.status(500).json({ error: dbErr.message });
    }

    const db = getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)');
    const configSnap = await db.collection('configs').doc('ftp').get();
    const config = configSnap.exists ? configSnap.data() : null;

    if (config && !config.enabled) {
      return res.status(400).json({ error: "FTP Storage is disabled in settings." });
    }

    const ftpHost = config?.host || process.env.FTP_SERVER;
    const ftpUser = config?.username || process.env.FTP_USERNAME;
    const ftpPass = config?.password || process.env.FTP_PASSWORD;
    let ftpPath = config?.path || process.env.FTP_FOLDER || "promptly/public/";
    const ftpEndpoint = config?.endpoint || "https://techworldproduct.com/promptly/public/";

    // Add subfolder to path and endpoint
    if (subfolder) {
      ftpPath = `${ftpPath.endsWith('/') ? ftpPath : ftpPath + '/'}${subfolder}/`;
    }

    // PATH SANITY CHECK: Prevent double public_html
    if (ftpPath.startsWith('public_html/public_html/')) {
      ftpPath = ftpPath.replace('public_html/public_html/', 'public_html/');
    }
    // If it starts with public_html/ and we are already in public_html, remove it
    // But since we confirmed PWD is public_html, any path starting with public_html/ is redundant
    if (ftpPath.startsWith('public_html/')) {
      ftpPath = ftpPath.replace('public_html/', '');
    }

    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: ftpHost,
        user: ftpUser,
        password: ftpPass,
        secure: false
      });

      await client.ensureDir(ftpPath);

      // Atomic Sanitization: Whitelist ONLY alphanumeric, dots, and underscores
      const originalName = path.basename(uploadFile.originalFilename).trim();
      const safeName = originalName
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, '_')// Replace EVERYTHING that isn't a letter, number, or dot with _
        .replace(/_{2,}/g, '_')// Collapse multiple underscores
        .replace(/^_+|_+$/g, '');// Trim underscores from ends

      const fileName = safeName;

      await client.uploadFrom(uploadFile.path, fileName);

      // Construct final public URL with subfolder and encoding insurance
      const baseUrl = ftpEndpoint.endsWith('/') ? ftpEndpoint : ftpEndpoint + '/';
      const finalEndpoint = subfolder ? `${baseUrl}${subfolder}/` : baseUrl;
      const publicUrl = encodeURI(`${finalEndpoint}${fileName}`);

      res.json({ success: true, url: publicUrl });
    } catch (ftpErr: any) {
      console.error("FTP Upload Error:", ftpErr);
      let errorMsg = ftpErr.message;

      if (ftpErr.code === 'ETIMEDOUT') {
        errorMsg = "Connection timed out. Please check if the FTP host is correct and not blocked by a firewall.";
      } else if (errorMsg.includes("530")) {
        errorMsg = "Login incorrect. Please verify your FTP username and password in the Hostinger panel.";
      }

      res.status(500).json({ error: `FTP Error: ${errorMsg}` });
    } finally {
      client.close();
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
  });
});

// Cashfree Integration
app.post("/api/payments/cashfree/create-order", express.json(), async (req, res) => {
  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
    const { amount, currency, customerId, customerEmail, customerPhone } = req.body;
    
    // Fetch Config from Firestore
    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;
    
    const appId = config?.cashfree?.appId || process.env.CASHFREE_APP_ID;
    const secretKey = config?.cashfree?.secretKey || process.env.CASHFREE_SECRET_KEY;
    const environment = config?.cashfree?.environment || process.env.CASHFREE_ENV || 'sandbox';

    if (!appId || !secretKey) {
      return res.status(400).json({ error: "Cashfree credentials missing" });
    }

    const baseUrl = environment === 'production' 
      ? "https://api.cashfree.com/pg" 
      : "https://sandbox.cashfree.com/pg";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
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

    clearTimeout(timeoutId);

    const data = await response.json();
    console.log("Cashfree Order Response:", JSON.stringify(data, null, 2));
    if (!response.ok) throw new Error(data.message || "Failed to create Cashfree order");

    res.json({ 
      payment_session_id: data.payment_session_id,
      environment: environment
    });
  } catch (err: any) {
    console.error("Cashfree Order Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Generic Payment Verification
app.get("/api/payments/verify", async (req, res) => {
  const { order_id } = req.query;
  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;

    // Check Cashfree Order
    const appId = config?.cashfree?.appId || process.env.CASHFREE_APP_ID;
    const secretKey = config?.cashfree?.secretKey || process.env.CASHFREE_SECRET_KEY;
    const environment = config?.cashfree?.environment || process.env.CASHFREE_ENV || 'sandbox';

    const baseUrl = environment === 'production' 
      ? "https://api.cashfree.com/pg" 
      : "https://sandbox.cashfree.com/pg";

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
      
      // 1. Fetch Plan Details from Firestore
      const planSnap = await firebase.db.collection("plans").doc(planId).get();
      const planData = planSnap.exists ? planSnap.data() : { credits: 500, name: 'Pro' };
      const creditsToAdd = planData.credits || 0;

      // 2. Provision Subscription & Credits
      const userRef = firebase.db.collection("users").doc(customerId);
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() : null;

      // Calculate Expiry (Gap #2)
      const expiryDate = new Date();
      if (billingCycle === 'yearly') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      }

      await userRef.update({
        subscriptionStatus: planId === 'free' ? 'free' : 'pro', 
        activePlanId: planId,
        credits: (userData?.credits || 0) + creditsToAdd,
        subscriptionExpiryDate: admin.firestore.FieldValue.serverTimestamp(), // Placeholder for now, we'll use actual date next
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(expiryDate),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 3. Create Order Record (The Paper Trail)
      const orderData = {
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
      };
      await firebase.db.collection("orders").doc(data.order_id).set(orderData);

      // 4. Create Payment Record (For Accounting)
      await firebase.db.collection("payments").add({
        orderId: data.order_id,
        transactionId: data.cf_order_id,
        userId: customerId,
        amount: data.order_amount,
        currency: data.order_currency,
        status: 'SUCCESS',
        method: 'cashfree',
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 5. Calculate & Award Affiliate Commission (Gap #1)
      if (userData?.referredBy) {
        const referrerSnap = await firebase.db.collection("users")
          .where("referralCode", "==", userData.referredBy)
          .limit(1)
          .get();
        
        if (!referrerSnap.empty) {
          const referrerDoc = referrerSnap.docs[0];
          const commissionAmount = Number(data.order_amount) * 0.25;
          
          await referrerDoc.ref.update({
            affiliateEarnings: admin.firestore.FieldValue.increment(commissionAmount),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Log Referral Commission
          await firebase.db.collection("referral_commissions").add({
            referrerId: referrerDoc.id,
            buyerId: customerId,
            orderId: data.order_id,
            amount: commissionAmount,
            currency: data.order_currency,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      // 6. Send Success Email (Gap #5)
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
    console.error("Verification Error:", err);
    res.status(500).json({ error: err.message });
  }
});

async function sendSuccessEmail(email: string, name: string, planName: string) {
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
                <li>Explore the <a href="${process.env.APP_URL || 'https://promptly.com'}/vault" style="color: #4f46e5;">Premium Vault</a></li>
                <li>Set up your <a href="${process.env.APP_URL || 'https://promptly.com'}/settings" style="color: #4f46e5;">Creator Profile</a></li>
                <li>Start earning via our <a href="${process.env.APP_URL || 'https://promptly.com'}/affiliate" style="color: #4f46e5;">Affiliate Program</a></li>
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

app.post("/api/payments/paypal/verify", async (req, res) => {
  const { orderID, planId, billingCycle, customerId, customerEmail } = req.body;
  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
    const configSnap = await firebase.db.collection("configs").doc("payment").get();
    const config = configSnap.exists ? configSnap.data() : null;

    const clientId = config?.paypal?.clientId || process.env.VITE_PAYPAL_CLIENT_ID;
    const clientSecret = config?.paypal?.clientSecret || process.env.PAYPAL_CLIENT_SECRET;
    const environment = config?.paypal?.environment || 'sandbox';

    const authUrl = environment === 'production' 
      ? "https://api-m.paypal.com/v1/oauth2/token" 
      : "https://api-m.sandbox.paypal.com/v1/oauth2/token";

    const captureUrl = environment === 'production'
      ? `https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`
      : `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`;

    // 1. Get Access Token
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    const { access_token } = await authRes.json();

    // 2. Capture Order
    const captureRes = await fetch(captureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      }
    });
    const captureData = await captureRes.json();

    if (captureData.status === 'COMPLETED') {
      // 3. Provision
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

      // 4. Log Order & Payment
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

      // 5. Send Email
      sendSuccessEmail(customerEmail, userData?.displayName || 'Creator', planData.name);

      return res.json({ 
        status: 'COMPLETED', 
        planName: planData.name,
        redirectUrl: `/checkout/success?order_id=${orderID}`
      });
    }

    res.status(400).json({ status: captureData.status, message: "Payment failed" });
  } catch (err: any) {
    console.error("PayPal Verify Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { email } = req.body;
  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
    const link = await firebase.auth.generatePasswordResetLink(email, {
      url: process.env.APP_URL || 'http://localhost:5173/login'
    });

    const configSnap = await firebase.db.collection("configs").doc("email").get();
    if (configSnap.exists) {
      const config = configSnap.data();
      if (config?.provider === 'smtp') {
        const transporter = nodemailer.createTransport({
          host: config.smtpHost,
          port: parseInt(config.smtpPort),
          secure: config.smtpSecure,
          auth: { user: config.smtpUser, pass: config.smtpPass }
        });

        await transporter.sendMail({
          from: `"${config.fromName}" <${config.fromEmail}>`,
          to: email,
          subject: "🔐 Secure Your Promptly Account",
          html: `
            <div style="font-family: sans-serif; padding: 40px; background: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 24px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                <h1 style="color: #4f46e5; margin-bottom: 24px;">Reset Your Password</h1>
                <p style="font-size: 16px; line-height: 1.6; color: #475569;">We received a request to reset your password. Click the button below to secure your account:</p>
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${link}" style="background: #4f46e5; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">Secure My Account</a>
                </div>
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
              </div>
            </div>
          `
        });
      }
    }

    res.json({ message: "Reset link sent successfully" });
  } catch (err: any) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/test-email", async (req, res) => {
  if (admin.apps.length === 0) {
    return res.status(500).json({ error: "Firebase Admin is not connected. Please set FIREBASE_SERVICE_ACCOUNT in your .env file." });
  }

  const db = getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)');
  try {
    const configSnap = await db.collection("configs").doc("email").get();
    if (!configSnap.exists) {
      return res.status(404).json({ error: "Email configuration not found" });
    }

    const config = configSnap.data();
    if (config?.provider !== 'smtp') {
      return res.status(400).json({ error: "SMTP provider not active" });
    }

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: parseInt(config.smtpPort),
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,   // 10 seconds
      socketTimeout: 10000,     // 10 seconds
    });

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: config.fromEmail,
      subject: "🚀 SMTP Connection Test - Success!",
      text: "Your SMTP connection is working perfectly. You are now ready to send marketing emails.",
      html: `
        <div style="font-family: sans-serif; padding: 40px; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 24px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
            <h1 style="color: #4f46e5; margin-bottom: 24px;">Connection Success!</h1>
            <p style="font-size: 16px; line-height: 1.6; color: #475569;">Your Hostinger SMTP connection is active and secured. You are now ready to engage your users through the Promptly marketing engine.</p>
            <div style="margin-top: 32px; padding-top: 32px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px; text-align: center;">
              Sent via Promptly AI Control Tower
            </div>
          </div>
        </div>
      `,
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    console.error("SMTP Test Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// For development, we'll setup Vite
async function startServer() {
/*
  if (process.env.NODE_ENV !== "production") {
    const { pathToFileURL } = await import("url");
    const configPath = path.resolve(process.cwd(), "vite.config.ts");
    const viteConfigModule = await import(pathToFileURL(configPath).href);
    const viteConfigFn = viteConfigModule.default;
    const viteConfig = typeof viteConfigFn === "function" ? await viteConfigFn({ mode: "development", command: "serve" }) : viteConfigFn;
    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      server: { middlewareMode: true, ...viteConfig.server },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
*/
    const distPath = path.join(process.cwd(), "dist");

    // --- DYNAMIC SEO SITEMAP (Gap #2) ---
    app.get("/sitemap.xml", async (req, res) => {
      try {
        const db = getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)');
        const promptsSnap = await db.collection("prompts").where("status", "==", "published").get();
        
        const baseUrl = process.env.VITE_SITE_URL || 'https://promptly.ai';
        const urls = promptsSnap.docs.map(doc => {
          const data = doc.data();
          return `
      <url>
        <loc>${baseUrl}/prompt/${data.slug}</loc>
        <lastmod>${new Date(data.updatedAt?.seconds * 1000 || Date.now()).toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
      </url>`;
        });

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>${baseUrl}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>
      <url>
        <loc>${baseUrl}/explore</loc>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
      </url>
      ${urls.join('')}
    </urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(sitemap);
      } catch (err) {
        console.error("Sitemap Error:", err);
        res.status(500).send("Error generating sitemap");
      }
    });

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
//  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Warm up the Firebase connection
    initFirebase().then(res => {
      if (res) console.log("✅ Firebase Warm-up Successful");
      else console.error("❌ Firebase Warm-up Failed");
    });
  });
}

startServer();
