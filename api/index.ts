import * as ftp from "basic-ftp";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import multiparty from "multiparty";
import nodemailer from "nodemailer";
import path from "path";
import Stripe from "stripe";

dotenv.config();

// Helper for Firebase
function initFirebase() {
  if (!admin.apps.length) {
    try {
      const saValue = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!saValue) return false;
      
      const cleanJson = saValue.trim().replace(/^'|'$/g, '').replace(/^"|"$/g, '');
      const serviceAccount = JSON.parse(cleanJson);
      
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key
          .split('\\n').join('\n')
          .replace(/\n\n/g, '\n')
          .trim();
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("✅ Firebase Admin Connected");
      return true;
    } catch (e: any) {
      console.error("❌ Firebase Init Error:", e.message);
      return false;
    }
  }
  return true;
}

// Helper for Stripe
function getStripe() {
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      return new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-12-18.acacia" as any,
      });
    } catch (e: any) {
      console.error("❌ Stripe Init Error:", e.message);
    }
  }
  return null;
}

const app = express();
app.use(express.json({ limit: '10mb' }));

// --- API Routes ---

app.get("/api/health", (req, res) => {
  const firebaseOk = initFirebase();
  res.json({ 
    status: "ok", 
    firebase: firebaseOk ? "connected" : "failed",
    platform: "vercel"
  });
});

app.post("/api/test-ftp", async (req, res) => {
  const config = req.body;
  console.log("🧪 Testing FTP Connection to:", config.host);
  const client = new ftp.Client();
  try {
    await client.access({
      host: config.host,
      port: parseInt(config.port) || 21,
      user: config.username,
      password: config.password,
      secure: false
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error("FTP Test Error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.close();
  }
});

app.post("/api/upload-ftp", async (req, res) => {
  const form = new multiparty.Form();
  
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Failed to parse upload" });
    
    const file = files.file?.[0];
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    if (!initFirebase()) {
      return res.status(500).json({ error: "Database connection failed" });
    }

    const db = getFirestore();
    const configSnap = await db.collection('configs').doc('ftp').get();
    const config = configSnap.exists ? configSnap.data() : null;

    if (config && !config.enabled) {
      return res.status(400).json({ error: "FTP Storage is disabled in settings." });
    }

    const ftpHost = config?.host || process.env.FTP_SERVER;
    const ftpUser = config?.username || process.env.FTP_USERNAME;
    const ftpPass = config?.password || process.env.FTP_PASSWORD;
    const ftpPath = config?.path || process.env.FTP_FOLDER || "public_html/promptly/public/";
    const ftpEndpoint = config?.endpoint || `http://${ftpHost?.replace("ftp.", "")}/promptly/public/`;

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
      const fileName = `${Date.now()}-${path.basename(file.originalFilename)}`;
      await client.uploadFrom(file.path, fileName);
      
      const publicUrl = `${ftpEndpoint.endsWith('/') ? ftpEndpoint : ftpEndpoint + '/'}${fileName}`;
      
      res.json({ 
        success: true, 
        url: publicUrl,
        name: file.originalFilename
      });
    } catch (ftpErr: any) {
      console.error("FTP Upload Error:", ftpErr);
      res.status(500).json({ error: `FTP Error: ${ftpErr.message}` });
    } finally {
      client.close();
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
  });
});

// Stripe Checkout Session
app.post("/api/create-checkout-session", async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: "Stripe not configured" });

  try {
    const { priceId, userId, userEmail } = req.body;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/pricing`,
      customer_email: userEmail,
      metadata: { userId },
    });
    res.json({ id: session.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
