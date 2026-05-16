// src/types/event.ts
import { Timestamp } from 'firebase/firestore';

// ── Enums / Union Types ──

export type EventCategory = 'client' | 'educational';

export type EventStatus = 'discovered' | 'registered' | 'prep' | 'attended' | 'follow_up' | 'archived';

export type EventType = 'conference' | 'exhibition' | 'hybrid' | 'meetup' | 'workshop' | 'hackathon' | 'mastermind' | 'roundtable' | 'networking_walk' | 'supper_club' | 'retreat';

export type EducationalTier = 'must_attend' | 'strong' | 'worth_trying' | 'skip';

export type TicketAvailability = 'available' | 'sold_out' | 'waitlist' | 'free' | 'unknown';

export type IcpMatch = 'yes' | 'partial' | 'no';

export type EventCompanyRole = 'sponsor' | 'exhibitor' | 'speaker' | 'organizer' | 'host' | 'attendee';

export type EventLeadRole = 'speaker' | 'panelist' | 'workshop_leader' | 'attendee';

export type EventLeadPersona = 'decision_maker' | 'influencer' | 'practitioner' | 'skip';

export type OutreachStatus = 'not_sent' | 'sent' | 'replied' | 'no_response' | 'meeting_booked';

export type EventDiscoverySource = 'claude_skill' | 'manual';

// ── Nested Structures ──

export interface EventLocation {
  venue: string | null;
  city: string;
  country: string;
}

export interface EventPricing {
  ticketPrice: number | null;
  currency: string;
  earlyBirdPrice?: number | null;
  earlyBirdDeadline?: string | null;
  ticketStatus: TicketAvailability;
  pricingNotes?: string;
}

export interface EventScoringBreakdown {
  attendeeComposition: number;    // 0-40
  decisionMakerAccess: number;    // 0-25
  formatNetworking: number;       // 0-20
  strategicBonus: number;         // 0-15
}

export interface EducationalScoringBreakdown {
  attendeeRelevance: number;        // 0-35
  learningContentQuality: number;   // 0-30
  networkingCollaboration: number;  // 0-20
  logisticsAccessibility: number;   // 0-15
}

export interface EventIcpSummary {
  totalIcpCompanies: number;
  totalDecisionMakers: number;
  topCompanies: string[];
}

export interface OutreachEntry {
  status: OutreachStatus;
  channel?: 'linkedin' | 'email' | 'twitter';
  sentAt?: string | null;
  notes?: string;
}

// ── Organizer Research ──

export type CredibilityLevel = 'high' | 'medium' | 'low' | 'unknown';
export type ReputationRating = 'excellent' | 'good' | 'mixed' | 'poor' | 'unknown';
export type RelevanceLevel = 'high' | 'medium' | 'low';

export interface OrganizerResearch {
  organizerName: string;
  summary: string;

  credibility: {
    score: CredibilityLevel;
    reasoning: string;
    yearsActive?: number;
    pastEditions?: number;
  };

  reputation: {
    rating: ReputationRating;
    highlights: string[];
    concerns: string[];
  };

  relevanceToCodeContent: {
    score: RelevanceLevel;
    reasoning: string;
    targetAudience: string;
  };

  notableSpeakers?: string[];
  typicalAttendeeProfile?: string;

  socialPresence: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    followersEstimate?: string;
  };

  researchedAt: string;
  sources: string[];
}

// ── Main Event Document ──

export interface Event {
  id: string;
  name: string;
  website: string | null;
  description?: string;

  // Category discriminator — separates client (ICP) events from educational (agency owner) events
  category: EventCategory;

  // Dates
  startDate: string;
  endDate: string;
  startDateTimestamp: Timestamp;
  endDateTimestamp: Timestamp;

  // Classification
  eventType: EventType;
  tags: string[];

  // Location & Pricing
  location: EventLocation;
  pricing: EventPricing;

  // Attendance
  estimatedAttendance: number | null;

  // Scoring
  eventScore: number;
  scoringBreakdown: EventScoringBreakdown;

  // Lifecycle
  status: EventStatus;

  // Discovery metadata
  discoveredAt: string;
  discoveredBy: EventDiscoverySource;
  sourceReport?: string | null;

  // ICP summary (denormalized) — client events only
  icpSummary?: EventIcpSummary;

  // Notes & actions
  notes?: string;
  recommendedActions?: string[];

  // Organiser — available for both categories (client events derive from event name or companies)
  organiser?: string;

  // ── Educational event fields (only populated when category === 'educational') ──
  audienceDescription?: string;
  gating?: string;
  keyTopics?: string[];
  questionsToAsk?: string[];
  collaborationPotential?: string;
  tier?: EducationalTier;
  educationalScoringBreakdown?: EducationalScoringBreakdown;

  // Organizer research (both categories)
  organizerResearch?: OrganizerResearch;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ── Subcollection: events/{eventId}/companies ──

export interface EventCompany {
  id: string;
  companyName: string;
  companyWebsite: string | null;
  entityId: string | null;
  role: EventCompanyRole;
  sponsorshipTier?: string | null;
  employeeCount: number | null;
  funding: string | null;
  description: string | null;
  icpMatch: IcpMatch;
  icpReason: string;
  hasCwp: boolean;
  cwpNotes?: string | null;
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Subcollection: events/{eventId}/leads ──

export interface EventLead {
  id: string;
  name: string;
  title: string | null;
  company: string;
  companyId?: string | null;
  leadId: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
  role: EventLeadRole;
  sessionTitle?: string | null;
  persona: EventLeadPersona;
  whyRelevant: string;
  preEventOutreach?: OutreachEntry;
  postEventOutreach?: OutreachEntry;
  notes?: string;
  metInPerson?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Form Data Types ──

export type EventFormData = Omit<Event, 'id' | 'startDateTimestamp' | 'endDateTimestamp' | 'createdAt' | 'updatedAt'>;

export type EventCompanyFormData = Omit<EventCompany, 'id' | 'createdAt' | 'updatedAt'>;

export type EventLeadFormData = Omit<EventLead, 'id' | 'createdAt' | 'updatedAt'>;

// ── Filter Types ──

export interface EventFilters {
  search: string;
  statuses: EventStatus[];
  eventTypes: EventType[];
  minScore: number | null;
  tags: string[];
}

// ── Constants ──

export const EVENT_STATUS_ORDER: EventStatus[] = [
  'discovered',
  'registered',
  'prep',
  'attended',
  'follow_up',
  'archived',
];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  discovered: 'Discovered',
  registered: 'Registered',
  prep: 'Prep',
  attended: 'Attended',
  follow_up: 'Follow-up',
  archived: 'Archived',
};

export const EVENT_STATUS_COLORS: Record<EventStatus, { bg: string; text: string }> = {
  discovered: { bg: '#f1f5f9', text: '#475569' },
  registered: { bg: '#dbeafe', text: '#1e40af' },
  prep: { bg: '#fef9c3', text: '#854d0e' },
  attended: { bg: '#dcfce7', text: '#166534' },
  follow_up: { bg: '#f3e8ff', text: '#7c3aed' },
  archived: { bg: '#e2e8f0', text: '#64748b' },
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  conference: 'Conference',
  exhibition: 'Exhibition',
  hybrid: 'Hybrid',
  meetup: 'Meetup',
  workshop: 'Workshop',
  hackathon: 'Hackathon',
  mastermind: 'Mastermind',
  roundtable: 'Roundtable',
  networking_walk: 'Networking Walk',
  supper_club: 'Supper Club',
  retreat: 'Retreat',
};

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  client: 'Client Events',
  educational: 'Educational Events',
};

export const EDUCATIONAL_TIER_LABELS: Record<EducationalTier, string> = {
  must_attend: 'Must Attend',
  strong: 'Strong',
  worth_trying: 'Worth Trying',
  skip: 'Skip',
};

export const EDUCATIONAL_TIER_COLORS: Record<EducationalTier, { bg: string; text: string }> = {
  must_attend: { bg: '#dcfce7', text: '#166534' },
  strong: { bg: '#dbeafe', text: '#1e40af' },
  worth_trying: { bg: '#fef9c3', text: '#854d0e' },
  skip: { bg: '#e2e8f0', text: '#64748b' },
};

export const ICP_MATCH_LABELS: Record<IcpMatch, string> = {
  yes: 'Yes',
  partial: 'Partial',
  no: 'No',
};

export const PERSONA_LABELS: Record<EventLeadPersona, string> = {
  decision_maker: 'Decision Maker',
  influencer: 'Influencer',
  practitioner: 'Practitioner',
  skip: 'Skip',
};

export const PERSONA_COLORS: Record<EventLeadPersona, { bg: string; text: string }> = {
  decision_maker: { bg: '#dcfce7', text: '#166534' },
  influencer: { bg: '#dbeafe', text: '#1e40af' },
  practitioner: { bg: '#f1f5f9', text: '#475569' },
  skip: { bg: '#e2e8f0', text: '#64748b' },
};
