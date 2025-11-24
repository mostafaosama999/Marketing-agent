/**
 * FieldDefinitionsTab Component
 *
 * Settings tab for managing field definitions for leads and companies.
 * Allows editing field labels, dropdown options, and adding new fields.
 * Supports renaming and deleting both default and custom fields.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Collapse,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import {
  FieldDefinition,
  CreateFieldDefinitionData,
  EntityType,
} from '../../types/fieldDefinitions';
import {
  getFieldDefinitions,
  updateFieldDefinition,
  createFieldDefinition,
  getFieldValueCount,
  renameFieldWithDataMigration,
  deleteFieldWithDataRemoval,
  BatchProgressCallback,
} from '../../services/api/fieldDefinitionsService';
import {
  DEFAULT_LEADS_TABLE_COLUMNS,
  DEFAULT_COMPANIES_TABLE_COLUMNS,
} from '../../types/table';
import { FieldDefinitionCard } from './FieldDefinitionCard';
import { AddFieldDefinitionDialog } from './AddFieldDefinitionDialog';
import {
  FieldOperationConfirmDialog,
  OperationType,
  PROTECTED_LEAD_FIELDS,
  PROTECTED_COMPANY_FIELDS,
} from './FieldOperationConfirmDialog';
import {
  BatchOperationModal,
  BatchOperationType,
  BatchOperationProgress,
} from '../common/BatchOperationModal';

export const FieldDefinitionsTab: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Field definitions state
  const [leadFields, setLeadFields] = useState<FieldDefinition[]>([]);
  const [companyFields, setCompanyFields] = useState<FieldDefinition[]>([]);

  // Section expansion state
  const [leadDefaultExpanded, setLeadDefaultExpanded] = useState(false);
  const [leadCustomExpanded, setLeadCustomExpanded] = useState(true);
  const [companyDefaultExpanded, setCompanyDefaultExpanded] = useState(false);
  const [companyCustomExpanded, setCompanyCustomExpanded] = useState(true);

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogEntityType, setAddDialogEntityType] = useState<EntityType>('lead');

  // Field operation dialog state
  const [operationDialogOpen, setOperationDialogOpen] = useState(false);
  const [operationType, setOperationType] = useState<OperationType>('rename');
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [selectedFieldName, setSelectedFieldName] = useState('');
  const [selectedFieldLabel, setSelectedFieldLabel] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('lead');
  const [selectedIsDefaultField, setSelectedIsDefaultField] = useState(false);
  const [selectedIsProtected, setSelectedIsProtected] = useState(false);
  const [affectedCount, setAffectedCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Batch operation modal state
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchOperationType, setBatchOperationType] = useState<BatchOperationType>('rename');
  const [batchFieldName, setBatchFieldName] = useState('');
  const [batchNewFieldName, setBatchNewFieldName] = useState('');
  const [batchProgress, setBatchProgress] = useState<BatchOperationProgress>({
    current: 0,
    total: 0,
    currentEntity: 'leads',
    phase: 'preparing',
  });

  // Load field definitions
  const loadFieldDefinitions = async () => {
    try {
      setLoading(true);
      const [leads, companies] = await Promise.all([
        getFieldDefinitions('lead'),
        getFieldDefinitions('company'),
      ]);

      // Sort by label
      setLeadFields(leads.sort((a, b) => a.label.localeCompare(b.label)));
      setCompanyFields(companies.sort((a, b) => a.label.localeCompare(b.label)));
    } catch (err: any) {
      console.error('Error loading field definitions:', err);
      setError('Failed to load field definitions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFieldDefinitions();
  }, []);

  // Handle save field
  const handleSaveField = async (
    fieldId: string,
    updates: { label?: string; options?: string[] }
  ) => {
    if (!user) return;

    try {
      await updateFieldDefinition(fieldId, updates, user.uid);

      // Refresh the list
      await loadFieldDefinitions();

      setSuccess('Field updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating field:', err);
      setError(err.message || 'Failed to update field');
      throw err;
    }
  };

  // Handle add field
  const handleOpenAddDialog = (entityType: EntityType) => {
    setAddDialogEntityType(entityType);
    setAddDialogOpen(true);
  };

  const handleAddField = async (data: CreateFieldDefinitionData) => {
    if (!user) return;

    try {
      await createFieldDefinition(data, user.uid);

      // Refresh the list
      await loadFieldDefinitions();

      setSuccess(`Field "${data.label}" created successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error creating field:', err);
      throw err;
    }
  };

  // Handle opening rename dialog
  const handleRenameClick = useCallback(async (
    fieldId: string,
    fieldName: string,
    fieldLabel: string,
    isDefaultField: boolean,
    entityType: EntityType
  ) => {
    const protectedFields = entityType === 'lead' ? PROTECTED_LEAD_FIELDS : PROTECTED_COMPANY_FIELDS;
    const isProtected = protectedFields.includes(fieldName);

    setSelectedFieldId(fieldId);
    setSelectedFieldName(fieldName);
    setSelectedFieldLabel(fieldLabel);
    setSelectedEntityType(entityType);
    setSelectedIsDefaultField(isDefaultField);
    setSelectedIsProtected(isProtected);
    setOperationType('rename');
    setOperationDialogOpen(true);

    // Load count of records with values in this field
    setLoadingCount(true);
    setAffectedCount(null);
    try {
      const count = await getFieldValueCount(entityType, fieldName, isDefaultField);
      setAffectedCount(count);
    } catch (err) {
      console.error('Error getting field value count:', err);
      setAffectedCount(0);
    } finally {
      setLoadingCount(false);
    }
  }, []);

  // Handle opening delete dialog
  const handleDeleteClick = useCallback(async (
    fieldId: string,
    fieldName: string,
    fieldLabel: string,
    isDefaultField: boolean,
    entityType: EntityType
  ) => {
    const protectedFields = entityType === 'lead' ? PROTECTED_LEAD_FIELDS : PROTECTED_COMPANY_FIELDS;
    const isProtected = protectedFields.includes(fieldName);

    setSelectedFieldId(fieldId);
    setSelectedFieldName(fieldName);
    setSelectedFieldLabel(fieldLabel);
    setSelectedEntityType(entityType);
    setSelectedIsDefaultField(isDefaultField);
    setSelectedIsProtected(isProtected);
    setOperationType('delete');
    setOperationDialogOpen(true);

    // Load count of records with values in this field
    setLoadingCount(true);
    setAffectedCount(null);
    try {
      const count = await getFieldValueCount(entityType, fieldName, isDefaultField);
      setAffectedCount(count);
    } catch (err) {
      console.error('Error getting field value count:', err);
      setAffectedCount(0);
    } finally {
      setLoadingCount(false);
    }
  }, []);

  // Handle confirming an operation (rename or delete)
  const handleOperationConfirm = async (newFieldName?: string) => {
    if (!user) return;

    setOperationDialogOpen(false);

    // Set up batch operation
    setBatchFieldName(selectedFieldName);
    setBatchNewFieldName(newFieldName || '');
    setBatchOperationType(operationType === 'rename' ? 'rename' : 'delete');
    setBatchProgress({
      current: 0,
      total: 0,
      currentEntity: selectedEntityType === 'lead' ? 'leads' : 'companies',
      phase: 'preparing',
    });
    setBatchModalOpen(true);

    const progressCallback: BatchProgressCallback = (progress) => {
      setBatchProgress({
        current: progress.current,
        total: progress.total,
        currentEntity: progress.currentEntity,
        phase: progress.phase,
      });
    };

    try {
      if (operationType === 'rename' && newFieldName) {
        await renameFieldWithDataMigration(
          selectedEntityType,
          selectedFieldName,
          newFieldName,
          selectedIsDefaultField,
          user.uid,
          progressCallback
        );
        setSuccess(`Field "${selectedFieldLabel}" has been renamed to "${newFieldName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}" successfully!`);
      } else if (operationType === 'delete') {
        await deleteFieldWithDataRemoval(
          selectedEntityType,
          selectedFieldName,
          selectedIsDefaultField,
          progressCallback
        );
        setSuccess(`Field "${selectedFieldLabel}" has been deleted successfully!`);
      }

      // Refresh field definitions
      await loadFieldDefinitions();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error performing field operation:', err);
      setBatchProgress(prev => ({
        ...prev,
        phase: 'error',
        errorMessage: err.message || 'An error occurred during the operation.',
      }));
    }
  };

  // Close batch modal
  const handleBatchModalClose = () => {
    setBatchModalOpen(false);
  };

  // Retry batch operation
  const handleBatchRetry = () => {
    handleOperationConfirm(batchNewFieldName || undefined);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 8,
        }}
      >
        <CircularProgress size={40} sx={{ color: '#667eea' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Field Definitions
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
        Manage custom field definitions for leads and companies. View existing fields
        or add new custom fields to track additional data.
      </Typography>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Lead Fields Section */}
      <Paper
        variant="outlined"
        sx={{
          mb: 3,
          overflow: 'hidden',
          borderColor: 'rgba(102, 126, 234, 0.3)',
        }}
      >
        {/* Main Section Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 2,
            bgcolor: 'rgba(102, 126, 234, 0.05)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flex: 1,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              <PersonIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Lead Fields
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {DEFAULT_LEADS_TABLE_COLUMNS.length} default + {leadFields.length} custom fields
              </Typography>
            </Box>
          </Box>

          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => handleOpenAddDialog('lead')}
            sx={{
              textTransform: 'none',
              color: '#667eea',
              fontWeight: 600,
              '&:hover': {
                bgcolor: 'rgba(102, 126, 234, 0.1)',
              },
            }}
          >
            Add Custom Field
          </Button>
        </Box>

        {/* Default Fields Sub-section */}
        <Box sx={{ borderTop: '1px solid rgba(102, 126, 234, 0.1)' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2,
              py: 1.5,
              cursor: 'pointer',
              bgcolor: leadDefaultExpanded ? 'rgba(102, 126, 234, 0.02)' : 'transparent',
              '&:hover': {
                bgcolor: 'rgba(102, 126, 234, 0.04)',
              },
            }}
            onClick={() => setLeadDefaultExpanded(!leadDefaultExpanded)}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b', flex: 1 }}>
              Default Fields
            </Typography>
            <Chip
              label={`${DEFAULT_LEADS_TABLE_COLUMNS.length} fields`}
              size="small"
              sx={{
                bgcolor: 'rgba(100, 116, 139, 0.1)',
                color: '#64748b',
                fontWeight: 600,
                fontSize: '11px',
                height: 22,
                mr: 1,
              }}
            />
            <IconButton size="small">
              {leadDefaultExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
          <Collapse in={leadDefaultExpanded}>
            <Box sx={{ px: 2, pb: 2 }}>
              {DEFAULT_LEADS_TABLE_COLUMNS.map((col) => (
                <FieldDefinitionCard
                  key={col.id}
                  defaultField={col}
                  entityType="lead"
                  isProtected={PROTECTED_LEAD_FIELDS.includes(col.id)}
                  onRename={(fieldId, fieldName, fieldLabel, isDefaultField) =>
                    handleRenameClick(fieldId, fieldName, fieldLabel, isDefaultField, 'lead')
                  }
                  onDelete={(fieldId, fieldName, fieldLabel, isDefaultField) =>
                    handleDeleteClick(fieldId, fieldName, fieldLabel, isDefaultField, 'lead')
                  }
                />
              ))}
            </Box>
          </Collapse>
        </Box>

        {/* Custom Fields Sub-section */}
        <Box sx={{ borderTop: '1px solid rgba(102, 126, 234, 0.1)' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2,
              py: 1.5,
              cursor: 'pointer',
              bgcolor: leadCustomExpanded ? 'rgba(102, 126, 234, 0.02)' : 'transparent',
              '&:hover': {
                bgcolor: 'rgba(102, 126, 234, 0.04)',
              },
            }}
            onClick={() => setLeadCustomExpanded(!leadCustomExpanded)}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#667eea', flex: 1 }}>
              Custom Fields
            </Typography>
            <Chip
              label={`${leadFields.length} fields`}
              size="small"
              sx={{
                bgcolor: 'rgba(102, 126, 234, 0.1)',
                color: '#667eea',
                fontWeight: 600,
                fontSize: '11px',
                height: 22,
                mr: 1,
              }}
            />
            <IconButton size="small">
              {leadCustomExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
          <Collapse in={leadCustomExpanded}>
            <Box sx={{ p: 2 }}>
              {leadFields.length === 0 ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 4,
                    color: '#64748b',
                  }}
                >
                  <Typography variant="body2">
                    No custom lead fields defined yet. Click "Add Custom Field" to create one.
                  </Typography>
                </Box>
              ) : (
                leadFields.map((field) => (
                  <FieldDefinitionCard
                    key={field.id}
                    field={field}
                    entityType="lead"
                    onSave={handleSaveField}
                    onRename={(fieldId, fieldName, fieldLabel, isDefaultField) =>
                      handleRenameClick(fieldId, fieldName, fieldLabel, isDefaultField, 'lead')
                    }
                    onDelete={(fieldId, fieldName, fieldLabel, isDefaultField) =>
                      handleDeleteClick(fieldId, fieldName, fieldLabel, isDefaultField, 'lead')
                    }
                  />
                ))
              )}
            </Box>
          </Collapse>
        </Box>
      </Paper>

      {/* Company Fields Section */}
      <Paper
        variant="outlined"
        sx={{
          mb: 3,
          overflow: 'hidden',
          borderColor: 'rgba(5, 150, 105, 0.3)',
        }}
      >
        {/* Main Section Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 2,
            bgcolor: 'rgba(5, 150, 105, 0.05)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flex: 1,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              }}
            >
              <BusinessIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Company Fields
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {DEFAULT_COMPANIES_TABLE_COLUMNS.length} default + {companyFields.length} custom fields
              </Typography>
            </Box>
          </Box>

          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => handleOpenAddDialog('company')}
            sx={{
              textTransform: 'none',
              color: '#059669',
              fontWeight: 600,
              '&:hover': {
                bgcolor: 'rgba(5, 150, 105, 0.1)',
              },
            }}
          >
            Add Custom Field
          </Button>
        </Box>

        {/* Default Fields Sub-section */}
        <Box sx={{ borderTop: '1px solid rgba(5, 150, 105, 0.1)' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2,
              py: 1.5,
              cursor: 'pointer',
              bgcolor: companyDefaultExpanded ? 'rgba(5, 150, 105, 0.02)' : 'transparent',
              '&:hover': {
                bgcolor: 'rgba(5, 150, 105, 0.04)',
              },
            }}
            onClick={() => setCompanyDefaultExpanded(!companyDefaultExpanded)}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b', flex: 1 }}>
              Default Fields
            </Typography>
            <Chip
              label={`${DEFAULT_COMPANIES_TABLE_COLUMNS.length} fields`}
              size="small"
              sx={{
                bgcolor: 'rgba(100, 116, 139, 0.1)',
                color: '#64748b',
                fontWeight: 600,
                fontSize: '11px',
                height: 22,
                mr: 1,
              }}
            />
            <IconButton size="small">
              {companyDefaultExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
          <Collapse in={companyDefaultExpanded}>
            <Box sx={{ px: 2, pb: 2 }}>
              {DEFAULT_COMPANIES_TABLE_COLUMNS.map((col) => (
                <FieldDefinitionCard
                  key={col.id}
                  defaultField={col}
                  entityType="company"
                  isProtected={PROTECTED_COMPANY_FIELDS.includes(col.id)}
                  onRename={(fieldId, fieldName, fieldLabel, isDefaultField) =>
                    handleRenameClick(fieldId, fieldName, fieldLabel, isDefaultField, 'company')
                  }
                  onDelete={(fieldId, fieldName, fieldLabel, isDefaultField) =>
                    handleDeleteClick(fieldId, fieldName, fieldLabel, isDefaultField, 'company')
                  }
                />
              ))}
            </Box>
          </Collapse>
        </Box>

        {/* Custom Fields Sub-section */}
        <Box sx={{ borderTop: '1px solid rgba(5, 150, 105, 0.1)' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2,
              py: 1.5,
              cursor: 'pointer',
              bgcolor: companyCustomExpanded ? 'rgba(5, 150, 105, 0.02)' : 'transparent',
              '&:hover': {
                bgcolor: 'rgba(5, 150, 105, 0.04)',
              },
            }}
            onClick={() => setCompanyCustomExpanded(!companyCustomExpanded)}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#059669', flex: 1 }}>
              Custom Fields
            </Typography>
            <Chip
              label={`${companyFields.length} fields`}
              size="small"
              sx={{
                bgcolor: 'rgba(5, 150, 105, 0.1)',
                color: '#059669',
                fontWeight: 600,
                fontSize: '11px',
                height: 22,
                mr: 1,
              }}
            />
            <IconButton size="small">
              {companyCustomExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
          <Collapse in={companyCustomExpanded}>
            <Box sx={{ p: 2 }}>
              {companyFields.length === 0 ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 4,
                    color: '#64748b',
                  }}
                >
                  <Typography variant="body2">
                    No custom company fields defined yet. Click "Add Custom Field" to create one.
                  </Typography>
                </Box>
              ) : (
                companyFields.map((field) => (
                  <FieldDefinitionCard
                    key={field.id}
                    field={field}
                    entityType="company"
                    onSave={handleSaveField}
                    onRename={(fieldId, fieldName, fieldLabel, isDefaultField) =>
                      handleRenameClick(fieldId, fieldName, fieldLabel, isDefaultField, 'company')
                    }
                    onDelete={(fieldId, fieldName, fieldLabel, isDefaultField) =>
                      handleDeleteClick(fieldId, fieldName, fieldLabel, isDefaultField, 'company')
                    }
                  />
                ))
              )}
            </Box>
          </Collapse>
        </Box>
      </Paper>

      {/* Add Field Dialog */}
      <AddFieldDefinitionDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddField}
        entityType={addDialogEntityType}
      />

      {/* Field Operation Confirm Dialog */}
      <FieldOperationConfirmDialog
        open={operationDialogOpen}
        onClose={() => setOperationDialogOpen(false)}
        onConfirm={handleOperationConfirm}
        operationType={operationType}
        fieldName={selectedFieldName}
        fieldLabel={selectedFieldLabel}
        entityType={selectedEntityType}
        isDefaultField={selectedIsDefaultField}
        isProtected={selectedIsProtected}
        affectedCount={affectedCount}
        loadingCount={loadingCount}
      />

      {/* Batch Operation Modal */}
      <BatchOperationModal
        open={batchModalOpen}
        operationType={batchOperationType}
        fieldName={batchFieldName}
        newFieldName={batchNewFieldName}
        progress={batchProgress}
        onRetry={handleBatchRetry}
        onClose={handleBatchModalClose}
      />
    </Box>
  );
};

export default FieldDefinitionsTab;
