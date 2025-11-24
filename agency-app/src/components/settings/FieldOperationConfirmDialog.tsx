/**
 * FieldOperationConfirmDialog Component
 *
 * Confirmation dialog for field edit (rename) and delete operations.
 * Shows affected record count and requires explicit confirmation for dangerous operations.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { EntityType } from '../../types/fieldDefinitions';

export type OperationType = 'rename' | 'delete';

interface FieldOperationConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newFieldName?: string) => void;
  operationType: OperationType;
  fieldName: string;
  fieldLabel: string;
  entityType: EntityType;
  isDefaultField: boolean;
  isProtected: boolean;
  affectedCount: number | null; // null while loading
  loadingCount: boolean;
}

// Protected fields that cannot be deleted
export const PROTECTED_LEAD_FIELDS = ['id', 'name', 'status', 'createdAt'];
export const PROTECTED_COMPANY_FIELDS = ['id', 'name', 'status', 'createdAt'];

export const isFieldProtected = (fieldId: string, entityType: EntityType): boolean => {
  const protectedFields = entityType === 'lead' ? PROTECTED_LEAD_FIELDS : PROTECTED_COMPANY_FIELDS;
  return protectedFields.includes(fieldId);
};

export const FieldOperationConfirmDialog: React.FC<FieldOperationConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  operationType,
  fieldName,
  fieldLabel,
  entityType,
  isDefaultField,
  isProtected,
  affectedCount,
  loadingCount,
}) => {
  const [newFieldName, setNewFieldName] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [newFieldNameError, setNewFieldNameError] = useState<string | null>(null);

  const isRename = operationType === 'rename';
  const isDelete = operationType === 'delete';
  const entityLabel = entityType === 'lead' ? 'leads' : 'companies';

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setNewFieldName('');
      setConfirmText('');
      setNewFieldNameError(null);
    }
  }, [open]);

  const validateFieldName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Field name is required';
    }
    if (name === fieldName) {
      return 'New name must be different from current name';
    }
    // Only allow alphanumeric and underscores
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      return 'Field name must start with a letter and contain only letters, numbers, and underscores';
    }
    if (name.length > 50) {
      return 'Field name must be 50 characters or less';
    }
    return null;
  };

  const handleNewFieldNameChange = (value: string) => {
    // Convert to snake_case as user types
    const normalizedValue = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setNewFieldName(normalizedValue);
    setNewFieldNameError(null);
  };

  const handleConfirm = () => {
    if (isRename) {
      const error = validateFieldName(newFieldName);
      if (error) {
        setNewFieldNameError(error);
        return;
      }
      onConfirm(newFieldName);
    } else {
      onConfirm();
    }
  };

  const canConfirm = () => {
    if (loadingCount) return false;
    if (isProtected) return false;

    if (isRename) {
      return newFieldName.trim().length > 0 && !validateFieldName(newFieldName);
    }

    // For delete, require typing the field name
    return confirmText === fieldName;
  };

  // Generate display label from field name
  const generateLabel = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
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
          background: isDelete
            ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
        }}
      />

      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {isRename ? (
            <EditIcon sx={{ color: '#667eea' }} />
          ) : (
            <DeleteIcon sx={{ color: '#ef4444' }} />
          )}
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {isRename ? 'Rename Field' : 'Delete Field'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Protected field warning */}
        {isProtected && (
          <Alert
            severity="error"
            icon={<LockIcon />}
            sx={{ mb: 3 }}
          >
            This field is protected and cannot be {isRename ? 'renamed' : 'deleted'}.
            Protected fields are essential for the system to function properly.
          </Alert>
        )}

        {/* Field info */}
        <Box
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: 'rgba(102, 126, 234, 0.05)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Field:
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>
              {fieldLabel}
            </Typography>
            {isDefaultField && (
              <Chip
                label="default"
                size="small"
                sx={{
                  bgcolor: 'rgba(100, 116, 139, 0.1)',
                  color: '#64748b',
                  fontWeight: 600,
                  fontSize: '10px',
                  height: 20,
                }}
              />
            )}
            {isProtected && (
              <Chip
                label="protected"
                size="small"
                icon={<LockIcon sx={{ fontSize: 12 }} />}
                sx={{
                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontWeight: 600,
                  fontSize: '10px',
                  height: 20,
                  '& .MuiChip-icon': {
                    color: '#ef4444',
                  },
                }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Internal name:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                bgcolor: 'rgba(0, 0, 0, 0.05)',
                px: 1,
                py: 0.25,
                borderRadius: 1,
                color: '#475569',
              }}
            >
              {fieldName}
            </Typography>
          </Box>
        </Box>

        {/* Affected records count */}
        <Box
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: isDelete ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)',
            border: `1px solid ${isDelete ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <WarningIcon sx={{ color: isDelete ? '#ef4444' : '#f59e0b', fontSize: 20 }} />
            {loadingCount ? (
              <>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Counting affected records...
                </Typography>
                <CircularProgress size={16} sx={{ mx: 0.5 }} />
              </>
            ) : (
              <>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    color: isDelete ? '#ef4444' : '#f59e0b',
                  }}
                >
                  {affectedCount?.toLocaleString() || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  {entityLabel} have values in this field
                </Typography>
              </>
            )}
          </Box>
          {!isDefaultField && (
            <Typography
              variant="caption"
              sx={{ color: '#94a3b8', display: 'block', mt: 1, ml: 3.5 }}
            >
              {isRename
                ? 'The field will be renamed in all records\' customFields.'
                : 'The field data will be permanently removed from all records.'}
            </Typography>
          )}
          {isDefaultField && (
            <Typography
              variant="caption"
              sx={{ color: '#94a3b8', display: 'block', mt: 1, ml: 3.5 }}
            >
              {isRename
                ? 'The field will be renamed as a top-level property in all records.'
                : 'The field data will be permanently removed from all records.'}
            </Typography>
          )}
        </Box>

        {/* New field name input (for rename) */}
        {isRename && !isProtected && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 1 }}
            >
              New Field Name
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={newFieldName}
              onChange={(e) => handleNewFieldNameChange(e.target.value)}
              placeholder="e.g., work_email, contact_phone"
              error={!!newFieldNameError}
              helperText={newFieldNameError || (newFieldName && `Display label will be: ${generateLabel(newFieldName)}`)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'monospace',
                  '&:hover fieldset': {
                    borderColor: 'rgba(102, 126, 234, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                  },
                },
              }}
            />
          </Box>
        )}

        {/* Confirmation input (for delete) */}
        {isDelete && !isProtected && (
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="body2"
              sx={{ color: '#64748b', mb: 2 }}
            >
              To confirm deletion, type the field name:{' '}
              <Typography
                component="span"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  color: '#ef4444',
                }}
              >
                {fieldName}
              </Typography>
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Type "${fieldName}" to confirm`}
              error={confirmText.length > 0 && confirmText !== fieldName}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'monospace',
                  '&:hover fieldset': {
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#ef4444',
                  },
                },
              }}
            />
          </Box>
        )}

        {/* Final warning for delete */}
        {isDelete && !isProtected && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              This action cannot be undone.
            </Typography>
            <Typography variant="caption">
              All data stored in this field will be permanently deleted.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            color: '#64748b',
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!canConfirm()}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            background: isDelete
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: isDelete
                ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #5568d3 0%, #6a408e 100%)',
            },
            '&:disabled': {
              background: '#e2e8f0',
              color: '#94a3b8',
            },
          }}
        >
          {isRename ? 'Rename Field' : 'Delete Field'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FieldOperationConfirmDialog;
