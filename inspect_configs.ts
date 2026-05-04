import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function inspectConfigs() {
  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  const db = getFirestore("ai-studio-144262e8-b62f-4b6d-801f-f5b7a636cc0e");
  const snap = await db.collection("configs").get();
  
  console.log("--- DOCUMENTS IN 'configs' ---");
  snap.docs.forEach(doc => {
    console.log(`- ${doc.id}`);
  });
  console.log("--- END ---");
  process.exit(0);
}

inspectConfigs();
