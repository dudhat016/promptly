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

    let serviceAccount;
    // Deep Clean: Remove surrounding quotes and all whitespace
    const cleanVar = serviceAccountVar.trim().replace(/^["']|["']$/g, '');
    
    try {
      // 1. Try standard JSON parse
      const sanitized = cleanVar.replace(/\\n/g, '\\n');
      serviceAccount = JSON.parse(sanitized);
    } catch (e) {
      // 2. Try Base64 decode
      try {
        const base64Clean = cleanVar.replace(/\s/g, '');
        const decoded = Buffer.from(base64Clean, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      } catch (innerError) {
        // 3. ULTIMATE FALLBACK: Regex Extraction
        console.log("⚠️ JSON parse failed, attempting Regex extraction...");
        try {
          // If it was Base64, we need to extract from the decoded version
          const base64Clean = cleanVar.replace(/\s/g, '');
          const decoded = Buffer.from(base64Clean, 'base64').toString('utf8');
          
          const extract = (str: string, key: string) => {
            const match = str.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
            return match ? match[1] : null;
          };
          
          // Try to extract from both the raw string and the decoded string
          const source = decoded.includes('project_id') ? decoded : cleanVar;
          
          serviceAccount = {
            project_id: extract(source, 'project_id'),
            private_key: extract(source, 'private_key')?.replace(/\\n/g, '\n'),
            client_email: extract(source, 'client_email'),
            type: 'service_account'
          };
          
          if (!serviceAccount.project_id || !serviceAccount.private_key) {
            throw new Error("Keys missing");
          }
        } catch (regexError) {
          throw new Error(`Firebase Config Error: ${cleanVar.substring(0, 20)}... (Length: ${cleanVar.length})`);
        }
      }
    }

    // CRITICAL: Robust Private Key Reconstruction
    if (serviceAccount && serviceAccount.private_key) {
      let rawKey = serviceAccount.private_key;
      
      // 1. Strip headers and all variations of newlines
      rawKey = rawKey
        .replace(/-----BEGIN[^-]*-----/g, "")
        .replace(/-----END[^-]*-----/g, "")
        .replace(/\\n/g, "")   // Literal \n
        .replace(/\\r/g, "")   // Literal \r
        .replace(/\n/g, "")    // Actual newline
        .replace(/\r/g, "")    // Actual carriage return
        .replace(/\s/g, "");   // All other whitespace

      // 2. Wrap at 64 chars
      const lines = rawKey.match(/.{1,64}/g);
      if (!lines) {
        throw new Error(`Private key data is empty or invalid. Length: ${rawKey.length}`);
      }
      
      const wrappedKey = lines.join("\n");
      serviceAccount.private_key = `-----BEGIN PRIVATE KEY-----\n${wrappedKey}\n-----END PRIVATE KEY-----\n`;
      
      console.log(`📡 [PEM Guard] Reconstructed key. Length: ${rawKey.length} chars.`);
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    isFirebaseInitialized = true;
    console.log("✅ Firebase Admin initialized successfully");
  } catch (error) {
    console.error("❌ Firebase Admin initialization failed:", error);
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
