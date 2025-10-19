import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../app/config/firebase';
import { UserProfile, LoginCredentials } from '../app/types/auth';

const USERS_COLLECTION = 'users';

/**
 * Sign in with email and password
 */
export async function signInWithEmail(credentials: LoginCredentials): Promise<User> {
  const { email, password } = credentials;
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));

    if (!userDoc.exists()) {
      console.error(`User profile not found for UID: ${uid}`);
      return null;
    }

    const data = userDoc.data();
    return {
      uid,
      email: data.email || '',
      displayName: data.displayName || '',
      role: data.role || '',
      department: data.department || '',
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Listen to authentication state changes
 */
export function onAuthStateChanged(callback: (user: User | null) => void) {
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}
