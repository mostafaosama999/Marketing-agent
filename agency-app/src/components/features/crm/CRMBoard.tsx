// src/components/features/crm/CRMBoard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Fab,
  Button,
  ThemeProvider,
  createTheme,
  Alert,
  Snackbar,
  IconButton,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
  TextField,
} from '@mui/material';
import { Add as AddIcon, UploadFile as UploadFileIcon, Archive as ArchiveIcon } from '@mui/icons-material';
import { serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { Lead, LeadStatus } from '../../../types/lead';
import { Company, CSVRow } from '../../../types/crm';
import { FilterState, FilterRule, SavePresetRequest } from '../../../types/filter';
import { CrossEntityFilterContext } from '../../../types/crossEntityFilter';
import { applyAdvancedFilters, applyAdvancedFiltersWithCrossEntity } from '../../../services/api/advancedFilterService';
import { buildCompaniesMap } from '../../../services/api/crossEntityFilterService';
import { subscribeToCompanies } from '../../../services/api/companies';
import { LeadDialog } from './LeadDialog';
import { LeadColumn } from './LeadColumn';
import { CRMLeadsTable } from './CRMLeadsTable';
import { CSVUploadDialog } from './CSVUploadDialog';
import { CSVFieldMappingDialog } from './CSVFieldMappingDialog';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { BulkEditDialog } from './BulkEditDialog';
import { TableColumnVisibilityMenu } from './TableColumnVisibilityMenu';
import {
  AdvancedFiltersModal,
  SearchFilter,
  FilterButton,
} from './filters';
import { TableColumnConfig, DEFAULT_TABLE_COLUMNS, TABLE_COLUMNS_STORAGE_KEY } from '../../../types/table';
import { buildTableColumns, columnsToPreferences, applyColumnPreferences } from '../../../services/api/tableColumnsService';
import { FilterPresetsMenu } from './filters/FilterPresetsMenu';
import { SavePresetDialog } from './filters/SavePresetDialog';
import {
  subscribeToLeads,
  subscribeToArchivedLeads,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  bulkDeleteLeads,
  bulkArchiveLeads,
  archiveLead,
  unarchiveLead,
  deleteCustomFieldFromAllLeads,
} from '../../../services/api/leads';
import { ArchivedLeadsView } from './ArchivedLeadsView';
import { usePipelineConfig } from '../../../hooks/usePipelineConfig';
import {
  loadPreset,
  getDefaultPreset,
  migrateLocalStorageToFirestore,
} from '../../../services/api/filterPresetsService';
import { ReleaseNotesBanner } from './ReleaseNotesBanner';
import { ReleaseNote, UserReleaseNoteState } from '../../../types/releaseNotes';
import { getLatestReleaseNote, getUserReleaseState } from '../../../services/api/releaseNotesService';

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

// LocalStorage key for persisting active filters across page refreshes
const ACTIVE_FILTERS_STORAGE_KEY = 'crm_active_filters';

function CRMBoard() {
  const navigate = useNavigate();
  const { userProfile, user } = useAuth();
  const { stages, updateLabel, updateOrder } = usePipelineConfig(); // Load dynamic pipeline config
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [archivedLeadsCount, setArchivedLeadsCount] = useState(0);
  const [showArchivedView, setShowArchivedView] = useState(false);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null); // Column being dragged
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null); // Column being dragged over
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Track if component has mounted to prevent saving on initial render
  const isInitialMount = React.useRef(true);

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

  // Advanced filters modal state
  const [openFiltersModal, setOpenFiltersModal] = useState(false);

  // Selection state for table view
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Bulk edit dialog state
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);

  // Bulk archive dialog state
  const [showBulkArchiveDialog, setShowBulkArchiveDialog] = useState(false);
  const [bulkArchiveReason, setBulkArchiveReason] = useState('');
  const [bulkArchiving, setBulkArchiving] = useState(false);

  // Bulk delete dialog and loading state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Table column visibility state
  const [tableColumns, setTableColumns] = useState<TableColumnConfig[]>(DEFAULT_TABLE_COLUMNS);

  // Release notes state
  const [latestRelease, setLatestRelease] = useState<ReleaseNote | null>(null);
  const [userReleaseState, setUserReleaseState] = useState<UserReleaseNoteState | null>(null);

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

  // Check if any filter rules require company data (cross-entity filtering)
  const hasCompanyCrossEntityRule = useMemo(
    () => advancedFilterRules.some(r => r.entitySource === 'company'),
    [advancedFilterRules]
  );

  // LAZY LOAD: Only subscribe to companies when cross-entity filter rules exist
  // This avoids loading all companies into memory when not needed
  useEffect(() => {
    if (!hasCompanyCrossEntityRule) {
      // Clear companies if no longer needed
      setCompanies([]);
      setCompaniesLoading(false);
      return;
    }

    // Start loading - filter should wait until companies are loaded
    setCompaniesLoading(true);

    // Only subscribe when we actually need companies data for filtering
    const unsubscribe = subscribeToCompanies((companiesData) => {
      setCompanies(companiesData);
      setCompaniesLoading(false); // Done loading
    });

    return () => unsubscribe();
  }, [hasCompanyCrossEntityRule]);

  // Build cross-entity context for filtering leads by company values
  const crossEntityContext = useMemo<CrossEntityFilterContext>(() => {
    return { companiesMap: buildCompaniesMap(companies) };
  }, [companies]);

  // Subscribe to archived leads count
  useEffect(() => {
    const unsubscribe = subscribeToArchivedLeads((archivedLeads) => {
      setArchivedLeadsCount(archivedLeads.length);
    });

    return () => unsubscribe();
  }, []);

  // Load release notes
  useEffect(() => {
    const loadReleaseNotes = async () => {
      if (!user) return;

      try {
        const [release, userState] = await Promise.all([
          getLatestReleaseNote(),
          getUserReleaseState(user.uid),
        ]);

        setLatestRelease(release);
        setUserReleaseState(userState);
      } catch (error) {
        console.error('Error loading release notes:', error);
      }
    };

    loadReleaseNotes();
  }, [user]);

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

        // Load saved preferences (visibility + order) from localStorage
        const savedPrefs = localStorage.getItem(TABLE_COLUMNS_STORAGE_KEY);
        let preferences: Record<string, boolean | { visible: boolean; order: number }> | null = null;

        if (savedPrefs) {
          try {
            preferences = JSON.parse(savedPrefs);
          } catch (e) {
            console.error('Error parsing saved column preferences:', e);
          }
        }

        // Apply saved preferences to columns (handles both old and new format)
        const columnsWithPreferences = applyColumnPreferences(allColumns, preferences);

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

  // Load filters from localStorage on mount (persists across page refreshes)
  useEffect(() => {
    const debugMode = localStorage.getItem('crm_debug') === 'true';

    try {
      const savedFilters = localStorage.getItem(ACTIVE_FILTERS_STORAGE_KEY);

      if (debugMode) {
        console.log('[CRM Filter Persistence] Loading filters from localStorage:', savedFilters);
      }

      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);

        if (debugMode) {
          console.log('[CRM Filter Persistence] Parsed filter state:', parsed);
        }

        if (parsed.filters) {
          setFilters(parsed.filters);
        }
        if (parsed.advancedFilterRules) {
          setAdvancedFilterRules(parsed.advancedFilterRules);
        }
        if (parsed.currentView) {
          setCurrentView(parsed.currentView);
        }

        if (debugMode) {
          console.log('[CRM Filter Persistence] Filters successfully restored');
        }
      } else if (debugMode) {
        console.log('[CRM Filter Persistence] No saved filters found in localStorage');
      }
    } catch (error) {
      console.error('Error loading filters from localStorage:', error);
    }
  }, []); // Only run once on mount

  // Helper function to save filters to localStorage
  const saveFiltersToStorage = React.useCallback(() => {
    try {
      const filterState = {
        filters,
        advancedFilterRules,
        currentView,
      };
      localStorage.setItem(ACTIVE_FILTERS_STORAGE_KEY, JSON.stringify(filterState));

      // Debug logging (only if crm_debug is enabled)
      const debugMode = localStorage.getItem('crm_debug') === 'true';
      if (debugMode) {
        console.log('[CRM Filter Persistence] Saved filters to localStorage:', filterState);
      }
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
    }
  }, [filters, advancedFilterRules, currentView]);

  // Save filters to localStorage whenever they change (skip initial mount)
  useEffect(() => {
    // Skip saving on the very first render to allow loading to complete
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    saveFiltersToStorage();
  }, [filters, advancedFilterRules, currentView, saveFiltersToStorage]);

  // Add beforeunload handler to ensure filters are saved before navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Force save filters before page unload/navigation
      saveFiltersToStorage();
    };

    // Listen to both beforeunload and pagehide for better browser compatibility
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      // Save one final time on cleanup
      saveFiltersToStorage();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [saveFiltersToStorage]);

  // Migrate localStorage data and load default preset on mount
  useEffect(() => {
    async function initializePresets() {
      if (!user) return;

      try {
        // Check if we have active filters in localStorage
        const savedFilters = localStorage.getItem(ACTIVE_FILTERS_STORAGE_KEY);

        // First, migrate any existing localStorage data
        await migrateLocalStorageToFirestore(user.uid);

        // Only load default preset if no active filters exist
        if (!savedFilters) {
          const defaultPreset = await getDefaultPreset(user.uid);
          if (defaultPreset) {
            // Apply the default preset
            setAdvancedFilterRules(defaultPreset.advancedRules);
            setFilters(defaultPreset.basicFilters);
            setCurrentView(defaultPreset.viewMode);
            // Note: Column visibility is now managed by the field configuration system
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
    // Navigate to the lead details page instead of opening dialog
    navigate(`/leads/${lead.id}`);
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

  const handleArchiveLead = async (leadId: string) => {
    if (!user) return;
    try {
      await archiveLead(leadId, user.uid);
      showAlert('Lead archived successfully');
    } catch (error) {
      console.error('Error archiving lead:', error);
      showAlert('Failed to archive lead. Please try again.');
    }
  };

  const handleUnarchiveLead = async (leadId: string) => {
    try {
      await unarchiveLead(leadId);
      showAlert('Lead unarchived successfully');
    } catch (error) {
      console.error('Error unarchiving lead:', error);
      showAlert('Failed to unarchive lead. Please try again.');
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

    // Apply advanced filters if any rules are set (with cross-entity support)
    if (advancedFilterRules.length > 0) {
      // If we have company cross-entity rules but companies are still loading, return empty
      // This prevents showing incorrect results before company data is available
      if (hasCompanyCrossEntityRule && companiesLoading) {
        return [];
      }
      filteredLeads = applyAdvancedFiltersWithCrossEntity(filteredLeads, advancedFilterRules, crossEntityContext);
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

    // Apply advanced filters if any rules are set (with cross-entity support)
    if (advancedFilterRules.length > 0) {
      // If we have company cross-entity rules but companies are still loading, return empty
      // This prevents showing incorrect results before company data is available
      if (hasCompanyCrossEntityRule && companiesLoading) {
        return [];
      }

      filteredLeads = applyAdvancedFiltersWithCrossEntity(filteredLeads, advancedFilterRules, crossEntityContext);
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

  // Helper function to remove undefined values from an object
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    const cleaned: any = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !(obj[key] instanceof Date)) {
          cleaned[key] = removeUndefined(obj[key]);
        } else {
          cleaned[key] = obj[key];
        }
      }
    }
    return cleaned;
  };

  // LinkedIn status update handler
  const handleUpdateLinkedInStatus = async (leadId: string, status: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    try {
      // Build the complete outreach object preserving both channels
      const outreachData: any = {};

      // Update LinkedIn
      outreachData.linkedIn = {
        ...lead.outreach?.linkedIn,
        status,
      };

      // Auto-set sentAt timestamp if status is sent or opened
      if ((status === 'sent' || status === 'opened') && !lead.outreach?.linkedIn?.sentAt) {
        outreachData.linkedIn.sentAt = serverTimestamp();
      }

      // Preserve existing email data (clean undefined values)
      if (lead.outreach?.email) {
        outreachData.email = removeUndefined(lead.outreach.email);
      }

      // Remove any undefined values before sending to Firestore
      const cleanedOutreachData = removeUndefined(outreachData);

      await updateLead(leadId, { outreach: cleanedOutreachData });
    } catch (error) {
      console.error('Error updating LinkedIn status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showAlert(`Failed to update LinkedIn status: ${errorMessage}`);
    }
  };

  // Email status update handler
  const handleUpdateEmailStatus = async (leadId: string, status: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    try {
      // Build the complete outreach object preserving both channels
      const outreachData: any = {};

      // Preserve existing LinkedIn data (clean undefined values)
      if (lead.outreach?.linkedIn) {
        outreachData.linkedIn = removeUndefined(lead.outreach.linkedIn);
      }

      // Update Email
      outreachData.email = {
        ...lead.outreach?.email,
        status,
      };

      // Auto-set sentAt timestamp if status is sent or opened
      if ((status === 'sent' || status === 'opened') && !lead.outreach?.email?.sentAt) {
        outreachData.email.sentAt = serverTimestamp();
      }

      // Remove any undefined values before sending to Firestore
      const cleanedOutreachData = removeUndefined(outreachData);

      await updateLead(leadId, { outreach: cleanedOutreachData });
    } catch (error) {
      console.error('Error updating email status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showAlert(`Failed to update email status: ${errorMessage}`);
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

  // Open bulk archive dialog
  const handleBulkArchive = () => {
    if (selectedLeadIds.length === 0) return;
    setShowBulkArchiveDialog(true);
  };

  // Confirm and execute bulk archive
  const confirmBulkArchive = async () => {
    if (selectedLeadIds.length === 0 || !user) return;

    setBulkArchiving(true);

    try {
      await bulkArchiveLeads(selectedLeadIds, user.uid, bulkArchiveReason);

      showAlert(`Successfully archived ${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? 's' : ''}`);
      setSelectedLeadIds([]);
      setBulkArchiveReason('');
      setShowBulkArchiveDialog(false);
    } catch (error) {
      console.error('Error archiving leads:', error);
      showAlert('Failed to archive some leads. Please try again.');
    } finally {
      setBulkArchiving(false);
    }
  };

  // Open bulk delete confirmation dialog
  const handleBulkDelete = () => {
    if (selectedLeadIds.length === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  // Confirm and execute bulk delete
  const confirmBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;

    setBulkDeleting(true);

    try {
      // Use bulkDeleteLeads to properly handle company cleanup
      await bulkDeleteLeads(selectedLeadIds);

      showAlert(`Successfully deleted ${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? 's' : ''}`);
      setSelectedLeadIds([]);
      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting leads:', error);
      showAlert('Failed to delete some leads. Please try again.');
    } finally {
      setBulkDeleting(false);
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
    // NOTE: We DON'T remove from sessionStorage here
    // The cleared state will be saved automatically by the useEffect
    // This way, filters stay cleared for the session but can be restored
    // by loading a preset or setting new filters
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
    // Save preferences (visibility + order) to localStorage
    const preferences = columnsToPreferences(updatedColumns);
    localStorage.setItem(TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(preferences));
  };

  // Column reordering handler
  const handleReorderColumns = (reorderedColumns: TableColumnConfig[]) => {
    setTableColumns(reorderedColumns);

    // Save preferences (visibility + order) to localStorage
    const preferences = columnsToPreferences(reorderedColumns);
    localStorage.setItem(TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(preferences));
  };

  // Column deletion handler
  const handleDeleteColumn = async (columnId: string, fieldName: string) => {
    try {
      // Delete the custom field from all leads in Firestore
      const result = await deleteCustomFieldFromAllLeads(fieldName);

      // Remove the column from state
      const updatedColumns = tableColumns.filter(col => col.id !== columnId);
      setTableColumns(updatedColumns);

      // Save preferences to localStorage
      const preferences = columnsToPreferences(updatedColumns);
      localStorage.setItem(TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(preferences));

      showAlert(`Column "${columnId}" deleted from ${result.deleted} lead${result.deleted !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error deleting column:', error);
      showAlert('Failed to delete column. Please try again.');
      throw error; // Re-throw so dialog can handle loading state
    }
  };

  // Reset column order to default (auto-grouped by section)
  const handleResetColumnOrder = async () => {
    try {
      // Clear saved preferences
      localStorage.removeItem(TABLE_COLUMNS_STORAGE_KEY);

      // Rebuild columns with auto-grouping (no saved preferences)
      const allColumns = await buildTableColumns(leads);

      // Update state with auto-grouped columns
      setTableColumns(allColumns);

      showAlert('Column order reset to default grouping');
    } catch (error) {
      console.error('Error resetting column order:', error);
      showAlert('Failed to reset column order. Please try again.');
    }
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
      tableColumns: columnsToPreferences(tableColumns),
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
        overflow: 'hidden',
        p: 4,
      }}>
        {/* Release Notes Banner */}
        {user && (
          <ReleaseNotesBanner
            release={latestRelease}
            userState={userReleaseState}
            userId={user.uid}
          />
        )}

        {/* Header */}
        <Box sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
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
                <Tooltip title="View Archived Leads">
                  <IconButton
                    onClick={() => setShowArchivedView(true)}
                    sx={{
                      border: '1px solid #e2e8f0',
                      color: '#667eea',
                      '&:hover': {
                        bgcolor: 'rgba(102, 126, 234, 0.08)',
                        borderColor: '#667eea',
                      },
                    }}
                  >
                    <Badge badgeContent={archivedLeadsCount} color="primary" max={999999}>
                      <ArchiveIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>
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
                      onReorderColumns={handleReorderColumns}
                      onDeleteColumn={handleDeleteColumn}
                      onResetToDefault={handleResetColumnOrder}
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

                {/* Search Filter */}
                <SearchFilter
                  value={filters.search}
                  onChange={(search) => handleFiltersChange({ search })}
                  placeholder="Search leads..."
                />

                {/* Filter Button */}
                <FilterButton
                  activeCount={advancedFilterRules.length}
                  isExpanded={openFiltersModal}
                  onToggle={() => setOpenFiltersModal(!openFiltersModal)}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Content Area - Board, Table, or Archived View */}
        {showArchivedView ? (
          <ArchivedLeadsView
            onClose={() => setShowArchivedView(false)}
            onLeadClick={handleLeadClick}
            onUnarchive={handleUnarchiveLead}
          />
        ) : currentView === 'board' ? (
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
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            py: 2,
          }}>
            <Box sx={{
              maxWidth: '2200px',
              margin: '0 auto',
              px: 0.5,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              overflow: 'hidden',
            }}>
              {/* Bulk Actions Toolbar */}
              <BulkActionsToolbar
                selectedCount={selectedLeadIds.length}
                onChangeStatus={handleBulkChangeStatus}
                onEditFields={handleBulkEditFields}
                onExportCSV={handleBulkExportCSV}
                onArchive={handleBulkArchive}
                onDelete={handleBulkDelete}
                onClear={handleClearSelection}
                isDeleting={bulkDeleting}
              />

              {/* Table */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <CRMLeadsTable
                  leads={getFilteredLeads()}
                  onLeadClick={handleLeadClick}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateLinkedInStatus={handleUpdateLinkedInStatus}
                  onUpdateEmailStatus={handleUpdateEmailStatus}
                  selectedLeadIds={selectedLeadIds}
                  onSelectLead={handleSelectLead}
                  onSelectAll={handleSelectAll}
                  onClearSelection={handleClearSelection}
                  visibleColumns={tableColumns}
                />
              </Box>
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

        {/* Lead Dialog - Only used for creating new leads now */}
        <LeadDialog
          open={openDialog}
          onClose={() => {
            setOpenDialog(false);
            setSelectedLead(null);
          }}
          onSave={handleSaveLead}
          onDelete={handleDeleteLead}
          onArchive={handleArchiveLead}
          onUnarchive={handleUnarchiveLead}
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

        {/* Advanced Filters Modal with Cross-Entity Support */}
        <AdvancedFiltersModal
          open={openFiltersModal}
          onClose={() => setOpenFiltersModal(false)}
          onApplyFilters={handleApplyAdvancedFilters}
          onClearFilters={handleClearAllFilters}
          data={leads}
          entityType="lead"
          pipelineStages={stages.map(s => s.id)}
          initialRules={advancedFilterRules}
          crossEntityData={{ companies }}
          enableCrossEntityFiltering={true}
        />

        {/* Bulk Edit Dialog */}
        <BulkEditDialog
          open={showBulkEditDialog}
          onClose={() => setShowBulkEditDialog(false)}
          onSave={handleBulkEditSave}
          selectedCount={selectedLeadIds.length}
        />

        {/* Bulk Archive Confirmation Dialog */}
        <Dialog
          open={showBulkArchiveDialog}
          onClose={() => {
            if (!bulkArchiving) {
              setShowBulkArchiveDialog(false);
              setBulkArchiveReason('');
            }
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            Archive {selectedLeadIds.length} Lead{selectedLeadIds.length > 1 ? 's' : ''}?
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to archive {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''}?
              They will be hidden from the main list but can be restored later.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              label="Reason (optional)"
              type="text"
              fullWidth
              multiline
              rows={3}
              value={bulkArchiveReason}
              onChange={(e) => setBulkArchiveReason(e.target.value)}
              disabled={bulkArchiving}
              placeholder="Enter reason for archiving these leads..."
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => {
                setShowBulkArchiveDialog(false);
                setBulkArchiveReason('');
              }}
              disabled={bulkArchiving}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBulkArchive}
              disabled={bulkArchiving}
              variant="contained"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: '#f59e0b',
                '&:hover': {
                  bgcolor: '#d97706',
                },
              }}
            >
              {bulkArchiving ? <CircularProgress size={24} /> : 'Archive'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog
          open={bulkDeleteDialogOpen}
          onClose={() => !bulkDeleting && setBulkDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Delete Multiple Leads?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete <strong>{selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''}</strong>?
              This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={bulkDeleting}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBulkDelete}
              disabled={bulkDeleting}
              variant="contained"
              color="error"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {bulkDeleting ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default CRMBoard;
