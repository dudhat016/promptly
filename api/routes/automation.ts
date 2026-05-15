import { Router, json } from "express";
import { initFirebase } from "../lib/firebase.js";
import { triggerFlow, tick } from "../services/automationEngine.js";
import { authMiddleware, adminOnly, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// POST /api/automation/trigger
// Internal — called by application events (signup, payment, etc.) to start flows
// Protected by auth so only the backend (or admin) can call it
router.post("/trigger", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const { triggerType, userId, data = {} } = req.body;
  if (!triggerType || !userId) {
    return res.status(400).json({ error: "triggerType and userId are required" });
  }

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    await triggerFlow(firebase.db, triggerType, userId, data);
    res.json({ queued: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/automation/tick
// Cron job endpoint — processes all due flow instances
// Should be called every 5–15 minutes by a scheduler (Vercel Cron, cron-job.org, etc.)
router.post("/tick", authMiddleware, adminOnly, async (req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const result = await tick(firebase.db);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/automation/instances — admin: list flow instances (last 200, newest first)
router.get("/instances", authMiddleware, adminOnly, async (req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const snap = await firebase.db.collection("flow_instances")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/automation/instances/:id/cancel — set pending instance to completed
router.patch("/instances/:id/cancel", authMiddleware, adminOnly, async (req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    await firebase.db.collection("flow_instances").doc(req.params.id).update({
      status: "completed",
      updatedAt: new Date(),
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/automation/instances/:id/retry — re-queue a failed instance
router.patch("/instances/:id/retry", authMiddleware, adminOnly, async (req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    await firebase.db.collection("flow_instances").doc(req.params.id).update({
      status: "pending",
      error: null,
      scheduledAt: new Date(),
      updatedAt: new Date(),
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
