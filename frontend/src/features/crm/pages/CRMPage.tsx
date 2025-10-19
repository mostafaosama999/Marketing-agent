import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  ViewKanban as ViewKanbanIcon,
  TableChart as TableChartIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  Lead,
  LeadFormData,
  ViewMode,
  PipelineStage,
  LeadFilters,
  CSVRow,
  CustomField,
} from '../../../app/types/crm';
import {
  BoardView,
  TableView,
  LeadDialog,
  FilterBar,
  PipelineSettingsDialog,
  CSVUploadDialog,
  FieldMappingDialog,
  CustomFieldsDialog,
  ConfirmDialog,
} from '../components';
import {
  subscribeToLeads,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
} from '../../../services/crmService';
import { subscribeToPipelineConfig, updatePipelineConfig } from '../../../services/pipelineService';
import { subscribeToCustomFields } from '../../../services/customFieldsService';
import { ImportResult } from '../../../services/importService';
import { findDuplicates, getDeduplicationConfig } from '../../../services/deduplicationService';

export const CRMPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [pipelineSettingsOpen, setPipelineSettingsOpen] = useState(false);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [csvUploadOpen, setCSVUploadOpen] = useState(false);
  const [fieldMappingOpen, setFieldMappingOpen] = useState(false);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCSVHeaders] = useState<string[]>([]);
  const [filters, setFilters] = useState<LeadFilters>({
    search: '',
    stages: [],
    dateRange: { start: null, end: null },
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [duplicateConfirm, setDuplicateConfirm] = useState<{
    open: boolean;
    data: LeadFormData | null;
    duplicateNames: string[];
  }>({
    open: false,
    data: null,
    duplicateNames: [],
  });

  // Subscribe to real-time leads updates
  useEffect(() => {
    const unsubscribe = subscribeToLeads((updatedLeads) => {
      setLeads(updatedLeads);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to pipeline configuration
  useEffect(() => {
    const unsubscribe = subscribeToPipelineConfig((config) => {
      if (config) {
        setStages(config.stages);
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to custom fields configuration
  useEffect(() => {
    const unsubscribe = subscribeToCustomFields((config) => {
      if (config) {
        setCustomFields(config.fields);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddLead = () => {
    setSelectedLead(null);
    setDialogOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setDialogOpen(true);
  };

  const handleSaveLead = async (data: LeadFormData) => {
    try {
      if (selectedLead) {
        await updateLead(selectedLead.id, data);
        showSnackbar('Lead updated successfully', 'success');
      } else {
        // Check for duplicates before creating
        const config = getDeduplicationConfig();
        const duplicates = findDuplicates(data, leads, config);

        if (duplicates.length > 0) {
          // Show confirmation dialog instead of saving
          const duplicateNames = duplicates.map(d => d.name);
          setDuplicateConfirm({
            open: true,
            data,
            duplicateNames,
          });
          return; // Don't save yet
        }

        await createLead(data);
        showSnackbar('Lead created successfully', 'success');
      }
    } catch (error) {
      showSnackbar('Failed to save lead', 'error');
      throw error;
    }
  };

  const handleConfirmDuplicateSave = async () => {
    if (!duplicateConfirm.data) return;

    try {
      await createLead(duplicateConfirm.data);
      showSnackbar('Lead created successfully', 'success');
      setDuplicateConfirm({ open: false, data: null, duplicateNames: [] });
    } catch (error) {
      showSnackbar('Failed to save lead', 'error');
      setDuplicateConfirm({ open: false, data: null, duplicateNames: [] });
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteLead(leadId);
      showSnackbar('Lead deleted successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to delete lead', 'error');
    }
  };

  const handleBulkDelete = async (leadIds: string[]) => {
    try {
      await Promise.all(leadIds.map(id => deleteLead(id)));
      showSnackbar(`${leadIds.length} lead${leadIds.length !== 1 ? 's' : ''} deleted successfully`, 'success');
    } catch (error) {
      showSnackbar('Failed to delete leads', 'error');
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateLeadStatus(leadId, newStatus);
      showSnackbar('Lead status updated', 'success');
    } catch (error) {
      showSnackbar('Failed to update status', 'error');
    }
  };

  const handleBulkStatusChange = async (leadIds: string[], newStatus: string) => {
    try {
      await Promise.all(leadIds.map(id => updateLeadStatus(id, newStatus)));
      showSnackbar(`${leadIds.length} lead${leadIds.length !== 1 ? 's' : ''} moved to ${newStatus}`, 'success');
    } catch (error) {
      showSnackbar('Failed to update status', 'error');
    }
  };

  const handleBulkEdit = async (leadIds: string[], updates: Record<string, any>) => {
    try {
      // Update custom fields for all selected leads
      await Promise.all(
        leadIds.map(leadId => {
          const lead = leads.find(l => l.id === leadId);
          if (lead) {
            const updatedCustomFields = {
              ...lead.customFields,
              ...updates,
            };
            return updateLead(leadId, {
              ...lead,
              customFields: updatedCustomFields,
            });
          }
          return Promise.resolve();
        })
      );
      showSnackbar(`${leadIds.length} lead${leadIds.length !== 1 ? 's' : ''} updated successfully`, 'success');
    } catch (error) {
      showSnackbar('Failed to update leads', 'error');
    }
  };

  const handleSavePipelineSettings = async (updatedStages: PipelineStage[]) => {
    try {
      await updatePipelineConfig(updatedStages);
      showSnackbar('Pipeline settings saved', 'success');
    } catch (error) {
      showSnackbar('Failed to save pipeline settings', 'error');
      throw error;
    }
  };

  const handleCSVUploadNext = (data: CSVRow[], headers: string[]) => {
    setCSVData(data);
    setCSVHeaders(headers);
    setCSVUploadOpen(false);
    setFieldMappingOpen(true);
  };

  const handleImportComplete = (result: ImportResult) => {
    setFieldMappingOpen(false);
    setCSVData([]);
    setCSVHeaders([]);

    const parts = [`${result.successful} leads imported`];
    if (result.customFieldsCreated > 0) {
      parts.push(`${result.customFieldsCreated} custom fields created`);
    }
    if (result.skipped > 0) {
      parts.push(`${result.skipped} duplicates skipped`);
    }
    if (result.failed > 0) {
      parts.push(`${result.failed} failed`);
    }

    showSnackbar(
      `Import complete: ${parts.join(', ')}`,
      result.failed > 0 ? 'error' : 'success'
    );
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Apply filters
  const filteredLeads = leads.filter((lead) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        lead.name.toLowerCase().includes(searchLower) ||
        lead.email.toLowerCase().includes(searchLower) ||
        lead.company.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Stage filter
    if (filters.stages.length > 0 && !filters.stages.includes(lead.status)) {
      return false;
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      const leadDate = lead.createdAt.getTime();
      if (filters.dateRange.start && leadDate < filters.dateRange.start.getTime()) {
        return false;
      }
      if (filters.dateRange.end && leadDate > filters.dateRange.end.getTime()) {
        return false;
      }
    }

    return true;
  });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            CRM
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your leads through the sales pipeline
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <IconButton onClick={() => setPipelineSettingsOpen(true)} title="Pipeline Settings">
            <SettingsIcon />
          </IconButton>

          <Button variant="outlined" onClick={() => setCustomFieldsOpen(true)}>
            Custom Fields
          </Button>

          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => setCSVUploadOpen(true)}>
            Import CSV
          </Button>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="board">
              <ViewKanbanIcon sx={{ mr: 1 }} fontSize="small" />
              Board
            </ToggleButton>
            <ToggleButton value="table">
              <TableChartIcon sx={{ mr: 1 }} fontSize="small" />
              Table
            </ToggleButton>
          </ToggleButtonGroup>

          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddLead}>
            Add Lead
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <FilterBar filters={filters} stages={stages} onFiltersChange={setFilters} />

      {/* View Content */}
      {viewMode === 'board' ? (
        <BoardView
          leads={filteredLeads}
          stages={stages}
          customFields={customFields}
          onStatusChange={handleStatusChange}
          onEditLead={handleEditLead}
        />
      ) : (
        <TableView
          leads={filteredLeads}
          stages={stages}
          customFields={customFields}
          onEditLead={handleEditLead}
          onDeleteLead={handleDeleteLead}
          onStatusChange={handleStatusChange}
          onBulkDelete={handleBulkDelete}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkEdit={handleBulkEdit}
        />
      )}

      {/* Lead Dialog */}
      <LeadDialog
        open={dialogOpen}
        lead={selectedLead}
        stages={stages}
        customFields={customFields}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveLead}
      />

      {/* Pipeline Settings Dialog */}
      <PipelineSettingsDialog
        open={pipelineSettingsOpen}
        stages={stages}
        onClose={() => setPipelineSettingsOpen(false)}
        onSave={handleSavePipelineSettings}
      />

      {/* Custom Fields Dialog */}
      <CustomFieldsDialog
        open={customFieldsOpen}
        fields={customFields}
        onClose={() => setCustomFieldsOpen(false)}
      />

      {/* CSV Upload Dialog */}
      <CSVUploadDialog
        open={csvUploadOpen}
        onClose={() => setCSVUploadOpen(false)}
        onNext={handleCSVUploadNext}
      />

      {/* Field Mapping Dialog */}
      <FieldMappingDialog
        open={fieldMappingOpen}
        csvData={csvData}
        headers={csvHeaders}
        stages={stages}
        leads={leads}
        onClose={() => {
          setFieldMappingOpen(false);
          setCSVData([]);
          setCSVHeaders([]);
        }}
        onComplete={handleImportComplete}
      />

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', maxWidth: 500 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Duplicate Lead Confirmation */}
      <ConfirmDialog
        open={duplicateConfirm.open}
        title="Duplicate Lead Detected"
        message={`A lead with the name "${duplicateConfirm.duplicateNames.join(', ')}" already exists. Are you sure you want to create another one?`}
        confirmText="Create Anyway"
        cancelText="Cancel"
        severity="warning"
        onConfirm={handleConfirmDuplicateSave}
        onCancel={() => setDuplicateConfirm({ open: false, data: null, duplicateNames: [] })}
      />
    </Box>
  );
};
