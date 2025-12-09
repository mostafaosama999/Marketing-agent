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
  Autocomplete,
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
import BusinessIcon from '@mui/icons-material/Business';
import { Company } from '../../../types/crm';
import { BulkLeadRow, BulkLeadValidation, BulkLeadImportResult } from '../../../types/bulkLead';

interface BulkLeadAddDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rows: BulkLeadRow[], companyName: string) => Promise<BulkLeadImportResult>;
  companies: Company[];
}

const generateRowId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createEmptyRow = (): BulkLeadRow => ({
  id: generateRowId(),
  name: '',
  lastName: '',
  jobTitle: '',
  linkedInUrl: '',
  email: '',
});

const validateRow = (row: BulkLeadRow): BulkLeadValidation => {
  const errors: BulkLeadValidation['errors'] = {};

  // Name is required if any field has data
  const hasData = row.name || row.lastName || row.jobTitle || row.linkedInUrl || row.email;
  if (hasData && !row.name.trim()) {
    errors.name = 'Name is required';
  }

  // Email format validation (if provided)
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.email = 'Invalid email format';
  }

  // LinkedIn URL validation (if provided)
  if (row.linkedInUrl && !row.linkedInUrl.toLowerCase().includes('linkedin.com')) {
    errors.linkedInUrl = 'Must be a LinkedIn URL';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

const isRowEmpty = (row: BulkLeadRow): boolean => {
  return !row.name && !row.lastName && !row.jobTitle && !row.linkedInUrl && !row.email;
};

export const BulkLeadAddDialog: React.FC<BulkLeadAddDialogProps> = ({
  open,
  onClose,
  onSubmit,
  companies,
}) => {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [rows, setRows] = useState<BulkLeadRow[]>(() =>
    Array.from({ length: 5 }, createEmptyRow)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<BulkLeadImportResult | null>(null);

  // Get effective company name (selected or new)
  const effectiveCompanyName = selectedCompany?.name || newCompanyName;

  // Compute validations for all rows
  const rowValidations = useMemo(() => {
    return rows.map(row => ({
      row,
      validation: validateRow(row),
      isEmpty: isRowEmpty(row),
    }));
  }, [rows]);

  // Get valid non-empty rows
  const validRows = useMemo(() => {
    return rowValidations.filter(r => !r.isEmpty && r.validation.isValid).map(r => r.row);
  }, [rowValidations]);

  // Check if form can be submitted
  const canSubmit = effectiveCompanyName.trim() && validRows.length > 0 && !isSubmitting;

  const handleRowChange = useCallback((rowId: string, field: keyof BulkLeadRow, value: string) => {
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
      const importResult = await onSubmit(validRows, effectiveCompanyName.trim());
      setResult(importResult);

      if (importResult.successful > 0 && importResult.failed === 0) {
        // All succeeded - close dialog after brief delay
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating leads:', error);
      setResult({
        successful: 0,
        failed: validRows.length,
        leadIds: [],
        errors: ['Failed to create leads. Please try again.'],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setSelectedCompany(null);
    setNewCompanyName('');
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
      maxWidth="lg"
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
            Bulk Add Leads
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Add multiple leads at once for a single company
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Company Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Select Company *
          </Typography>
          <Autocomplete<Company, false, false, true>
            value={selectedCompany}
            onChange={(_, newValue) => {
              // Handle string input from freeSolo mode
              if (typeof newValue === 'string') {
                setNewCompanyName(newValue);
                setSelectedCompany(null);
              } else {
                setSelectedCompany(newValue);
                if (newValue) setNewCompanyName('');
              }
            }}
            inputValue={newCompanyName || selectedCompany?.name || ''}
            onInputChange={(_, newInputValue, reason) => {
              if (reason === 'input') {
                setNewCompanyName(newInputValue);
                setSelectedCompany(null);
              }
            }}
            options={companies.filter(c => !c.archived)}
            getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Select existing company or type new name"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon sx={{ fontSize: 18, color: '#667eea' }} />
                  {option.name}
                </Box>
              </li>
            )}
          />
          {newCompanyName && !selectedCompany && (
            <Typography variant="caption" sx={{ color: '#667eea', mt: 0.5, display: 'block' }}>
              New company "{newCompanyName}" will be created
            </Typography>
          )}
        </Box>

        {/* Result Alert */}
        {result && (
          <Alert
            severity={result.failed === 0 ? 'success' : 'warning'}
            sx={{ mb: 2 }}
          >
            {result.successful > 0 && `${result.successful} lead(s) created successfully.`}
            {result.failed > 0 && ` ${result.failed} lead(s) failed.`}
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
                <TableCell sx={{ minWidth: 120 }}>Name *</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Last Name</TableCell>
                <TableCell sx={{ minWidth: 130 }}>Job Title</TableCell>
                <TableCell sx={{ minWidth: 200 }}>LinkedIn URL</TableCell>
                <TableCell sx={{ minWidth: 180 }}>Email</TableCell>
                <TableCell sx={{ width: 60 }}>Status</TableCell>
                <TableCell sx={{ width: 50 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => {
                const { validation, isEmpty } = rowValidations[index];
                const hasErrors = !isEmpty && !validation.isValid;

                return (
                  <TableRow
                    key={row.id}
                    sx={{
                      '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.04)' },
                      bgcolor: hasErrors ? 'rgba(245, 101, 101, 0.05)' : 'inherit',
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
                          placeholder="First name"
                          error={!!validation.errors.name}
                          variant="outlined"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={cellStyles}>
                      <TextField
                        size="small"
                        fullWidth
                        value={row.lastName}
                        onChange={(e) => handleRowChange(row.id, 'lastName', e.target.value)}
                        placeholder="Last name"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={cellStyles}>
                      <TextField
                        size="small"
                        fullWidth
                        value={row.jobTitle}
                        onChange={(e) => handleRowChange(row.id, 'jobTitle', e.target.value)}
                        placeholder="Job title"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={validation.errors.linkedInUrl ? errorCellStyles : cellStyles}>
                      <Tooltip title={validation.errors.linkedInUrl || ''} arrow>
                        <TextField
                          size="small"
                          fullWidth
                          value={row.linkedInUrl}
                          onChange={(e) => handleRowChange(row.id, 'linkedInUrl', e.target.value)}
                          placeholder="https://linkedin.com/in/..."
                          error={!!validation.errors.linkedInUrl}
                          variant="outlined"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={validation.errors.email ? errorCellStyles : cellStyles}>
                      <Tooltip title={validation.errors.email || ''} arrow>
                        <TextField
                          size="small"
                          fullWidth
                          value={row.email}
                          onChange={(e) => handleRowChange(row.id, 'email', e.target.value)}
                          placeholder="email@example.com"
                          error={!!validation.errors.email}
                          variant="outlined"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      {isEmpty ? (
                        <Typography variant="caption" color="text.disabled">—</Typography>
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
            Valid leads: <strong style={{ color: '#48bb78' }}>{validRows.length}</strong>
          </Typography>
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
            `Create ${validRows.length} Lead${validRows.length !== 1 ? 's' : ''}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkLeadAddDialog;
