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
} from '../../../app/types/crm';
import {
  BoardView,
  TableView,
  LeadDialog,
  FilterBar,
  PipelineSettingsDialog,
  CSVUploadDialog,
  FieldMappingDialog,
} from '../components';
import {
  subscribeToLeads,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
} from '../../../services/crmService';
import { subscribeToPipelineConfig, updatePipelineConfig } from '../../../services/pipelineService';
import { ImportResult } from '../../../services/importService';

export const CRMPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [pipelineSettingsOpen, setPipelineSettingsOpen] = useState(false);
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
        await createLead(data);
        showSnackbar('Lead created successfully', 'success');
      }
    } catch (error) {
      showSnackbar('Failed to save lead', 'error');
      throw error;
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

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateLeadStatus(leadId, newStatus);
      showSnackbar('Lead status updated', 'success');
    } catch (error) {
      showSnackbar('Failed to update status', 'error');
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
    showSnackbar(
      `Import complete: ${result.successful} leads imported${
        result.failed > 0 ? `, ${result.failed} failed` : ''
      }`,
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
          onStatusChange={handleStatusChange}
          onEditLead={handleEditLead}
        />
      ) : (
        <TableView
          leads={filteredLeads}
          stages={stages}
          onEditLead={handleEditLead}
          onDeleteLead={handleDeleteLead}
        />
      )}

      {/* Lead Dialog */}
      <LeadDialog
        open={dialogOpen}
        lead={selectedLead}
        stages={stages}
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
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
