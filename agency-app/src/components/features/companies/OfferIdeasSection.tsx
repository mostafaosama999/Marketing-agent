// src/components/features/companies/OfferIdeasSection.tsx
// Main orchestrator component for AI-generated blog ideas workflow
// Now includes new Company Offer Analysis feature

import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Snackbar, Alert, Button, Divider } from '@mui/material';
import { AutoAwesome as AnalyzeIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { Company } from '../../../types/crm';
import {
  generateIdeasForCompany,
  saveApprovedIdeas,
  hasApprovedIdeas,
  getApprovedIdeas,
  GeneratedIdea,
} from '../../../services/api/companyIdeas';
import {
  analyzeCompanyWebsite,
  generateOfferIdeas,
  formatCost,
  CompanyAnalysis,
  BlogIdeaV2,
  IdeaValidationResult,
  CompanyProfileV2,
  ContentGap,
  // V2 staged functions for progressive UI
  v2Stage1Differentiators,
  v2Stage2ContentGaps,
  v2Stage3GenerateIdeas,
  v2Stage4ValidateIdeas,
} from '../../../services/firebase/cloudFunctions';
import { OfferIdeasReviewUI } from './OfferIdeasReviewUI';
import { ApprovedIdeasDisplay } from './ApprovedIdeasDisplay';
import { CompanyAnalysisResults } from './CompanyAnalysisResults';
import { BlogIdeasDisplay, BlogIdeasDisplayDual } from './BlogIdeasDisplay';
import { doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase/firestore';

interface OfferIdeasSectionProps {
  company: Company;
  companyId: string;
}

type WorkflowState = 'empty' | 'generating' | 'reviewing' | 'approved' | 'analyzing_company' | 'generating_blog_ideas' | 'analysis_complete';

type LoadingStep = 'analyzing' | 'generating' | null;

export const OfferIdeasSection: React.FC<OfferIdeasSectionProps> = ({
  company,
  companyId,
}) => {
  // Determine initial state based on company data
  const hasApproved = hasApprovedIdeas(company);
  const hasAnalysis = !!company.offerAnalysis;
  const initialState: WorkflowState = hasAnalysis ? 'analysis_complete' : hasApproved ? 'approved' : 'empty';

  const [workflowState, setWorkflowState] = useState<WorkflowState>(initialState);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>(null);

  // New analysis state - store locally so we don't depend on Firestore refresh
  const [analysisResult, setAnalysisResult] = useState<{
    companyAnalysis: any;
    ideas: any[];
    promptUsed: string;
    costInfo?: any;
    // V2 data
    v2?: {
      ideas: BlogIdeaV2[];
      validationResults?: IdeaValidationResult[];
      companyProfile?: CompanyProfileV2;
      contentGaps?: ContentGap[];
      costInfo?: any;
    };
    dualVersionGeneration?: boolean;
  } | null>(company.offerAnalysis || null);

  // Chosen idea state - synced with company.customFields.chosen_idea
  const [chosenIdea, setChosenIdea] = useState<string | null>(
    (company.customFields?.['chosen_idea'] as string) || null
  );

  // Chosen idea version - tracks which version the chosen idea came from
  const [chosenIdeaVersion, setChosenIdeaVersion] = useState<'v1' | 'v2' | null>(
    (company.customFields?.['chosen_idea_version'] as 'v1' | 'v2') || null
  );

  // Legacy idea generation state
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [generationPrompt, setGenerationPrompt] = useState<string>('');
  const [generalFeedback, setGeneralFeedback] = useState<string>('');
  const [costInfo, setCostInfo] = useState<any>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // V2 staged progress state
  const [v2StageStatus, setV2StageStatus] = useState<string | null>(null);

  // Load existing approved ideas if they exist
  useEffect(() => {
    if (company.offerIdeas?.ideas && company.offerIdeas.ideas.length > 0) {
      setIdeas(company.offerIdeas.ideas);
      setGeneralFeedback(company.offerIdeas.generalFeedback || '');
      setGenerationPrompt(company.offerIdeas.generationPrompt || '');
      setSessionId(company.offerIdeas.sessionId || '');
    }
  }, [company]);

  // Subscribe to real-time updates for offerAnalysis (for async updates from table actions)
  useEffect(() => {
    const companyRef = doc(db, 'entities', companyId);

    const unsubscribe = onSnapshot(companyRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const offerAnalysis = data?.offerAnalysis;

        // Sync chosenIdea from customFields (field key is chosen_idea)
        const chosenIdeaValue = data?.customFields?.['chosen_idea'];
        const chosenIdeaVersionValue = data?.customFields?.['chosen_idea_version'] as 'v1' | 'v2' | undefined;
        setChosenIdea(chosenIdeaValue || null);
        setChosenIdeaVersion(chosenIdeaVersionValue || null);

        if (offerAnalysis && offerAnalysis.ideas && offerAnalysis.ideas.length > 0) {
          // Update local state with new analysis data (including V2 if available)
          setAnalysisResult({
            companyAnalysis: offerAnalysis.companyAnalysis,
            ideas: offerAnalysis.ideas,
            promptUsed: offerAnalysis.promptUsed || '',
            costInfo: offerAnalysis.costInfo,
            // Include V2 data if present
            v2: offerAnalysis.v2 ? {
              ideas: offerAnalysis.v2.ideas || [],
              validationResults: offerAnalysis.v2.validationResults,
              companyProfile: offerAnalysis.v2.companyProfile,
              contentGaps: offerAnalysis.v2.contentGaps,
              costInfo: offerAnalysis.v2.costInfo,
            } : undefined,
            dualVersionGeneration: offerAnalysis.dualVersionGeneration,
          });

          // Update workflow state if we're not currently running analysis
          if (workflowState !== 'analyzing_company' && workflowState !== 'generating_blog_ideas') {
            setWorkflowState('analysis_complete');
          }
        } else if (offerAnalysis?.companyAnalysis && !offerAnalysis.ideas?.length) {
          // Stage 1 complete but Stage 2 not yet - update company analysis
          setAnalysisResult({
            companyAnalysis: offerAnalysis.companyAnalysis,
            ideas: [],
            promptUsed: '',
            costInfo: offerAnalysis.costInfo,
          });
        }
      }
    });

    return () => unsubscribe();
  }, [companyId, workflowState]);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // NEW: Handle company offer analysis with staged V2 for progressive feedback
  const handleStartAnalysis = async () => {
    const websiteBlogLink = company.customFields?.website_blog_link as string | undefined;
    const websiteUrl = company.website || websiteBlogLink || company.blogAnalysis?.blogUrl;

    if (!websiteUrl) {
      showSnackbar('Company website or blog URL is required for analysis', 'error');
      return;
    }

    setWorkflowState('analyzing_company');
    setLoadingStep('analyzing');
    setV2StageStatus(null);

    try {
      const blogContent = company.blogAnalysis?.blogUrl || undefined;

      // ========================================
      // STEP 1: Analyze company website (for company type classification)
      // ========================================
      const stage1Result = await analyzeCompanyWebsite(
        companyId,
        company.name,
        websiteUrl,
        blogContent
      );

      // Immediately show company analysis results
      setAnalysisResult({
        companyAnalysis: stage1Result.companyAnalysis,
        ideas: [], // No ideas yet
        promptUsed: '',
        costInfo: { stage1Cost: stage1Result.costInfo.totalCost, totalCost: stage1Result.costInfo.totalCost },
      });

      showSnackbar(
        `Company type detected: ${stage1Result.companyAnalysis.companyType}. Starting idea generation...`,
        'info'
      );

      // Switch to generating ideas state
      setWorkflowState('generating_blog_ideas');
      setLoadingStep('generating');

      // Prepare Apollo data and blog analysis for V2
      const apolloData = company.apolloEnrichment ? {
        industry: company.apolloEnrichment.industry,
        industries: company.apolloEnrichment.industries,
        employeeCount: company.apolloEnrichment.employeeCount,
        employeeRange: company.apolloEnrichment.employeeRange,
        foundedYear: company.apolloEnrichment.foundedYear,
        totalFunding: company.apolloEnrichment.totalFunding,
        totalFundingFormatted: company.apolloEnrichment.totalFundingFormatted,
        latestFundingStage: company.apolloEnrichment.latestFundingStage,
        technologies: company.apolloEnrichment.technologies,
        keywords: company.apolloEnrichment.keywords,
        description: company.apolloEnrichment.description,
      } : undefined;

      const blogAnalysisData = company.blogAnalysis ? {
        isTechnical: company.blogAnalysis.blogNature?.isTechnical,
        hasCodeExamples: company.blogAnalysis.blogNature?.hasCodeExamples,
        hasDiagrams: company.blogAnalysis.blogNature?.hasDiagrams,
        isDeveloperB2BSaas: company.blogAnalysis.isDeveloperB2BSaas,
        monthlyFrequency: company.blogAnalysis.monthlyFrequency,
        contentSummary: company.blogAnalysis.contentSummary,
        rating: company.blogAnalysis.blogNature?.rating,
      } : undefined;

      // ========================================
      // Start V1 immediately (runs in parallel with V2 stages)
      // ========================================
      const v1Promise = generateOfferIdeas(
        companyId,
        company.name,
        websiteUrl,
        stage1Result.companyAnalysis,
        blogContent
      );

      // ========================================
      // V2 STAGED PIPELINE (sequential with progress updates)
      // ========================================
      let v2Profile: CompanyProfileV2 | undefined;
      let v2Gaps: ContentGap[] = [];
      let v2RawIdeas: BlogIdeaV2[] = [];
      let v2ValidationResults: IdeaValidationResult[] = [];
      let v2TotalCost = 0;

      // V2 Stage 1: Analyze differentiators
      setV2StageStatus('V2: Analyzing company profile...');
      const v2Stage1Result = await v2Stage1Differentiators(
        companyId,
        company.name,
        websiteUrl,
        apolloData,
        blogAnalysisData,
        stage1Result.companyAnalysis.companyType
      );
      v2Profile = v2Stage1Result.profile;
      v2TotalCost += v2Stage1Result.costInfo.totalCost;
      showSnackbar(`V2: Found ${v2Profile.uniqueDifferentiators.length} differentiators`, 'info');

      // V2 Stage 2: Analyze content gaps
      setV2StageStatus('V2: Finding content gaps...');
      const v2Stage2Result = await v2Stage2ContentGaps(
        companyId,
        v2Profile,
        company.blogAnalysis?.contentSummary
      );
      v2Gaps = v2Stage2Result.gaps;
      v2TotalCost += v2Stage2Result.costInfo.totalCost;
      showSnackbar(`V2: Found ${v2Gaps.length} content gaps`, 'info');

      // V2 Stage 3: Generate ideas (show immediately after this!)
      setV2StageStatus('V2: Generating personalized ideas...');
      const v2Stage3Result = await v2Stage3GenerateIdeas(
        companyId,
        v2Profile,
        v2Gaps
      );
      v2RawIdeas = v2Stage3Result.ideas;
      v2TotalCost += v2Stage3Result.costInfo.totalCost;

      // Wait for V1 to complete
      const v1Result = await v1Promise;

      // Show intermediate results with V2 raw ideas (before validation)
      const intermediateResult = {
        companyAnalysis: stage1Result.companyAnalysis,
        ideas: v1Result.ideas,
        promptUsed: v1Result.promptUsed,
        costInfo: {
          stage1Cost: stage1Result.costInfo.totalCost,
          stage2CostV1: v1Result.costInfo.totalCost,
          stage2CostV2: v2TotalCost,
          stage2Cost: v1Result.costInfo.totalCost + v2TotalCost,
          totalCost: stage1Result.costInfo.totalCost + v1Result.costInfo.totalCost + v2TotalCost,
        },
        v2: {
          ideas: v2RawIdeas, // Show raw ideas immediately
          validationResults: undefined, // Not yet validated
          companyProfile: v2Profile,
          contentGaps: v2Gaps,
          costInfo: { totalCost: v2TotalCost },
        },
        dualVersionGeneration: true,
      };
      setAnalysisResult(intermediateResult);
      showSnackbar(`V1: ${v1Result.ideas.length} ideas, V2: ${v2RawIdeas.length} ideas (validating...)`, 'info');

      // V2 Stage 4: Validate ideas (runs after ideas are visible)
      setV2StageStatus('V2: Validating ideas...');
      const v2Stage4Result = await v2Stage4ValidateIdeas(
        companyId,
        v2RawIdeas,
        v2Profile
      );
      v2ValidationResults = v2Stage4Result.validIdeas;
      v2TotalCost += v2Stage4Result.costInfo.totalCost;

      // Use validated ideas if any passed, otherwise keep raw ideas
      const finalV2Ideas = v2ValidationResults.length > 0
        ? v2ValidationResults.map(r => r.idea)
        : v2RawIdeas;

      // Final result with validated V2 ideas
      const totalCost = stage1Result.costInfo.totalCost + v1Result.costInfo.totalCost + v2TotalCost;
      const completeResult = {
        companyAnalysis: stage1Result.companyAnalysis,
        ideas: v1Result.ideas,
        promptUsed: v1Result.promptUsed,
        costInfo: {
          stage1Cost: stage1Result.costInfo.totalCost,
          stage2CostV1: v1Result.costInfo.totalCost,
          stage2CostV2: v2TotalCost,
          stage2Cost: v1Result.costInfo.totalCost + v2TotalCost,
          totalCost,
        },
        v2: {
          ideas: finalV2Ideas,
          validationResults: v2ValidationResults,
          companyProfile: v2Profile,
          contentGaps: v2Gaps,
          costInfo: {
            stage1Cost: v2Stage1Result.costInfo.totalCost,
            stage2Cost: v2Stage2Result.costInfo.totalCost,
            stage3Cost: v2Stage3Result.costInfo.totalCost,
            stage4Cost: v2Stage4Result.costInfo.totalCost,
            totalCost: v2TotalCost,
          },
        },
        dualVersionGeneration: true,
      };

      // Save combined V1+V2 result to Firestore
      const companyRef = doc(db, 'entities', companyId);
      await updateDoc(companyRef, {
        offerAnalysis: completeResult,
        updatedAt: serverTimestamp(),
      });

      setAnalysisResult(completeResult);
      setV2StageStatus(null);

      showSnackbar(
        `Complete! V1: ${v1Result.ideas.length} ideas, V2: ${finalV2Ideas.length} validated ideas ($${totalCost.toFixed(4)})`,
        'success'
      );

      setWorkflowState('analysis_complete');
      setLoadingStep(null);
    } catch (error: any) {
      console.error('Error analyzing company offer:', error);
      showSnackbar(error.message || 'Failed to analyze company', 'error');
      setV2StageStatus(null);

      // If we have partial results, keep them
      if (analysisResult?.companyAnalysis && (analysisResult.ideas?.length || analysisResult.v2?.ideas?.length)) {
        setWorkflowState('analysis_complete');
        showSnackbar('Partial results saved. Some stages may have failed.', 'error');
      } else if (analysisResult?.companyAnalysis) {
        setWorkflowState('analysis_complete');
        showSnackbar('Company analysis saved, but idea generation failed. You can try again.', 'error');
      } else {
        setWorkflowState('empty');
      }
      setLoadingStep(null);
    }
  };

  // Handle regenerate analysis
  const handleRegenerateAnalysis = async () => {
    // Clear existing analysis and restart
    try {
      const companyRef = doc(db, 'entities', companyId);
      await updateDoc(companyRef, {
        offerAnalysis: null,
        // Clear pending approval flag since there's no analysis to approve
        pendingOfferApproval: false,
        pendingOfferApprovalAt: null,
        updatedAt: serverTimestamp(),
      });

      // Clear local state
      setAnalysisResult(null);
      setChosenIdea(null);
      setWorkflowState('empty');
      showSnackbar('Ready to run new analysis', 'info');
    } catch (error: any) {
      console.error('Error clearing analysis:', error);
      showSnackbar('Failed to clear analysis', 'error');
    }
  };

  // LEGACY: Handle old idea generation
  const handleGenerate = async (prompt: string) => {
    setWorkflowState('generating');
    setGenerationPrompt(prompt);

    try {
      const result = await generateIdeasForCompany({
        companyId,
        prompt,
        context: {
          companyName: company.name,
          website: company.website,
          industry: company.industry,
          blogUrl: company.blogAnalysis?.blogUrl || undefined,
        },
      });

      // Transform to our GeneratedIdea format
      const generatedIdeas: GeneratedIdea[] = result.ideas.map((idea) => ({
        ...idea,
        approved: false,
        rejected: false,
        feedback: undefined,
        createdAt: new Date(),
      }));

      setIdeas(generatedIdeas);
      setSessionId(result.sessionId);
      setCostInfo(result.costInfo);
      setWorkflowState('reviewing');

      const costMessage = result.costInfo
        ? ` (${formatCost(result.costInfo)})`
        : '';
      showSnackbar(
        `Successfully generated ${result.totalGenerated} ideas${costMessage}`,
        'success'
      );
    } catch (error: any) {
      console.error('Error generating ideas:', error);
      showSnackbar(error.message || 'Failed to generate ideas', 'error');
      setWorkflowState('empty');
    }
  };

  const handleApprove = (ideaId: string) => {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === ideaId
          ? { ...idea, approved: true, rejected: false }
          : idea
      )
    );
  };

  const handleReject = (ideaId: string) => {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === ideaId
          ? { ...idea, approved: false, rejected: true }
          : idea
      )
    );
  };

  const handleFeedbackChange = (ideaId: string, feedback: string) => {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === ideaId ? { ...idea, feedback } : idea
      )
    );
  };

  const handleGeneralFeedbackChange = (feedback: string) => {
    setGeneralFeedback(feedback);
  };

  const handleSave = async () => {
    try {
      await saveApprovedIdeas(
        companyId,
        ideas,
        generalFeedback,
        generationPrompt,
        sessionId
      );

      const approvedCount = ideas.filter((i) => i.approved).length;
      showSnackbar(
        `Successfully saved ${approvedCount} approved idea${approvedCount !== 1 ? 's' : ''}`,
        'success'
      );
      setWorkflowState('approved');
    } catch (error: any) {
      console.error('Error saving ideas:', error);
      showSnackbar(error.message || 'Failed to save ideas', 'error');
    }
  };

  const handleRegenerate = () => {
    // Reset to generation state
    setIdeas([]);
    setGeneralFeedback('');
    setSessionId('');
    setCostInfo(null);
    setWorkflowState('empty');
    showSnackbar('Ready to generate new ideas', 'info');
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Handle choosing an idea - save to company.customFields.chosen_idea with version tracking
  const handleChooseIdea = async (ideaTitle: string, sourceVersion: 'v1' | 'v2' = 'v1') => {
    try {
      const companyRef = doc(db, 'entities', companyId);
      await updateDoc(companyRef, {
        'customFields.chosen_idea': ideaTitle,
        'customFields.chosen_idea_version': sourceVersion,
        // Clear pending approval flag (CEO has chosen an idea)
        pendingOfferApproval: false,
        pendingOfferApprovalAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setChosenIdea(ideaTitle);
      setChosenIdeaVersion(sourceVersion);
      showSnackbar(`Idea chosen from ${sourceVersion.toUpperCase()}!`, 'success');
    } catch (error: any) {
      console.error('Error choosing idea:', error);
      showSnackbar(error.message || 'Failed to save choice', 'error');
    }
  };

  // Handle clearing the chosen idea
  const handleClearChoice = async () => {
    try {
      const companyRef = doc(db, 'entities', companyId);
      // Check if there are ideas to determine if we should set pending back to true
      const hasIdeas = (analysisResult?.ideas && analysisResult.ideas.length > 0) ||
                       (analysisResult?.v2?.ideas && analysisResult.v2.ideas.length > 0);

      await updateDoc(companyRef, {
        'customFields.chosen_idea': null,
        'customFields.chosen_idea_version': null,
        // Re-enable pending approval if there are ideas to choose from
        pendingOfferApproval: hasIdeas,
        pendingOfferApprovalAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setChosenIdea(null);
      setChosenIdeaVersion(null);
      showSnackbar('Choice cleared', 'info');
    } catch (error: any) {
      console.error('Error clearing choice:', error);
      showSnackbar(error.message || 'Failed to clear choice', 'error');
    }
  };

  // Render based on workflow state
  const renderContent = () => {
    switch (workflowState) {
      case 'empty':
        return (
          <Box>
            {/* NEW ANALYSIS FEATURE - Primary Action */}
            <Box
              sx={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                p: 4,
                mb: 3,
                border: '1px solid #e2e8f0',
                textAlign: 'center',
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                Company Offer Analysis
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#64748b',
                  fontSize: '0.875rem',
                  mb: 3,
                  maxWidth: '600px',
                  mx: 'auto',
                }}
              >
                AI-powered analysis that identifies the company type, business model, and generates 5 tailored blog ideas with detailed insights.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<AnalyzeIcon />}
                onClick={handleStartAnalysis}
                disabled={!company.website && !company.customFields?.website_blog_link && !company.blogAnalysis?.blogUrl}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 600,
                  textTransform: 'none',
                  padding: '14px 32px',
                  fontSize: '1rem',
                  borderRadius: 2,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)',
                  },
                  '&:disabled': {
                    background: '#e2e8f0',
                    color: '#94a3b8',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                Start Analysis
              </Button>
              {!company.website && !company.customFields?.website_blog_link && !company.blogAnalysis?.blogUrl && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: '#ef4444',
                    mt: 1,
                    fontSize: '0.75rem',
                  }}
                >
                  Company website or blog URL is required for analysis
                </Typography>
              )}
            </Box>
          </Box>
        );

      case 'analyzing_company':
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              border: '1px solid #e2e8f0',
            }}
          >
            <CircularProgress
              size={60}
              thickness={4}
              sx={{
                color: '#667eea',
                mb: 3,
              }}
            />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#1e293b',
                mb: 1,
              }}
            >
              Step 1/2: Analyzing Company Type...
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#64748b',
                textAlign: 'center',
                maxWidth: '500px',
              }}
            >
              Identifying {company.name}'s company type, business model, and AI capabilities. This may take 30-60 seconds.
            </Typography>
          </Box>
        );

      case 'generating_blog_ideas':
        return (
          <Box>
            {/* Show company analysis results from Stage 1 */}
            {analysisResult?.companyAnalysis && (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 2,
                    }}
                  >
                    Step 1 Complete: Company Analysis
                  </Typography>
                </Box>
                <CompanyAnalysisResults analysis={analysisResult.companyAnalysis} />
              </>
            )}

            {/* Loading indicator for Stage 2 */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                mt: 4,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                border: '2px dashed #667eea',
              }}
            >
              <CircularProgress
                size={50}
                thickness={4}
                sx={{
                  color: '#764ba2',
                  mb: 2,
                }}
              />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: '#1e293b',
                  mb: 1,
                }}
              >
                {v2StageStatus || 'Generating Blog Ideas...'}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#64748b',
                  textAlign: 'center',
                  maxWidth: '500px',
                }}
              >
                {v2StageStatus
                  ? 'V1 runs in parallel while V2 stages complete sequentially with progress updates.'
                  : `Creating blog ideas based on ${analysisResult?.companyAnalysis?.companyType || 'company'} analysis.`
                }
              </Typography>
            </Box>
          </Box>
        );

      case 'analysis_complete':
        return (
          <Box>
            {/* Header with Regenerate Button */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 4,
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Analysis Results
              </Typography>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRegenerateAnalysis}
                sx={{
                  borderColor: '#667eea',
                  color: '#667eea',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#5568d3',
                    backgroundColor: 'rgba(102, 126, 234, 0.04)',
                  },
                }}
              >
                Run New Analysis
              </Button>
            </Box>

            {/* Company Analysis Results */}
            {analysisResult?.companyAnalysis && (
              <CompanyAnalysisResults analysis={analysisResult.companyAnalysis} />
            )}

            {/* Blog Ideas Display - Dual version if available, otherwise single version */}
            {analysisResult?.dualVersionGeneration && analysisResult?.v2?.ideas ? (
              // Dual version display with V1/V2 tabs
              <BlogIdeasDisplayDual
                v1Ideas={analysisResult.ideas}
                v2Ideas={analysisResult.v2.ideas}
                v2ValidationResults={analysisResult.v2.validationResults}
                chosenIdeaTitle={chosenIdea}
                chosenIdeaVersion={chosenIdeaVersion}
                onChooseIdea={handleChooseIdea}
                onClearChoice={handleClearChoice}
              />
            ) : analysisResult?.ideas && analysisResult.ideas.length > 0 ? (
              // Single version display (backward compatibility)
              <BlogIdeasDisplay
                ideas={analysisResult.ideas}
                chosenIdeaTitle={chosenIdea}
                onChooseIdea={(title) => handleChooseIdea(title, 'v1')}
                onClearChoice={handleClearChoice}
              />
            ) : null}

            {/* Cost Info */}
            {analysisResult?.costInfo && (
              <Box
                sx={{
                  mt: 4,
                  p: 2,
                  background: 'rgba(102, 126, 234, 0.08)',
                  borderRadius: 2,
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontSize: '0.75rem',
                  }}
                >
                  Analysis Cost: {formatCost(analysisResult.costInfo)}
                </Typography>
              </Box>
            )}
          </Box>
        );

      case 'generating':
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              border: '1px solid #e2e8f0',
            }}
          >
            <CircularProgress
              size={60}
              thickness={4}
              sx={{
                color: '#667eea',
                mb: 3,
              }}
            />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#1e293b',
                mb: 1,
              }}
            >
              Generating AI-Powered Blog Ideas...
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#64748b',
                textAlign: 'center',
              }}
            >
              This may take 30-60 seconds. We're analyzing {company.name}'s context
              and generating personalized blog topic ideas.
            </Typography>
          </Box>
        );

      case 'reviewing':
        return (
          <OfferIdeasReviewUI
            ideas={ideas}
            onApprove={handleApprove}
            onReject={handleReject}
            onFeedbackChange={handleFeedbackChange}
            onGeneralFeedbackChange={handleGeneralFeedbackChange}
            onSave={handleSave}
            onRegenerate={handleRegenerate}
            generalFeedback={generalFeedback}
            isSaving={false}
          />
        );

      case 'approved':
        return (
          <ApprovedIdeasDisplay
            ideas={getApprovedIdeas(company)}
            lastGeneratedAt={company.offerIdeas?.lastGeneratedAt}
            generalFeedback={company.offerIdeas?.generalFeedback}
            onRegenerate={handleRegenerate}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      {renderContent()}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
