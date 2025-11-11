// src/types/releaseNotes.ts
// Types for release notes system

export interface ReleaseNote {
  id: string;
  version: string; // e.g., "1.2.0" or "v1.2.0"
  title: string; // e.g., "New Features & Improvements"
  description: string; // Main description/summary
  highlights: string[]; // Array of bullet points
  createdAt: Date;
  createdBy: string; // userId
  updatedAt: Date;
  updatedBy: string; // userId
  published: boolean; // Only published releases show in banner
}

export interface UserReleaseNoteState {
  userId: string;
  lastSeenReleaseId: string | null; // Last release note the user viewed
  dismissedReleaseIds: string[]; // Release notes user clicked "Don't show again"
  updatedAt: Date;
}

export interface ReleaseNoteFormData {
  version: string;
  title: string;
  description: string;
  highlights: string[];
  published: boolean;
}
