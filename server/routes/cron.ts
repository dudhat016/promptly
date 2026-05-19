import { Router } from "express";
import admin from "firebase-admin";
import { initFirebase } from "../lib/firebase.js";
import { tick, rebuildSegments } from "../services/automationEngine.js";
import { NudgeService } from "../services/nudgeService.js";
import { processExpiredLocks, triggerAutoPayouts } from "../lib/payouts.js";

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
    console.error(`[Cron] Auth mismatch — received header length: ${authHeader?.length ?? 0}, expected length: ${7 + secret.length}`);
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

async function writeHealthRecord(jobId: string, status: 'ok' | 'error', result: Record<string, any>, durationMs: number) {
  try {
    const firebase = await initFirebase();
    if (!firebase) return;
    await firebase.db.collection("system_health").doc(jobId).set({
      jobId,
      lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
      lastStatus: status,
      lastResult: result,
      durationMs,
    }, { merge: true });
  } catch { /* non-fatal */ }
}

// POST /api/cron/automation-tick
// Schedule: every 10 minutes — processes due automation flow instances
router.post("/automation-tick", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;
  const t0 = Date.now();

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const result = await tick(firebase.db);
    console.log(`[Cron] automation-tick: ${result.processed} processed, ${result.errors} errors`);
    await writeHealthRecord("automation-tick", "ok", result, Date.now() - t0);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[Cron] automation-tick error:", err.message);
    await writeHealthRecord("automation-tick", "error", { error: err.message }, Date.now() - t0);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cron/nudges
// Schedule: every hour — trial expiry + renewal reminders
router.post("/nudges", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;
  const t0 = Date.now();

  try {
    const [trial, renewal] = await Promise.all([
      NudgeService.runTrialExpiryNudges(),
      NudgeService.runSubscriptionRenewalReminders(),
    ]);
    const result = { trial, renewal };
    console.log(`[Cron] nudges: trial=${trial.sent} renewal=${renewal.sent}`);
    await writeHealthRecord("nudges", "ok", result, Date.now() - t0);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[Cron] nudges error:", err.message);
    await writeHealthRecord("nudges", "error", { error: err.message }, Date.now() - t0);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cron/segment-rebuild
// Schedule: every hour — re-evaluates segment filters against live contacts
router.post("/segment-rebuild", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;
  const t0 = Date.now();

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const result = await rebuildSegments(firebase.db);
    console.log(`[Cron] segment-rebuild: ${result.rebuilt} rebuilt, ${result.errors} errors`);
    await writeHealthRecord("segment-rebuild", "ok", result, Date.now() - t0);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[Cron] segment-rebuild error:", err.message);
    await writeHealthRecord("segment-rebuild", "error", { error: err.message }, Date.now() - t0);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cron/process-locks
// Schedule: daily at 03:00 UTC — approves affiliate commissions past lock period
router.post("/process-locks", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;
  const t0 = Date.now();

  try {
    const result = await processExpiredLocks();
    console.log(`[Cron] process-locks: ${result.processed} commissions approved`);
    await writeHealthRecord("process-locks", "ok", result, Date.now() - t0);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[Cron] process-locks error:", err.message);
    await writeHealthRecord("process-locks", "error", { error: err.message }, Date.now() - t0);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cron/expire-trials
// Schedule: daily at 04:00 UTC — downgrades trial users whose trial period has ended with no payment method
router.post("/expire-trials", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;
  const t0 = Date.now();

  try {
    const result = await NudgeService.expireTrials();
    console.log(`[Cron] expire-trials: ${result.expired} expired`);
    await writeHealthRecord("expire-trials", "ok", result, Date.now() - t0);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[Cron] expire-trials error:", err.message);
    await writeHealthRecord("expire-trials", "error", { error: err.message }, Date.now() - t0);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cron/auto-payouts
// Schedule: daily at 05:00 UTC — auto-pays eligible affiliates via PayPal Payouts API
// Only fires when autoPayoutsEnabled === true in configs/marketing
router.post("/auto-payouts", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;
  const t0 = Date.now();

  try {
    const result = await triggerAutoPayouts();
    console.log(`[Cron] auto-payouts: processed=${result.processed} succeeded=${result.succeeded} failed=${result.failed} skipped=${result.skipped}`);
    await writeHealthRecord("auto-payouts", "ok", result, Date.now() - t0);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[Cron] auto-payouts error:", err.message);
    await writeHealthRecord("auto-payouts", "error", { error: err.message }, Date.now() - t0);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cron/health — returns last-run status for all jobs (admin use only)
router.get("/health", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const snap = await firebase.db.collection("system_health").get();
    const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ ok: true, jobs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
