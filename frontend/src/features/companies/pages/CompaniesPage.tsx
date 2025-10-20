import React, { useState, useEffect } from 'react';
import { Typography, Box, Alert } from '@mui/material';
import { CompanyResearchForm } from '../components/CompanyResearchForm';
import { ResearchResults } from '../components/ResearchResults';
import { ProgressStepper, TestModePanel } from '../../../components/ui';
import { CompanyResearchRequest, ResearchSession, ResearchStep } from '../../../app/types/research';
import { triggerResearchFlow, TriggerResearchRequest, TriggerResearchResponse } from '../../../services/researchApi';
import { subscribeToSession } from '../../../services/firestoreService';

const initialSteps: ResearchStep[] = [
  {
    id: 1,
    title: 'Analyze Homepage',
    description: 'Extract company information from the homepage',
    status: 'pending',
  },
  {
    id: 2,
    title: 'Find Blog',
    description: 'Locate and analyze the company blog',
    status: 'pending',
  },
  {
    id: 3,
    title: 'Extract AI Trends',
    description: 'Pull latest trends from AI newsletters',
    status: 'pending',
  },
  {
    id: 4,
    title: 'Generate Ideas',
    description: 'Create 15-20 tailored content ideas',
    status: 'pending',
  },
  {
    id: 5,
    title: 'Update Document',
    description: 'Update existing Google Doc with research results',
    status: 'pending',
  },
  {
    id: 6,
    title: 'Complete',
    description: 'Research completed successfully',
    status: 'pending',
  },
];

export const CompaniesPage: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<ResearchSession | null>(null);
  const [steps, setSteps] = useState<ResearchStep[]>(initialSteps);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [testMode, setTestMode] = useState(false);

  // Effect to track active step based on session steps
  useEffect(() => {
    if (currentSession?.steps) {
      const inProgressIndex = currentSession.steps.findIndex(step => step.status === 'in_progress');
      const completedCount = currentSession.steps.filter(step => step.status === 'completed').length;

      if (inProgressIndex >= 0) {
        setActiveStep(inProgressIndex);
      } else if (completedCount === currentSession.steps.length) {
        setActiveStep(currentSession.steps.length - 1);
      } else {
        setActiveStep(completedCount);
      }

      setSteps(currentSession.steps);
    }
  }, [currentSession?.steps]);

  const handleResearchSubmit = async (request: CompanyResearchRequest) => {
    setLoading(true);
    setError('');
    setActiveStep(0);
    setSteps(initialSteps);
    setCurrentSession(null);

    try {
      // Call the Cloud Function to trigger research flow
      const triggerRequest: TriggerResearchRequest = {
        companyUrl: request.url,
      };

      const result = await triggerResearchFlow(triggerRequest);
      const response = result.data as TriggerResearchResponse;

      if (response.success && response.sessionId) {
        // Subscribe to real-time updates for this session
        const unsubscribe = subscribeToSession(response.sessionId, (session) => {
          if (session) {
            setCurrentSession(session);
            if (session.status === 'error') {
              setError(session.error || 'Research failed');
              setLoading(false);
            } else if (session.status === 'completed') {
              setLoading(false);
            }
          }
        });

        // Store unsubscribe function to clean up on unmount
        return () => unsubscribe();
      } else {
        throw new Error('Failed to start research flow');
      }
    } catch (err) {
      console.error('Research submission error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };


  const handleDownload = () => {
    // TODO: Implement download functionality
    console.log('Download report');
  };

  const handleOpenDoc = () => {
    if (currentSession?.googleDocUrl) {
      window.open(currentSession.googleDocUrl, '_blank');
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Company Research
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Automated content research and idea generation for any company.
        Start with a URL and get comprehensive insights in minutes.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TestModePanel
        session={currentSession}
        testMode={testMode}
        onTestModeToggle={setTestMode}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: '1fr 2fr',
          },
          gap: 4,
        }}
      >
        <Box>
          <CompanyResearchForm
            onSubmit={handleResearchSubmit}
            loading={loading}
            error={error}
          />
        </Box>

        <Box>
          {currentSession && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <ProgressStepper
                steps={steps}
                activeStep={activeStep}
                orientation="vertical"
              />

              {currentSession.status === 'completed' && (
                <ResearchResults
                  session={currentSession}
                  onDownload={handleDownload}
                  onOpenDoc={handleOpenDoc}
                />
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};export default CompaniesPage;
