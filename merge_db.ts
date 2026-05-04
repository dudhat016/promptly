import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function mergeCollections() {
  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  const db = getFirestore("ai-studio-144262e8-b62f-4b6d-801f-f5b7a636cc0e");
  
  // 1. Get all documents from 'config' (singular)
  console.log("Reading from 'config'...");
  const oldSnap = await db.collection("config").get();
  
  for (const doc of oldSnap.docs) {
    console.log(`Moving document: ${doc.id} -> configs/${doc.id}`);
    await db.collection("configs").doc(doc.id).set({
      ...doc.data(),
      mergedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  console.log("✅ MERGE COMPLETE: All settings moved to 'configs' collection.");
  process.exit(0);
}

mergeCollections();
