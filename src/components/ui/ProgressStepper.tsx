import React, { useState, useEffect } from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { ResearchStep } from '../../app/types/research';

interface ProgressStepperProps {
  steps: ResearchStep[];
  activeStep: number;
  orientation?: 'horizontal' | 'vertical';
}

// Utility function to format duration
const formatDuration = (durationMs: number): string => {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

// Utility function to get elapsed time
const getElapsedTime = (startTime: Date | any): number => {
  // Handle Firestore Timestamp objects
  const startTimeMs = startTime?.toDate ? startTime.toDate().getTime() :
                     startTime?.getTime ? startTime.getTime() :
                     typeof startTime === 'number' ? startTime : Date.now();
  return Date.now() - startTimeMs;
};

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  steps,
  activeStep,
  orientation = 'vertical',
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for real-time timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Get timing display text for a step
  const getTimingText = (step: ResearchStep): string | null => {
    if (step.status === 'completed' && step.duration) {
      // Handle duration as either number or any other type
      const durationMs = typeof step.duration === 'number' ? step.duration : 0;
      return `Completed in ${formatDuration(durationMs)}`;
    }
    if (step.status === 'in_progress' && step.startedAt) {
      const elapsed = getElapsedTime(step.startedAt);
      return `Running for ${formatDuration(elapsed)}`;
    }
    return null;
  };

  const getStepIcon = (step: ResearchStep, stepIndex: number) => {
    if (step.status === 'completed') {
      return <CheckCircleIcon color="success" />;
    }
    if (step.status === 'error') {
      return <ErrorIcon color="error" />;
    }
    if (step.status === 'in_progress') {
      return <CircularProgress size={20} />;
    }
    if (stepIndex < activeStep) {
      return <CheckCircleIcon color="success" />;
    }
    return <ScheduleIcon color="disabled" />;
  };

  const getStatusColor = (status: ResearchStep['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'primary';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  if (orientation === 'horizontal') {
    return (
      <Box sx={{ width: '100%', mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((step, index) => (
            <Step key={step.id} completed={step.status === 'completed'}>
              <StepLabel
                icon={getStepIcon(step, index)}
                error={step.status === 'error'}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" fontWeight={500}>
                    {step.title}
                  </Typography>
                  {getTimingText(step) && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {getTimingText(step)}
                    </Typography>
                  )}
                </Box>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.id}>
            <StepLabel
              icon={getStepIcon(step, index)}
              error={step.status === 'error'}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="h6" component="div">
                  {step.title}
                </Typography>
                <Chip
                  size="small"
                  label={step.status.replace('_', ' ')}
                  color={getStatusColor(step.status)}
                  variant={step.status === 'pending' ? 'outlined' : 'filled'}
                />
                {getTimingText(step) && (
                  <Chip
                    size="small"
                    icon={<AccessTimeIcon />}
                    label={getTimingText(step)}
                    variant="outlined"
                    color="primary"
                  />
                )}
              </Box>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {step.description}
              </Typography>

              {step.status === 'in_progress' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="primary">
                    Processing...
                  </Typography>
                </Box>
              )}

              {step.status === 'error' && step.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {step.error}
                </Alert>
              )}

              {step.status === 'completed' && step.result && (
                <Box sx={{ mb: 2 }}>
                  {typeof step.result === 'string' ? (
                    <Typography variant="body2" color="success.main">
                      ✓ {step.result}
                    </Typography>
                  ) : (
                    <Alert severity="success">
                      Step completed successfully
                    </Alert>
                  )}
                </Box>
              )}
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};