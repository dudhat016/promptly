import { Router, json } from "express";
import { initFirebase } from "../lib/firebase.js";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.js";
import admin from "firebase-admin";

const router = Router();

// Validate a coupon code (public — called from checkout)
router.post("/validate", json(), async (req, res) => {
  const { code, planId, amount } = req.body;
  if (!code) return res.status(400).json({ error: "Coupon code required" });

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const snap = await firebase.db.collection("coupons")
      .where("code", "==", code.trim().toUpperCase())
      .where("active", "==", true)
      .limit(1).get();

    if (snap.empty) return res.status(404).json({ error: "Invalid or expired coupon" });

    const coupon = snap.docs[0].data();
    const couponId = snap.docs[0].id;

    // Check expiry
    if (coupon.expiresAt && coupon.expiresAt.toDate() < new Date()) {
      return res.status(400).json({ error: "This coupon has expired" });
    }

    // Check usage limit
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ error: "This coupon has reached its usage limit" });
    }

    // Check plan restriction
    if (coupon.planIds?.length && planId && !coupon.planIds.includes(planId)) {
      return res.status(400).json({ error: "This coupon is not valid for the selected plan" });
    }

    const originalAmount = Number(amount || 0);
    let discountAmount = 0;
    if (coupon.type === 'percent') {
      discountAmount = parseFloat((originalAmount * coupon.value / 100).toFixed(2));
    } else if (coupon.type === 'fixed') {
      discountAmount = Math.min(coupon.value, originalAmount);
    }
    const finalAmount = parseFloat(Math.max(0, originalAmount - discountAmount).toFixed(2));

    res.json({
      couponId,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description || '',
      discountAmount,
      finalAmount,
      originalAmount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Redeem a coupon (called server-side after successful payment)
router.post("/redeem", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const { couponId, orderId } = req.body;
  if (!couponId || !orderId) return res.status(400).json({ error: "couponId and orderId required" });

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    await firebase.db.runTransaction(async tx => {
      const couponRef = firebase.db.collection("coupons").doc(couponId);
      const couponSnap = await tx.get(couponRef);
      if (!couponSnap.exists) throw new Error("Coupon not found");

      tx.update(couponRef, {
        usedCount: admin.firestore.FieldValue.increment(1),
        lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log redemption
      const logRef = firebase.db.collection("coupon_redemptions").doc();
      tx.set(logRef, {
        couponId,
        orderId,
        userId: req.user!.uid,
        redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: list all coupons
router.get("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const snap = await firebase.db.collection("coupons")
      .orderBy("createdAt", "desc").get();

    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: create coupon
router.post("/", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const { code, type, value, maxUses, expiresAt, planIds, description } = req.body;
  if (!code || !type || value == null) {
    return res.status(400).json({ error: "code, type, and value are required" });
  }
  if (!['percent', 'fixed'].includes(type)) {
    return res.status(400).json({ error: "type must be 'percent' or 'fixed'" });
  }
  if (type === 'percent' && (value <= 0 || value > 100)) {
    return res.status(400).json({ error: "Percent discount must be 1-100" });
  }

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const upperCode = code.trim().toUpperCase();
    const existing = await firebase.db.collection("coupons")
      .where("code", "==", upperCode).limit(1).get();
    if (!existing.empty) return res.status(409).json({ error: "Coupon code already exists" });

    const docRef = await firebase.db.collection("coupons").add({
      code: upperCode,
      type,
      value: Number(value),
      maxUses: maxUses ? Number(maxUses) : null,
      usedCount: 0,
      planIds: planIds || [],
      description: description || '',
      expiresAt: expiresAt ? admin.firestore.Timestamp.fromDate(new Date(expiresAt)) : null,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ id: docRef.id, code: upperCode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: update coupon
router.patch("/:id", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { active, maxUses, expiresAt, description } = req.body;

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const updates: any = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (active !== undefined) updates.active = active;
    if (maxUses !== undefined) updates.maxUses = maxUses ? Number(maxUses) : null;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? admin.firestore.Timestamp.fromDate(new Date(expiresAt)) : null;
    if (description !== undefined) updates.description = description;

    await firebase.db.collection("coupons").doc(id).update(updates);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: delete coupon
router.delete("/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });
    await firebase.db.collection("coupons").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
