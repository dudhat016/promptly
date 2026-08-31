import { Router } from "express";
import { DataService } from "../services/dataService.js";

const router = Router();

// GET /api/blog/posts — List blog posts
router.get("/posts", async (_req, res) => {
  try {
    const posts: any[] = await DataService.getCollection("blog_posts");
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
    const posts: any[] = await DataService.getCollection("blog_posts");
    const found = posts.find(p => p.slug === slug || p.id === slug);
    if (!found) {
      return res.status(404).json({ error: "Blog post not found" });
    }
    res.json(found);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
