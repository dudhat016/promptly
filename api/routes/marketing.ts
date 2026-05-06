import { Router } from "express";
import { initFirebase } from "../lib/firebase";
import { getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

const router = Router();

router.get("/sitemap.xml", async (req, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).send("Firebase not connected");

    const promptsSnap = await firebase.db.collection("prompts").where("status", "==", "published").get();
    const baseUrl = process.env.VITE_SITE_URL || 'https://promptly.ai';
    
    const urls = promptsSnap.docs.map(doc => {
      const data = doc.data();
      return `
  <url>
    <loc>${baseUrl}/prompt/${data.slug}</loc>
    <lastmod>${new Date(data.updatedAt?.seconds * 1000 || Date.now()).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/explore</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  ${urls.join('')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (err) {
    console.error("Sitemap Error:", err);
    res.status(500).send("Error generating sitemap");
  }
});

router.post("/test-email", async (req, res) => {
  const firebase = await initFirebase();
  if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

  try {
    const configSnap = await firebase.db.collection("configs").doc("email").get();
    if (!configSnap.exists) return res.status(404).json({ error: "Email configuration not found" });

    const config = configSnap.data();
    if (config?.provider !== 'smtp') return res.status(400).json({ error: "SMTP provider not active" });

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: parseInt(config.smtpPort),
      secure: config.smtpSecure,
      auth: { user: config.smtpUser, pass: config.smtpPass },
      connectionTimeout: 10000,
    });

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: config.fromEmail,
      subject: "🚀 SMTP Connection Test - Success!",
      text: "Your SMTP connection is working perfectly.",
      html: `<h1 style="color: #4f46e5;">Connection Success!</h1><p>Your SMTP connection is active and secured.</p>`
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    console.error("SMTP Test Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
