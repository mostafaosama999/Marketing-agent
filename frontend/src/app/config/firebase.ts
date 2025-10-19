import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

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

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

// Connect to Functions emulator only when explicitly enabled
const useFunctionsEmulator = process.env.REACT_APP_USE_FUNCTIONS_EMULATOR === 'true';

if (useFunctionsEmulator && process.env.NODE_ENV === 'development') {
  console.log('🔧 Using Functions Emulator (Auth & Firestore remain in production)');

  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (error) {
    // Emulator already connected
  }
} else {
  console.log('🚀 Using Production Firebase Services');
}

export default app;