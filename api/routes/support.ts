import { Router, json } from "express";
import { SupportService } from "../services/supportService";
import { authMiddleware, adminOnly, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// 1. Create a Ticket (User)
router.post("/tickets", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const { userId, subject, message } = req.body;

  if (req.user?.uid !== userId) {
    return res.status(403).json({ error: "Unauthorized ticket creation" });
  }

  if (!subject || !message) {
    return res.status(400).json({ error: "subject and message are required" });
  }

  try {
    const result = await SupportService.createTicket({
      ...req.body,
      userEmail: req.user?.email || req.body.userEmail
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get User's Tickets
router.get("/tickets/user/:userId", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;

  if (req.user?.uid !== userId && req.user?.role !== 'admin') {
    return res.status(403).json({ error: "Unauthorized access to tickets" });
  }

  try {
    const tickets = await SupportService.getUserTickets(userId);
    res.json(tickets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Add Message to Ticket
router.post("/tickets/:id/messages", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { senderId } = req.body;

  if (req.user?.uid !== senderId && req.user?.role !== 'admin') {
    return res.status(403).json({ error: "Unauthorized message sending" });
  }

  try {
    const result = await SupportService.addTicketMessage(id, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Admin: Get All Tickets
router.get("/admin/tickets", authMiddleware, adminOnly, async (req, res) => {
  try {
    const tickets = await SupportService.getAllTickets();
    res.json(tickets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Admin: Update Ticket Status
router.patch("/admin/tickets/:id/status", authMiddleware, adminOnly, json(), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const result = await SupportService.updateTicketStatus(id, status);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

