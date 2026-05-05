import * as ftp from "basic-ftp";
import * as dotenv from 'dotenv';
import express from "express";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import multiparty from "multiparty";
import nodemailer from "nodemailer";
import path from "path";
import Stripe from "stripe";

dotenv.config();

const app = express();

// Initialize Firebase Admin
let isFirebaseInitialized = false;

async function initFirebase() {
  if (isFirebaseInitialized) return;

  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountVar) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is not set in environment variables");
    }

    const cleanVar = serviceAccountVar.trim().replace(/^["']|["']$/g, '');
    let serviceAccount: any;

    // Step 1: Parse the service account (JSON or Base64)
    if (cleanVar.startsWith('{')) {
      // Raw JSON string
      serviceAccount = JSON.parse(cleanVar);
    } else {
      // Base64 encoded
      const decoded = Buffer.from(cleanVar, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    }

    // Step 2: Fix private_key only if it contains literal \n (not real newlines)
    if (serviceAccount.private_key && !serviceAccount.private_key.includes('\n')) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    // Step 3: Initialize Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    isFirebaseInitialized = true;
    console.log("✅ Firebase Admin initialized successfully");
  } catch (error: any) {
    console.error("❌ Firebase init failed:", error.message);
    throw error;
  }
}

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
};

// Middleware
app.use(express.json({ limit: '10mb' }));

// --- API Routes ---

app.get("/api/health", async (req, res) => {
  try {
    await initFirebase();
    res.json({
      status: "ok",
      firebase: "connected",
      platform: "vercel"
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      firebase: "failed",
      error: err.message,
      platform: "vercel"
    });
  }
});

app.post("/api/test-ftp", async (req, res) => {
  const config = req.body;
  console.log("🧪 Testing FTP Connection to:", config.host);
  const client = new ftp.Client();
  try {
    await client.access({
      host: config.host,
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

    const { folder = "" } = fields;
    const subfolder = folder?.[0] || "";
    const file = files.file?.[0];

    if (!file) return res.status(400).json({ error: "No file uploaded" });

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
    
    // Guard: Validate required FTP vars if not using DB config
    if (!config) {
      const missingFtpVars = [];
      if (!ftpHost) missingFtpVars.push('FTP_SERVER');
      if (!ftpUser) missingFtpVars.push('FTP_USERNAME');
      if (!ftpPass) missingFtpVars.push('FTP_PASSWORD');
      
      if (missingFtpVars.length > 0) {
        return res.status(500).json({ 
          error: `Missing FTP environment variables: ${missingFtpVars.join(', ')}`,
          tip: "Add these to Vercel Project Settings -> Environment Variables."
        });
      }
    }

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
      const originalName = path.basename(file.originalFilename).trim();
      const safeName = originalName
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, '_')// Replace EVERYTHING that isn't a letter, number, or dot with _
        .replace(/_{2,}/g, '_')// Collapse multiple underscores
        .replace(/^_+|_+$/g, '');// Trim underscores from ends

      const fileName = safeName;

      await client.uploadFrom(file.path, fileName);

      // Construct final public URL with subfolder
      const baseUrl = ftpEndpoint.endsWith('/') ? ftpEndpoint : ftpEndpoint + '/';
      const finalEndpoint = subfolder ? `${baseUrl}${subfolder}/` : baseUrl;
      const publicUrl = encodeURI(`${finalEndpoint}${fileName}`);

      res.json({
        success: true,
        url: publicUrl,
        name: file.originalFilename
      });
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

app.post("/api/test-email", async (req, res) => {
  try {
    await initFirebase();
    const db = getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)');
    const configSnap = await db.collection("configs").doc("email").get();
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
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'Promptly'}" <${smtpUser}>`,
      to: smtpUser,
      subject: "SMTP Configuration Test",
      text: "If you are reading this, your SMTP settings are working perfectly!",
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Email Test Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/create-checkout-session", async (req, res) => {
  const { priceId, userId, userEmail } = req.body;
  const stripe = getStripe();

  if (!stripe) return res.status(500).json({ error: "Stripe not configured" });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.APP_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:5173'}/pricing`,
      customer_email: userEmail,
      metadata: { userId },
    });

    res.json({ id: session.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
