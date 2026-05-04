import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

// Helper for Firebase
function initFirebase() {
  if (!admin.apps.length) {
    try {
      const saValue = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!saValue) {
        console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT missing");
        return false;
      }
      
      const cleanJson = saValue.trim().replace(/^'|'$/g, '').replace(/^"|"$/g, '');
      const serviceAccount = JSON.parse(cleanJson);
      
      if (serviceAccount.private_key) {
        console.log(`🔑 Key Length: ${serviceAccount.private_key.length}`);
        // The "Master Fix": Handle literal \n, \\n, and even \\\n
        serviceAccount.private_key = serviceAccount.private_key
          .replace(/\\n/g, '\n')
          .replace(/\\\\n/g, '\n')
          .replace(/\n\n/g, '\n') // Remove double newlines
          .trim();
          
        if (!serviceAccount.private_key.startsWith('-----BEGIN PRIVATE KEY-----\n')) {
          serviceAccount.private_key = serviceAccount.private_key.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
        }
        if (!serviceAccount.private_key.endsWith('\n-----END PRIVATE KEY-----')) {
          serviceAccount.private_key = serviceAccount.private_key.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
        }
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("✅ Firebase Admin Connected Successfully");
      return true;
    } catch (e: any) {
      console.error("❌ Firebase Init Error:", e.message);
      return false;
    }
  }
  return true;
}

export default async function handler(req: any, res: any) {
  const { url } = req;
  console.log("💉 Request Hit:", url);

  const firebaseOk = initFirebase();

  if (url.includes('/api/health')) {
    return res.status(200).json({ 
      status: "diagnostic-ok", 
      firebase: firebaseOk ? "connected" : "failed" 
    });
  }

  res.status(200).json({ message: "Main API is Online! 🚀" });
}
