import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAm2sPcqn2kjMK7CzfeStOWo9rQ24B6TWA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "infiniquant-da402.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "infiniquant-da402",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "infiniquant-da402.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "608512799755",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:608512799755:web:894c7c6915b975a366c30e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-KD0Y9DFE2B"
};

const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error logging in with Google", error);
    throw error;
  }
};

export const loginAnonymously = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Error logging in anonymously", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out", error);
    throw error;
  }
};
