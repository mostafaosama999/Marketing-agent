// Outbound hiring: sourced candidates from the BDR hiring skill's `source` mode.

export type OutboundStatus = 'sourced' | 'contacted' | 'replied' | 'interested' | 'closed';

export type ArchiveReason = 'rejected_by_them' | 'rejected_by_us' | 'no_response' | 'moved_offline';

export const ARCHIVE_REASON_LABELS: Record<ArchiveReason, string> = {
  rejected_by_them: 'Rejected by candidate',
  rejected_by_us: 'Rejected by us',
  no_response: 'No response',
  moved_offline: 'Moved offline',
};

export interface SourcedCandidate {
  id: string;
  name: string;
  linkedInUrl: string;
  linkedInUrlNormalized: string;
  university: string | null;
  universityTier: 'A' | 'B' | 'C' | null;
  currentRole: string | null;
  currentCompany: string | null;
  location: string | null;
  estimatedAge: number | null;
  yearsOfExperience: number | null;
  techStack: string[];
  englishLevel: string | null;
  writingSignals: string | null;
  score: number;
  tier: 'standard' | 'premium' | null;
  estimatedCurrentSalaryEgp: number | null;
  recommendedOfferEgp: number | null;
  whyThisPerson: string;
  risks: string | null;
  draftOutreach: string;
  sentAt: Date | null;
  repliedAt: Date | null;
  messageSent: string | null;
  cwpAlumni: boolean;
  apifyEnrichment: Record<string, any> | null;
  sourcedAt: Date;
  sourcedBy: 'claude_skill' | 'manual';
  sourceReport: string | null;
  focusArea: string | null;
  status: OutboundStatus;
  archived: boolean;
  archiveReason: ArchiveReason | null;
  archivedAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SourcedCandidateFormData = Omit<
  SourcedCandidate,
  'id' | 'linkedInUrlNormalized' | 'sentAt' | 'repliedAt' | 'messageSent' | 'archived' | 'archiveReason' | 'archivedAt' | 'createdAt' | 'updatedAt'
>;

export interface OutboundStage {
  id: OutboundStatus;
  label: string;
  icon: string;
  color: string;
  headerColor: string;
}

export const OUTBOUND_STAGES: OutboundStage[] = [
  { id: 'sourced', label: 'Sourced', icon: '\u{1F50D}', color: '#64748b', headerColor: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' },
  { id: 'contacted', label: 'Contacted', icon: '\u{1F4E4}', color: '#3b82f6', headerColor: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
  { id: 'replied', label: 'Replied', icon: '\u{1F4AC}', color: '#8b5cf6', headerColor: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
  { id: 'interested', label: 'Interested', icon: '\u{1F525}', color: '#f59e0b', headerColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
  { id: 'closed', label: 'Closed', icon: '\u2705', color: '#10b981', headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
];

export const STALE_DAYS_THRESHOLD = 7;

export function isStale(candidate: Pick<SourcedCandidate, 'status' | 'sentAt'>): boolean {
  if (candidate.status !== 'contacted' || !candidate.sentAt) return false;
  const ageMs = Date.now() - candidate.sentAt.getTime();
  return ageMs > STALE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000;
}
