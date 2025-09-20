import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { ResearchSession, ResearchStep } from '../../app/types/research';

interface TestModePanelProps {
  session: ResearchSession | null;
  testMode: boolean;
  onTestModeToggle: (enabled: boolean) => void;
}

export const TestModePanel: React.FC<TestModePanelProps> = ({
  session,
  testMode,
  onTestModeToggle,
}) => {
  const [expandedStep, setExpandedStep] = useState<string | false>(false);

  const handleAccordionChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedStep(isExpanded ? panel : false);
  };

  const getStepStatusIcon = (status: ResearchStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'in_progress':
        return <ScheduleIcon color="primary" fontSize="small" />;
      default:
        return <ScheduleIcon color="disabled" fontSize="small" />;
    }
  };

  const getStepStatusColor = (status: ResearchStep['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'in_progress':
        return 'primary';
      default:
        return 'default';
    }
  };

  if (!testMode) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BugReportIcon color="action" />
            <FormControlLabel
              control={
                <Switch
                  checked={testMode}
                  onChange={(e) => onTestModeToggle(e.target.checked)}
                  color="primary"
                />
              }
              label="Enable Test Mode"
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Enable test mode to view detailed step results and debugging information.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BugReportIcon color="primary" />
            <Typography variant="h6">Test Mode - Debug Panel</Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={testMode}
                onChange={(e) => onTestModeToggle(e.target.checked)}
                color="primary"
              />
            }
            label="Enabled"
          />
        </Box>

        {session && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Session ID:</strong> {session.id}
                <br />
                <strong>Status:</strong> {session.status}
                <br />
                <strong>Company URL:</strong> {session.companyUrl}
                <br />
                <strong>Started:</strong> {session.createdAt.toLocaleString()}
                {session.completedAt && (
                  <>
                    <br />
                    <strong>Completed:</strong> {session.completedAt.toLocaleString()}
                  </>
                )}
              </Typography>
            </Alert>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
              Step Results & Debug Information
            </Typography>

            {session.steps.map((step, index) => (
              <Accordion
                key={step.id}
                expanded={expandedStep === `step-${step.id}`}
                onChange={handleAccordionChange(`step-${step.id}`)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    {getStepStatusIcon(step.status)}
                    <Typography sx={{ flexGrow: 1 }}>
                      Step {step.id}: {step.title}
                    </Typography>
                    <Chip
                      label={step.status}
                      size="small"
                      color={getStepStatusColor(step.status) as any}
                      variant={step.status === 'pending' ? 'outlined' : 'filled'}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {step.description}
                    </Typography>

                    {step.result && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Result:
                        </Typography>
                        <Box
                          sx={{
                            p: 2,
                            bgcolor: 'grey.50',
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {typeof step.result === 'string'
                            ? step.result
                            : JSON.stringify(step.result, null, 2)
                          }
                        </Box>
                      </Box>
                    )}

                    {step.error && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        <strong>Error:</strong> {step.error}
                      </Alert>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}

            {session.status === 'completed' && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  Final Results
                </Typography>

                {session.companyAnalysis && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Company Analysis:</Typography>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        whiteSpace: 'pre-wrap',
                        maxHeight: 200,
                        overflow: 'auto',
                      }}
                    >
                      {JSON.stringify(session.companyAnalysis, null, 2)}
                    </Box>
                  </Box>
                )}

                {session.uniqueIdeas && session.uniqueIdeas.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">
                      Generated Ideas ({session.uniqueIdeas.length}):
                    </Typography>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        whiteSpace: 'pre-wrap',
                        maxHeight: 300,
                        overflow: 'auto',
                      }}
                    >
                      {JSON.stringify(session.uniqueIdeas, null, 2)}
                    </Box>
                  </Box>
                )}

                {session.googleDocUrl && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    <strong>Google Doc Created:</strong>{' '}
                    <a href={session.googleDocUrl} target="_blank" rel="noopener noreferrer">
                      {session.googleDocUrl}
                    </a>
                  </Alert>
                )}
              </>
            )}
          </>
        )}

        {!session && (
          <Alert severity="info">
            No active research session. Start a research process to see debug information.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};