import { initializeApp } from 'firebase/app';
import { getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDjMt3RrBjBqctXZ9UxdriQDfSgFS4HMRE",
  authDomain: "instantnums-48c6e.firebaseapp.com",
  projectId: "instantnums-48c6e",
  storageBucket: "instantnums-48c6e.firebasestorage.app",
  messagingSenderId: "647968972152",
  appId: "1:647968972152:web:c9a9518c832ecff9aafc8d",
  measurementId: "G-TX0EJ98S8T"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
export default app;