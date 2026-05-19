import { Router, json } from "express";
import { AuthService } from "../services/authService.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { authMiddleware } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { initFirebase } from "../lib/firebase.js";
import { sendEmail } from "../lib/mailer.js";

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

    const result = await sendEmail(firebase.db, email, "login_alert", { name, time }, userId);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[Auth] login-alert error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
