import { Router } from "express";
import { initFirebase } from "../lib/firebase.js";
import { authMiddleware, adminOnly } from "../middleware/auth.js";

const router = Router();

// GET /api/admin/overview — Dashboard metrics & platform stats
router.get("/overview", authMiddleware, adminOnly, async (_req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const [promptsSnap, usersSnap, ticketsSnap, messagesSnap] = await Promise.all([
      firebase.db.collection("prompts").get(),
      firebase.db.collection("users").get(),
      firebase.db.collection("tickets").where("status", "==", "open").get(),
      firebase.db.collection("contact_messages").get(),
    ]);

    const totalPrompts = promptsSnap.size;
    const totalUsers = usersSnap.size;
    const openTickets = ticketsSnap.size;
    const unreadInquiries = messagesSnap.docs.filter(d => !d.data().readAt).length;

    let totalCopies = 0;
    let totalViews = 0;
    promptsSnap.docs.forEach(d => {
      const data = d.data();
      totalCopies += data.copiesCount || 0;
      totalViews += data.viewsCount || 0;
    });

    res.json({
      totalPrompts,
      totalUsers,
      openTickets,
      unreadInquiries,
      totalCopies,
      totalViews,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/inquiries — List contact inquiries
router.get("/inquiries", authMiddleware, adminOnly, async (_req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const snap = await firebase.db.collection("contact_messages").orderBy("createdAt", "desc").get();
    const inquiries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(inquiries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
