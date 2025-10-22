// src/types/auth.ts
export type UserRole = 'admin' | 'manager' | 'writer' | 'viewer' | 'CEO' | 'Manager' | 'Writer' | 'Marketing Analyst';

export interface User {
  id: string;
  email: string;
  displayName?: string;
}

// Alias for backward compatibility
export type AuthUser = User;

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  department?: string;
  phoneNumber?: string;
  specialties?: string[];
  joinDate?: string;
  performance?: UserPerformance;
}

export interface UserPerformance {
  averageScore: number;
  tasksCompleted: number;
  onTimeDelivery: number;
}

export interface AuthContextType {
  user: any | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  canAccess: (allowedRoles: UserRole[]) => boolean;
}