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

  // API Cost Tracking
  apiUsage?: {
    ai: {
      totalCost: number;           // Total AI costs (USD)
      totalTokens: number;          // Total tokens used
      totalCalls: number;           // Total AI API calls
      lastUpdated: Date;
      breakdown?: {
        blogAnalysis: { cost: number; calls: number; tokens: number };
        writingProgram: { cost: number; calls: number; tokens: number };
        other: { cost: number; calls: number; tokens: number };
      };
    };
    apollo: {
      totalCost: number;           // Total Apollo costs (USD, credits * $1)
      totalCredits: number;        // Total Apollo credits used
      totalCalls: number;          // Total Apollo API calls
      lastUpdated: Date;
      breakdown?: {
        emailEnrichment: { cost: number; calls: number; credits: number };
        organizationEnrichment: { cost: number; calls: number; credits: number };
        peopleSearch: { cost: number; calls: number; credits: number };
      };
    };
  };
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