import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function checkConfig() {
  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  const db = getFirestore("ai-studio-144262e8-b62f-4b6d-801f-f5b7a636cc0e");
  const doc = await db.collection("configs").doc("email").get();
  
  if (doc.exists) {
    console.log("--- SMTP CONFIG AUDIT ---");
    const data = doc.data();
    console.log("Provider:", data?.provider);
    console.log("Host:", data?.smtpHost);
    console.log("Port:", data?.smtpPort);
    console.log("User:", data?.smtpUser);
    console.log("Secure:", data?.smtpSecure);
    console.log("From Email:", data?.fromEmail);
    console.log("--- END ---");
  } else {
    console.log("❌ Email config document not found!");
  }
  process.exit(0);
}

checkConfig();
