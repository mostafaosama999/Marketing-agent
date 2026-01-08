import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Paper,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import BusinessIcon from '@mui/icons-material/Business';
import { Company } from '../../../types/crm';
import { BulkCompanyRow, BulkCompanyValidation, BulkCompanyImportResult } from '../../../types/bulkCompany';

interface BulkCompanyAddDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rows: BulkCompanyRow[]) => Promise<BulkCompanyImportResult>;
  existingCompanies: Company[];
}

const generateRowId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createEmptyRow = (): BulkCompanyRow => ({
  id: generateRowId(),
  name: '',
  website: '',
  industry: '',
  description: '',
  ratingV2: '',
});

const validateRow = (
  row: BulkCompanyRow,
  existingCompanies: Company[]
): BulkCompanyValidation => {
  const errors: BulkCompanyValidation['errors'] = {};

  // Check if row has any data
  const hasData = row.name || row.website || row.industry || row.description || row.ratingV2;

  // Name is required if any field has data
  if (hasData && !row.name.trim()) {
    errors.name = 'Name is required';
  }

  // Check for duplicate (warning, not error)
  let isDuplicate = false;
  if (row.name.trim()) {
    const nameLower = row.name.trim().toLowerCase();
    isDuplicate = existingCompanies.some(
      c => c.name.toLowerCase() === nameLower
    );
  }

  // Website URL validation (if provided)
  if (row.website && row.website.trim()) {
    try {
      new URL(row.website.startsWith('http') ? row.website : `https://${row.website}`);
    } catch {
      errors.website = 'Invalid URL format';
    }
  }

  // Rating validation (if provided)
  if (row.ratingV2 && row.ratingV2.trim()) {
    const rating = parseFloat(row.ratingV2);
    if (isNaN(rating) || rating < 1 || rating > 10) {
      errors.ratingV2 = 'Rating must be between 1-10';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    isDuplicate,
    errors,
  };
};

const isRowEmpty = (row: BulkCompanyRow): boolean => {
  return !row.name && !row.website && !row.industry && !row.description && !row.ratingV2;
};

export const BulkCompanyAddDialog: React.FC<BulkCompanyAddDialogProps> = ({
  open,
  onClose,
  onSubmit,
  existingCompanies,
}) => {
  const [rows, setRows] = useState<BulkCompanyRow[]>(() =>
    Array.from({ length: 5 }, createEmptyRow)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<BulkCompanyImportResult | null>(null);

  // Compute validations for all rows
  const rowValidations = useMemo(() => {
    return rows.map(row => ({
      row,
      validation: validateRow(row, existingCompanies),
      isEmpty: isRowEmpty(row),
    }));
  }, [rows, existingCompanies]);

  // Get valid non-empty rows
  const validRows = useMemo(() => {
    return rowValidations.filter(r => !r.isEmpty && r.validation.isValid).map(r => r.row);
  }, [rowValidations]);

  // Count duplicates
  const duplicateCount = useMemo(() => {
    return rowValidations.filter(r => !r.isEmpty && r.validation.isDuplicate && r.validation.isValid).length;
  }, [rowValidations]);

  // Check if form can be submitted
  const canSubmit = validRows.length > 0 && !isSubmitting;

  const handleRowChange = useCallback((rowId: string, field: keyof BulkCompanyRow, value: string) => {
    setRows(prev => prev.map(row =>
      row.id === rowId ? { ...row, [field]: value } : row
    ));
  }, []);

  const handleAddRow = useCallback(() => {
    setRows(prev => [...prev, createEmptyRow()]);
  }, []);

  const handleRemoveRow = useCallback((rowId: string) => {
    setRows(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(row => row.id !== rowId);
    });
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const importResult = await onSubmit(validRows);
      setResult(importResult);

      if (importResult.successful > 0 && importResult.failed === 0) {
        // All succeeded - close dialog after brief delay
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating companies:', error);
      setResult({
        successful: 0,
        failed: validRows.length,
        companyIds: [],
        errors: ['Failed to create companies. Please try again.'],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setRows(Array.from({ length: 5 }, createEmptyRow));
    setResult(null);
    onClose();
  };

  const cellStyles = {
    padding: '4px 8px',
    '& .MuiInputBase-root': {
      fontSize: '0.875rem',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#e2e8f0',
    },
    '&:focus-within .MuiOutlinedInput-notchedOutline': {
      borderColor: '#667eea',
      borderWidth: '2px',
    },
  };

  const errorCellStyles = {
    ...cellStyles,
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#f56565',
    },
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          borderRadius: '12px',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon sx={{ color: '#667eea' }} />
          <Typography variant="h6" component="span" fontWeight={600}>
            Bulk Add Companies
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Add multiple companies at once
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Result Alert */}
        {result && (
          <Alert
            severity={result.failed === 0 ? 'success' : 'warning'}
            sx={{ mb: 2 }}
          >
            {result.successful > 0 && `${result.successful} compan${result.successful === 1 ? 'y' : 'ies'} created/updated successfully.`}
            {result.failed > 0 && ` ${result.failed} failed.`}
            {result.errors.length > 0 && (
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </Box>
            )}
          </Alert>
        )}

        {/* Spreadsheet Grid */}
        <TableContainer
          component={Paper}
          sx={{
            maxHeight: 400,
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            '& .MuiTableCell-head': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.8rem',
              padding: '10px 8px',
              position: 'sticky',
              top: 0,
              zIndex: 1,
            },
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }}>#</TableCell>
                <TableCell sx={{ minWidth: 150 }}>Name *</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Website</TableCell>
                <TableCell sx={{ minWidth: 130 }}>Industry</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Description</TableCell>
                <TableCell sx={{ width: 100 }}>Rating (1-10)</TableCell>
                <TableCell sx={{ width: 60 }}>Status</TableCell>
                <TableCell sx={{ width: 50 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => {
                const { validation, isEmpty } = rowValidations[index];
                const hasErrors = !isEmpty && !validation.isValid;
                const isDuplicate = !isEmpty && validation.isDuplicate && validation.isValid;

                return (
                  <TableRow
                    key={row.id}
                    sx={{
                      '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.04)' },
                      bgcolor: hasErrors ? 'rgba(245, 101, 101, 0.05)' :
                               isDuplicate ? 'rgba(245, 158, 11, 0.05)' : 'inherit',
                    }}
                  >
                    <TableCell sx={{ color: '#666', fontSize: '0.75rem' }}>
                      {index + 1}
                    </TableCell>
                    <TableCell sx={validation.errors.name ? errorCellStyles : cellStyles}>
                      <Tooltip title={validation.errors.name || ''} arrow>
                        <TextField
                          size="small"
                          fullWidth
                          value={row.name}
                          onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                          placeholder="Company name"
                          error={!!validation.errors.name}
                          variant="outlined"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={validation.errors.website ? errorCellStyles : cellStyles}>
                      <Tooltip title={validation.errors.website || ''} arrow>
                        <TextField
                          size="small"
                          fullWidth
                          value={row.website}
                          onChange={(e) => handleRowChange(row.id, 'website', e.target.value)}
                          placeholder="https://example.com"
                          error={!!validation.errors.website}
                          variant="outlined"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={cellStyles}>
                      <TextField
                        size="small"
                        fullWidth
                        value={row.industry}
                        onChange={(e) => handleRowChange(row.id, 'industry', e.target.value)}
                        placeholder="Industry"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={cellStyles}>
                      <TextField
                        size="small"
                        fullWidth
                        value={row.description}
                        onChange={(e) => handleRowChange(row.id, 'description', e.target.value)}
                        placeholder="Description"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={validation.errors.ratingV2 ? errorCellStyles : cellStyles}>
                      <Tooltip title={validation.errors.ratingV2 || ''} arrow>
                        <TextField
                          size="small"
                          fullWidth
                          value={row.ratingV2}
                          onChange={(e) => handleRowChange(row.id, 'ratingV2', e.target.value)}
                          placeholder="1-10"
                          error={!!validation.errors.ratingV2}
                          variant="outlined"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      {isEmpty ? (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      ) : isDuplicate ? (
                        <Tooltip title="Company already exists (will be updated)" arrow>
                          <WarningIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                        </Tooltip>
                      ) : validation.isValid ? (
                        <CheckCircleIcon sx={{ color: '#48bb78', fontSize: 18 }} />
                      ) : (
                        <ErrorIcon sx={{ color: '#f56565', fontSize: 18 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveRow(row.id)}
                        disabled={rows.length <= 1}
                        sx={{
                          color: '#999',
                          '&:hover': { color: '#f56565' },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add Row Button */}
        <Button
          startIcon={<AddIcon />}
          onClick={handleAddRow}
          sx={{
            mt: 1,
            color: '#667eea',
            '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.08)' },
          }}
        >
          Add Row
        </Button>

        {/* Summary */}
        <Box sx={{ mt: 2, display: 'flex', gap: 2, color: '#666' }}>
          <Typography variant="body2">
            Valid companies: <strong style={{ color: '#48bb78' }}>{validRows.length}</strong>
          </Typography>
          {duplicateCount > 0 && (
            <Typography variant="body2">
              Duplicates: <strong style={{ color: '#f59e0b' }}>{duplicateCount}</strong>
            </Typography>
          )}
          <Typography variant="body2">
            Empty rows: <strong>{rowValidations.filter(r => r.isEmpty).length}</strong>
          </Typography>
          {rowValidations.filter(r => !r.isEmpty && !r.validation.isValid).length > 0 && (
            <Typography variant="body2">
              Invalid: <strong style={{ color: '#f56565' }}>
                {rowValidations.filter(r => !r.isEmpty && !r.validation.isValid).length}
              </strong>
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
            },
            '&.Mui-disabled': {
              background: '#ccc',
            },
          }}
        >
          {isSubmitting ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
              Creating...
            </>
          ) : (
            `Create ${validRows.length} Compan${validRows.length !== 1 ? 'ies' : 'y'}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkCompanyAddDialog;
