import { Router, json } from "express";
import { initFirebase } from "../lib/firebase";
import admin from "firebase-admin";

const router = Router();

// 1. Create a Ticket (User)
router.post("/tickets", json(), async (req, res) => {
  const { userId, userEmail, subject, message, priority } = req.body;

  if (!userId || !userEmail || !subject || !message) {
    return res.status(400).json({ error: "userId, userEmail, subject, and message are required" });
  }
  if (typeof subject !== 'string' || subject.length > 300) {
    return res.status(400).json({ error: "subject must be a string under 300 characters" });
  }
  if (typeof message !== 'string' || message.length > 10000) {
    return res.status(400).json({ error: "message must be a string under 10,000 characters" });
  }

  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
    const ticketData = {
      userId,
      userEmail,
      subject,
      status: 'open',
      priority: priority || 'medium',
      messages: [{
        senderId: userId,
        senderRole: 'user',
        text: message,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }],
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await firebase.db.collection("tickets").add(ticketData);
    res.json({ success: true, ticketId: docRef.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get User's Tickets
router.get("/tickets/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
    const snap = await firebase.db.collection("tickets")
      .where("userId", "==", userId)
      .orderBy("updatedAt", "desc")
      .get();
    
    const tickets = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(tickets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Add Message to Ticket
router.post("/tickets/:id/messages", json(), async (req, res) => {
  const { id } = req.params;
  const { senderId, senderRole, text } = req.body;
  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
    const message = {
      senderId,
      senderRole,
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await firebase.db.collection("tickets").doc(id).update({
      messages: admin.firestore.FieldValue.arrayUnion(message),
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Admin: Get All Tickets
router.get("/admin/tickets", async (req, res) => {
  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
    const snap = await firebase.db.collection("tickets")
      .orderBy("updatedAt", "desc")
      .get();
    
    const tickets = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(tickets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Admin: Update Ticket Status
router.patch("/admin/tickets/:id/status", json(), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
    await firebase.db.collection("tickets").doc(id).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
