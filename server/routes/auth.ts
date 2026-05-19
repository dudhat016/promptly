import { Router, json } from "express";
import { AuthService } from "../services/authService.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { authMiddleware } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { initFirebase } from "../lib/firebase.js";
import { sendEmail } from "../lib/mailer.js";

function parseBrowser(ua: string): string {
  if (/Edg\//.test(ua))         return 'Microsoft Edge';
  if (/OPR\/|Opera\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua))      return 'Chrome';
  if (/Firefox\//.test(ua))     return 'Firefox';
  if (/Safari\//.test(ua))      return 'Safari';
  return 'Unknown Browser';
}

function parseOS(ua: string): string {
  if (/Windows NT 10\.0/.test(ua)) return 'Windows 10/11';
  if (/Windows NT 6\.3/.test(ua))  return 'Windows 8.1';
  if (/Windows/.test(ua))          return 'Windows';
  if (/iPhone/.test(ua))           return 'iPhone';
  if (/iPad/.test(ua))             return 'iPad';
  if (/Android/.test(ua))          return 'Android';
  if (/Mac OS X/.test(ua))         return 'macOS';
  if (/Linux/.test(ua))            return 'Linux';
  return 'Unknown OS';
}

const router = Router();

router.post("/reset-password", authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const result = await AuthService.sendPasswordResetEmail(email);
    res.json(result);
  } catch (err: any) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login-alert
// Called once per browser session from the client immediately after Firebase auth resolves.
// Server owns the dedup (atomic Firestore transaction) so duplicate sends are impossible
// regardless of how many tabs, devices, or onAuthStateChanged firings the client produces.
router.post("/login-alert", authLimiter, authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const userId = req.user!.uid;
    const email  = req.user!.email || "";
    const name   = req.body?.name || email.split("@")[0] || "there";
    const time   = req.body?.time || new Date().toLocaleString();

    if (!email) return res.status(400).json({ error: "No email on token" });

    const ua      = (req.headers['user-agent'] as string) || '';
    const ip      = ((req.headers['x-forwarded-for'] as string) || '').split(',')[0].trim() || req.ip || 'Unknown';
    const browser = `${parseBrowser(ua)} on ${parseOS(ua)}`;

    const result = await sendEmail(firebase.db, email, "login_alert", { name, time, browser, ip }, userId);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[Auth] login-alert error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
