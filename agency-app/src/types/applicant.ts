// Hiring applicant types

export type ApplicantStatus = 'applied' | 'shortlisted' | 'screening' | 'test_task' | 'offer' | 'hired';

export interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  bio: string;
  education: string;
  sex: string;
  age: string;
  status: ApplicantStatus;
  score: number | null;
  notes: string;
  formAnswers: Record<string, string>;
  source: 'webflow' | 'csv_import' | 'manual';
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicantFormData {
  name: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  bio: string;
  status: ApplicantStatus;
  formAnswers: Record<string, string>;
  source: 'webflow' | 'csv_import' | 'manual';
  submittedAt?: Date;
}

export interface HiringStage {
  id: ApplicantStatus;
  label: string;
  icon: string;
  color: string;
  headerColor: string;
}

export const HIRING_STAGES: HiringStage[] = [
  { id: 'applied', label: 'Applied', icon: '\u{1F4CB}', color: '#3b82f6', headerColor: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
  { id: 'shortlisted', label: 'Shortlisted', icon: '\u2B50', color: '#f59e0b', headerColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
  { id: 'screening', label: 'Screening', icon: '\u{1F50D}', color: '#8b5cf6', headerColor: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
  { id: 'test_task', label: 'Test Task', icon: '\u{1F4DD}', color: '#f97316', headerColor: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' },
  { id: 'offer', label: 'Offer', icon: '\u{1F91D}', color: '#06b6d4', headerColor: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
  { id: 'hired', label: 'Hired', icon: '\u2705', color: '#10b981', headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
];
