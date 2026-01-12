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
} from '../../../services/firebase/cloudFunctions';
import { OfferIdeasReviewUI } from './OfferIdeasReviewUI';
import { ApprovedIdeasDisplay } from './ApprovedIdeasDisplay';
import { CompanyAnalysisResults } from './CompanyAnalysisResults';
import { BlogIdeasDisplay } from './BlogIdeasDisplay';
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
  } | null>(company.offerAnalysis || null);

  // Chosen idea state - synced with company.customFields.chosen_idea
  const [chosenIdea, setChosenIdea] = useState<string | null>(
    (company.customFields?.['chosen_idea'] as string) || null
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
        setChosenIdea(chosenIdeaValue || null);

        if (offerAnalysis && offerAnalysis.ideas && offerAnalysis.ideas.length > 0) {
          // Update local state with new analysis data
          setAnalysisResult({
            companyAnalysis: offerAnalysis.companyAnalysis,
            ideas: offerAnalysis.ideas,
            promptUsed: offerAnalysis.promptUsed || '',
            costInfo: offerAnalysis.costInfo,
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

  // NEW: Handle company offer analysis (two-step process)
  const handleStartAnalysis = async () => {
    const websiteBlogLink = company.customFields?.website_blog_link as string | undefined;
    const websiteUrl = company.website || websiteBlogLink || company.blogAnalysis?.blogUrl;

    if (!websiteUrl) {
      showSnackbar('Company website or blog URL is required for analysis', 'error');
      return;
    }

    setWorkflowState('analyzing_company');
    setLoadingStep('analyzing');

    try {
      const blogContent = company.blogAnalysis?.blogUrl || undefined;

      // ========================================
      // STEP 1: Analyze company website
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
        `Company type detected: ${stage1Result.companyAnalysis.companyType}. Generating blog ideas...`,
        'info'
      );

      // Switch to generating ideas state (shows analysis + loading for ideas)
      setWorkflowState('generating_blog_ideas');
      setLoadingStep('generating');

      // ========================================
      // STEP 2: Generate blog ideas
      // ========================================
      const stage2Result = await generateOfferIdeas(
        companyId,
        company.name,
        websiteUrl,
        stage1Result.companyAnalysis,
        blogContent
      );

      // Update with complete results
      const totalCost = stage1Result.costInfo.totalCost + stage2Result.costInfo.totalCost;
      const completeResult = {
        companyAnalysis: stage1Result.companyAnalysis,
        ideas: stage2Result.ideas,
        promptUsed: stage2Result.promptUsed,
        costInfo: {
          stage1Cost: stage1Result.costInfo.totalCost,
          stage2Cost: stage2Result.costInfo.totalCost,
          totalCost,
        },
      };

      setAnalysisResult(completeResult);

      // Save to Firestore
      const companyRef = doc(db, 'entities', companyId);
      await updateDoc(companyRef, {
        'offerAnalysis.companyAnalysis': completeResult.companyAnalysis,
        'offerAnalysis.ideas': completeResult.ideas,
        'offerAnalysis.promptUsed': completeResult.promptUsed,
        'offerAnalysis.costInfo': completeResult.costInfo,
        'offerAnalysis.analyzedAt': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showSnackbar(
        `Analysis complete! Generated ${stage2Result.ideas.length} blog ideas ($${totalCost.toFixed(4)})`,
        'success'
      );

      setWorkflowState('analysis_complete');
      setLoadingStep(null);
    } catch (error: any) {
      console.error('Error analyzing company offer:', error);
      showSnackbar(error.message || 'Failed to analyze company', 'error');

      // If we have partial results (stage 1 complete but stage 2 failed), keep them
      if (analysisResult?.companyAnalysis && !analysisResult.ideas?.length) {
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
        updatedAt: serverTimestamp(),
      });

      // Clear local state
      setAnalysisResult(null);
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

  // Handle choosing an idea - save to company.customFields.chosen_idea
  const handleChooseIdea = async (ideaTitle: string) => {
    try {
      const companyRef = doc(db, 'entities', companyId);
      await updateDoc(companyRef, {
        'customFields.chosen_idea': ideaTitle,
        updatedAt: serverTimestamp(),
      });

      setChosenIdea(ideaTitle);
      showSnackbar('Idea chosen successfully!', 'success');
    } catch (error: any) {
      console.error('Error choosing idea:', error);
      showSnackbar(error.message || 'Failed to save choice', 'error');
    }
  };

  // Handle clearing the chosen idea
  const handleClearChoice = async () => {
    try {
      const companyRef = doc(db, 'entities', companyId);
      await updateDoc(companyRef, {
        'customFields.chosen_idea': null,
        updatedAt: serverTimestamp(),
      });

      setChosenIdea(null);
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
                Step 2/2: Generating Blog Ideas...
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#64748b',
                  textAlign: 'center',
                  maxWidth: '500px',
                }}
              >
                Creating 5 tailored blog ideas based on the {analysisResult?.companyAnalysis?.companyType || 'company'} analysis. This may take 30-60 seconds.
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

            {/* Blog Ideas Display */}
            {analysisResult?.ideas && analysisResult.ideas.length > 0 && (
              <BlogIdeasDisplay
                ideas={analysisResult.ideas}
                chosenIdeaTitle={chosenIdea}
                onChooseIdea={handleChooseIdea}
                onClearChoice={handleClearChoice}
              />
            )}

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
