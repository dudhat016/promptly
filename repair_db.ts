import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function repairDatabase() {
  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  const db = getFirestore("ai-studio-144262e8-b62f-4b6d-801f-f5b7a636cc0e");
  
  const correctConfig = {
    provider: 'smtp',
    fromEmail: 'support@techworldproduct.com',
    fromName: 'Promptly AI',
    smtpHost: 'smtp.hostinger.com',
    smtpPort: '465',
    smtpUser: 'support@techworldproduct.com', // FORCE FULL EMAIL
    smtpPass: '#ChDudhat@1286&',
    smtpSecure: true, // FORCE SSL
    replyTo: 'support@techworldproduct.com',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection("configs").doc("email").set(correctConfig);
  console.log("✅ DATABASE REPAIRED: Correct Hostinger settings applied.");
  process.exit(0);
}

repairDatabase();
