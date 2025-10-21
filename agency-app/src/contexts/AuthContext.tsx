// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase/firestore';
import { UserRole, UserProfile, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (user: User) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          role: userData.role || 'Writer',
          displayName: userData.displayName || user.displayName || '',
          department: userData.department || '',
          phoneNumber: userData.phoneNumber || '',
          specialties: userData.specialties || [],
          joinDate: userData.joinDate || '',
          performance: userData.performance || undefined,
        };
        setUserProfile(profile);
      } else {
        const defaultProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          role: 'Writer',
          displayName: user.displayName || '',
        };
        setUserProfile(defaultProfile);
        console.warn('No user profile found, using default role: Writer');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      const fallbackProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        role: 'Writer',
        displayName: user.displayName || '',
      };
      setUserProfile(fallbackProfile);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return userProfile?.role === role;
  };

  const canAccess = (allowedRoles: UserRole[]): boolean => {
    return userProfile ? allowedRoles.includes(userProfile.role) : false;
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    logout,
    hasRole,
    canAccess,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};