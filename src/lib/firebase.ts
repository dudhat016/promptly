import { initializeApp } from 'firebase/app';
import { signInWithEmailAndPassword as fbSignInWithEmail, createUserWithEmailAndPassword as fbSignUpWithEmail, getAuth, GoogleAuthProvider, sendPasswordResetEmail, signInAnonymously, signInWithPopup } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInAsGuest = () => signInAnonymously(auth);
export const signInWithEmail = (e: string, p: string) => fbSignInWithEmail(auth, e, p);
export const signUpWithEmail = (e: string, p: string) => fbSignUpWithEmail(auth, e, p);
export const sendPasswordReset = (e: string) => sendPasswordResetEmail(auth, e);

// Removed testConnection function as it was causing permission errors without specific rules
