import { Router } from "express";
import { initFirebase } from "../lib/firebase.js";

const router = Router();

// GET /api/blog — List blog posts
router.get("/posts", async (_req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const snap = await firebase.db.collection("blog_posts").get();
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    posts.sort((a: any, b: any) => {
      const ta = new Date(a.publishedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.publishedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
    res.json(posts);
  } catch (err: any) {
    console.error("[Blog Route] Error fetching posts:", err.message);
    res.json([]);
  }
});

// GET /api/blog/post/:slug — Single blog post by slug
router.get("/post/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const snap = await firebase.db.collection("blog_posts").where("slug", "==", slug).limit(1).get();
    if (snap.empty) {
      return res.status(404).json({ error: "Blog post not found" });
    }
    const doc = snap.docs[0];
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
