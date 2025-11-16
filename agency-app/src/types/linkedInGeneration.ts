// src/types/linkedInGeneration.ts

import {Timestamp} from 'firebase/firestore';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type JobStage =
  | 'fetching_data'
  | 'analyzing_competitors'
  | 'generating_post'
  | 'generating_image'
  | 'completed';

export interface JobProgress {
  stage: JobStage;
  percentage: number; // 0-100
  message: string;
}

export interface GeneratedPost {
  content: string;
  wordCount: number;
  hashtags: string[];
}

export interface JobResult {
  post: GeneratedPost;
  imageUrl?: string;
  imagePrompt?: string;
}

export interface LinkedInGenerationJob {
  id: string;
  userId: string;
  status: JobStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Input data
  aiTrendId: string;
  aiTrendTitle: string;
  selectedCompetitorIds?: string[]; // For future filtering

  // Progress tracking
  progress: JobProgress;

  // Output
  result?: JobResult;

  // Metadata
  error?: string;
  totalCost: number;
  costs: {
    postGeneration: number;
    imageGeneration: number;
  };
}

// API Request/Response types
export interface GenerateLinkedInPostRequest {
  aiTrendId: string;
}

export interface GenerateLinkedInPostResponse {
  success: boolean;
  jobId: string;
  message: string;
}

export interface GetJobRequest {
  jobId: string;
}

export interface GetJobResponse {
  success: boolean;
  job?: LinkedInGenerationJob;
  error?: string;
}
