import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

export const initFirebase = async () => {
  try {
    if (admin.apps.length > 0) {
      return {
        db: getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)'),
        auth: admin.auth(),
        admin
      };
    }

    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'ai-studio-applet-webapp-9788d';

    if (serviceAccountVar) {
      try {
        const cleanVar = serviceAccountVar.trim().replace(/^["']|["']$/g, '');
        let serviceAccount: any;

        if (cleanVar.startsWith('{')) {
          serviceAccount = JSON.parse(cleanVar);
        } else {
          const decoded = Buffer.from(cleanVar, 'base64').toString('utf8');
          serviceAccount = JSON.parse(decoded);
        }

        if (serviceAccount.private_key && !serviceAccount.private_key.includes('\n')) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId
        });
      } catch (parseErr: any) {
        console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT parse warning, falling back to projectId init:", parseErr.message);
        admin.initializeApp({ projectId });
      }
    } else {
      console.log("ℹ️ No FIREBASE_SERVICE_ACCOUNT found, initializing Firebase Admin with projectId:", projectId);
      admin.initializeApp({ projectId });
    }

    return {
      db: getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)'),
      auth: admin.auth(),
      admin
    };
  } catch (e: any) {
    console.error("❌ Firebase Admin Init Error:", e.message);
    if (admin.apps.length > 0) {
      return {
        db: getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)'),
        auth: admin.auth(),
        admin
      };
    }
    return null;
  }
};

export const db = admin.apps.length > 0 ? getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)') : null;
export default admin;
