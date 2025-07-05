// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOwzthW3Q8S01no-XlGCfj8-a5Sk5eeLU",
  authDomain: "pdi-v2.firebaseapp.com",
  projectId: "pdi-v2",
  storageBucket: "pdi-v2.firebasestorage.app",
  messagingSenderId: "631665492653",
  appId: "1:631665492653:web:7b8f9792eb2c58a861fc24"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
