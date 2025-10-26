// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

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

// Connect to emulators in development mode
if (process.env.REACT_APP_USE_EMULATOR === 'true') {
  console.log('🔧 Connecting to Firebase Emulators...');

  // Connect Firestore emulator
  try {
    connectFirestoreEmulator(db, 'localhost', 8081);
    console.log('✅ Firestore connected to emulator (localhost:8081)');
  } catch (error) {
    console.warn('⚠️ Firestore emulator already connected or failed to connect');
  }

  // Connect Auth emulator
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('✅ Auth connected to emulator (localhost:9099)');
  } catch (error) {
    console.warn('⚠️ Auth emulator already connected or failed to connect');
  }

  // Connect Functions emulator
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('✅ Functions connected to emulator (localhost:5001)');
  } catch (error) {
    console.warn('⚠️ Functions emulator already connected or failed to connect');
  }

  console.log('🎯 All Firebase services connected to local emulators');
} else {
  console.log('🌐 Using production Firebase services');
}

export default app;