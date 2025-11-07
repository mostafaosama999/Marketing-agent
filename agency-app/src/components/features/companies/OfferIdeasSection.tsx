// src/components/features/companies/OfferIdeasSection.tsx
// Main orchestrator component for AI-generated blog ideas workflow

import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Snackbar, Alert } from '@mui/material';
import { Company } from '../../../types/crm';
import {
  generateIdeasForCompany,
  saveApprovedIdeas,
  hasApprovedIdeas,
  getApprovedIdeas,
  GeneratedIdea,
} from '../../../services/api/companyIdeas';
import { OfferIdeasGenerationUI } from './OfferIdeasGenerationUI';
import { OfferIdeasReviewUI } from './OfferIdeasReviewUI';
import { ApprovedIdeasDisplay } from './ApprovedIdeasDisplay';
import { formatCost } from '../../../services/firebase/cloudFunctions';

interface OfferIdeasSectionProps {
  company: Company;
  companyId: string;
}

type WorkflowState = 'empty' | 'generating' | 'reviewing' | 'approved';

export const OfferIdeasSection: React.FC<OfferIdeasSectionProps> = ({
  company,
  companyId,
}) => {
  // Determine initial state based on company data
  const hasApproved = hasApprovedIdeas(company);
  const initialState: WorkflowState = hasApproved ? 'approved' : 'empty';

  const [workflowState, setWorkflowState] = useState<WorkflowState>(initialState);
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

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

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

  // Render based on workflow state
  const renderContent = () => {
    switch (workflowState) {
      case 'empty':
        return (
          <OfferIdeasGenerationUI
            companyName={company.name}
            onGenerate={handleGenerate}
            isGenerating={false}
          />
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
