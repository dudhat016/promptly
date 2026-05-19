import admin from "firebase-admin";
import { initFirebase } from "../lib/firebase.js";
import { sendEmail } from "../lib/mailer.js";
import { triggerFlow } from "./automationEngine.js";

export class NudgeService {

  static async sendLowCreditsEmail(userId: string, creditsRemaining: number) {
    const firebase = await initFirebase();
    if (!firebase) return { sent: false, reason: "firebase_unavailable" };
    const db = firebase.db;

    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) return { sent: false, reason: "user_not_found" };
    const user = userSnap.data()!;
    if (!user.email) return { sent: false, reason: "no_email" };

    // Dedup handled centrally by sendEmail (dedupWindowMs: 24h on low_credits type)
    return sendEmail(db, user.email, "low_credits", {
      name:              user.displayName || "Creator",
      credits_remaining: String(creditsRemaining),
    }, userId);
  }

  static async runTrialExpiryNudges(): Promise<{ sent: number; skipped: number; errors: number }> {
    const firebase = await initFirebase();
    if (!firebase) return { sent: 0, skipped: 0, errors: 0 };
    const db = firebase.db;

    const now     = Date.now();
    const in3Days = now + 3 * 86_400_000;

    const usersSnap = await db.collection("users")
      .where("trialUsed", "==", true)
      .get();

    let sent = 0, skipped = 0, errors = 0;

    for (const docSnap of usersSnap.docs) {
      const user = docSnap.data();
      if (user.subscriptionStatus !== 'pro') { skipped++; continue; }
      if (!user.trialEndsAt || !user.email)   { skipped++; continue; }

      const trialEnds = user.trialEndsAt?.toDate?.() ?? new Date(user.trialEndsAt.seconds * 1000);
      const msLeft    = trialEnds.getTime() - now;
      if (msLeft < 0 || msLeft > in3Days - now) { skipped++; continue; }

      if (user.trialExpirySentAt?.toDate?.()) { skipped++; continue; }

      const daysLeft     = Math.ceil(msLeft / 86_400_000);
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

      // Skip users on auto-pay — they don't need a "heads up, we're charging you" nudge;
      // they'll get a receipt after renewal fires automatically.
      if (user.autoPayEnabled) { skipped++; continue; }

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

  // Onboarding drip: D1 / D3 / D7 emails for new free users.
  // Run daily. The central dedupWindowMs (30 days) on each type acts as the once-per-user guard,
  // so the cron is safe to retry — sendEmail suppresses duplicates atomically.
  static async runOnboardingDrip(): Promise<{ sent: number; skipped: number; errors: number }> {
    const firebase = await initFirebase();
    if (!firebase) return { sent: 0, skipped: 0, errors: 0 };
    const db = firebase.db;

    const now           = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 86_400_000).toISOString();

    // Fetch users registered within the last 30 days (covers all drip windows)
    const usersSnap = await db.collection("users")
      .where("createdAt", ">=", thirtyDaysAgo)
      .get();

    let sent = 0, skipped = 0, errors = 0;

    for (const docSnap of usersSnap.docs) {
      const user = docSnap.data();
      if (!user.email) { skipped++; continue; }

      const rawCreated = user.createdAt;
      const createdMs  = rawCreated?.toDate
        ? rawCreated.toDate().getTime()
        : new Date(rawCreated).getTime();

      if (isNaN(createdMs)) { skipped++; continue; }

      const daysSince    = (now - createdMs) / 86_400_000;
      const emailDedup   = user.emailDedup || {};
      const name         = user.displayName || "Creator";

      try {
        // D1: 1+ days old, zero unlocks, d1 not yet sent
        if (daysSince >= 1 && daysSince < 30 && !emailDedup.onboarding_d1_nudge && (user.totalUsedCredits || 0) === 0) {
          const result = await sendEmail(db, user.email, 'onboarding_d1_nudge', { name }, docSnap.id);
          result.sent ? sent++ : skipped++;

        // D3: 3+ days old, d3 not yet sent
        } else if (daysSince >= 3 && daysSince < 30 && !emailDedup.onboarding_d3_prompt) {
          const raw      = (user.interests?.[0] || 'marketing') as string;
          const category = raw.charAt(0).toUpperCase() + raw.slice(1);
          const result   = await sendEmail(db, user.email, 'onboarding_d3_prompt', { name, category }, docSnap.id);
          result.sent ? sent++ : skipped++;

        // D7: 7+ days old, still on free, d7 not yet sent
        } else if (daysSince >= 7 && daysSince < 30 && !emailDedup.onboarding_d7_expiry && user.subscriptionStatus !== 'pro') {
          const credits    = String(user.credits ?? 0);
          const expiryDate = new Date(createdMs + 14 * 86_400_000)
            .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
          const result = await sendEmail(db, user.email, 'onboarding_d7_expiry', {
            name, credits_left: credits, expiry_date: expiryDate,
          }, docSnap.id);
          result.sent ? sent++ : skipped++;

        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`Onboarding drip failed for ${user.email}:`, err);
        errors++;
      }
    }

    return { sent, skipped, errors };
  }

  // Weekly digest: top 5 prompts by likes, sent to all active contacts.
  // Run once per week (Monday 09:00 UTC).
  static async sendWeeklyDigest(): Promise<{ sent: number; skipped: number; errors: number }> {
    const firebase = await initFirebase();
    if (!firebase) return { sent: 0, skipped: 0, errors: 0 };
    const db = firebase.db;

    // Compute top 5 prompts by likesCount over the past 7 days
    const sevenDaysAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 7 * 86_400_000));
    const promptsSnap  = await db.collection("prompts")
      .where("status", "==", "approved")
      .where("updatedAt", ">=", sevenDaysAgo)
      .orderBy("updatedAt", "desc")
      .orderBy("likesCount", "desc")
      .limit(10)
      .get();

    // Sort by likesCount client-side (Firestore compound ordering needs an index)
    const topPrompts = promptsSnap.docs
      .map(d => d.data())
      .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
      .slice(0, 5);

    if (topPrompts.length === 0) {
      console.log("[NudgeService] Weekly digest: no approved prompts found, skipping.");
      return { sent: 0, skipped: 0, errors: 0 };
    }

    const topPromptsText = topPrompts
      .map((p, i) => `${i + 1}. ${p.title || p.name || 'Untitled'}`)
      .join('\n');

    const week = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    // Send to all active marketing contacts (respects per-user newsletter pref via userId link)
    const contactsSnap = await db.collection("marketing_contacts")
      .where("status", "==", "active")
      .get();

    let sent = 0, skipped = 0, errors = 0;

    for (const docSnap of contactsSnap.docs) {
      const contact = docSnap.data();
      if (!contact.email) { skipped++; continue; }

      try {
        const result = await sendEmail(db, contact.email, 'weekly_digest', {
          name:         contact.displayName || contact.email.split('@')[0],
          week,
          top_prompts:  topPromptsText,
          dashboard_url: '', // resolved by template var injection in resolveTemplate
        }, contact.userId || undefined);
        result.sent ? sent++ : skipped++;
      } catch (err) {
        console.error(`Weekly digest failed for ${contact.email}:`, err);
        errors++;
      }
    }

    return { sent, skipped, errors };
  }

  static async expireTrials(): Promise<{ expired: number; skipped: number; errors: number }> {
    const firebase = await initFirebase();
    if (!firebase) return { expired: 0, skipped: 0, errors: 0 };
    const db = firebase.db;

    const usersSnap = await db.collection("users")
      .where("subscriptionStatus", "==", "pro")
      .get();

    let expired = 0, skipped = 0, errors = 0;

    for (const docSnap of usersSnap.docs) {
      const user = docSnap.data();

      if (!user.trialUsed || !user.trialEndsAt) { skipped++; continue; }
      if (user.autoPayEnabled)                   { skipped++; continue; }

      const trialEnds = user.trialEndsAt?.toDate?.() ?? new Date(user.trialEndsAt.seconds * 1000);
      if (trialEnds.getTime() > Date.now()) { skipped++; continue; }

      try {
        await docSnap.ref.update({
          subscriptionStatus: 'free',
          credits:            50,
          monthlyLimit:       50,
          activePlanId:       admin.firestore.FieldValue.delete(),
          trialExpiredAt:     admin.firestore.FieldValue.serverTimestamp(),
          updatedAt:          admin.firestore.FieldValue.serverTimestamp(),
        });

        if (user.email) {
          sendEmail(db, user.email, "trial_expired", {
            name: user.displayName || "Creator",
          }, docSnap.id).catch(() => {});
        }

        triggerFlow(db, "trial_expired", docSnap.id, {}).catch(() => {});

        expired++;
      } catch (err) {
        console.error(`Trial expiry failed for ${docSnap.id}:`, err);
        errors++;
      }
    }

    return { expired, skipped, errors };
  }
}
