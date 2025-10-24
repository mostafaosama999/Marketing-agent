// src/components/features/crm/CRMBoard.tsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Fab, Button, ThemeProvider, createTheme, Alert, Snackbar } from '@mui/material';
import { Add as AddIcon, UploadFile as UploadFileIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { Lead, LeadStatus } from '../../../types/lead';
import { CSVRow } from '../../../types/crm';
import { FilterState, FilterRule, SavePresetRequest } from '../../../types/filter';
import { applyAdvancedFilters } from '../../../services/api/advancedFilterService';
import { LeadDialog } from './LeadDialog';
import { LeadColumn } from './LeadColumn';
import { CRMLeadsTable } from './CRMLeadsTable';
import { CSVUploadDialog } from './CSVUploadDialog';
import { CSVFieldMappingDialog } from './CSVFieldMappingDialog';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { BulkEditDialog } from './BulkEditDialog';
import { TableColumnVisibilityMenu } from './TableColumnVisibilityMenu';
import {
  CollapsibleFilterBar,
} from './filters';
import { TableColumnConfig, DEFAULT_TABLE_COLUMNS, TABLE_COLUMNS_STORAGE_KEY, applyVisibilityPreferences } from '../../../types/table';
import { buildTableColumns, columnsToVisibilityMap } from '../../../services/api/tableColumnsService';
import { FilterPresetsMenu } from './filters/FilterPresetsMenu';
import { SavePresetDialog } from './filters/SavePresetDialog';
import {
  subscribeToLeads,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  bulkDeleteLeads,
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

  const [currentView, setCurrentView] = useState<'board' | 'table'>('table');

  // Preset dialog state
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);

  // Selection state for table view
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Bulk edit dialog state
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);

  // Table column visibility state
  const [tableColumns, setTableColumns] = useState<TableColumnConfig[]>(DEFAULT_TABLE_COLUMNS);

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

  // Reset columns when all leads are deleted
  useEffect(() => {
    if (leads.length === 0 && tableColumns.length > DEFAULT_TABLE_COLUMNS.length) {
      // All leads deleted and we have custom columns - reset to defaults
      setTableColumns(DEFAULT_TABLE_COLUMNS);
      localStorage.removeItem(TABLE_COLUMNS_STORAGE_KEY);
    }
  }, [leads.length, tableColumns.length]);

  // Load table columns (default + custom fields) when leads change
  useEffect(() => {
    async function initializeTableColumns() {
      try {
        // Build complete column list from default + custom fields from actual leads
        const allColumns = await buildTableColumns(leads);

        // Load saved visibility preferences from localStorage
        const savedPrefs = localStorage.getItem(TABLE_COLUMNS_STORAGE_KEY);
        let visibilityMap: Record<string, boolean> | null = null;

        if (savedPrefs) {
          try {
            visibilityMap = JSON.parse(savedPrefs);
          } catch (e) {
            console.error('Error parsing saved column preferences:', e);
          }
        }

        // Apply saved preferences to columns
        const columnsWithPreferences = applyVisibilityPreferences(allColumns, visibilityMap);

        setTableColumns(columnsWithPreferences);
      } catch (error) {
        console.error('Error loading table columns:', error);
        // Fallback to default columns
        setTableColumns(DEFAULT_TABLE_COLUMNS);
      }
    }

    // Only initialize once leads are loaded
    if (leads.length > 0) {
      initializeTableColumns();
    }
  }, [leads]);

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
          // Note: Column visibility is now managed by the field configuration system
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
        // Update existing lead
        await updateLead(selectedLead.id, leadData);
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
    try {
      await deleteLead(leadId);
      showAlert('Lead deleted successfully');
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

  // Selection handlers for table view
  const handleSelectLead = (leadId: string) => {
    setSelectedLeadIds(prev => {
      if (prev.includes(leadId)) {
        return prev.filter(id => id !== leadId);
      } else {
        return [...prev, leadId];
      }
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allLeadIds = getFilteredLeads().map(lead => lead.id);
      setSelectedLeadIds(allLeadIds);
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleClearSelection = () => {
    setSelectedLeadIds([]);
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

  // Bulk action handlers
  const handleBulkChangeStatus = async (newStatus: LeadStatus) => {
    if (!user || selectedLeadIds.length === 0) return;

    try {
      // Update all selected leads in parallel
      await Promise.all(
        selectedLeadIds.map(leadId => updateLeadStatus(leadId, newStatus, user.uid))
      );

      showAlert(`Successfully updated ${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? 's' : ''}`);
      setSelectedLeadIds([]);
    } catch (error) {
      console.error('Error updating leads:', error);
      showAlert('Failed to update some leads. Please try again.');
    }
  };

  const handleBulkEditFields = () => {
    setShowBulkEditDialog(true);
  };

  const handleBulkEditSave = async (updates: Partial<Lead['customFields']>) => {
    if (selectedLeadIds.length === 0) return;

    try {
      // Update all selected leads with the new custom fields
      await Promise.all(
        selectedLeadIds.map(leadId => {
          const lead = leads.find(l => l.id === leadId);
          if (!lead) return Promise.resolve();

          const updatedCustomFields = {
            ...lead.customFields,
            ...updates,
          };

          return updateLead(leadId, { customFields: updatedCustomFields });
        })
      );

      showAlert(`Successfully updated ${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? 's' : ''}`);
      setSelectedLeadIds([]);
      setShowBulkEditDialog(false);
    } catch (error) {
      console.error('Error bulk editing leads:', error);
      showAlert('Failed to update some leads. Please try again.');
    }
  };

  const handleBulkExportCSV = () => {
    if (selectedLeadIds.length === 0) return;

    try {
      // Get selected leads
      const selectedLeads = leads.filter(lead => selectedLeadIds.includes(lead.id));

      // Prepare CSV headers
      const headers = [
        'Name',
        'Email',
        'Phone',
        'Company',
        'Status',
        'Lead Owner',
        'Priority',
        'Deal Value',
        'Created At',
      ];

      // Prepare CSV rows
      const rows = selectedLeads.map(lead => [
        lead.name,
        lead.email,
        lead.phone || '',
        lead.company,
        lead.status,
        lead.customFields?.lead_owner || '',
        lead.customFields?.priority || '',
        lead.customFields?.deal_value || '',
        lead.createdAt?.toLocaleDateString() || '',
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showAlert(`Exported ${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? 's' : ''} to CSV`);
      setSelectedLeadIds([]);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showAlert('Failed to export CSV. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? 's' : ''}? This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      // Use bulkDeleteLeads to properly handle company cleanup
      await bulkDeleteLeads(selectedLeadIds);

      showAlert(`Successfully deleted ${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? 's' : ''}`);
      setSelectedLeadIds([]);
    } catch (error) {
      console.error('Error deleting leads:', error);
      showAlert('Failed to delete some leads. Please try again.');
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

  // Table column visibility handler
  const handleToggleTableColumnVisibility = (columnId: string, visible: boolean) => {
    const updatedColumns = tableColumns.map(col =>
      col.id === columnId ? { ...col, visible } : col
    );

    // Ensure at least one column remains visible
    const visibleCount = updatedColumns.filter(c => c.visible).length;
    if (visibleCount === 0) {
      showAlert('At least one column must remain visible.');
      return;
    }

    setTableColumns(updatedColumns);
    // Save only visibility map (not full column objects) to localStorage
    const visibilityMap = columnsToVisibilityMap(updatedColumns);
    localStorage.setItem(TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibilityMap));
  };

  // Column reordering handlers
  const handleMoveColumnLeft = (columnId: string) => {
    const currentIndex = tableColumns.findIndex(col => col.id === columnId);

    // Can't move first column left
    if (currentIndex <= 0) return;

    // Create new array with swapped positions
    const newColumns = [...tableColumns];
    const targetIndex = currentIndex - 1;

    // Swap order values
    const currentOrder = newColumns[currentIndex].order;
    newColumns[currentIndex] = { ...newColumns[currentIndex], order: newColumns[targetIndex].order };
    newColumns[targetIndex] = { ...newColumns[targetIndex], order: currentOrder };

    // Sort by new order
    const sortedColumns = newColumns.sort((a, b) => a.order - b.order);

    setTableColumns(sortedColumns);

    // Save to localStorage
    const visibilityMap = columnsToVisibilityMap(sortedColumns);
    localStorage.setItem(TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibilityMap));
  };

  const handleMoveColumnRight = (columnId: string) => {
    const currentIndex = tableColumns.findIndex(col => col.id === columnId);

    // Can't move last column right
    if (currentIndex < 0 || currentIndex >= tableColumns.length - 1) return;

    // Create new array with swapped positions
    const newColumns = [...tableColumns];
    const targetIndex = currentIndex + 1;

    // Swap order values
    const currentOrder = newColumns[currentIndex].order;
    newColumns[currentIndex] = { ...newColumns[currentIndex], order: newColumns[targetIndex].order };
    newColumns[targetIndex] = { ...newColumns[targetIndex], order: currentOrder };

    // Sort by new order
    const sortedColumns = newColumns.sort((a, b) => a.order - b.order);

    setTableColumns(sortedColumns);

    // Save to localStorage
    const visibilityMap = columnsToVisibilityMap(sortedColumns);
    localStorage.setItem(TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibilityMap));
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
        // Note: Column visibility is now managed by the field configuration system
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
                {/* Table view: Show lead count and column visibility */}
                {currentView === 'table' && (
                  <>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Showing {getFilteredLeads().length} leads
                    </Typography>
                    <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
                    <TableColumnVisibilityMenu
                      columns={tableColumns}
                      onToggleVisibility={handleToggleTableColumnVisibility}
                    />
                    <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
                  </>
                )}
                {/* ViewToggle hidden - keeping code for potential future use
                <ViewToggle
                  view={currentView}
                  onViewChange={handleViewChange}
                />
                */}
              </Box>

              {/* Collapsible Filter Bar */}
              <CollapsibleFilterBar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClearAll={handleClearAllFilters}
                onApplyAdvancedFilters={handleApplyAdvancedFilters}
                data={leads}
                entityType="lead"
                searchPlaceholder="Search leads..."
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
            overflow: 'auto',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            py: 2,
          }}>
            <Box sx={{
              maxWidth: '2200px',
              margin: '0 auto',
              px: 0.5,
            }}>
              {/* Bulk Actions Toolbar */}
              <BulkActionsToolbar
                selectedCount={selectedLeadIds.length}
                onChangeStatus={handleBulkChangeStatus}
                onEditFields={handleBulkEditFields}
                onExportCSV={handleBulkExportCSV}
                onDelete={handleBulkDelete}
                onClear={handleClearSelection}
              />

              {/* Table */}
              <CRMLeadsTable
                leads={getFilteredLeads()}
                onLeadClick={handleLeadClick}
                onUpdateStatus={handleUpdateStatus}
                selectedLeadIds={selectedLeadIds}
                onSelectLead={handleSelectLead}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                visibleColumns={tableColumns}
                onMoveColumnLeft={handleMoveColumnLeft}
                onMoveColumnRight={handleMoveColumnRight}
              />
            </Box>
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
          onDelete={handleDeleteLead}
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

        {/* Bulk Edit Dialog */}
        <BulkEditDialog
          open={showBulkEditDialog}
          onClose={() => setShowBulkEditDialog(false)}
          onSave={handleBulkEditSave}
          selectedCount={selectedLeadIds.length}
        />
      </Box>
    </ThemeProvider>
  );
}

export default CRMBoard;
