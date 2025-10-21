// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

// Firebase configuration for marketing-app-cc237 project
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
  authDomain: "marketing-app-cc237.firebaseapp.com",
  projectId: "marketing-app-cc237",
  storageBucket: "marketing-app-cc237.firebasestorage.app",
  messagingSenderId: "967626109033",
  appId: "1:967626109033:web:9eab40f10ec512f1bc72f8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const auth = getAuth(app);

export default app;