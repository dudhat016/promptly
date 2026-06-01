import * as ftp from "basic-ftp";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import fs from "fs";
import multiparty from "multiparty";
import { initFirebase } from "./lib/firebase.js";
import type { AuthenticatedRequest } from "./middleware/auth.js";
import { adminOnly, authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authLimiter, checkoutLimiter, contactLimiter, generalLimiter } from "./middleware/rateLimit.js";
import affiliatesRouter from "./routes/affiliates.js";
import authRouter from "./routes/auth.js";
import automationRouter from "./routes/automation.js";
import couponsRouter from "./routes/coupons.js";
import cronRouter from "./routes/cron.js";
import dataRouter from "./routes/data.js";
import locationRouter from "./routes/location.js";
import marketingRouter from "./routes/marketing.js";
import nudgesRouter from "./routes/nudges.js";
import paymentsRouter from "./routes/payments.js";
import supportRouter from "./routes/support.js";
import transactionalRouter from "./routes/transactional.js";
import { GeneralService } from "./services/generalService.js";

dotenv.config();

const app = express();
app.set('trust proxy', 1);

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://sdk.cashfree.com", "https://www.paypal.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://*.firebaseio.com", "https://*.googleapis.com", "https://api.stripe.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const corsOrigins: string[] = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : process.env.VERCEL_URL
    ? [`https://${process.env.VERCEL_URL}`, 'http://localhost:5173', 'http://localhost:5175']
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(generalLimiter);

// rawBody capture is required for webhook signature verification (Cashfree, Stripe, etc.)
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/location",   locationRouter);
app.use("/api/data",       dataRouter);
app.use("/api/payments",   checkoutLimiter, paymentsRouter);
app.use("/api/auth",       authLimiter,     authRouter);
app.use("/api/support",    contactLimiter,  supportRouter);
app.use("/api/marketing",  marketingRouter);
app.use("/api/nudges",     nudgesRouter);
app.use("/api/email",      transactionalRouter);
app.use("/api/automation", automationRouter);
app.use("/api/cron",       cronRouter);
app.use("/api/affiliates", affiliatesRouter);
app.use("/api/coupons",    couponsRouter);
app.use("/",               marketingRouter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  const firebase = await initFirebase();
  res.json({ status: "ok", firebase: firebase ? "connected" : "failed" });
});

// ── General utilities ─────────────────────────────────────────────────────────
app.post("/api/test-ftp", authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await GeneralService.testFtp(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/upload-ftp", (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (err: Error | null, fields: Record<string, string[]>, files: Record<string, multiparty.File[]>) => {
    if (err) return res.status(500).json({ error: "Failed to parse upload" });
    const folder = fields.folder?.[0] || "";
    const file = files.file?.[0];
    if (!file) return res.status(400).json({ error: "No file uploaded" });
    try {
      const result = await GeneralService.uploadFtp(file, folder);
      res.json(result);
    } catch (ftpErr: any) {
      res.status(500).json({ error: ftpErr.message });
    }
  });
});

app.post("/api/vault/upload", (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (err: Error | null, fields: Record<string, string[]>, files: Record<string, multiparty.File[]>) => {
    if (err) return res.status(500).json({ error: err.message });
    const file = files.file[0];
    const pathOnServer = fields.path[0];
    const client = new ftp.Client();
    try {
      const firebase = await initFirebase();
      if (!firebase) throw new Error("Firebase not connected");
      const configSnap = await firebase.db.collection("configs").doc("storage").get();
      if (!configSnap.exists) throw new Error("Storage config missing");
      const config = configSnap.data();
      await client.access({ host: config?.host, user: config?.user, password: config?.password, secure: config?.secure === 'true' });
      await client.uploadFrom(file.path, pathOnServer);
      res.json({ success: true, url: `${config?.publicUrl}/${pathOnServer}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    } finally {
      client.close();
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
  });
});

app.post("/api/test-email", authMiddleware, adminOnly, async (_req, res) => {
  try {
    const result = await GeneralService.testEmail();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

export default app;
