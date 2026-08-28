import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

function getValidString(val: string | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim().replace(/^["']|["']$/g, '');
  return trimmed.length > 0 ? trimmed : null;
}

export const initFirebase = async () => {
  try {
    if (admin.apps.length > 0) {
      const app = admin.app();
      return {
        db: getFirestore(app),
        auth: admin.auth(app),
        admin
      };
    }

    const rawServiceAccount = getValidString(process.env.FIREBASE_SERVICE_ACCOUNT);
    const rawProjectId = getValidString(process.env.VITE_FIREBASE_PROJECT_ID) || getValidString(process.env.FIREBASE_PROJECT_ID);
    const projectId = rawProjectId || 'ai-studio-applet-webapp-9788d';

    if (rawServiceAccount) {
      try {
        let serviceAccount: any;
        if (rawServiceAccount.startsWith('{')) {
          serviceAccount = JSON.parse(rawServiceAccount);
        } else {
          const decoded = Buffer.from(rawServiceAccount, 'base64').toString('utf8');
          if (!decoded || decoded.trim().length === 0) {
            throw new Error("Decoded service account is empty");
          }
          serviceAccount = JSON.parse(decoded);
        }

        if (serviceAccount && serviceAccount.private_key && typeof serviceAccount.private_key === 'string' && !serviceAccount.private_key.includes('\n')) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        if (serviceAccount && serviceAccount.client_email && serviceAccount.private_key) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id || projectId
          });
        } else {
          throw new Error("Invalid service account object shape");
        }
      } catch (parseErr: any) {
        console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT parse warning, falling back to projectId init:", parseErr.message);
        if (admin.apps.length === 0) {
          admin.initializeApp({ projectId });
        }
      }
    } else {
      console.log("ℹ️ No FIREBASE_SERVICE_ACCOUNT, initializing Firebase Admin with projectId:", projectId);
      if (admin.apps.length === 0) {
        admin.initializeApp({ projectId });
      }
    }

    const app = admin.app();
    return {
      db: getFirestore(app),
      auth: admin.auth(app),
      admin
    };
  } catch (e: any) {
    console.error("❌ Firebase Admin Init Error:", e.message);
    if (admin.apps.length > 0) {
      const app = admin.app();
      return {
        db: getFirestore(app),
        auth: admin.auth(app),
        admin
      };
    }
    return null;
  }
};

export const db = admin.apps.length > 0 ? getFirestore(admin.app()) : null;
export default admin;
