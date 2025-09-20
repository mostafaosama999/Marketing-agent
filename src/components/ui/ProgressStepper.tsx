import React from 'react';
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
} from '@mui/icons-material';
import { ResearchStep } from '../../app/types/research';

interface ProgressStepperProps {
  steps: ResearchStep[];
  activeStep: number;
  orientation?: 'horizontal' | 'vertical';
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  steps,
  activeStep,
  orientation = 'vertical',
}) => {
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
                <Typography variant="body2" fontWeight={500}>
                  {step.title}
                </Typography>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" component="div">
                  {step.title}
                </Typography>
                <Chip
                  size="small"
                  label={step.status.replace('_', ' ')}
                  color={getStatusColor(step.status)}
                  variant={step.status === 'pending' ? 'outlined' : 'filled'}
                />
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