// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
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

// Connect to Functions emulator in development mode
// Auth and Firestore remain connected to production for real user access
if (process.env.REACT_APP_USE_EMULATOR === 'true') {
  console.log('🔧 Connecting Functions to local emulator...');
  connectFunctionsEmulator(functions, 'localhost', 5001);
  console.log('✅ Functions connected to emulator (Auth & Firestore using production)');
}

export default app;