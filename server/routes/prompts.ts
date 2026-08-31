import { Router, json } from "express";
import admin from "firebase-admin";
import { initFirebase } from "../lib/firebase.js";
import { DataService } from "../services/dataService.js";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// GET /api/prompts — Fetch list of prompts with optional query filters
router.get("/", async (req, res) => {
  const { category, model, status, search, limit = "100" } = req.query;

  try {
    let prompts: any[] = await DataService.getCollection("prompts");

    if (status && typeof status === "string") {
      prompts = prompts.filter(p => !p.status || p.status === status);
    }
    if (category && typeof category === "string") {
      prompts = prompts.filter(p => p.category === category || p.categoryId === category);
    }
    if (model && typeof model === "string") {
      prompts = prompts.filter(p => p.model === model);
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.toLowerCase().trim();
      prompts = prompts.filter((p: any) =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.content && p.content.toLowerCase().includes(q))
      );
    }

    const limitNum = parseInt(limit as string, 10) || 100;
    res.json(prompts.slice(0, limitNum));
  } catch (err: any) {
    console.error("[Prompts Route] Error fetching prompts:", err.message);
    res.json([]);
  }
});

// GET /api/prompts/:id — Single prompt by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const doc = await firebase.db.collection("prompts").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    // Increment viewsCount asynchronously
    firebase.db.collection("prompts").doc(id).update({
      viewsCount: admin.firestore.FieldValue.increment(1)
    }).catch(() => {});

    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prompts — Submit new prompt
router.post("/", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const { title, description, content, category, model } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const newPrompt = {
      ...req.body,
      creatorId: req.user?.uid || req.body.creatorId,
      creatorEmail: req.user?.email || req.body.creatorEmail,
      status: "approved",
      viewsCount: 0,
      copiesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await firebase.db.collection("prompts").add(newPrompt);
    res.json({ id: docRef.id, ...newPrompt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/prompts/:id — Update prompt
router.put("/:id", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const docRef = firebase.db.collection("prompts").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    const data = docSnap.data();
    if (data?.creatorId !== req.user?.uid && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized to edit prompt" });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await docRef.update(updateData);
    res.json({ id, ...data, ...updateData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/prompts/:id — Delete prompt
router.delete("/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const docRef = firebase.db.collection("prompts").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    const data = docSnap.data();
    if (data?.creatorId !== req.user?.uid && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized to delete prompt" });
    }

    await docRef.delete();
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
