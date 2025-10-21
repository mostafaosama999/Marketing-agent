// src/components/features/crm/CRMBoard.tsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Fab, Button, ThemeProvider, createTheme, Alert, Snackbar, Menu, MenuItem, Checkbox, ListItemIcon, ListItemText } from '@mui/material';
import { Add as AddIcon, UploadFile as UploadFileIcon, ViewColumn as ViewColumnIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { Lead, LeadStatus } from '../../../types/lead';
import { CSVRow } from '../../../types/crm';
import { FilterState, FilterRule, SavePresetRequest } from '../../../types/filter';
import { applyAdvancedFilters } from '../../../services/api/advancedFilterService';
import { LeadDialog } from './LeadDialog';
import { LeadColumn } from './LeadColumn';
import { ViewToggle } from './ViewToggle';
import { CRMLeadsTable } from './CRMLeadsTable';
import { CSVUploadDialog } from './CSVUploadDialog';
import { CSVFieldMappingDialog } from './CSVFieldMappingDialog';
import {
  CollapsibleFilterBar,
} from './filters';
import { FilterPresetsMenu } from './filters/FilterPresetsMenu';
import { SavePresetDialog } from './filters/SavePresetDialog';
import {
  subscribeToLeads,
  createLead,
  updateLeadStatus,
  deleteLead,
} from '../../../services/api/leads';
import { usePipelineConfig } from '../../../hooks/usePipelineConfig';
import {
  loadPreset,
  getDefaultPreset,
  migrateLocalStorageToFirestore,
} from '../../../services/api/filterPresetsService';

// Modern theme matching KanbanBoard
const modernTheme = createTheme({
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 700, fontSize: '28px', lineHeight: 1.2 },
    h6: { fontWeight: 600, fontSize: '16px' },
    subtitle1: { fontWeight: 400, fontSize: '15px', lineHeight: 1.4 },
    body1: { fontWeight: 500, fontSize: '14px' },
    body2: { fontWeight: 400, fontSize: '13px' },
    caption: { fontWeight: 400, fontSize: '12px' },
  },
});

function CRMBoard() {
  const { userProfile, user } = useAuth();
  const { stages, updateLabel, updateOrder } = usePipelineConfig(); // Load dynamic pipeline config
  const [leads, setLeads] = useState<Lead[]>([]);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null); // Column being dragged
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null); // Column being dragged over
  const [openDialog, setOpenDialog] = useState(false);
  const [openLeadDetail, setOpenLeadDetail] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Unified filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    statuses: [],
    company: '',
    month: '',
  });

  // Advanced filter rules
  const [advancedFilterRules, setAdvancedFilterRules] = useState<FilterRule[]>([]);

  // CSV Import states
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showCSVMapping, setShowCSVMapping] = useState(false);
  const [parsedCSVData, setParsedCSVData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);

  const [currentView, setCurrentView] = useState<'board' | 'table'>('board');

  // Preset dialog state
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);

  // Column visibility state for table view
  const defaultColumns = [
    { id: 'name', label: 'Name', required: true },
    { id: 'email', label: 'Email', required: false },
    { id: 'phone', label: 'Phone', required: false },
    { id: 'company', label: 'Company', required: false },
    { id: 'status', label: 'Status', required: false },
    { id: 'created', label: 'Created', required: false },
    { id: 'actions', label: 'Actions', required: true },
  ];

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    defaultColumns.reduce((acc, col) => {
      acc[col.id] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);

  // Get columns with counts from dynamic pipeline stages
  const getColumns = () => {
    return stages
      .sort((a, b) => a.order - b.order)
      .filter((stage) => stage.visible)
      .map((stage) => ({
        id: stage.id,
        title: stage.label,
        icon: stage.icon,
        color: stage.color,
        headerColor: stage.headerColor,
        count: getLeadsForColumn(stage.id as LeadStatus).length,
      }));
  };

  // Subscribe to leads in real-time
  useEffect(() => {
    const unsubscribe = subscribeToLeads((leadsData) => {
      setLeads(leadsData);
    });

    return () => unsubscribe();
  }, []);

  // Migrate localStorage data and load default preset on mount
  useEffect(() => {
    async function initializePresets() {
      if (!user) return;

      try {
        // First, migrate any existing localStorage data
        await migrateLocalStorageToFirestore(user.uid);

        // Then, load the default preset if one exists
        const defaultPreset = await getDefaultPreset(user.uid);
        if (defaultPreset) {
          // Apply the default preset
          setAdvancedFilterRules(defaultPreset.advancedRules);
          setFilters(defaultPreset.basicFilters);
          setCurrentView(defaultPreset.viewMode);
          if (defaultPreset.tableColumns) {
            setColumnVisibility(defaultPreset.tableColumns);
          }
        }
      } catch (error) {
        console.error('Error initializing presets:', error);
      }
    }

    initializePresets();
  }, [user]);

  // Helper functions
  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertOpen(true);
  };

  // Helper to get the most recent update date from stateHistory or updatedAt
  const getLastUpdateDate = (lead: Lead): Date | null => {
    // First, try to get the most recent timestamp from stateHistory
    if (lead.stateHistory) {
      const timestamps = Object.values(lead.stateHistory)
        .filter((timestamp): timestamp is string => timestamp !== undefined && timestamp !== null)
        .map(ts => new Date(ts))
        .filter(date => !isNaN(date.getTime()));

      if (timestamps.length > 0) {
        return new Date(Math.max(...timestamps.map(d => d.getTime())));
      }
    }

    // Fallback to updatedAt if available
    if (lead.updatedAt) {
      if (lead.updatedAt instanceof Date) {
        return lead.updatedAt;
      }
      if (typeof lead.updatedAt === 'string') {
        return new Date(lead.updatedAt);
      }
    }

    return null;
  };

  // Event handlers
  const handleDragStart = (e: any, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: any, targetStatus: string) => {
    e.preventDefault();

    if (!draggedLead || !user) return;

    const newStatus = targetStatus as LeadStatus;
    const oldStatus = draggedLead.status;

    if (oldStatus === newStatus) {
      setDraggedLead(null);
      return;
    }

    try {
      await updateLeadStatus(draggedLead.id, newStatus, user.uid);
      setDraggedLead(null);
    } catch (error) {
      console.error('Error updating lead status:', error);
      showAlert('Failed to update lead status. Please try again.');
      setDraggedLead(null);
    }
  };

  // Column drag handlers
  const handleColumnDragStart = (e: any, columnId: string) => {
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
    // Prevent dragging leads while dragging columns
    e.stopPropagation();
  };

  const handleColumnDragOver = (e: any, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedColumn && draggedColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleColumnDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleColumnDrop = async (e: any, targetColumnId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    try {
      // Find source and target indices
      const sourceIndex = stages.findIndex((s) => s.id === draggedColumn);
      const targetIndex = stages.findIndex((s) => s.id === targetColumnId);

      if (sourceIndex === -1 || targetIndex === -1) {
        console.error('Invalid column indices');
        return;
      }

      // Create new array with swapped positions
      const newStages = [...stages];
      const [movedStage] = newStages.splice(sourceIndex, 1);
      newStages.splice(targetIndex, 0, movedStage);

      // Update order in Firestore
      await updateOrder(newStages);

      setDraggedColumn(null);
      setDragOverColumn(null);
    } catch (error) {
      console.error('Error reordering columns:', error);
      showAlert('Failed to reorder columns. Please try again.');
      setDraggedColumn(null);
      setDragOverColumn(null);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDialogMode('edit');
    setOpenLeadDetail(true);
  };

  const handleAddLead = () => {
    setSelectedLead(null);
    setDialogMode('create');
    setOpenDialog(true);
  };

  const handleSaveLead = async (leadData: any) => {
    try {
      if (dialogMode === 'create') {
        if (!user) throw new Error('User not authenticated');
        await createLead(leadData, user.uid);
      } else if (selectedLead) {
        // Update handled by LeadDialog
      }
      setOpenDialog(false);
      setOpenLeadDetail(false);
      setSelectedLead(null);
    } catch (error) {
      console.error('Error saving lead:', error);
      showAlert('Failed to save lead. Please try again.');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;

    try {
      await deleteLead(leadId);
    } catch (error) {
      console.error('Error deleting lead:', error);
      showAlert('Failed to delete lead. Please try again.');
    }
  };

  // Helper function to check if lead matches search term
  const matchesSearch = (lead: Lead, term: string): boolean => {
    if (!term) return true;
    const searchLower = term.toLowerCase();
    const nameMatch = lead.name.toLowerCase().includes(searchLower);
    const emailMatch = lead.email.toLowerCase().includes(searchLower);
    const companyMatch = lead.company.toLowerCase().includes(searchLower);
    const phoneMatch = lead.phone ? lead.phone.toLowerCase().includes(searchLower) : false;
    return nameMatch || emailMatch || companyMatch || phoneMatch;
  };

  const getLeadsForColumn = (columnId: LeadStatus) => {
    let filteredLeads = leads.filter(lead => lead.status === columnId);

    // Apply search filter
    if (filters.search) {
      filteredLeads = filteredLeads.filter(lead => matchesSearch(lead, filters.search));
    }

    // Apply status filter (for board view, if specific statuses are selected)
    if (filters.statuses.length > 0 && !filters.statuses.includes(columnId)) {
      return []; // Don't show this column if its status is not selected
    }

    // Apply owner filter if selected
    if (filters.lead_owner) {
      filteredLeads = filteredLeads.filter(lead =>
        lead.customFields?.lead_owner === filters.lead_owner
      );
    }

    // Apply company filter if selected
    if (filters.company) {
      filteredLeads = filteredLeads.filter(lead =>
        lead.company === filters.company
      );
    }

    // Apply month filter if selected
    if (filters.month) {
      filteredLeads = filteredLeads.filter(lead => {
        const lastUpdateDate = getLastUpdateDate(lead);

        if (!lastUpdateDate) {
          return false;
        }

        const leadYear = lastUpdateDate.getFullYear();
        const leadMonth = String(lastUpdateDate.getMonth() + 1).padStart(2, '0');
        const leadYearMonth = `${leadYear}-${leadMonth}`;

        return leadYearMonth === filters.month;
      });
    }

    // Apply advanced filters if any rules are set
    if (advancedFilterRules.length > 0) {
      filteredLeads = applyAdvancedFilters(filteredLeads, advancedFilterRules);
    }

    return filteredLeads;
  };

  // Get all filtered leads for table view
  const getFilteredLeads = () => {
    let filteredLeads = [...leads];

    // Apply search filter
    if (filters.search) {
      filteredLeads = filteredLeads.filter(lead => matchesSearch(lead, filters.search));
    }

    // Apply status filter
    if (filters.statuses.length > 0) {
      filteredLeads = filteredLeads.filter(lead =>
        filters.statuses.includes(lead.status)
      );
    }

    // Apply owner filter
    if (filters.lead_owner) {
      filteredLeads = filteredLeads.filter(lead =>
        lead.customFields?.lead_owner === filters.lead_owner
      );
    }

    // Apply company filter
    if (filters.company) {
      filteredLeads = filteredLeads.filter(lead =>
        lead.company === filters.company
      );
    }

    // Apply month filter
    if (filters.month) {
      filteredLeads = filteredLeads.filter(lead => {
        const lastUpdateDate = getLastUpdateDate(lead);
        if (!lastUpdateDate) return false;

        const leadYear = lastUpdateDate.getFullYear();
        const leadMonth = String(lastUpdateDate.getMonth() + 1).padStart(2, '0');
        const leadYearMonth = `${leadYear}-${leadMonth}`;

        return leadYearMonth === filters.month;
      });
    }

    // Apply advanced filters if any rules are set
    if (advancedFilterRules.length > 0) {
      filteredLeads = applyAdvancedFilters(filteredLeads, advancedFilterRules);
    }

    return filteredLeads;
  };

  const handleViewChange = (view: 'board' | 'table') => {
    setCurrentView(view);
  };

  // Column visibility handler
  const toggleColumnVisibility = (columnId: string) => {
    const column = defaultColumns.find((c) => c.id === columnId);
    if (column?.required) return;

    const visibleCount = Object.values(columnVisibility).filter((v) => v).length;
    if (visibleCount === 1 && columnVisibility[columnId]) {
      alert('At least one column must remain visible');
      return;
    }

    const newVisibility = {
      ...columnVisibility,
      [columnId]: !columnVisibility[columnId],
    };

    setColumnVisibility(newVisibility);
  };

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || !user) return;

    try {
      await updateLeadStatus(leadId, newStatus, user.uid);
    } catch (error) {
      console.error('Error updating lead status:', error);
      showAlert('Failed to update status. Please try again.');
    }
  };

  // Filter handlers
  const handleFiltersChange = (updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  const handleClearAllFilters = () => {
    setFilters({
      search: '',
      statuses: [],
      company: '',
      month: '',
    });
    setAdvancedFilterRules([]);
  };

  const handleApplyAdvancedFilters = (rules: FilterRule[]) => {
    setAdvancedFilterRules(rules);
  };

  // Preset handlers
  const handleLoadPreset = async (presetId: string) => {
    if (!user) return;

    try {
      const preset = await loadPreset(user.uid, presetId);
      if (preset) {
        setAdvancedFilterRules(preset.advancedRules);
        setFilters(preset.basicFilters);
        setCurrentView(preset.viewMode);
        if (preset.tableColumns) {
          setColumnVisibility(preset.tableColumns);
        }
        showAlert(`Preset "${preset.name}" loaded successfully`);
      }
    } catch (error) {
      console.error('Error loading preset:', error);
      showAlert('Failed to load preset. Please try again.');
    }
  };

  const handleSaveNewPreset = () => {
    setShowSavePresetDialog(true);
  };

  const getCurrentPresetData = (): SavePresetRequest => {
    return {
      name: '', // Will be filled by dialog
      advancedRules: advancedFilterRules,
      basicFilters: filters,
      viewMode: currentView,
      tableColumns: columnVisibility,
    };
  };

  // CSV Import handlers
  const handleCSVUploadNext = (data: CSVRow[], headers: string[]) => {
    setParsedCSVData(data);
    setCsvHeaders(headers);
    setShowCSVUpload(false);
    setShowCSVMapping(true);
  };

  const handleCSVMappingBack = () => {
    setShowCSVMapping(false);
    setShowCSVUpload(true);
  };

  const handleCSVMappingClose = () => {
    setShowCSVMapping(false);
    setParsedCSVData([]);
    setCsvHeaders([]);
  };

  const handleCSVUploadClose = () => {
    setShowCSVUpload(false);
    setParsedCSVData([]);
    setCsvHeaders([]);
  };

  const columns = getColumns();

  return (
    <ThemeProvider theme={modernTheme}>
      <Box sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        height: 'calc(100vh - 48px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <Box sx={{
          position: 'relative',
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          px: 3,
          py: 1.5,
          flexShrink: 0
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box>
              <Typography variant="h4" sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                fontWeight: 700,
                mb: 1
              }}>
                CRM Pipeline
              </Typography>
              <Typography variant="subtitle1" sx={{
                color: '#64748b',
                fontWeight: 400
              }}>
                Manage your leads efficiently
              </Typography>
            </Box>

            {/* View Toggle and Smart Filters */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flex: 1 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<UploadFileIcon />}
                  onClick={() => setShowCSVUpload(true)}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 2,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    },
                  }}
                >
                  Import CSV
                </Button>
                <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
                {user && (
                  <>
                    <FilterPresetsMenu
                      userId={user.uid}
                      onLoadPreset={handleLoadPreset}
                      onSaveNew={handleSaveNewPreset}
                    />
                    <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
                  </>
                )}
                <ViewToggle
                  view={currentView}
                  onViewChange={handleViewChange}
                />
                {currentView === 'table' && (
                  <>
                    <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ViewColumnIcon />}
                      onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                      sx={{
                        textTransform: 'none',
                        borderColor: '#e2e8f0',
                        color: '#64748b',
                        fontWeight: 500,
                        '&:hover': {
                          borderColor: '#667eea',
                          bgcolor: 'rgba(102, 126, 234, 0.04)',
                          color: '#667eea',
                        },
                      }}
                    >
                      Columns
                    </Button>
                  </>
                )}
                <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
              </Box>

              {/* Collapsible Filter Bar */}
              <CollapsibleFilterBar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClearAll={handleClearAllFilters}
                onApplyAdvancedFilters={handleApplyAdvancedFilters}
                leads={leads}
              />
            </Box>
          </Box>
        </Box>

        {/* Content Area - Board or Table View */}
        {currentView === 'board' ? (
          <Box sx={{
            flex: 1,
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            overflowY: 'hidden',
            px: 3,
            py: 1.5,
          }}>
            {columns.map((column) => (
              <LeadColumn
                key={column.id}
                column={column}
                leads={getLeadsForColumn(column.id as LeadStatus)}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onLeadClick={handleLeadClick}
                onAddLead={() => setOpenDialog(true)}
                userProfile={userProfile}
                onUpdateLabel={updateLabel}
                onColumnDragStart={handleColumnDragStart}
                onColumnDragOver={handleColumnDragOver}
                onColumnDragLeave={handleColumnDragLeave}
                onColumnDrop={handleColumnDrop}
                isDraggedOver={dragOverColumn === column.id}
              />
            ))}
          </Box>
        ) : (
          <Box sx={{
            flex: 1,
            px: 3,
            py: 1.5,
            overflow: 'auto',
          }}>
            <CRMLeadsTable
              leads={getFilteredLeads()}
              onLeadClick={handleLeadClick}
              onDeleteLead={handleDeleteLead}
              onUpdateStatus={handleUpdateStatus}
              columnVisibility={columnVisibility}
              onToggleColumnVisibility={toggleColumnVisibility}
            />
          </Box>
        )}

        {/* Floating Action Button */}
        <Fab
          onClick={handleAddLead}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              transform: 'scale(1.05)',
            },
          }}
        >
          <AddIcon />
        </Fab>

        {/* Alert Snackbar */}
        <Snackbar
          open={alertOpen}
          autoHideDuration={6000}
          onClose={() => setAlertOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setAlertOpen(false)} severity="warning">
            {alertMessage}
          </Alert>
        </Snackbar>

        {/* Lead Dialog */}
        <LeadDialog
          open={openDialog || openLeadDetail}
          onClose={() => {
            setOpenDialog(false);
            setOpenLeadDetail(false);
            setSelectedLead(null);
          }}
          onSave={handleSaveLead}
          lead={selectedLead || undefined}
          mode={dialogMode}
        />

        {/* CSV Upload Dialog */}
        <CSVUploadDialog
          open={showCSVUpload}
          onClose={handleCSVUploadClose}
          onNext={handleCSVUploadNext}
        />

        {/* CSV Field Mapping Dialog */}
        <CSVFieldMappingDialog
          open={showCSVMapping}
          onClose={handleCSVMappingClose}
          onBack={handleCSVMappingBack}
          data={parsedCSVData}
          headers={csvHeaders}
        />

        {/* Save Preset Dialog */}
        {user && (
          <SavePresetDialog
            open={showSavePresetDialog}
            onClose={() => setShowSavePresetDialog(false)}
            userId={user.uid}
            currentPreset={getCurrentPresetData()}
          />
        )}

        {/* Column Visibility Menu */}
        <Menu
          anchorEl={columnMenuAnchor}
          open={Boolean(columnMenuAnchor)}
          onClose={() => setColumnMenuAnchor(null)}
          PaperProps={{
            sx: {
              minWidth: 200,
              maxHeight: 400,
            },
          }}
        >
          <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #e2e8f0' }}>
            <Typography variant="caption" fontWeight={600} color="#64748b">
              SHOW/HIDE COLUMNS
            </Typography>
          </Box>
          {defaultColumns.map((column) => (
            <MenuItem
              key={column.id}
              onClick={() => {
                if (!column.required) {
                  toggleColumnVisibility(column.id);
                }
              }}
              disabled={column.required}
              sx={{
                py: 1,
                '&.Mui-disabled': {
                  opacity: 0.5,
                },
              }}
            >
              <ListItemIcon>
                <Checkbox
                  checked={columnVisibility[column.id] ?? true}
                  disabled={column.required}
                  size="small"
                  sx={{
                    color: '#64748b',
                    '&.Mui-checked': {
                      color: '#667eea',
                    },
                  }}
                />
              </ListItemIcon>
              <ListItemText
                primary={column.label}
                primaryTypographyProps={{
                  fontSize: '14px',
                  fontWeight: columnVisibility[column.id] ? 500 : 400,
                }}
              />
              {column.required && (
                <Typography variant="caption" color="#94a3b8" sx={{ ml: 1 }}>
                  Required
                </Typography>
              )}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </ThemeProvider>
  );
}

export default CRMBoard;
