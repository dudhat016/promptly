var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// vite.config.ts
var vite_config_exports = {};
__export(vite_config_exports, {
  default: () => vite_config_default
});
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
var vite_config_default;
var init_vite_config = __esm({
  "vite.config.ts"() {
    vite_config_default = defineConfig(({ mode }) => {
      const env = loadEnv(mode, ".", "");
      return {
        plugins: [react(), tailwindcss()],
        define: {
          "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY)
        },
        resolve: {
          alias: {
            "@": path.resolve(process.cwd(), ".")
          }
        },
        server: {
          proxy: {
            "/api": {
              target: "http://localhost:3000",
              changeOrigin: true,
              rewrite: (path3) => path3
            }
          },
          // HMR is disabled in AI Studio via DISABLE_HMR env var.
          // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
          hmr: process.env.DISABLE_HMR !== "true"
        }
      };
    });
  }
});

// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path2 from "path";
import fs from "fs";
import dotenv from "dotenv";
import Stripe from "stripe";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";
dotenv.config();
console.log("\u{1F50D} [Diagnostic] .env file exists:", fs.existsSync(path2.join(process.cwd(), ".env")));
console.log("\u{1F50D} [Diagnostic] FIREBASE_SERVICE_ACCOUNT defined:", !!process.env.FIREBASE_SERVICE_ACCOUNT);
var serviceAccountPath = path2.join(process.cwd(), "service-account.json");
if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    console.log("\u2705 Firebase Admin initialized with service-account.json");
  } catch (e) {
    console.error("\u274C Firebase Admin Init Error (File):", e.message);
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    console.log("\u2705 Firebase Admin initialized with Service Account ENV");
  } catch (e) {
    console.error("\u274C Firebase Admin Init Error (ENV):", e.message);
  }
} else {
  try {
    const configPath = path2.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      admin.initializeApp({
        projectId: config.projectId
      });
      console.log("\u26A0\uFE0F Firebase Admin initialized in fallback mode (No Service Account)");
    }
  } catch (e) {
    console.warn("Could not initialize Firebase Admin fallback:", e);
  }
}
var app = express();
var PORT = 3e3;
var stripeInstance = null;
function getStripe() {
  if (!stripeInstance && process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-01-27.acacia"
    });
  }
  return stripeInstance;
}
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
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    if (userId && admin.apps.length > 0) {
      const db = getFirestore("ai-studio-144262e8-b62f-4b6d-801f-f5b7a636cc0e");
      await db.collection("users").doc(userId).update({
        subscriptionStatus: "pro",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`User ${userId} upgraded to PRO`);
    }
  }
  res.json({ received: true });
});
app.use(express.json({ limit: "10mb" }));
app.get("/ping", (req, res) => {
  res.send("PONG - Server is Alive!");
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
app.post("/api/upload-avatar", async (req, res) => {
  const { image, userId } = req.body;
  if (!image || !userId) {
    return res.status(400).json({ error: "Missing image or userId" });
  }
  try {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const publicDir = path2.join(process.cwd(), "public");
    const avatarsDir = path2.join(publicDir, "avatars");
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }
    const fileName = `${userId}-${Date.now()}.png`;
    const filePath = path2.join(avatarsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    const imageUrl = `/avatars/${fileName}`;
    res.json({ url: imageUrl });
  } catch (err) {
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
          quantity: 1
        }
      ],
      mode: "subscription",
      success_url: `${process.env.APP_URL}/dashboard?status=success`,
      cancel_url: `${process.env.APP_URL}/pricing`,
      customer_email: userEmail,
      metadata: {
        userId
      }
    });
    res.json({ id: session.id, url: session.url });
  } catch (err) {
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
    if (config?.provider !== "smtp") {
      return res.status(400).json({ error: "SMTP provider not active" });
    }
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: parseInt(config.smtpPort),
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass
      },
      connectionTimeout: 1e4,
      // 10 seconds
      greetingTimeout: 1e4,
      // 10 seconds
      socketTimeout: 1e4
      // 10 seconds
    });
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: config.fromEmail,
      subject: "\u{1F680} SMTP Connection Test - Success!",
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
      `
    });
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error("SMTP Test Error:", err);
    res.status(500).json({ error: err.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const viteConfigModule = await Promise.resolve().then(() => (init_vite_config(), vite_config_exports));
    const viteConfigFn = viteConfigModule.default;
    const viteConfig = typeof viteConfigFn === "function" ? await viteConfigFn({ mode: "development", command: "serve" }) : viteConfigFn;
    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      server: { middlewareMode: true, ...viteConfig.server },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path2.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path2.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
