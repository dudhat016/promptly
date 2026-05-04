import express from "express";
import Stripe from "stripe";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT && !admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin initialized");
  } catch (e: any) {
    console.error("❌ Firebase Admin Init Error:", e.message);
  }
}

// Initialize Stripe
let stripeInstance: Stripe | null = null;
function getStripe() {
  if (!stripeInstance && process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-01-27.acacia" as any,
    });
  }
  return stripeInstance;
}

// Standard middleware
app.use(express.json({ limit: '10mb' }));

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", platform: "vercel" });
});

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
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (userId && admin.apps.length > 0) {
      const db = getFirestore("ai-studio-144262e8-b62f-4b6d-801f-f5b7a636cc0e");
      await db.collection("users").doc(userId).update({
        subscriptionStatus: "pro",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  res.json({ received: true });
});

app.post("/api/test-email", async (req, res) => {
  if (admin.apps.length === 0) {
    return res.status(500).json({ error: "Firebase Admin is not connected." });
  }

  const db = getFirestore("ai-studio-144262e8-b62f-4b6d-801f-f5b7a636cc0e");
  try {
    const configSnap = await db.collection("configs").doc("email").get();
    if (!configSnap.exists) {
      return res.status(404).json({ error: "Email configuration not found" });
    }

    const config = configSnap.data();
    const transporter = nodemailer.createTransport({
      host: config?.smtpHost,
      port: parseInt(config?.smtpPort),
      secure: config?.smtpSecure,
      auth: {
        user: config?.smtpUser,
        pass: config?.smtpPass,
      }
    });

    await transporter.sendMail({
      from: `"${config?.fromName}" <${config?.fromEmail}>`,
      to: config?.fromEmail,
      subject: "🚀 Vercel Deployment Success!",
      text: "Your backend is now running on Vercel Serverless Functions."
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
