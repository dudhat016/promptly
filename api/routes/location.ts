import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  try {
    // Switch to https://ipapi.co/json/ for better reliability on Vercel (HTTPS support)
    const response = await fetch('https://ipapi.co/json/');
    
    if (!response.ok) {
      throw new Error(`Location API failed with status: ${response.status}`);
    }
    
    const data = await response.json();

    // Map ipapi.co fields to our internal format
    res.json({
      ...data,
      country: data.country_code, // ipapi.co uses country_code
      localCurrency: data.currency || "USD"
    });
  } catch (err: any) {
    console.error("❌ [Backend Location Error]:", err.message);
    res.status(500).json({ 
      error: "Failed to detect location", 
      message: err.message,
      fallback: true
    });
  }
});

export default router;
