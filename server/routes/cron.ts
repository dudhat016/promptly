import { Router } from "express";
import admin from "firebase-admin";
import { initFirebase } from "../lib/firebase.js";
import { rebuildSegments, tick } from "../services/automationEngine.js";

import { processBroadcastJobs } from "./transactional.js";



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


// POST /api/cron/process-broadcasts
// Schedule: every 10 minutes — drains the broadcast_jobs queue in parallel batches
router.post("/process-broadcasts", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;
  const t0 = Date.now();
  try {
    const result = await processBroadcastJobs();
    console.log(`[Cron] process-broadcasts: ${result.processed} jobs, ${result.sent} sent, ${result.skipped} skipped`);
    await writeHealthRecord("process-broadcasts", "ok", result, Date.now() - t0);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[Cron] process-broadcasts error:", err.message);
    await writeHealthRecord("process-broadcasts", "error", { error: err.message }, Date.now() - t0);
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
