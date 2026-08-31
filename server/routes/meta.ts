import { Router } from "express";
import { DataService } from "../services/dataService.js";

const router = Router();

// Vercel Edge CDN Caching Header Middleware
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800');
  next();
});

// GET /api/categories — Returns active categories
router.get("/categories", async (_req, res) => {
  try {
    const categories = await DataService.getCollection("categories");
    res.json(categories);
  } catch {
    res.json([]);
  }
});

// GET /api/models — Returns supported AI models
router.get("/models", async (_req, res) => {
  try {
    const models = await DataService.getCollection("models");
    res.json(models);
  } catch {
    res.json([]);
  }
});

// GET /api/tags — Returns active tags
router.get("/tags", async (_req, res) => {
  try {
    const tags = await DataService.getCollection("tags");
    res.json(tags);
  } catch {
    res.json([]);
  }
});

export default router;
