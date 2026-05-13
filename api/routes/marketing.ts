import { Router, json } from "express";
import { MarketingService } from "../services/marketingService";
import { authMiddleware, adminOnly } from "../middleware/auth";

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

export default router;
