import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();

const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT!, 'base64').toString('utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore(process.env.VITE_FIREBASE_DATABASE_ID || '(default)');

async function fix() {
  await db.collection('configs').doc('payment').update({
    'cashfree.environment': 'production'
  });
  console.log('✅ Cashfree environment updated to PRODUCTION in Firestore');
  process.exit(0);
}

fix();
