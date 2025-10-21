// src/types/client.ts
export interface Client {
  id: string;
  name: string;
  industry: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  website: string;
  status: string;
  contractValue: number;
  monthlyRevenue: number;
  startDate: string;
  notes: string;
  createdAt?: string; // ISO timestamp for onboarding tracking
  guidelines?: ClientGuidelines;
  compensation?: ClientCompensation;
}

export interface GuidelineSection {
  id: string;
  title: string;
  content: string;
  order: number;
  type: 'freeform' | 'checklist'; // New field to distinguish content types
  checklistItems?: ChecklistItem[]; // Array of checklist items
}

export interface ChecklistItem {
  id: string;
  text: string;
  order: number;
}

export interface ClientGuidelines {
  // New section-based format
  sections?: GuidelineSection[];
  
  // Legacy fields for backward compatibility
  brandVoice?: string;
  targetAudience?: string;
  contentStyle?: string;
  keyMessages?: string[];
  avoidTopics?: string[];
  preferredFormats?: string[];
  seoKeywords?: string[];
  competitorAnalysis?: string;
  content?: string; // Legacy single content field
  updatedAt?: string;
}

export interface ClientCompensation {
  blogRate?: number;
  tutorialRate?: number;
  caseStudyRate?: number;
  whitepaperRate?: number;
  socialMediaRate?: number;
  emailRate?: number;
  landingPageRate?: number;
  otherRate?: number;
}