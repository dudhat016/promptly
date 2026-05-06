import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const response = await fetch('http://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,currency,isp,org,as,query');
    if (!response.ok) {
      throw new Error(`ip-api failed with ${response.status}`);
    }
    const data = await response.json();

    res.json({
      ...data,
      country: data.countryCode,
      localCurrency: data.currency || "USD"
    });
  } catch (err: any) {
    console.error("Backend Location Error:", err.message);
    res.status(500).json({ error: "Failed to detect location", message: err.message });
  }
});

export default router;
