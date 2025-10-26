// src/components/features/crm/CSVFieldMappingDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { CSVRow, FieldMapping, EntityType } from '../../../types/crm';
import { LeadStatus } from '../../../types/lead';
import { importLeadsFromCSV, ImportResult, detectFieldSection, detectEntityType } from '../../../services/api/csvImportService';
import { useAuth } from '../../../contexts/AuthContext';
import { usePipelineConfigContext } from '../../../contexts/PipelineConfigContext';

interface CSVFieldMappingDialogProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  data: CSVRow[];
  headers: string[];
}

const STANDARD_FIELDS = [
  { value: 'name', label: 'Lead Name (Required)', section: 'general', entityType: 'lead' as EntityType },
  { value: 'email', label: 'Email', section: 'general', entityType: 'lead' as EntityType },
  { value: 'company', label: 'Company (Required)', section: 'general', entityType: 'lead' as EntityType },
  { value: 'phone', label: 'Phone', section: 'general', entityType: 'lead' as EntityType },
  { value: 'status', label: 'Pipeline Stage', section: 'general', entityType: 'lead' as EntityType },
];

const LINKEDIN_FIELDS = [
  { value: 'outreach.linkedIn.profileUrl', label: 'LinkedIn Profile URL' },
  { value: 'outreach.linkedIn.status', label: 'LinkedIn Status' },
];

const EMAIL_FIELDS = [
  { value: 'outreach.email.status', label: 'Email Status' },
];

export const CSVFieldMappingDialog: React.FC<CSVFieldMappingDialogProps> = ({
  open,
  onClose,
  onBack,
  data,
  headers,
}) => {
  const { user } = useAuth();
  const { stages } = usePipelineConfigContext();
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<LeadStatus>('new_lead');
  const [autoCreateFields, setAutoCreateFields] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect mappings on mount (only run once when headers change)
  useEffect(() => {
    if (headers.length > 0) {
      const detectedMappings: FieldMapping[] = headers.map((csvField) => {
        const lowerField = csvField.toLowerCase().trim();
        const section = detectFieldSection(csvField);
        let leadField: string | null = null;
        let entityType: EntityType = 'lead';

        // Auto-detect standard lead fields (case-insensitive)
        if (lowerField === 'name' || lowerField === 'lead name' || lowerField === 'full name' || lowerField === 'name of person') {
          leadField = 'name';
          entityType = 'lead';
        } else if (lowerField === 'email' || lowerField === 'email address' || lowerField.includes("e'mail")) {
          leadField = 'email';
          entityType = 'lead';
        } else if (lowerField === 'company' || lowerField === 'company name' || lowerField === 'organization') {
          leadField = 'company';
          entityType = 'lead';
        } else if (lowerField === 'phone' || lowerField === 'phone number' || lowerField === 'telephone') {
          leadField = 'phone';
          entityType = 'lead';
        } else if (lowerField === 'status' || lowerField === 'stage' || lowerField === 'pipeline stage') {
          leadField = 'status';
          entityType = 'lead';
        }
        // Company fields - Website
        else if (lowerField.includes('website') || lowerField.includes('blog link') ||
                 (lowerField.includes('url') && !lowerField.includes('linkedin'))) {
          leadField = 'skip'; // Will be auto-created as custom field
          entityType = 'company';
        }
        // Company fields - Description
        else if (lowerField === 'description' || lowerField === 'company description' ||
                 lowerField.includes('what they do') || lowerField.includes('company details') ||
                 lowerField.includes('about') || lowerField === 'overview') {
          leadField = 'skip'; // Will be auto-created as custom field
          entityType = 'company';
        }
        // Company fields - Location
        else if (lowerField === 'country' || lowerField === 'location' || lowerField === 'region' ||
                 lowerField === 'city' || lowerField.includes('headquarters')) {
          leadField = 'skip'; // Will be auto-created as custom field
          entityType = 'company';
        }
        // Company fields - Rating/Score
        else if (lowerField === 'rating' || lowerField === 'score' || lowerField === 'tier' ||
                 lowerField.includes('quality')) {
          leadField = 'skip'; // Will be auto-created as custom field
          entityType = 'company';
        }
        // Company fields - Content/Programs
        else if (lowerField === 'program' || lowerField.includes('writing program') ||
                 lowerField.includes('ideas generated') || lowerField.includes('chosen idea') ||
                 lowerField.includes('article name') || lowerField.includes('blog post') ||
                 lowerField.includes('selected idea')) {
          leadField = 'skip'; // Will be auto-created as custom field
          entityType = 'company';
        }
        // Company fields - Industry
        else if (lowerField === 'industry' || lowerField === 'sector' || lowerField === 'vertical' ||
                 lowerField === 'niche' || lowerField === 'category') {
          leadField = 'skip'; // Will be auto-created as custom field
          entityType = 'company';
        }
        // LinkedIn fields
        else if (lowerField.includes('linkedin') && (lowerField.includes('link') || lowerField.includes('url') || lowerField.includes('profile'))) {
          leadField = 'outreach.linkedIn.profileUrl';
          entityType = 'lead';
        } else if (section === 'linkedin' && (lowerField.includes('status') || lowerField.includes('response'))) {
          leadField = 'outreach.linkedIn.status';
          entityType = 'lead';
        }
        // Email/Response fields (lead-specific)
        else if ((section === 'email' || lowerField === 'response') && (lowerField.includes('status') || lowerField.includes('response'))) {
          leadField = 'outreach.email.status';
          entityType = 'lead';
        }
        // Default to skip for unmapped columns
        else {
          leadField = 'skip';
          entityType = detectEntityType(csvField, null);
        }

        return {
          csvField,
          leadField,
          section,
          entityType,
          autoCreate: leadField === 'skip' ? true : undefined
        };
      });

      setMappings(detectedMappings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers]); // Only re-run when headers change, not when autoCreateFields changes

  const handleMappingChange = (csvField: string, leadField: string) => {
    setMappings((prev) =>
      prev.map((mapping) => {
        if (mapping.csvField === csvField) {
          // Detect entity type based on the selected field
          const standardField = STANDARD_FIELDS.find(f => f.value === leadField);
          const entityType = standardField?.entityType || detectEntityType(csvField, leadField);

          return {
            ...mapping,
            leadField,
            entityType,
            autoCreate: leadField === 'skip' ? autoCreateFields : undefined
          };
        }
        return mapping;
      })
    );
  };

  const handleEntityTypeChange = (csvField: string, entityType: EntityType) => {
    setMappings((prev) =>
      prev.map((mapping) =>
        mapping.csvField === csvField ? { ...mapping, entityType } : mapping
      )
    );
  };

  const handleAutoCreateToggle = (csvField: string, autoCreate: boolean) => {
    setMappings((prev) =>
      prev.map((mapping) =>
        mapping.csvField === csvField ? { ...mapping, autoCreate } : mapping
      )
    );
  };


  const getSampleValues = (csvField: string): string[] => {
    return data
      .slice(0, 3)
      .map((row) => row[csvField])
      .filter((val) => val && val.trim() !== '');
  };

  // Group mappings by section
  const groupedMappings = {
    general: mappings.filter((m) => m.section === 'general'),
    linkedin: mappings.filter((m) => m.section === 'linkedin'),
    email: mappings.filter((m) => m.section === 'email'),
  };

  const validateMappings = (): boolean => {
    const hasName = mappings.some((m) => m.leadField === 'name');
    const hasCompany = mappings.some((m) => m.leadField === 'company');

    if (!hasName) {
      setError('Please map the "Name" field (required)');
      return false;
    }
    if (!hasCompany) {
      setError('Please map the "Company" field (required)');
      return false;
    }

    setError(null);
    return true;
  };

  const handleImport = async () => {
    if (!validateMappings() || !user) return;

    // Count fields that will be auto-created
    const fieldsToAutoCreate = mappings.filter(
      (m) => (m.leadField === 'skip' || m.leadField === null) && m.autoCreate === true
    ).length;

    // Show confirmation if global auto-create is enabled or individual fields are marked
    if (autoCreateFields && fieldsToAutoCreate > 0) {
      const confirmMessage = `Auto-create is enabled and will create ${fieldsToAutoCreate} new custom field${fieldsToAutoCreate > 1 ? 's' : ''}. Continue?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setImporting(true);
    setImportProgress({ current: 0, total: data.length });

    try {
      const result = await importLeadsFromCSV(
        data,
        mappings,
        defaultStatus,
        autoCreateFields,
        user.uid,
        (current, total) => {
          setImportProgress({ current, total });
        }
      );

      setImportResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      setError(errorMessage);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setMappings([]);
    setImportResult(null);
    setError(null);
    setImporting(false);
    setImportProgress({ current: 0, total: 0 });
    onClose();
  };

  const progressPercentage = importProgress.total > 0
    ? (importProgress.current / importProgress.total) * 100
    : 0;

  // Render a single field mapping row
  const renderFieldMappingRow = (mapping: FieldMapping, availableFields: Array<{ value: string; label: string; entityType?: EntityType }>) => {
    const samples = getSampleValues(mapping.csvField);
    const isSkipped = mapping.leadField === 'skip' || mapping.leadField === null;
    const showEntityType = isSkipped || ['website', 'industry', 'description'].includes(mapping.leadField || '');

    return (
      <Box
        key={mapping.csvField}
        sx={{
          mb: 2,
          p: 2,
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          bgcolor: 'white',
        }}
      >
        {/* CSV field info */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            CSV Column: <Chip label={mapping.csvField} size="small" sx={{ ml: 1 }} />
          </Typography>

          {samples.length > 0 && (
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              Sample values: {samples.join(', ')}
            </Typography>
          )}
        </Box>

        {/* Mapping controls row */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            alignItems: { xs: 'stretch', md: 'flex-start' },
          }}
        >
          {/* Field mapping dropdown */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 45%' } }}>
            <FormControl fullWidth size="small">
              <Select
                value={mapping.leadField || 'skip'}
                onChange={(e) => handleMappingChange(mapping.csvField, e.target.value)}
                sx={{ bgcolor: 'white' }}
              >
                <MenuItem value="skip">
                  <em>Skip this field</em>
                </MenuItem>
                {availableFields.map((field) => (
                  <MenuItem key={field.value} value={field.value}>
                    {field.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Entity Type dropdown */}
          {showEntityType && (
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' } }}>
              <FormControl fullWidth size="small">
                <Select
                  value={mapping.entityType || 'lead'}
                  onChange={(e) => handleEntityTypeChange(mapping.csvField, e.target.value as EntityType)}
                  sx={{ bgcolor: 'white' }}
                >
                  <MenuItem value="lead">Lead</MenuItem>
                  <MenuItem value="company">Company</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Per-field auto-create checkbox */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 25%' }, display: 'flex', alignItems: 'center' }}>
            {isSkipped && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={mapping.autoCreate ?? false}
                    onChange={(e) => handleAutoCreateToggle(mapping.csvField, e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Auto-create as custom field
                  </Typography>
                }
                sx={{ ml: 0 }}
              />
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  // Render a section with header and fields
  const renderSection = (
    title: string,
    icon: React.ReactNode,
    mappings: FieldMapping[],
    availableFields: Array<{ value: string; label: string }>
  ) => {
    if (mappings.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {icon}
          <Typography
            variant="h6"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              fontWeight: 700,
              fontSize: '18px',
            }}
          >
            {title}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 2,
            bgcolor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}
        >
          {mappings.map((mapping) => renderFieldMappingRow(mapping, availableFields))}
        </Box>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '12px',
        },
      }}
    >
      <DialogTitle>
        <Typography
          variant="h6"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontWeight: 700,
          }}
        >
          Import CSV - Map Fields
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
          Step 2 of 2: Map CSV columns to lead fields
        </Typography>
      </DialogTitle>

      <DialogContent>
        {!importResult && !importing && (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                Map your CSV columns to CRM fields. Required fields: Name, Company.
              </Typography>

              {/* General Fields Section */}
              {renderSection(
                'General Information',
                <InfoIcon sx={{ color: '#667eea', fontSize: 24 }} />,
                groupedMappings.general,
                STANDARD_FIELDS
              )}

              {/* LinkedIn Fields Section */}
              {renderSection(
                'LinkedIn Outreach',
                <LinkedInIcon sx={{ color: '#0077b5', fontSize: 24 }} />,
                groupedMappings.linkedin,
                [...STANDARD_FIELDS, ...LINKEDIN_FIELDS]
              )}

              {/* Email Fields Section */}
              {renderSection(
                'Email Outreach',
                <EmailIcon sx={{ color: '#ea4335', fontSize: 24 }} />,
                groupedMappings.email,
                [...STANDARD_FIELDS, ...EMAIL_FIELDS]
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Default Pipeline Stage for Imported Leads:
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={defaultStatus}
                  onChange={(e) => setDefaultStatus(e.target.value as LeadStatus)}
                  sx={{ bgcolor: 'white' }}
                >
                  {stages.map((stage) => (
                    <MenuItem key={stage.id} value={stage.id}>
                      {stage.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={autoCreateFields}
                  onChange={(e) => setAutoCreateFields(e.target.checked)}
                />
              }
              label="Auto-create custom fields for unmapped columns"
            />
          </>
        )}

        {importing && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1" sx={{ mb: 1 }}>
              Importing leads...
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              Processing {importProgress.current} of {importProgress.total} rows
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}

        {importResult && (
          <Box sx={{ py: 2 }}>
            <Alert
              severity={
                importResult.failed === 0 && importResult.duplicates === 0
                  ? 'success'
                  : importResult.successful > 0
                  ? 'warning'
                  : 'error'
              }
              sx={{ mb: 2 }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                Import Complete
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#10b981' }} />
                  <Typography variant="body2">
                    {importResult.successful} leads imported successfully
                  </Typography>
                </Box>
                {importResult.duplicates > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                    <Typography variant="body2">
                      {importResult.duplicates} duplicates skipped
                    </Typography>
                  </Box>
                )}
                {importResult.failed > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorIcon sx={{ fontSize: 18, color: '#ef4444' }} />
                    <Typography variant="body2">
                      {importResult.failed} failed
                    </Typography>
                  </Box>
                )}
              </Box>
            </Alert>

            {importResult.errors.length > 0 && (
              <Box
                sx={{
                  maxHeight: 200,
                  overflow: 'auto',
                  p: 2,
                  bgcolor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Error Details:
                </Typography>
                {importResult.errors.slice(0, 10).map((error, index) => (
                  <Typography key={index} variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                    • {error}
                  </Typography>
                ))}
                {importResult.errors.length > 10 && (
                  <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                    ... and {importResult.errors.length - 10} more errors
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!importResult && !importing && (
          <>
            <Button onClick={onBack} sx={{ color: '#64748b' }}>
              Back
            </Button>
            <Button
              onClick={handleImport}
              variant="contained"
              disabled={importing}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                },
              }}
            >
              Import {data.length} Leads
            </Button>
          </>
        )}
        {importResult && (
          <Button
            onClick={handleClose}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              },
            }}
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
