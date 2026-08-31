import { Router } from "express";
import { initFirebase } from "../lib/firebase.js";

const router = Router();

// GET /api/categories — Returns active categories
router.get("/categories", async (_req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.json([]);

    const snap = await firebase.db.collection("categories").get();
    const categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(categories);
  } catch (err: any) {
    console.error("[Meta Route] Error fetching categories:", err.message);
    res.json([]);
  }
});

// GET /api/models — Returns supported AI models
router.get("/models", async (_req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.json([]);

    const snap = await firebase.db.collection("models").get();
    const models = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(models);
  } catch (err: any) {
    console.error("[Meta Route] Error fetching models:", err.message);
    res.json([]);
  }
});

// GET /api/tags — Returns active tags
router.get("/tags", async (_req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.json([]);

    const snap = await firebase.db.collection("tags").get();
    const tags = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(tags);
  } catch (err: any) {
    console.error("[Meta Route] Error fetching tags:", err.message);
    res.json([]);
  }
});

export default router;
