import { Router, json } from "express";
import { initFirebase } from "../lib/firebase.js";
import { processExpiredLocks } from "../lib/payouts.js";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth.js";
import admin from "firebase-admin";

const router = Router();

// Process commissions whose lock period has expired → credit affiliateEarnings
// Can be triggered by a cron job hitting POST /api/affiliates/process-locks
router.post("/process-locks", async (req, res) => {
  try {
    const result = await processExpiredLocks();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get affiliate stats for the authenticated user
router.get("/stats", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const [userSnap, commissionsSnap, payoutsSnap] = await Promise.all([
      firebase.db.collection("users").doc(uid).get(),
      firebase.db.collection("referral_commissions").where("referrerId", "==", uid).get(),
      firebase.db.collection("payouts").where("userId", "==", uid).get()
    ]);

    const user = userSnap.exists ? userSnap.data() : {};
    const commissions = commissionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const payouts = payoutsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const totalWithdrawn = payouts
      .filter((p: any) => p.status === 'completed')
      .reduce((acc: number, p: any) => acc + Number(p.amount ?? 0), 0);

    res.json({
      availableBalance: Number(user?.affiliateEarnings ?? 0),
      pendingEarnings: Number(user?.pendingEarnings ?? 0),
      withdrawnAmount: totalWithdrawn,
      totalEarned: Number(user?.affiliateEarnings ?? 0) + totalWithdrawn,
      commissions,
      payouts,
      hasPendingWithdrawal: payouts.some((p: any) => p.status === 'pending')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Submit a withdrawal request
router.post("/withdraw", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const { amount, payoutMethod, payoutDetails } = req.body;
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: "Invalid amount" });
  if (!payoutMethod) return res.status(400).json({ error: "Payout method required" });

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const [userSnap, marketingSnap] = await Promise.all([
      firebase.db.collection("users").doc(uid).get(),
      firebase.db.collection("configs").doc("marketing").get()
    ]);

    const user = userSnap.exists ? userSnap.data() : null;
    const marketing = marketingSnap.exists ? marketingSnap.data() : {};

    if (!user) return res.status(404).json({ error: "User not found" });

    const available = Number(user.affiliateEarnings ?? 0);
    const minAmount = Number(marketing?.minWithdrawalAmount ?? 10);
    const requestedAmount = Number(amount);

    if (requestedAmount < minAmount) {
      return res.status(400).json({ error: `Minimum withdrawal is $${minAmount}` });
    }
    if (requestedAmount > available) {
      return res.status(400).json({ error: "Amount exceeds available balance" });
    }

    // Block if there's already a pending withdrawal
    const existingPending = await firebase.db.collection("payouts")
      .where("userId", "==", uid)
      .where("status", "==", "pending")
      .limit(1).get();

    if (!existingPending.empty) {
      return res.status(409).json({ error: "You already have a pending withdrawal request" });
    }

    // Fraud scoring
    let fraudScore = 0;
    const createdAt = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt || Date.now());
    const accountAgeDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < 7) fraudScore += 40;
    if (accountAgeDays < 2) fraudScore += 30;
    if (!user.photoURL || !user.displayName) fraudScore += 10;
    const fraudThreshold = Number(marketing?.fraudScoreThreshold ?? 70);

    const payoutRef = await firebase.db.collection("payouts").add({
      userId: uid,
      userEmail: user.email || req.user?.email || '',
      userName: user.displayName || '',
      amount: requestedAmount,
      currency: 'USD',
      payoutMethod,
      payoutDetails: payoutDetails || {},
      status: fraudScore >= fraudThreshold ? 'flagged' : 'pending',
      riskScore: fraudScore,
      riskLevel: fraudScore >= fraudThreshold ? 'high_risk' : fraudScore >= 40 ? 'medium_risk' : 'low_risk',
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: null,
      transactionRef: null,
      adminNote: null
    });

    res.json({ id: payoutRef.id, status: fraudScore >= fraudThreshold ? 'flagged' : 'pending' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: approve withdrawal with transaction reference
router.post("/approve/:payoutId", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const { payoutId } = req.params;
  const { transactionRef, adminNote } = req.body;

  if (!transactionRef?.trim()) {
    return res.status(400).json({ error: "Transaction reference is required" });
  }

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    const payoutSnap = await firebase.db.collection("payouts").doc(payoutId).get();
    if (!payoutSnap.exists) return res.status(404).json({ error: "Payout not found" });

    const payout = payoutSnap.data()!;
    if (payout.status !== 'pending' && payout.status !== 'flagged') {
      return res.status(400).json({ error: "Payout already processed" });
    }

    const amount = Number(payout.amount ?? 0);

    await firebase.db.runTransaction(async tx => {
      const userRef = firebase.db.collection("users").doc(payout.userId);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error("User not found");

      const available = Number(userSnap.data()!.affiliateEarnings ?? 0);
      if (amount > available) throw new Error("User balance insufficient");

      tx.update(firebase.db.collection("payouts").doc(payoutId), {
        status: 'completed',
        transactionRef: transactionRef.trim(),
        adminNote: adminNote || null,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      tx.update(userRef, {
        affiliateEarnings: admin.firestore.FieldValue.increment(-amount),
        withdrawnAmount: admin.firestore.FieldValue.increment(amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: reject withdrawal
router.post("/reject/:payoutId", authMiddleware, json(), async (req: AuthenticatedRequest, res) => {
  const { payoutId } = req.params;
  const { adminNote } = req.body;

  try {
    const firebase = await initFirebase();
    if (!firebase) return res.status(500).json({ error: "Firebase not connected" });

    await firebase.db.collection("payouts").doc(payoutId).update({
      status: 'rejected',
      adminNote: adminNote || null,
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
