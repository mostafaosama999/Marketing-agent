// functions/src/linkedinGeneration/getLinkedInGenerationJob.ts

import * as functions from 'firebase-functions';
import {getFirestore} from 'firebase-admin/firestore';
import {GetJobRequest, GetJobResponse, LinkedInGenerationJob} from './types';

/**
 * Cloud Function: Get LinkedIn Generation Job Status
 * Allows clients to poll for job status and results
 */
export const getLinkedInGenerationJob = functions.https.onCall(
  async (data: GetJobRequest, context): Promise<GetJobResponse> => {
    // 1. Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const userId = context.auth.uid;
    const {jobId} = data;

    // 2. Validate input
    if (!jobId) {
      throw new functions.https.HttpsError('invalid-argument', 'jobId is required');
    }

    try {
      const db = getFirestore();

      // 3. Fetch job document
      const jobRef = db
        .collection('linkedInGenerationJobs')
        .doc(userId)
        .collection('jobs')
        .doc(jobId);

      const jobDoc = await jobRef.get();

      if (!jobDoc.exists) {
        return {
          success: false,
          error: 'Job not found',
        };
      }

      // 4. Verify user owns this job
      const jobData = jobDoc.data() as LinkedInGenerationJob;
      if (jobData.userId !== userId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'You do not have permission to access this job'
        );
      }

      // 5. Return job data
      return {
        success: true,
        job: jobData,
      };
    } catch (error) {
      console.error('Error fetching job:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Failed to fetch job: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);
