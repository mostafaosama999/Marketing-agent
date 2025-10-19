/**
 * Authentication and User Types
 */

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  department: string;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}
