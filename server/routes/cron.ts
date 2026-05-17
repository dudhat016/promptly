import { Router } from "express";
import { initFirebase } from "../lib/firebase.js";
import { tick, rebuildSegments } from "../services/automationEngine.js";
import { NudgeService } from "../services/nudgeService.js";
import { processExpiredLocks } from "../lib/payouts.js";

const router = Router();

function verifyCronSecret(req: any, res: any): boolean {
  const authHeader = req.headers.authorization as string | undefined;
  const secret = process.env.CRON_SECRET;
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  if (!secret) {
    if (isProd) {
      console.error("[Cron] CRON_SECRET not set in production — blocking request");
      res.status(401).json({ error: "CRON_SECRET not configured" });
      return false;
    }
    console.warn("[Cron] CRON_SECRET not set — allowing (dev only)");
    return true;
  }
  if (authHeader !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// POST /api/cron/automation-tick
// Schedule: every 10 minutes — processes due automation flow instances
router.post("/automation-tick", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const result = await tick(firebase.db);
    console.log(`[Cron] automation-tick: ${result.processed} processed, ${result.errors} errors`);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[Cron] automation-tick error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cron/nudges
// Schedule: every hour — trial expiry + renewal reminders
router.post("/nudges", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;

  try {
    const [trial, renewal] = await Promise.all([
      NudgeService.runTrialExpiryNudges(),
      NudgeService.runSubscriptionRenewalReminders(),
    ]);
    console.log(`[Cron] nudges: trial=${trial.sent} renewal=${renewal.sent}`);
    res.json({ ok: true, trial, renewal });
  } catch (err: any) {
    console.error("[Cron] nudges error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cron/segment-rebuild
// Schedule: every hour — re-evaluates segment filters against live contacts
router.post("/segment-rebuild", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const result = await rebuildSegments(firebase.db);
    console.log(`[Cron] segment-rebuild: ${result.rebuilt} rebuilt, ${result.errors} errors`);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[Cron] segment-rebuild error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cron/process-locks
// Schedule: daily at 02:00 UTC — approves affiliate commissions past lock period
router.post("/process-locks", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;

  try {
    const result = await processExpiredLocks();
    console.log(`[Cron] process-locks: ${result.processed} commissions approved`);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[Cron] process-locks error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cron/expire-trials
// Schedule: daily at 03:00 UTC — downgrades trial users whose trial period has ended with no payment method
router.post("/expire-trials", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;

  try {
    const result = await NudgeService.expireTrials();
    console.log(`[Cron] expire-trials: ${result.expired} expired`);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[Cron] expire-trials error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
