/**
 * BatchOperationModal Component
 *
 * A blocking modal that displays progress during batch operations like
 * field renaming or deletion across all records.
 * Prevents user interaction until the operation completes or fails.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

export type BatchOperationType = 'rename' | 'delete';

export interface BatchOperationProgress {
  current: number;
  total: number;
  currentEntity: 'leads' | 'companies';
  phase: 'preparing' | 'processing' | 'finalizing' | 'completed' | 'error';
  errorMessage?: string;
}

interface BatchOperationModalProps {
  open: boolean;
  operationType: BatchOperationType;
  fieldName: string;
  newFieldName?: string; // Only for rename operations
  progress: BatchOperationProgress;
  onRetry?: () => void;
  onClose?: () => void; // Only available when completed or error
}

export const BatchOperationModal: React.FC<BatchOperationModalProps> = ({
  open,
  operationType,
  fieldName,
  newFieldName,
  progress,
  onRetry,
  onClose,
}) => {
  const isCompleted = progress.phase === 'completed';
  const isError = progress.phase === 'error';
  const canClose = isCompleted || isError;
  const progressPercent = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const getTitle = () => {
    if (isCompleted) {
      return operationType === 'rename' ? 'Field Renamed Successfully' : 'Field Deleted Successfully';
    }
    if (isError) {
      return 'Operation Failed';
    }
    return operationType === 'rename' ? 'Renaming Field...' : 'Deleting Field...';
  };

  const getDescription = () => {
    if (isCompleted) {
      if (operationType === 'rename') {
        return `Field "${fieldName}" has been renamed to "${newFieldName}" across all ${progress.total} records.`;
      }
      return `Field "${fieldName}" has been removed from all ${progress.total} records.`;
    }
    if (isError) {
      return progress.errorMessage || 'An error occurred during the operation.';
    }

    switch (progress.phase) {
      case 'preparing':
        return 'Preparing to update records...';
      case 'processing':
        return `Updating ${progress.currentEntity}...`;
      case 'finalizing':
        return 'Finalizing changes...';
      default:
        return 'Processing...';
    }
  };

  const getIcon = () => {
    if (isCompleted) {
      return <CheckCircleIcon sx={{ fontSize: 48, color: '#10b981' }} />;
    }
    if (isError) {
      return <ErrorIcon sx={{ fontSize: 48, color: '#ef4444' }} />;
    }
    if (operationType === 'rename') {
      return <EditIcon sx={{ fontSize: 48, color: '#667eea' }} />;
    }
    return <DeleteIcon sx={{ fontSize: 48, color: '#ef4444' }} />;
  };

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={!canClose}
      onClose={canClose ? onClose : undefined}
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      {/* Header gradient bar */}
      <Box
        sx={{
          height: 4,
          background: isError
            ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
            : isCompleted
            ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
            : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
        }}
      />

      <DialogContent sx={{ textAlign: 'center', py: 4, px: 4 }}>
        {/* Icon */}
        <Box sx={{ mb: 3 }}>
          {!isCompleted && !isError ? (
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress
                size={64}
                sx={{
                  color: operationType === 'rename' ? '#667eea' : '#ef4444',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {operationType === 'rename' ? (
                  <EditIcon sx={{ fontSize: 28, color: '#667eea' }} />
                ) : (
                  <DeleteIcon sx={{ fontSize: 28, color: '#ef4444' }} />
                )}
              </Box>
            </Box>
          ) : (
            getIcon()
          )}
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: '#1e293b',
            mb: 1,
          }}
        >
          {getTitle()}
        </Typography>

        {/* Description */}
        <Typography
          variant="body2"
          sx={{
            color: '#64748b',
            mb: 3,
          }}
        >
          {getDescription()}
        </Typography>

        {/* Progress Bar - only show during processing */}
        {!isCompleted && !isError && progress.phase === 'processing' && (
          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 1,
              }}
            >
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                Progress
              </Typography>
              <Typography variant="caption" sx={{ color: '#667eea', fontWeight: 600 }}>
                {progress.current} / {progress.total} records
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(102, 126, 234, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: operationType === 'rename'
                    ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                    : 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 1,
                color: '#94a3b8',
              }}
            >
              {progressPercent}% complete
            </Typography>
          </Box>
        )}

        {/* Indeterminate progress for preparing/finalizing */}
        {!isCompleted && !isError && progress.phase !== 'processing' && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: 'rgba(102, 126, 234, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                },
              }}
            />
          </Box>
        )}

        {/* Error Alert */}
        {isError && progress.errorMessage && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              textAlign: 'left',
              '& .MuiAlert-message': {
                width: '100%',
              },
            }}
          >
            {progress.errorMessage}
          </Alert>
        )}

        {/* Warning message during operation */}
        {!isCompleted && !isError && (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              textAlign: 'left',
              bgcolor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            Please do not close this window or navigate away until the operation is complete.
          </Alert>
        )}

        {/* Action Buttons - only show when completed or error */}
        {canClose && (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            {isError && onRetry && (
              <Button
                variant="outlined"
                onClick={onRetry}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#667eea',
                  color: '#667eea',
                  '&:hover': {
                    borderColor: '#5568d3',
                    bgcolor: 'rgba(102, 126, 234, 0.05)',
                  },
                }}
              >
                Retry
              </Button>
            )}
            <Button
              variant="contained"
              onClick={onClose}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                background: isCompleted
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: isCompleted
                    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                    : 'linear-gradient(135deg, #5568d3 0%, #6a408e 100%)',
                },
              }}
            >
              {isCompleted ? 'Done' : 'Close'}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BatchOperationModal;
