import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType, UserProfile, LoginCredentials } from '../app/types/auth';
import {
  signInWithEmail,
  signOut as authSignOut,
  onAuthStateChanged,
  getUserProfile,
} from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      setLoading(true);
      setError(null);

      if (firebaseUser) {
        // User is signed in, fetch their profile from Firestore
        const profile = await getUserProfile(firebaseUser.uid);
        if (profile) {
          setUser(profile);
        } else {
          setError('User profile not found in database. Please contact administrator.');
          setUser(null);
          await authSignOut();
        }
      } else {
        // User is signed out
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);

      // Sign in with Firebase Auth
      const firebaseUser = await signInWithEmail(credentials);

      // Fetch user profile from Firestore
      const profile = await getUserProfile(firebaseUser.uid);

      if (!profile) {
        throw new Error('User profile not found in database. Please contact administrator.');
      }

      setUser(profile);
    } catch (err: any) {
      // Handle Firebase Auth errors
      let errorMessage = 'Failed to sign in. Please try again.';

      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact administrator.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await authSignOut();
      setUser(null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
