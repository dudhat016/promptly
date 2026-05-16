import admin from "firebase-admin";
import { initFirebase } from "../lib/firebase.js";
import { sendEmail } from "../lib/mailer.js";

export class NudgeService {

  static async sendLowCreditsEmail(userId: string, creditsRemaining: number) {
    const firebase = await initFirebase();
    if (!firebase) return { sent: false, reason: "firebase_unavailable" };
    const db = firebase.db;

    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return { sent: false, reason: "user_not_found" };
    const user = userSnap.data()!;
    if (!user.email) return { sent: false, reason: "no_email" };

    // Dedup: max once per 24 hours
    const lastNudge = user.lowCreditNudgeSentAt?.toDate?.() ?? null;
    if (lastNudge && Date.now() - lastNudge.getTime() < 86_400_000) {
      return { sent: false, reason: "cooldown" };
    }

    const result = await sendEmail(db, user.email, "low_credits", {
      name:              user.displayName || "Creator",
      credits_remaining: String(creditsRemaining),
    }, userId);

    if (result.sent) {
      await userRef.update({ lowCreditNudgeSentAt: admin.firestore.FieldValue.serverTimestamp() });
    }
    return result;
  }

  static async runTrialExpiryNudges(): Promise<{ sent: number; skipped: number; errors: number }> {
    const firebase = await initFirebase();
    if (!firebase) return { sent: 0, skipped: 0, errors: 0 };
    const db = firebase.db;

    const now    = Date.now();
    const in3Days = now + 3 * 86_400_000;

    const usersSnap = await db.collection("users")
      .where("subscriptionStatus", "!=", "pro")
      .get();

    let sent = 0, skipped = 0, errors = 0;

    for (const docSnap of usersSnap.docs) {
      const user = docSnap.data();
      if (!user.trialEndsAt || !user.email) { skipped++; continue; }

      const trialEnds = user.trialEndsAt?.toDate?.() ?? new Date(user.trialEndsAt.seconds * 1000);
      const msLeft    = trialEnds.getTime() - now;
      if (msLeft < 0 || msLeft > in3Days - now) { skipped++; continue; }

      if (user.trialExpirySentAt?.toDate?.()) { skipped++; continue; }

      const daysLeft    = Math.ceil(msLeft / 86_400_000);
      const urgencyLabel = daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
      const trialEndDate = trialEnds.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

      try {
        const result = await sendEmail(db, user.email, "trial_expiry", {
          name:           user.displayName || "Creator",
          days_left:      String(daysLeft),
          urgency_label:  urgencyLabel,
          trial_end_date: trialEndDate,
        }, docSnap.id);

        if (result.sent) {
          await db.collection("users").doc(docSnap.id).update({
            trialExpirySentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          sent++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`Trial nudge failed for ${user.email}:`, err);
        errors++;
      }
    }

    return { sent, skipped, errors };
  }

  static async runSubscriptionRenewalReminders(): Promise<{ sent: number; skipped: number; errors: number }> {
    const firebase = await initFirebase();
    if (!firebase) return { sent: 0, skipped: 0, errors: 0 };
    const db = firebase.db;

    const now     = Date.now();
    const in3Days = now + 3 * 86_400_000;

    const usersSnap = await db.collection("users")
      .where("subscriptionStatus", "==", "pro")
      .get();

    let sent = 0, skipped = 0, errors = 0;

    for (const docSnap of usersSnap.docs) {
      const user = docSnap.data();
      if (!user.subscriptionEndsAt || !user.email) { skipped++; continue; }

      const renewsAt = user.subscriptionEndsAt?.toDate?.() ?? new Date(user.subscriptionEndsAt.seconds * 1000);
      const msLeft   = renewsAt.getTime() - now;
      if (msLeft < 0 || msLeft > in3Days - now) { skipped++; continue; }

      const alreadySent = user.renewalReminderSentAt?.toDate?.();
      if (alreadySent && renewsAt.getTime() - alreadySent.getTime() < 30 * 86_400_000) {
        skipped++; continue;
      }

      const daysLeft  = Math.ceil(msLeft / 86_400_000);
      const renewDate = renewsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

      try {
        const result = await sendEmail(db, user.email, "renewal_reminder", {
          name:         user.displayName || "Creator",
          renewal_date: renewDate,
          days_left:    String(daysLeft),
        }, docSnap.id);

        if (result.sent) {
          await db.collection("users").doc(docSnap.id).update({
            renewalReminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          sent++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`Renewal reminder failed for ${user.email}:`, err);
        errors++;
      }
    }

    return { sent, skipped, errors };
  }
}
