import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function inspectCollections() {
  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  const db = getFirestore("ai-studio-144262e8-b62f-4b6d-801f-f5b7a636cc0e");
  const collections = await db.listCollections();
  
  console.log("--- DATABASE COLLECTION LIST ---");
  collections.forEach(col => {
    console.log(`- ${col.id}`);
  });
  console.log("--- END ---");
  process.exit(0);
}

inspectCollections();
