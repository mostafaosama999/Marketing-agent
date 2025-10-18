import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import { CSVRow, FieldMapping, LeadFormData, PipelineStage } from '../../../app/types/crm';
import { autoDetectMappings, validateMappings, importLeadsFromCSV, ImportResult } from '../../../services/importService';

interface FieldMappingDialogProps {
  open: boolean;
  csvData: CSVRow[];
  headers: string[];
  stages: PipelineStage[];
  onClose: () => void;
  onComplete: (result: ImportResult) => void;
}

const LEAD_FIELDS: { value: keyof LeadFormData; label: string; required: boolean }[] = [
  { value: 'name', label: 'Name', required: true },
  { value: 'email', label: 'Email', required: true },
  { value: 'company', label: 'Company', required: true },
  { value: 'phone', label: 'Phone', required: false },
  { value: 'status', label: 'Status/Stage', required: false },
];

export const FieldMappingDialog: React.FC<FieldMappingDialogProps> = ({
  open,
  csvData,
  headers,
  stages,
  onClose,
  onComplete,
}) => {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (open && headers.length > 0) {
      const autoMappings = autoDetectMappings(headers);
      setMappings(autoMappings);

      // Set default status to first visible stage
      const firstStage = stages.find((s) => s.visible);
      if (firstStage) {
        setDefaultStatus(firstStage.label);
      }
    }
  }, [open, headers, stages]);

  const handleMappingChange = (csvField: string, leadField: keyof LeadFormData | null) => {
    setMappings((prev) =>
      prev.map((m) => (m.csvField === csvField ? { ...m, leadField } : m))
    );
    setErrors([]);
  };

  const handleImport = async () => {
    // Validate mappings
    const validationErrors = validateMappings(mappings);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setImporting(true);
    setErrors([]);

    try {
      const result = await importLeadsFromCSV(csvData, mappings, defaultStatus);
      onComplete(result);
    } catch (error) {
      setErrors(['Failed to import leads. Please try again.']);
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const previewData = csvData.slice(0, 3);
  const visibleStages = stages.filter((s) => s.visible);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Map CSV Fields to Lead Fields</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Map your CSV columns to lead fields. Required fields must be mapped to proceed.
        </Typography>

        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </Alert>
        )}

        {/* Default Status Selection */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Default Stage for New Leads</InputLabel>
            <Select
              value={defaultStatus}
              onChange={(e) => setDefaultStatus(e.target.value)}
              label="Default Stage for New Leads"
            >
              {visibleStages.map((stage) => (
                <MenuItem key={stage.id} value={stage.label}>
                  {stage.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Field Mapping Table */}
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>CSV Column</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Maps To</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Preview</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mappings.map((mapping) => {
                const previewValues = previewData.map((row) => row[mapping.csvField]).filter((v) => v);
                const previewText = previewValues.slice(0, 2).join(', ');

                return (
                  <TableRow key={mapping.csvField}>
                    <TableCell>{mapping.csvField}</TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={mapping.leadField || ''}
                          onChange={(e) =>
                            handleMappingChange(
                              mapping.csvField,
                              e.target.value as keyof LeadFormData | null
                            )
                          }
                        >
                          <MenuItem value="">
                            <em>Skip this field</em>
                          </MenuItem>
                          {LEAD_FIELDS.map((field) => (
                            <MenuItem key={field.value} value={field.value}>
                              {field.label} {field.required && '*'}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {previewText || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" color="text.secondary">
          * Required fields
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={importing}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={importing || errors.length > 0}
          startIcon={importing ? <CircularProgress size={16} /> : null}
        >
          {importing ? 'Importing...' : `Import ${csvData.length} Leads`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
