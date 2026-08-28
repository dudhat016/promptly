import { Router, json } from "express";
import { MarketingService } from "../services/marketingService";
import { authMiddleware, adminOnly } from "../middleware/auth";
import { initFirebase } from "../lib/firebase";

const router = Router();

router.get("/sitemap.xml", async (req, res) => {
  try {
    const sitemap = await MarketingService.generateSitemap();
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (err) {
    console.error("Sitemap Error:", err);
    res.status(500).send("Error generating sitemap");
  }
});

router.post("/test-email", authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await MarketingService.testSmtp();
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("SMTP Test Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/marketing/send-campaign
router.post("/send-campaign", authMiddleware, adminOnly, json(), async (req, res) => {
  const { subject, html } = req.body;

  if (!subject || !html) {
    return res.status(400).json({ error: "subject and html are required" });
  }

  try {
    const result = await MarketingService.sendCampaign(req.body);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("Campaign send error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/marketing/contacts/import
// Body: { contacts: { email, name?, tags? }[] }
// Upserts contacts — skips existing active, updates unsubscribed to pending review
router.post("/contacts/import", authMiddleware, adminOnly, json(), async (req, res) => {
  const rows: { email: string; name?: string; tags?: string[] }[] = req.body?.contacts ?? [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "contacts array is required" });
  }

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    let created = 0, updated = 0, skipped = 0;
    const batch = firebase.db.batch();
    let batchCount = 0;

    for (const row of rows) {
      const email = (row.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) { skipped++; continue; }

      const snap = await firebase.db.collection("marketing_contacts")
        .where("email", "==", email).limit(1).get();

      if (!snap.empty) {
        const existing = snap.docs[0].data();
        if (existing.status === 'active') { skipped++; continue; }
        batch.update(snap.docs[0].ref, {
          displayName: row.name || existing.displayName || email.split('@')[0],
          tags: row.tags?.length ? row.tags : (existing.tags || []),
          updatedAt: new Date().toISOString(),
        });
        updated++;
      } else {
        const ref = firebase.db.collection("marketing_contacts").doc();
        batch.set(ref, {
          email,
          displayName: row.name || email.split('@')[0],
          status: 'active',
          source: 'import',
          tags: row.tags || [],
          leadScore: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        created++;
      }

      batchCount++;
      // Firestore batch limit is 500
      if (batchCount === 490) break;
    }

    await batch.commit();
    res.json({ ok: true, created, updated, skipped, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/marketing/segments/rebuild — force-rebuild all segment memberships now
router.post("/segments/rebuild", authMiddleware, adminOnly, async (req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const { rebuildSegments } = await import("../services/automationEngine");

    const result = await rebuildSegments(firebase.db);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
