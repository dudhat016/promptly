import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function deleteOldCollection() {
  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  const db = getFirestore("ai-studio-144262e8-b62f-4b6d-801f-f5b7a636cc0e");
  
  console.log("Identifying documents in 'config' (singular) for deletion...");
  const oldSnap = await db.collection("config").get();
  
  if (oldSnap.empty) {
    console.log("✨ Collection 'config' is already empty.");
  } else {
    const batch = db.batch();
    oldSnap.docs.forEach(doc => {
      console.log(`Scheduling deletion: config/${doc.id}`);
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log("✅ SUCCESS: Collection 'config' has been permanently deleted.");
  }
  
  process.exit(0);
}

deleteOldCollection();
