import { initFirebase } from "../lib/firebase.js";
import { sendEmail } from "../lib/mailer.js";
import { getAppUrl } from "../lib/config.js";

export class AuthService {
  static async sendPasswordResetEmail(email: string) {
    const firebase = await initFirebase();
    if (!firebase) throw new Error("Firebase not connected");

    const link = await firebase.auth.generatePasswordResetLink(email, {
      url: `${getAppUrl()}/login`,
    });

    // Look up the user's name for personalisation
    let name = "Creator";
    try {
      const userRecord = await firebase.auth.getUserByEmail(email);
      name = userRecord.displayName || "Creator";
    } catch {
      // Non-fatal — use default name
    }

    await sendEmail(firebase.db, email, "password_reset", {
      name,
      reset_link: link,
      expiry:     "1 hour",
    });

    return { message: "Reset link sent successfully" };
  }
}
