import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

let stripeInstance: Stripe | null = null;

export function getStripe() {
  if (!stripeInstance && process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
    });
  }
  return stripeInstance;
}
