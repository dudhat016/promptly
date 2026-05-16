import { Router, json } from "express";
import { initFirebase } from "../lib/firebase.js";
import { getAppUrl, getLangUrl } from "../lib/config.js";
import { sendEmail } from "../lib/mailer.js";
import { EMAIL_TYPE_LIST } from "../lib/emailTypes.js";
import { triggerFlow } from "../services/automationEngine.js";
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

    const result = await sendEmail(firebase.db, userEmail, type, enriched);

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

// POST /api/email/send-to — admin-only: send to an arbitrary email
router.post("/send-to", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const { to, type, variables = {} } = req.body;
  if (!to || !type) return res.status(400).json({ error: "to and type are required" });

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const result = await sendEmail(firebase.db, to, type, variables);
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

// POST /api/email/seed-templates — admin: write default templates to Firestore if missing
// Safe to run multiple times — skips types that already have a template doc
router.post("/seed-templates", authMiddleware, adminOnly, async (req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    let created = 0;
    let skipped = 0;

    for (const type of EMAIL_TYPE_LIST) {
      const ref = firebase.db.collection("templates").doc(type.type);
      const snap = await ref.get();
      if (snap.exists) { skipped++; continue; }

      await ref.set({
        id:        type.type,
        type:      type.type,
        name:      type.name,
        subject:   type.defaultSubject,
        body:      type.defaultBody,
        variables: type.variables.map(v => v.name),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      created++;
    }

    res.json({ ok: true, created, skipped });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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

// POST /api/email/broadcast — admin: send a template to all contacts in a segment (or all active)
// Body: { segmentId?, type, variables? }
// Returns: { sent, failed, skipped, total }
router.post("/broadcast", authMiddleware, adminOnly, json(), async (req: AuthenticatedRequest, res) => {
  const { segmentId, type, variables = {} } = req.body;
  if (!type) return res.status(400).json({ error: "type is required" });

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    // Resolve recipient list
    let emails: string[] = [];
    if (segmentId) {
      const segSnap = await firebase.db.collection("marketing_segments").doc(segmentId).get();
      if (!segSnap.exists) return res.status(404).json({ error: "Segment not found" });
      const seg = segSnap.data()!;
      emails = (seg.contactEmails as string[]) || [];
    } else {
      // All active contacts
      const snap = await firebase.db.collection("marketing_contacts")
        .where("status", "==", "active").get();
      emails = snap.docs.map(d => d.data().email as string).filter(Boolean);
    }

    let sent = 0, failed = 0, skipped = 0;
    for (const email of emails) {
      try {
        const result = await sendEmail(firebase.db, email, type, { email, ...variables });
        if (result.sent) sent++;
        else { skipped++; } // unsubscribed / suppressed
      } catch {
        failed++;
      }
    }

    res.json({ ok: true, total: emails.length, sent, failed, skipped });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
