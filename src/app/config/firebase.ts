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

// Connect to emulators only when explicitly enabled
const useEmulators = process.env.REACT_APP_USE_EMULATORS === 'true';

if (useEmulators && process.env.NODE_ENV === 'development') {
  console.log('🔧 Using Firebase Emulators');

  // Only connect to emulators if not already connected
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
  } catch (error) {
    // Emulator already connected
  }

  // Check if Firestore is already connected to avoid multiple connections
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    // Emulator already connected
  }

  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (error) {
    // Emulator already connected
  }
} else {
  console.log('🚀 Using Production Firebase Services');
}

export default app;