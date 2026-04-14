// Hiring applicant types

export interface AiScoreDimensions {
  locationUniversityFit: number;     // 0-2
  engineeringExperience: number;     // 0-3
  answerQuality: number;             // 0-2
  writingCommunication: number;      // 0-1.5
  authenticityRoleFit: number;       // 0-1.5
  bonusSignals: number;              // 0-1
}

export interface AiScore {
  total: number;                     // 0-10
  dimensions: AiScoreDimensions;
  tier: 'ADVANCE' | 'REVIEW' | 'HOLD' | 'REJECT';
  reasoning: string;
  redFlags: string[];
  strengths: string[];
  overQualified: boolean;
  instantReject: boolean;
  scoredAt: Date;
}

export type ApplicantStatus = 'ai_rejected' | 'backlog' | 'applied' | 'shortlisted' | 'test_task' | 'not_responded' | 'responded' | 'feedback' | 'interview' | 'hired' | 'rejected';

// The stage an applicant was in when they were rejected (excludes 'rejected' and 'hired')
export type RejectionStage = 'applied' | 'shortlisted' | 'test_task' | 'not_responded' | 'responded' | 'feedback' | 'interview';

export const REJECTION_STAGE_LABELS: Record<RejectionStage, string> = {
  applied: 'After Screening',
  shortlisted: 'After Shortlist',
  test_task: 'After Writing Test',
  not_responded: 'Ghosted / No Response',
  responded: 'After Response',
  feedback: 'After Feedback',
  interview: 'After Interview',
};

export const REJECTION_STAGE_COLORS: Record<RejectionStage, string> = {
  applied: '#3b82f6',
  shortlisted: '#f59e0b',
  test_task: '#f97316',
  not_responded: '#6b7280',
  responded: '#8b5cf6',
  feedback: '#0ea5e9',
  interview: '#06b6d4',
};

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
  availability: string;
  status: ApplicantStatus;
  score: number | null;
  aiScore?: AiScore | null;
  notes: string;
  formAnswers: Record<string, string>;
  source: 'webflow' | 'tally' | 'csv_import' | 'manual';
  recruiterSourced?: boolean;
  jobPost?: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  rejectionStage?: RejectionStage;
  rejectedAt?: Date;
  rejectionNote?: string;
  testTaskUrl?: string;
  outreach?: {
    email?: {
      status: string;
      draftCreatedAt?: Date;
      draftId?: string;
      draftUrl?: string;
      subject?: string;
      templateName?: string;
    };
  };
}

export interface ApplicantFormData {
  name: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  bio: string;
  status: ApplicantStatus;
  formAnswers: Record<string, string>;
  source: 'webflow' | 'tally' | 'csv_import' | 'manual';
  jobPost?: string;
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
  { id: 'ai_rejected', label: 'AI Rejected', icon: '\u{1F916}', color: '#475569', headerColor: 'linear-gradient(135deg, #64748b 0%, #334155 100%)' },
  { id: 'backlog', label: 'Backlog', icon: '\u{1F4E6}', color: '#64748b', headerColor: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' },
  { id: 'applied', label: 'Applied', icon: '\u{1F4CB}', color: '#3b82f6', headerColor: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
  { id: 'shortlisted', label: 'Shortlisted', icon: '\u2B50', color: '#f59e0b', headerColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
  { id: 'test_task', label: 'Writing Test', icon: '\u{1F4DD}', color: '#f97316', headerColor: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' },
  { id: 'not_responded', label: 'Not Responded', icon: '\u{1F47B}', color: '#6b7280', headerColor: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' },
  { id: 'responded', label: 'Responded', icon: '\u{1F4E9}', color: '#8b5cf6', headerColor: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
  { id: 'feedback', label: 'Feedback', icon: '\u{1F4AC}', color: '#0ea5e9', headerColor: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' },
  { id: 'interview', label: 'Interview', icon: '\u{1F91D}', color: '#06b6d4', headerColor: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
  { id: 'hired', label: 'Hired', icon: '\u2705', color: '#10b981', headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
  { id: 'rejected', label: 'Rejected', icon: '\u274C', color: '#ef4444', headerColor: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
];
