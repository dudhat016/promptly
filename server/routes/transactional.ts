import { Router, json } from "express";
import admin from "firebase-admin";
import { initFirebase } from "../lib/firebase.js";
import { getAppUrl, getLangUrl } from "../lib/config.js";
import { sendEmail } from "../lib/mailer.js";
import { EMAIL_TYPE_LIST } from "../lib/emailTypes.js";
import { triggerFlow, rebuildSegments } from "../services/automationEngine.js";
import { authMiddleware, adminOnly, AuthenticatedRequest } from "../middleware/auth.js";



const router = Router();

// GET /api/email/types — returns the full type registry for the admin UI
router.get("/types", (req, res) => {
  res.json(EMAIL_TYPE_LIST);
});

// ─── TRACKING ─────────────────────────────────────────────────────────────────

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'
);

// GET /api/email/track/open/:logId — 1×1 tracking pixel
router.get("/track/open/:logId", async (req, res) => {
  const { logId } = req.params;
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache', 'Pragma': 'no-cache' });
  res.send(TRANSPARENT_GIF);

  // Update asynchronously so pixel response is instant
  initFirebase().then(firebase => {
    if (!firebase || !logId) return;
    const ref = firebase.db.collection("email_logs").doc(logId);
    ref.get().then(snap => {
      if (!snap.exists) return;
      const data = snap.data()!;
      const update: Record<string, any> = { opens: (data.opens || 0) + 1 };
      if (!data.openedAt) update.openedAt = new Date().toISOString();
      ref.update(update).catch(() => {});
    }).catch(() => {});
  }).catch(() => {});
});

// GET /api/email/track/click/:logId?url= — click redirect
router.get("/track/click/:logId", async (req, res) => {
  const { logId } = req.params;
  const url = decodeURIComponent((req.query.url as string) || '');
  if (!url || !url.startsWith('http')) return res.redirect('/');

  res.redirect(url);

  // Update asynchronously so redirect is instant
  initFirebase().then(firebase => {
    if (!firebase || !logId) return;
    const ref = firebase.db.collection("email_logs").doc(logId);
    ref.get().then(snap => {
      if (!snap.exists) return;
      const data = snap.data()!;
      const update: Record<string, any> = { clicks: (data.clicks || 0) + 1 };
      if (!data.clickedAt) update.clickedAt = new Date().toISOString();
      ref.update(update).catch(() => {});
    }).catch(() => {});
  }).catch(() => {});
});

// POST /api/email/seed-templates — idempotent: seeds default templates for any email type not already in Firestore
router.post("/seed-templates", authMiddleware, adminOnly, async (req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    let seeded = 0, skipped = 0;

    await Promise.all(EMAIL_TYPE_LIST.map(async def => {
      const ref = firebase.db.collection("templates").doc(def.type);
      const snap = await ref.get();
      if (snap.exists) { skipped++; return; }

      await ref.set({
        id:        def.type,
        type:      def.type,
        name:      def.name,
        group:     def.group,
        subject:   def.defaultSubject,
        body:      def.defaultBody,
        variables: def.variables.map(v => v.name),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      seeded++;
    }));

    res.json({ ok: true, seeded, skipped });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/settings — return SMTP config from Firestore (admin only, password masked)
router.get("/settings", authMiddleware, adminOnly, async (req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });
    const snap = await firebase.db.collection("configs").doc("email").get();
    const data = snap.exists ? snap.data()! : {};
    // Mask password so it never leaves the server in plain text
    if (data.smtpPass) data.smtpPass = '••••••••';
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/email/settings — save SMTP config to Firestore (admin only)
// If smtpPass is the masked placeholder, preserve the existing value
router.put("/settings", authMiddleware, adminOnly, json(), async (req: AuthenticatedRequest, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const incoming = { ...req.body };
    if (incoming.smtpPass === '••••••••') {
      // Don't overwrite the real password if the user didn't change it
      const existing = await firebase.db.collection("configs").doc("email").get();
      if (existing.exists) incoming.smtpPass = existing.data()!.smtpPass;
      else delete incoming.smtpPass;
    }

    await firebase.db.collection("configs").doc("email").set({
      ...incoming,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/newsletter/subscribe — double opt-in: creates contact + sends confirm email
router.post("/newsletter/subscribe", json(), async (req, res) => {
  const { email, name = '' } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const appUrl = getAppUrl();
    const token  = Buffer.from(`${email}:${Date.now()}`).toString('base64url');

    // Upsert contact as pending_confirm
    const existing = await firebase.db.collection("marketing_contacts")
      .where("email", "==", email).limit(1).get();

    if (!existing.empty) {
      const contact = existing.docs[0].data();
      if (contact.status === 'active') {
        return res.json({ ok: true, alreadySubscribed: true });
      }
      await existing.docs[0].ref.update({
        status: 'pending_confirm', confirmToken: token,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await firebase.db.collection("marketing_contacts").add({
        email, displayName: name || email.split('@')[0],
        status: 'pending_confirm', source: 'newsletter_form',
        confirmToken: token, tags: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }

    const confirmLink = `${getLangUrl('/newsletter/confirm')}?email=${encodeURIComponent(email)}&token=${token}`;
    await sendEmail(firebase.db, email, 'newsletter_confirm', {
      name: name || email.split('@')[0],
      confirm_link: confirmLink,
      app_url: appUrl,
    });

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/newsletter/confirm?email=...&token=... — confirm subscription + redirect
router.get("/newsletter/confirm", async (req, res) => {
  const email = decodeURIComponent((req.query.email as string) || '');
  const token = (req.query.token as string) || '';
  if (!email || !token) return res.status(400).json({ error: "email and token required" });

  const appUrl = getAppUrl();

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const snap = await firebase.db.collection("marketing_contacts")
      .where("email", "==", email).limit(1).get();

    if (snap.empty) {
      return res.redirect(`${getLangUrl('/newsletter/confirm')}?status=invalid`);
    }

    const doc = snap.docs[0];
    const data = doc.data();

    if (data.confirmToken !== token) {
      return res.redirect(`${getLangUrl('/newsletter/confirm')}?status=invalid`);
    }

    if (data.status === 'active') {
      return res.redirect(`${getLangUrl('/newsletter/confirm')}?status=already`);
    }

    await doc.ref.update({
      status: 'active', confirmedAt: new Date().toISOString(),
      confirmToken: null, updatedAt: new Date().toISOString(),
    });

    // Send welcome email
    await sendEmail(firebase.db, email, 'newsletter_welcome', {
      name: data.displayName || email.split('@')[0],
      unsubscribe_link: `${appUrl}/api/email/unsubscribe?email=${encodeURIComponent(email)}`,
      app_url: appUrl,
    }).catch(() => {});

    res.redirect(`${getLangUrl('/newsletter/confirm')}?status=confirmed&email=${encodeURIComponent(email)}`);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/send — send a transactional email for the authenticated user
// Called by the frontend to replace the client-side EmailService logging
router.post("/send", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const { type, variables = {} } = req.body;
  if (!type) return res.status(400).json({ error: "type is required" });

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    // Resolve the user's email from the auth token or Firestore
    const userEmail = req.user?.email;
    if (!userEmail) return res.status(400).json({ error: "User has no email" });

    // Enrich variables with user data
    const userSnap = await firebase.db.collection("users").doc(uid).get();
    const userData = userSnap.exists ? userSnap.data()! : {};

    const enriched: Record<string, string> = {
      name:  userData.displayName || "Creator",
      email: userEmail,
      ...variables,
    };

    const result = await sendEmail(firebase.db, userEmail, type, enriched, uid);

    // Fire automation trigger on welcome email (user_signup event)
    if (type === 'welcome' && result.sent) {
      triggerFlow(firebase.db, 'user_signup', uid, { email: userEmail, name: enriched.name })
        .catch(err => console.error('[Automation] user_signup trigger failed:', err.message));
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/send-to — send to an arbitrary email; pass userId to enforce notif prefs
router.post("/send-to", authMiddleware, adminOnly, json(), async (req: AuthenticatedRequest, res) => {
  const { to, type, variables = {}, userId } = req.body;
  if (!to || !type) return res.status(400).json({ error: "to and type are required" });

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const result = await sendEmail(firebase.db, to, type, variables, userId || undefined);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/unsubscribe?email=... — one-click unsubscribe (linked from emails)
router.get("/unsubscribe", async (req, res) => {
  const email = decodeURIComponent((req.query.email as string) || '');
  if (!email) return res.status(400).json({ error: "email required" });

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const snap = await firebase.db.collection("marketing_contacts")
      .where("email", "==", email).limit(1).get();

    if (!snap.empty) {
      await snap.docs[0].ref.update({
        status: "unsubscribed",
        unsubscribedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Contact not in CRM — create an unsubscribed entry so future sends are blocked
      await firebase.db.collection("marketing_contacts").add({
        email,
        status: "unsubscribed",
        source: "unsubscribe_link",
        unsubscribedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    res.redirect(`${getLangUrl('/unsubscribe')}?email=${encodeURIComponent(email)}&confirmed=true`);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/resubscribe — re-opt-in
router.post("/resubscribe", json(), async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const snap = await firebase.db.collection("marketing_contacts")
      .where("email", "==", email).limit(1).get();

    if (!snap.empty) {
      await snap.docs[0].ref.update({
        status: "active",
        resubscribedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BROADCAST JOB QUEUE ─────────────────────────────────────────────────────

// Called by POST /api/cron/process-broadcasts every 10 minutes.
// Picks up pending broadcast jobs and sends in parallel batches of 25.
export async function processBroadcastJobs(): Promise<{ processed: number; sent: number; failed: number; skipped: number }> {
  const firebase = await initFirebase();
  if (!firebase) return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  const db = firebase.db;

  const jobsSnap = await db.collection("broadcast_jobs")
    .where("status", "==", "pending")
    .orderBy("createdAt", "asc")
    .limit(3) // process up to 3 jobs per tick to stay within function timeout
    .get();

  let processed = 0, totalSent = 0, totalFailed = 0, totalSkipped = 0;

  for (const jobDoc of jobsSnap.docs) {
    const job = jobDoc.data();

    // Mark as processing so another concurrent cron doesn't pick it up
    await jobDoc.ref.update({ status: "processing", startedAt: admin.firestore.FieldValue.serverTimestamp() });

    try {
      // Resolve email list from segment or all active contacts
      let emails: { email: string; userId?: string; name?: string }[] = [];

      if (job.segmentId) {
        // Rebuild segments dynamically before sending to ensure 100% accurate targeting
        await rebuildSegments(db).catch(err => console.error("[Broadcast] Segment rebuild failed:", err.message));

        const seg = await db.collection("marketing_segments").doc(job.segmentId).get();
        if (!seg.exists) throw new Error(`Segment ${job.segmentId} not found`);
        emails = ((seg.data()!.contactEmails as string[]) || []).map(e => ({ email: e }));
      } else {
        const snap = await db.collection("marketing_contacts").where("status", "==", "active").get();
        emails = snap.docs.map(d => ({
          email:  d.data().email as string,
          userId: d.data().userId as string | undefined,
          name:   d.data().displayName as string | undefined,
        })).filter(e => !!e.email);
      }

      let sent = 0, failed = 0, skipped = 0;

      // Process in parallel batches of 25
      const BATCH = 25;
      for (let i = 0; i < emails.length; i += BATCH) {
        const batch = emails.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(({ email, userId, name }) =>
            sendEmail(db, email, job.type, { email, name: name || '', ...job.variables }, userId)
          )
        );
        for (const r of results) {
          if (r.status === 'fulfilled') {
            r.value.sent ? sent++ : skipped++;
          } else {
            failed++;
          }
        }
      }

      await jobDoc.ref.update({
        status: "done",
        sent, failed, skipped,
        total: emails.length,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
      });

      totalSent    += sent;
      totalFailed  += failed;
      totalSkipped += skipped;
      processed++;

    } catch (err: any) {
      console.error(`[Broadcast] Job ${jobDoc.id} failed:`, err.message);
      await jobDoc.ref.update({
        status: "error",
        error:  err.message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  return { processed, sent: totalSent, failed: totalFailed, skipped: totalSkipped };
}

// GET /api/email/broadcast/preview?segmentId= — recipient count before sending
router.get("/broadcast/preview", authMiddleware, adminOnly, async (req, res) => {
  const segmentId = req.query.segmentId as string | undefined;
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    let total = 0;
    if (segmentId) {
      const seg = await firebase.db.collection("marketing_segments").doc(segmentId).get();
      total = seg.exists ? ((seg.data()?.contactEmails as string[]) || []).length : 0;
    } else {
      const snap = await firebase.db.collection("marketing_contacts")
        .where("status", "==", "active").get();
      total = snap.size;
    }
    res.json({ total });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/broadcast — admin: queue a broadcast; returns immediately with a jobId.
// The cron POST /api/cron/process-broadcasts drains the queue every 10 minutes.
// Body: { segmentId?, type, variables? }
router.post("/broadcast", authMiddleware, adminOnly, json(), async (req: AuthenticatedRequest, res) => {
  const { segmentId, type, variables = {} } = req.body;
  if (!type) return res.status(400).json({ error: "type is required" });

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const jobRef = await firebase.db.collection("broadcast_jobs").add({
      type,
      segmentId: segmentId || null,
      variables,
      status:    "pending",
      sent:      0,
      failed:    0,
      skipped:   0,
      total:     0,
      createdBy: req.user!.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ ok: true, jobId: jobRef.id, status: "pending" });

    // Trigger processing immediately in the background
    processBroadcastJobs().catch(err => {
      console.error("[Broadcast] Immediate processing failed:", err.message);
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/broadcast/status/:jobId — poll broadcast job progress (admin only)
router.get("/broadcast/status/:jobId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const snap = await firebase.db.collection("broadcast_jobs").doc(req.params.jobId).get();
    if (!snap.exists) return res.status(404).json({ error: "Job not found" });

    res.json({ ok: true, id: snap.id, ...snap.data() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
