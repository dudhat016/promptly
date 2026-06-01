import { getApp, getApps, initializeApp } from 'firebase/app';
import { signInWithEmailAndPassword as fbSignInWithEmail, createUserWithEmailAndPassword as fbSignUpWithEmail, getAuth, GoogleAuthProvider, sendPasswordResetEmail, signInAnonymously, signInWithPopup } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Guard: Validate required keys
const requiredKeys = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'];
const missingKeys = requiredKeys.filter(key => !import.meta.env[key]);

if (missingKeys.length > 0) {
  console.error(`❌ [Firebase] Missing required environment variables: ${missingKeys.join(', ')}`);
  console.error(`💡 Tip: Add these to your Vercel Project Settings -> Environment Variables.`);
}

// Guard against Vite HMR re-initialization: re-use the existing app if already initialized.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const dbId = import.meta.env.VITE_FIREBASE_DATABASE_ID || undefined;

// initializeFirestore throws if called twice on the same app (Vite HMR); fall back to getFirestore().
export const db = (() => {
  try {
    return initializeFirestore(
      app,
      { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) },
      dbId,
    );
  } catch {
    return getFirestore(app, dbId);
  }
})();

export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInAsGuest = () => signInAnonymously(auth);
export const signInWithEmail = (e: string, p: string) => fbSignInWithEmail(auth, e, p);
export const signUpWithEmail = (e: string, p: string) => fbSignUpWithEmail(auth, e, p);
export const sendPasswordReset = (e: string) => sendPasswordResetEmail(auth, e);

// Removed testConnection function as it was causing permission errors without specific rules
