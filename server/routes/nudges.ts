import { Router, json } from "express";
import { authMiddleware, adminOnly, AuthenticatedRequest } from "../middleware/auth.js";
import { NudgeService } from "../services/nudgeService.js";
import { initFirebase } from "../lib/firebase.js";
import { triggerFlow } from "../services/automationEngine.js";

const router = Router();

// POST /api/nudges/low-credits
// Called client-side after a credit unlock when credits drop below threshold.
// authMiddleware ensures only the authenticated user triggers their own nudge.
router.post("/low-credits", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.uid;
  const { creditsRemaining } = req.body;

  if (typeof creditsRemaining !== 'number' || creditsRemaining < 0) {
    return res.status(400).json({ error: "creditsRemaining must be a non-negative number" });
  }

  try {
    const firebase = await initFirebase();
    const result = await NudgeService.sendLowCreditsEmail(userId, creditsRemaining);

    if (firebase) {
      triggerFlow(firebase.db, 'limit_reached', userId, { credits_remaining: String(creditsRemaining) })
        .catch(err => console.error('[Automation] limit_reached trigger failed:', err.message));
    }

    res.json(result);
  } catch (err: any) {
    console.error("Low credits nudge error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nudges/run-trial-expiry  (admin-only)
router.post("/run-trial-expiry", authMiddleware, adminOnly, async (_req, res) => {
  try {
    const result = await NudgeService.runTrialExpiryNudges();
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("Trial expiry nudge error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nudges/run-renewal-reminders  (admin-only)
router.post("/run-renewal-reminders", authMiddleware, adminOnly, async (_req, res) => {
  try {
    const result = await NudgeService.runSubscriptionRenewalReminders();
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("Renewal reminder error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nudges/run-all  (admin-only) — convenience: run both trial + renewal in one call
router.post("/run-all", authMiddleware, adminOnly, async (_req, res) => {
  try {
    const [trial, renewal] = await Promise.all([
      NudgeService.runTrialExpiryNudges(),
      NudgeService.runSubscriptionRenewalReminders(),
    ]);
    res.json({
      success: true,
      trial,
      renewal,
      total: {
        sent: trial.sent + renewal.sent,
        skipped: trial.skipped + renewal.skipped,
        errors: trial.errors + renewal.errors,
      },
    });
  } catch (err: any) {
    console.error("Run-all nudge error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
