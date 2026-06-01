import admin from "firebase-admin";
import { initFirebase } from "../lib/firebase.js";
import { sendEmail } from "../lib/mailer.js";
import { getLangUrl } from "../lib/config.js";

const DUNNING_SCHEDULE = [0, 3, 7, 10]; // days after first failure
const MAX_ATTEMPTS     = 3;

export class DunningService {

  static async handlePaymentFailure(userId: string, gateway: string, attempt: number = 1) {
    const firebase = await initFirebase();
    if (!firebase) return;
    const db = firebase.db;

    const userRef  = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return;
    const user = userSnap.data()!;

    const nextRetryDate = new Date();
    nextRetryDate.setDate(nextRetryDate.getDate() + (DUNNING_SCHEDULE[attempt] ?? 10));

    await userRef.update({
      dunningStatus:    "failing",
      dunningAttempt:   attempt,
      dunningGateway:   gateway,
      dunningStartedAt: attempt === 1 ? admin.firestore.FieldValue.serverTimestamp() : user.dunningStartedAt,
      dunningNextRetryAt: admin.firestore.Timestamp.fromDate(nextRetryDate),
      updatedAt:        admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("dunning_events").add({
      userId,
      userEmail: user.email,
      attempt,
      gateway,
      event:       "payment_failed",
      nextRetryAt: admin.firestore.Timestamp.fromDate(nextRetryDate),
      createdAt:   admin.firestore.FieldValue.serverTimestamp(),
    });

    if (attempt > MAX_ATTEMPTS) {
      await DunningService.downgradeUser(userId, gateway);
      return;
    }

    await DunningService.sendDunningEmail(user, userId, attempt, nextRetryDate, db);
  }

  static async handlePaymentRecovery(userId: string) {
    const firebase = await initFirebase();
    if (!firebase) return;
    const db = firebase.db;

    const userRef  = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return;
    const user = userSnap.data()!;

    if (user.dunningStatus !== "failing") return;

    await userRef.update({
      dunningStatus:    "recovered",
      dunningAttempt:   admin.firestore.FieldValue.delete(),
      dunningNextRetryAt: admin.firestore.FieldValue.delete(),
      updatedAt:        admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("dunning_events").add({
      userId,
      userEmail: user.email,
      event:     "payment_recovered",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (user.email) {
      await sendEmail(db, user.email, "dunning_recovered", {
        name: user.displayName || "Creator",
        plan: user.activePlanId || "Pro",
      }, userId);
    }
  }

  private static async downgradeUser(userId: string, gateway: string) {
    const firebase = await initFirebase();
    if (!firebase) return;
    const db = firebase.db;

    const userRef = db.collection("users").doc(userId);
    await userRef.update({
      subscriptionStatus: "free",
      autoPayEnabled:     false,
      cancelAtPeriodEnd:  true,
      dunningStatus:      "downgraded",
      updatedAt:          admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("dunning_events").add({
      userId,
      event:     "downgraded_to_free",
      gateway,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const userSnap = await userRef.get();
    const user     = userSnap.data()!;
    if (user.email) {
      await sendEmail(db, user.email, "subscription_ended", {
        name: user.displayName || "Creator",
      }, userId);
    }
  }

  static async processDunningQueue(): Promise<{ processed: number; downgraded: number; errors: number }> {
    const firebase = await initFirebase();
    if (!firebase) return { processed: 0, downgraded: 0, errors: 0 };
    const db = firebase.db;

    const now = admin.firestore.Timestamp.now();
    const snap = await db.collection("users")
      .where("dunningStatus", "==", "failing")
      .where("dunningNextRetryAt", "<=", now)
      .get();

    let processed = 0, downgraded = 0, errors = 0;

    await Promise.all(snap.docs.map(async doc => {
      try {
        const data   = doc.data();
        const nextAttempt = (data.dunningAttempt || 0) + 1;
        const wasDowngraded = nextAttempt > MAX_ATTEMPTS;

        await DunningService.handlePaymentFailure(doc.id, data.dunningGateway || 'unknown', nextAttempt);

        processed++;
        if (wasDowngraded) downgraded++;
      } catch (err: any) {
        console.error(`[Dunning] processDunningQueue error for user ${doc.id}:`, err.message);
        errors++;
      }
    }));

    return { processed, downgraded, errors };
  }

  private static async sendDunningEmail(
    user: any,
    userId: string,
    attempt: number,
    nextRetryDate: Date,
    db: admin.firestore.Firestore
  ) {
    if (!user.email) return;

    const retryDateStr = nextRetryDate.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
    const billingUrl = getLangUrl('/settings/billing');

    const typeMap: Record<number, string> = {
      1: "dunning_attempt_1",
      2: "dunning_attempt_2",
      3: "dunning_attempt_3",
    };
    const emailType = typeMap[attempt] || "dunning_attempt_1";

    await sendEmail(db, user.email, emailType, {
      name:        user.displayName || "Creator",
      amount:      String(user.lastPaymentAmount || ""),
      retry_date:  retryDateStr,
      cancel_date: retryDateStr,
      billing_url: billingUrl,
    }, userId);
  }
}
