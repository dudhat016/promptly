import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signInWithEmailAndPassword as fbSignInWithEmail, createUserWithEmailAndPassword as fbSignUpWithEmail, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
export const auth = getAuth();
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInAsGuest = () => signInAnonymously(auth);
export const signInWithEmail = (e: string, p: string) => fbSignInWithEmail(auth, e, p);
export const signUpWithEmail = (e: string, p: string) => fbSignUpWithEmail(auth, e, p);
export const sendPasswordReset = (e: string) => sendPasswordResetEmail(auth, e);

// Removed testConnection function as it was causing permission errors without specific rules

