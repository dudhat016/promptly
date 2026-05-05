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

    let serviceAccount;
    const cleanVar = serviceAccountVar.trim();
    
    try {
      const sanitized = cleanVar.replace(/\\n/g, '\\n');
      serviceAccount = JSON.parse(sanitized);
    } catch (e) {
      try {
        const base64Clean = cleanVar.replace(/\s/g, '');
        const decoded = Buffer.from(base64Clean, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      } catch (innerError: any) {
        // ULTIMATE FALLBACK: Regex Extraction
        try {
          const extract = (key: string) => {
            const match = cleanVar.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
            return match ? match[1] : null;
          };
          
          serviceAccount = {
            project_id: extract('project_id'),
            private_key: extract('private_key')?.replace(/\\n/g, '\n'),
            client_email: extract('client_email'),
            type: 'service_account'
          };
          
          if (!serviceAccount.project_id || !serviceAccount.private_key) {
            throw new Error("Regex extraction failed");
          }
        } catch (regexError) {
          throw new Error(`Firebase Config Error: ${innerError.message}`);
        }
      }
    }

    // Robust Private Key Reconstruction
    if (serviceAccount && serviceAccount.private_key) {
      const rawKey = serviceAccount.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/\s/g, "");
      const wrappedKey = rawKey.match(/.{1,64}/g)?.join("\n");
      serviceAccount.private_key = `-----BEGIN PRIVATE KEY-----\n${wrappedKey}\n-----END PRIVATE KEY-----\n`;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

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
