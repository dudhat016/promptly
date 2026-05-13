import { Router } from "express";
import { AuthService } from "../services/authService";
import { authLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/reset-password", authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const result = await AuthService.sendPasswordResetEmail(email);
    res.json(result);
  } catch (err: any) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

