import admin from "firebase-admin";
import { initFirebase } from "./firebase";
import { sendEmail } from "./mailer";


export async function sendSuccessEmail(
  email: string,
  name: string,
  planName: string,
  orderId?: string,
  amount?: number,
  currency?: string,
  billingCycle?: string
) {
  try {
    const firebase = await initFirebase();
    if (!firebase) return;

    const currencyCode = currency || "USD";
    const displayAmount = amount
      ? `${currencyCode === "INR" ? "₹" : "$"}${amount}`
      : "";

    await sendEmail(firebase.db, email, "purchase_confirmation", {
      name,
      plan:          planName,
      amount:        displayAmount,
      currency:      currencyCode,
      order_id:      orderId     || "",
      billing_cycle: billingCycle || "monthly",
    });

    console.log(`[Email] Purchase confirmation sent to ${email} (order: ${orderId ?? "n/a"})`);
  } catch (err) {
    console.error("[Email] Failed to send purchase confirmation:", err);
  }
}
