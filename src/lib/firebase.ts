// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Prefer environment variables; fallback to existing defaults for dev convenience
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDOwzthW3Q8S01no-XlGCfj8-a5Sk5eeLU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pdi-v2.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pdi-v2",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pdi-v2.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "631665492653",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:631665492653:web:7b8f9792eb2c58a861fc24",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
