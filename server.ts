import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import Stripe from "stripe";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

// Load env vars
dotenv.config();

console.log("🔍 [Diagnostic] .env file exists:", fs.existsSync(path.join(process.cwd(), '.env')));
console.log("🔍 [Diagnostic] FIREBASE_SERVICE_ACCOUNT defined:", !!process.env.FIREBASE_SERVICE_ACCOUNT);

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), 'service-account.json');

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    console.log("✅ Firebase Admin initialized with service-account.json");
  } catch (e: any) {
    console.error("❌ Firebase Admin Init Error (File):", e.message);
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    // Fix potential private key formatting issues from ENV vars
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    console.log("✅ Firebase Admin initialized with Service Account ENV");
  } catch (e: any) {
    console.error("❌ Firebase Admin Init Error (ENV):", e.message);
  }
} else {
  // Fallback for local development if possible
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      admin.initializeApp({
        projectId: config.projectId
      });
      console.log("⚠️ Firebase Admin initialized in fallback mode (No Service Account)");
    }
  } catch (e) {
    console.warn("Could not initialize Firebase Admin fallback:", e);
  }
}

const app = express();
const PORT = 3000;

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

// Special middleware for Stripe Webhooks (needs raw body)
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
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (userId && admin.apps.length > 0) {
      const db = getFirestore("ai-studio-144262e8-b62f-4b6d-801f-f5b7a636cc0e");
      await db.collection("users").doc(userId).update({
        subscriptionStatus: "pro",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`User ${userId} upgraded to PRO`);
    }
  }

  res.json({ received: true });
});

// Increased limit for base64 image uploads
app.use(express.json({ limit: '10mb' }));

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Temporary Avatar Upload Endpoint (saves to /public/avatars)
app.post("/api/upload-avatar", async (req, res) => {
  const { image, userId } = req.body;
  if (!image || !userId) {
    return res.status(400).json({ error: "Missing image or userId" });
  }

  try {
    // Extract base64 content
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    const publicDir = path.join(process.cwd(), "public");
    const avatarsDir = path.join(publicDir, "avatars");
    
    // Ensure directory exists
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    const fileName = `${userId}-${Date.now()}.png`;
    const filePath = path.join(avatarsDir, fileName);
    
    // Save file locally
    fs.writeFileSync(filePath, buffer);
    
    const imageUrl = `/avatars/${fileName}`;
    res.json({ url: imageUrl });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/create-checkout-session", async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(500).json({ error: "Stripe not configured" });
  }

  const { priceId, userId, userEmail } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.APP_URL}/dashboard?status=success`,
      cancel_url: `${process.env.APP_URL}/pricing`,
      customer_email: userEmail,
      metadata: {
        userId: userId,
      },
    });

    res.json({ id: session.id, url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/test-email", async (req, res) => {
  if (admin.apps.length === 0) {
    return res.status(500).json({ error: "Firebase Admin is not connected. Please set FIREBASE_SERVICE_ACCOUNT in your .env file." });
  }

  const db = getFirestore("ai-studio-144262e8-b62f-4b6d-801f-f5b7a636cc0e");
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
  if (process.env.NODE_ENV !== "production") {
    const viteConfigModule = await import("./vite.config.ts");
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
