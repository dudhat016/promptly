import { Router } from "express";
import { LocationService } from "../services/locationService";

const router = Router();

router.get(["/", "/detect"], async (req, res) => {
  try {
    const data = await LocationService.detectLocation();
    res.json(data);
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
