import * as dotenv from 'dotenv';
import express from "express";
import helmet from "helmet";
import cors from "cors";
import multiparty from "multiparty";
import paymentsRouter from "../server/routes/payments.js";
import authRouter from "../server/routes/auth.js";
import marketingRouter from "../server/routes/marketing.js";
import supportRouter from "../server/routes/support.js";
import locationRouter from "../server/routes/location.js";
import dataRouter from "../server/routes/data.js";
import nudgesRouter from "../server/routes/nudges.js";
import transactionalRouter from "../server/routes/transactional.js";
import automationRouter from "../server/routes/automation.js";
import cronRouter from "../server/routes/cron.js";
import affiliatesRouter from "../server/routes/affiliates.js";
import couponsRouter from "../server/routes/coupons.js";
import { generalLimiter, authLimiter, checkoutLimiter, contactLimiter } from "../server/middleware/rateLimit.js";
import { errorHandler } from "../server/middleware/errorHandler.js";
import { authMiddleware, adminOnly } from "../server/middleware/auth.js";
import type { AuthenticatedRequest } from "../server/middleware/auth.js";
import { apiKeyAuth } from "../server/middleware/apiKeyAuth.js";
import v1Router from "../server/routes/v1/index.js";
import developerRouter from "../server/routes/developer.js";
import { GeneralService } from "../server/services/generalService.js";
import { initFirebase } from "../server/lib/firebase.js";

dotenv.config();

const app = express();
app.set('trust proxy', 1);

// --- Security Middleware ---
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
    ? [`https://${process.env.VERCEL_URL}`, 'http://localhost:5173']
    : ['http://localhost:5173'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));

// --- Public Developer API (API key auth) ---
app.use("/api/v1", apiKeyAuth, v1Router);

// --- Developer Key Management (Firebase JWT auth) ---
app.use("/api/developer", authLimiter, developerRouter);

// --- Routes ---
app.use("/api/location", locationRouter);
app.use("/api/data", dataRouter);
app.use("/api/payments", checkoutLimiter, paymentsRouter);
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/support", contactLimiter, supportRouter);
app.use("/api/marketing", marketingRouter);
app.use("/api/nudges", nudgesRouter);
app.use("/api/email", transactionalRouter);
app.use("/api/automation", automationRouter);
app.use("/api/cron", cronRouter);
app.use("/api/affiliates", affiliatesRouter);
app.use("/api/coupons", couponsRouter);
app.use("/", marketingRouter);

// --- Core API Routes ---

app.get("/api/health", async (req, res) => {
  try {
    await initFirebase();
    res.json({ status: "ok", firebase: "connected", platform: "vercel" });
  } catch (err: any) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/api/test-ftp", authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await GeneralService.testFtp(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/upload-ftp", async (req, res) => {
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

app.post("/api/test-email", authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await GeneralService.testEmail();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/create-checkout-session", checkoutLimiter, authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await GeneralService.createStripeCheckout({
      ...req.body,
      userId: req.user!.uid,
      userEmail: req.user!.email
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Global Error Handler ---
app.use(errorHandler);

export default app;

