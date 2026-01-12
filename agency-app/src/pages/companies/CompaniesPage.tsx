// src/pages/companies/CompaniesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Fab,
  CircularProgress,
  IconButton,
  Badge,
  Tooltip,
  Snackbar,
  Alert,
  Button,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material';
import {
  Add as AddIcon,
  Archive as ArchiveIcon,
  ViewList as ViewListIcon,
  Article as ArticleIcon,
  GroupAdd as GroupAddIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { Company } from '../../types/crm';
import { Lead } from '../../types/lead';
import { CrossEntityFilterContext } from '../../types/crossEntityFilter';
import {
  subscribeToCompanies,
  countLeadsForCompany,
  subscribeToArchivedCompanies,
  unarchiveCompany,
  getLeadCountsForAllCompanies,
  bulkUpdateCompanyFields,
  bulkArchiveCompanies,
  createCompaniesBatch,
} from '../../services/api/companies';
import { subscribeToLeads } from '../../services/api/leads';
import { buildLeadsMap } from '../../services/api/crossEntityFilterService';
import { CompanyDialog } from '../../components/features/companies/CompanyDialog';
import { CompanyTable } from '../../components/features/companies/CompanyTable';
import { BulkCompanyAddDialog } from '../../components/features/companies/BulkCompanyAddDialog';
import { BulkCompanyRow, BulkCompanyImportResult } from '../../types/bulkCompany';
import { WritingProgramTable } from '../../components/features/companies/WritingProgramTable';
import { CompetitorWorkflowDialog } from '../../components/features/companies/CompetitorWorkflowDialog';
import { WritingProgramBulkActionsToolbar } from '../../components/features/companies/WritingProgramBulkActionsToolbar';
import { BulkWritingProgramDialog } from '../../components/features/companies/BulkWritingProgramDialog';
import { WritingProgramUrlSelectionDialog } from '../../components/features/companies/WritingProgramUrlSelectionDialog';
import { WebsiteFieldMappingDialog } from '../../components/features/companies/WebsiteFieldMappingDialog';
import { ArchivedCompaniesView } from '../../components/features/companies/ArchivedCompaniesView';
import { CompanyBulkActionsToolbar } from '../../components/features/companies/CompanyBulkActionsToolbar';
import { CompanyBulkEditDialog } from '../../components/features/companies/CompanyBulkEditDialog';
import { BulkOfferAnalysisDialog } from '../../components/features/companies/BulkOfferAnalysisDialog';
import { TableColumnVisibilityMenu } from '../../components/features/crm/TableColumnVisibilityMenu';
import {
  TableColumnConfig,
  DEFAULT_COMPANIES_TABLE_COLUMNS,
  COMPANIES_TABLE_COLUMNS_STORAGE_KEY,
  DEFAULT_WRITING_PROGRAM_TABLE_COLUMNS,
  WRITING_PROGRAM_TABLE_COLUMNS_STORAGE_KEY,
} from '../../types/table';
import {
  buildCompaniesTableColumns,
  buildWritingProgramTableColumns,
  columnsToPreferences,
  applyColumnPreferences,
} from '../../services/api/tableColumnsService';
import { CompanyFilterState, DEFAULT_COMPANY_FILTER_STATE, SaveCompanyPresetRequest } from '../../types/companyFilter';
import { FilterRule } from '../../types/filter';
import { applyCompanyAdvancedFilters, applyCompanyAdvancedFiltersWithCrossEntity } from '../../services/api/companyFilterService';
import { AdvancedFiltersModal, SearchFilter, FilterButton } from '../../components/features/crm/filters';
import { FilterPresetsMenu } from '../../components/features/crm/filters/FilterPresetsMenu';
import { SavePresetDialog } from '../../components/features/crm/filters/SavePresetDialog';
import {
  loadCompanyPreset,
  getDefaultCompanyPreset,
} from '../../services/api/companyFilterPresetsService';
import {
  analyzeWritingProgram,
  analyzeWritingProgramDetails,
  analyzeCompanyWebsite,
  generateOfferIdeas,
} from '../../services/firebase/cloudFunctions';
import { updateCompany } from '../../services/api/companies';
import {
  getCompanyWebsite,
  getWebsiteFieldMapping,
} from '../../services/api/websiteFieldMappingService';
import {
  getCompanyProgramUrl,
  getProgramUrlFieldMapping,
} from '../../services/api/programUrlFieldMappingService';
import { ProgramUrlFieldMappingSelector } from '../../components/features/companies/ProgramUrlFieldMappingSelector';
import { BlogUrlFieldMappingSelector } from '../../components/features/companies/BlogUrlFieldMappingSelector';

// LocalStorage key for persisting active filters across page refreshes
const ACTIVE_COMPANY_FILTERS_STORAGE_KEY = 'companies_active_filters';

/**
 * Helper function to extract domain from URL
 */
function extractDomainFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return null;
  }
}

export const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Array<Company & { leadCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);
  const [openFiltersModal, setOpenFiltersModal] = useState(false);

  // View mode state ('all' or 'writing-program')
  const [currentView, setCurrentView] = useState<'all' | 'writing-program'>(() => {
    const saved = localStorage.getItem('companies_current_view');
    return (saved === 'writing-program' ? 'writing-program' : 'all') as 'all' | 'writing-program';
  });

  // Archived companies state
  const [showArchivedView, setShowArchivedView] = useState(false);
  const [archivedCompaniesCount, setArchivedCompaniesCount] = useState(0);
  const [leadCounts, setLeadCounts] = useState<Map<string, number>>(new Map());

  // Selection state for bulk actions
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [showBulkArchiveDialog, setShowBulkArchiveDialog] = useState(false);
  const [bulkArchiveReason, setBulkArchiveReason] = useState('');
  const [bulkArchiving, setBulkArchiving] = useState(false);
  const [bulkCascadeToLeads, setBulkCascadeToLeads] = useState(false);
  const [bulkTotalLeadsCount, setBulkTotalLeadsCount] = useState(0);
  const [showBulkOfferDialog, setShowBulkOfferDialog] = useState(false);

  // Writing program analysis state
  const [selectedWritingProgramIds, setSelectedWritingProgramIds] = useState<string[]>([]);
  const [showBulkAnalysisDialog, setShowBulkAnalysisDialog] = useState(false);

  // Single company analysis state
  const [urlSelectionDialogOpen, setUrlSelectionDialogOpen] = useState(false);
  const [foundUrls, setFoundUrls] = useState<Array<{
    url: string;
    source: 'pattern' | 'ai';
    confidence?: 'high' | 'medium' | 'low';
    verified?: boolean;
  }>>([]);
  const [currentAnalyzingCompany, setCurrentAnalyzingCompany] = useState<Company | null>(null);
  const [analyzingLoading, setAnalyzingLoading] = useState(false);
  const [existingProgramUrl, setExistingProgramUrl] = useState<string | undefined>(undefined);

  // Website mapping dialog state
  const [websiteMappingDialogOpen, setWebsiteMappingDialogOpen] = useState(false);
  const [pendingAnalysisCompany, setPendingAnalysisCompany] = useState<Company | null>(null);

  // Filter state - initialize from localStorage if available
  const [filters, setFilters] = useState<CompanyFilterState>(() => {
    try {
      const savedFilters = localStorage.getItem(ACTIVE_COMPANY_FILTERS_STORAGE_KEY);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        return parsed.filters || DEFAULT_COMPANY_FILTER_STATE;
      }
    } catch (error) {
      console.error('Error loading company filters from localStorage:', error);
    }
    return DEFAULT_COMPANY_FILTER_STATE;
  });
  const [advancedFilterRules, setAdvancedFilterRules] = useState<FilterRule[]>(() => {
    try {
      const savedFilters = localStorage.getItem(ACTIVE_COMPANY_FILTERS_STORAGE_KEY);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        return parsed.advancedFilterRules || [];
      }
    } catch (error) {
      console.error('Error loading company advanced filters from localStorage:', error);
    }
    return [];
  });

  // Preset dialog state
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);

  // Competitor workflow dialog state
  const [competitorDialogOpen, setCompetitorDialogOpen] = useState(false);
  const [selectedCompanyForCompetitors, setSelectedCompanyForCompetitors] = useState<Company | null>(null);

  // Table column visibility state - DUAL STATE for both views
  const [allCompaniesColumns, setAllCompaniesColumns] = useState<TableColumnConfig[]>(DEFAULT_COMPANIES_TABLE_COLUMNS);
  const [writingProgramColumns, setWritingProgramColumns] = useState<TableColumnConfig[]>(DEFAULT_WRITING_PROGRAM_TABLE_COLUMNS);

  // Computed values based on current view
  const activeColumns = currentView === 'all' ? allCompaniesColumns : writingProgramColumns;
  const setActiveColumns = currentView === 'all' ? setAllCompaniesColumns : setWritingProgramColumns;
  const activeStorageKey = currentView === 'all'
    ? COMPANIES_TABLE_COLUMNS_STORAGE_KEY
    : WRITING_PROGRAM_TABLE_COLUMNS_STORAGE_KEY;

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // State for leads (used for cross-entity filtering - lazy loaded)
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  // Check if any filter rules require lead data (cross-entity filtering)
  const hasLeadsCrossEntityRule = useMemo(
    () => advancedFilterRules.some(r => r.entitySource === 'leads'),
    [advancedFilterRules]
  );

  // Subscribe to companies with real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToCompanies(async (companiesData) => {
      // Fetch lead counts for each company
      const companiesWithCounts = await Promise.all(
        companiesData.map(async (company) => {
          const leadCount = await countLeadsForCompany(company.id);
          return { ...company, leadCount };
        })
      );

      setCompanies(companiesWithCounts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // LAZY LOAD: Only subscribe to leads when cross-entity filter rules exist
  // This avoids loading all leads into memory when not needed
  useEffect(() => {
    if (!hasLeadsCrossEntityRule) {
      // Clear leads if no longer needed
      setAllLeads([]);
      setLeadsLoading(false);
      return;
    }

    // Start loading - filter should wait until leads are loaded
    setLeadsLoading(true);

    // Only subscribe when we actually need leads data for filtering
    const unsubscribe = subscribeToLeads((leadsData) => {
      setAllLeads(leadsData);
      setLeadsLoading(false); // Done loading
    });

    return () => unsubscribe();
  }, [hasLeadsCrossEntityRule]);

  // Build cross-entity context for filtering companies by lead values
  const crossEntityContext = useMemo<CrossEntityFilterContext>(() => ({
    leadsMap: buildLeadsMap(allLeads),
  }), [allLeads]);

  // Subscribe to archived companies count
  useEffect(() => {
    const unsubscribe = subscribeToArchivedCompanies((archivedCompanies) => {
      setArchivedCompaniesCount(archivedCompanies.length);
    });

    return () => unsubscribe();
  }, []);

  // Load lead counts for all companies (for archived view)
  useEffect(() => {
    async function loadLeadCounts() {
      const counts = await getLeadCountsForAllCompanies();
      setLeadCounts(counts);
    }

    loadLeadCounts();
  }, [companies]);

  // Persist view preference to localStorage
  useEffect(() => {
    localStorage.setItem('companies_current_view', currentView);
  }, [currentView]);

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    try {
      const filterState = {
        filters,
        advancedFilterRules,
      };
      localStorage.setItem(ACTIVE_COMPANY_FILTERS_STORAGE_KEY, JSON.stringify(filterState));

      // Debug logging (only if crm_debug is enabled)
      const debugMode = localStorage.getItem('crm_debug') === 'true';
      if (debugMode) {
        console.log('[Company Filter Persistence] Saved filters to localStorage:', filterState);
      }
    } catch (error) {
      console.error('Error saving company filters to localStorage:', error);
    }
  }, [filters, advancedFilterRules]);

  // Load default preset on mount (only if no active filters exist)
  useEffect(() => {
    if (!user) return;

    async function loadDefaultPreset() {
      try {
        // Check if we have active filters in localStorage
        const savedFilters = localStorage.getItem(ACTIVE_COMPANY_FILTERS_STORAGE_KEY);

        // Only load default preset if no active filters exist
        if (!savedFilters) {
          const defaultPreset = await getDefaultCompanyPreset(user.uid);
          if (defaultPreset) {
            // Apply preset filters
            setFilters(defaultPreset.basicFilters);
            setAdvancedFilterRules(defaultPreset.advancedRules);

            // Apply table column preferences if saved in preset
            if (defaultPreset.tableColumns) {
              const preferences = defaultPreset.tableColumns;
              const columnsWithPreferences = applyColumnPreferences(allCompaniesColumns, preferences);
              setAllCompaniesColumns(columnsWithPreferences);
            }
          }
        }
      } catch (error) {
        console.error('Error loading default preset:', error);
      }
    }

    loadDefaultPreset();
  }, [user, allCompaniesColumns]); // Include allCompaniesColumns dependency

  // Load table columns (default + custom fields from companies) - BOTH VIEWS
  useEffect(() => {
    async function initializeTableColumns() {
      try {
        // 1. Build and load ALL COMPANIES columns
        const allCols = await buildCompaniesTableColumns(companies);
        const savedAllPrefs = localStorage.getItem(COMPANIES_TABLE_COLUMNS_STORAGE_KEY);
        let allPreferences: Record<string, boolean | { visible: boolean; order: number }> | null = null;

        if (savedAllPrefs) {
          try {
            allPreferences = JSON.parse(savedAllPrefs);
          } catch (e) {
            console.error('Error parsing all companies column preferences:', e);
          }
        }

        const allWithPreferences = applyColumnPreferences(allCols, allPreferences);
        setAllCompaniesColumns(allWithPreferences);

        // 2. Build and load WRITING PROGRAM columns
        const wpCols = await buildWritingProgramTableColumns(companies);
        const savedWpPrefs = localStorage.getItem(WRITING_PROGRAM_TABLE_COLUMNS_STORAGE_KEY);
        let wpPreferences: Record<string, boolean | { visible: boolean; order: number }> | null = null;

        if (savedWpPrefs) {
          try {
            wpPreferences = JSON.parse(savedWpPrefs);
          } catch (e) {
            console.error('Error parsing writing program column preferences:', e);
          }
        }

        const wpWithPreferences = applyColumnPreferences(wpCols, wpPreferences);
        setWritingProgramColumns(wpWithPreferences);

      } catch (error) {
        console.error('Error loading table columns:', error);
        // Fallback to default columns
        setAllCompaniesColumns(DEFAULT_COMPANIES_TABLE_COLUMNS);
        setWritingProgramColumns(DEFAULT_WRITING_PROGRAM_TABLE_COLUMNS);
      }
    }

    // Only initialize once companies are loaded
    if (companies.length > 0) {
      initializeTableColumns();
    }
  }, [companies]);

  // Filter companies based on all filters
  const filteredCompanies = useMemo(() => {
    let filtered: Array<Company & { leadCount: number }> = [...companies];

    // Apply search filter
    if (filters.search.trim()) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(term) ||
        company.industry?.toLowerCase().includes(term) ||
        company.website?.toLowerCase().includes(term) ||
        company.description?.toLowerCase().includes(term)
      );
    }

    // Apply industry filter
    if (filters.industry) {
      filtered = filtered.filter(company =>
        company.industry?.toLowerCase() === filters.industry.toLowerCase()
      );
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(company =>
        company.status === filters.status
      );
    }

    // Apply employee range filter (from Apollo enrichment)
    if (filters.employeeRange) {
      filtered = filtered.filter(company =>
        company.apolloEnrichment?.employeeRange === filters.employeeRange
      );
    }

    // Apply funding stage filter (from Apollo enrichment)
    if (filters.fundingStage) {
      filtered = filtered.filter(company =>
        company.apolloEnrichment?.latestFundingStage === filters.fundingStage
      );
    }

    // Apply advanced filters if any rules are set (with cross-entity support)
    if (advancedFilterRules.length > 0) {
      // If we have leads cross-entity rules but leads are still loading, return empty
      // This prevents showing incorrect results before lead data is available
      if (hasLeadsCrossEntityRule && leadsLoading) {
        return [];
      }
      filtered = applyCompanyAdvancedFiltersWithCrossEntity(
        filtered,
        advancedFilterRules,
        crossEntityContext
      ) as Array<Company & { leadCount: number }>;
    }

    return filtered;
  }, [companies, filters, advancedFilterRules, crossEntityContext, hasLeadsCrossEntityRule, leadsLoading]);

  const handleAddCompany = () => {
    setOpenDialog(true);
  };

  const handleViewCompany = (company: Company) => {
    navigate(`/companies/${company.id}`);
  };

  const handleFindCompetitors = (company: Company) => {
    setSelectedCompanyForCompetitors(company);
    setCompetitorDialogOpen(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
  };

  // Column visibility handlers - works with active column set based on current view
  const handleColumnVisibilityChange = (columnId: string, visible: boolean) => {
    const updatedColumns = activeColumns.map(col =>
      col.id === columnId ? { ...col, visible } : col
    );
    setActiveColumns(updatedColumns);

    // Save preferences (visibility + order) to localStorage for active view
    const preferences = columnsToPreferences(updatedColumns);
    localStorage.setItem(activeStorageKey, JSON.stringify(preferences));
  };

  // Column reordering handler - works with active column set based on current view
  const handleReorderColumns = (reorderedColumns: TableColumnConfig[]) => {
    setActiveColumns(reorderedColumns);

    // Save preferences (visibility + order) to localStorage for active view
    const preferences = columnsToPreferences(reorderedColumns);
    localStorage.setItem(activeStorageKey, JSON.stringify(preferences));
  };

  // Reset column order to default (auto-grouped by section) - works with active view
  const handleResetColumnOrder = async () => {
    try {
      // Clear saved preferences for active view
      localStorage.removeItem(activeStorageKey);

      // Rebuild columns with auto-grouping (no saved preferences) based on current view
      const freshColumns = currentView === 'all'
        ? await buildCompaniesTableColumns(companies)
        : await buildWritingProgramTableColumns(companies);

      // Update state with auto-grouped columns for active view
      setActiveColumns(freshColumns);

      setSnackbar({ open: true, message: 'Column order reset to default grouping', severity: 'success' });
    } catch (error) {
      console.error('Error resetting column order:', error);
      setSnackbar({ open: true, message: 'Failed to reset column order', severity: 'error' });
    }
  };

  // Filter handlers
  const handleFiltersChange = (updates: Partial<CompanyFilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  const handleClearAllFilters = () => {
    setFilters(DEFAULT_COMPANY_FILTER_STATE);
    setAdvancedFilterRules([]);
  };

  const handleApplyAdvancedFilters = (rules: FilterRule[]) => {
    setAdvancedFilterRules(rules);
  };

  // Calculate active filter count (for badge)
  const activeFilterCount = advancedFilterRules.length;

  // Preset handlers
  const handleLoadPreset = async (presetId: string) => {
    if (!user) return;

    try {
      const preset = await loadCompanyPreset(user.uid, presetId);
      if (preset) {
        // Apply filters from preset
        setFilters(preset.basicFilters);
        setAdvancedFilterRules(preset.advancedRules);

        // Apply table column preferences if saved in preset
        if (preset.tableColumns) {
          const preferences = preset.tableColumns;
          const columnsWithPreferences = applyColumnPreferences(allCompaniesColumns, preferences);
          setAllCompaniesColumns(columnsWithPreferences);
        }
      }
    } catch (error) {
      console.error('Error loading preset:', error);
    }
  };

  const handleSaveNewPreset = () => {
    setShowSavePresetDialog(true);
  };

  const getCurrentPresetData = (): SaveCompanyPresetRequest => {
    return {
      name: '', // Will be filled by dialog
      description: '',
      advancedRules: advancedFilterRules,
      basicFilters: filters,
      tableColumns: columnsToPreferences(activeColumns),
      isDefault: false,
    };
  };

  // Archive handlers
  const handleUnarchiveCompany = async (companyId: string) => {
    try {
      await unarchiveCompany(companyId);
    } catch (error) {
      console.error('Error unarchiving company:', error);
    }
  };

  const handleCompanyClick = (company: Company) => {
    navigate(`/companies/${company.id}`);
  };

  // Bulk selection handlers
  const handleSelectCompany = (companyId: string, selected: boolean) => {
    if (selected) {
      setSelectedCompanyIds(prev => [...prev, companyId]);
    } else {
      setSelectedCompanyIds(prev => prev.filter(id => id !== companyId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedCompanyIds(filteredCompanies.map(c => c.id));
    } else {
      setSelectedCompanyIds([]);
    }
  };

  const handleClearSelection = () => {
    setSelectedCompanyIds([]);
  };

  // Bulk action handlers
  const handleBulkEdit = () => {
    setShowBulkEditDialog(true);
  };

  const handleBulkEditSave = async (updates: Partial<Company>) => {
    try {
      await bulkUpdateCompanyFields(selectedCompanyIds, updates);
      handleClearSelection();
    } catch (error) {
      console.error('Error in bulk edit:', error);
      alert('Failed to update companies. Please try again.');
    }
  };

  const handleBulkExportCSV = () => {
    const selectedCompanies = companies.filter(c => selectedCompanyIds.includes(c.id));

    // Prepare CSV data
    const csvRows = [
      // Header row
      ['Name', 'Website', 'Website Blog Link', 'Rating V2', 'Company LinkedIn Link', 'Industry', 'Description', 'Lead Count'].join(','),
      // Data rows
      ...selectedCompanies.map(company =>
        [
          `"${company.name || ''}"`,
          `"${company.website || ''}"`,
          `"${company.customFields?.website_blog_link || ''}"`,
          company.ratingV2 ?? '',
          `"${company.customFields?.company_linkedin_link || ''}"`,
          `"${company.industry || ''}"`,
          `"${(company.description || '').replace(/"/g, '""')}"`,
          company.leadCount || 0,
        ].join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `companies_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clear selection after export
    handleClearSelection();
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedCompanyIds.length} ${selectedCompanyIds.length === 1 ? 'company' : 'companies'}?`)) {
      return;
    }

    try {
      const { deleteCompanies } = await import('../../services/api/companies');
      await deleteCompanies(selectedCompanyIds);
      handleClearSelection();
    } catch (error) {
      console.error('Error deleting companies:', error);
      alert('Failed to delete companies. Please try again.');
    }
  };

  const handleBulkArchive = () => {
    // Calculate total leads across selected companies
    let totalLeads = 0;
    selectedCompanyIds.forEach(id => {
      totalLeads += (leadCounts.get(id) || 0);
    });
    setBulkTotalLeadsCount(totalLeads);
    setShowBulkArchiveDialog(true);
  };

  // Track companies currently being analyzed for offers
  const [generatingOffersForIds, setGeneratingOffersForIds] = useState<Set<string>>(new Set());

  const handleBulkGenerateOffers = () => {
    if (selectedCompanyIds.length === 0) return;

    const selectedCompanies = companies.filter(c => selectedCompanyIds.includes(c.id));
    const companiesWithUrl = selectedCompanies.filter(c =>
      c.website || c.customFields?.website_blog_link || c.blogAnalysis?.blogUrl
    );

    if (companiesWithUrl.length === 0) {
      setSnackbar({
        open: true,
        message: 'No selected companies have a website URL',
        severity: 'warning',
      });
      return;
    }

    // Show starting message
    setSnackbar({
      open: true,
      message: `Starting offer analysis for ${companiesWithUrl.length} companies...`,
      severity: 'info',
    });

    // Add all companies to the generating set
    setGeneratingOffersForIds(prev => {
      const next = new Set(prev);
      companiesWithUrl.forEach(c => next.add(c.id));
      return next;
    });

    // Clear selection immediately so user can continue working
    handleClearSelection();

    // Run analysis for each company async (not blocking)
    let completed = 0;
    let failed = 0;

    companiesWithUrl.forEach(async (company) => {
      const websiteUrl = company.website ||
        (company.customFields?.website_blog_link as string) ||
        company.blogAnalysis?.blogUrl;

      if (!websiteUrl) return;

      try {
        // Stage 1: Analyze company website
        const stage1Result = await analyzeCompanyWebsite(
          company.id,
          company.name,
          websiteUrl,
          company.blogAnalysis?.blogUrl || undefined
        );

        // Stage 2: Generate ideas
        await generateOfferIdeas(
          company.id,
          company.name,
          websiteUrl,
          stage1Result.companyAnalysis,
          company.blogAnalysis?.blogUrl || undefined
        );

        completed++;
      } catch (error) {
        console.error(`Error generating offers for ${company.name}:`, error);
        failed++;
      } finally {
        // Remove from generating set
        setGeneratingOffersForIds(prev => {
          const next = new Set(prev);
          next.delete(company.id);
          return next;
        });

        // Show completion message when all done
        if (completed + failed === companiesWithUrl.length) {
          setSnackbar({
            open: true,
            message: failed > 0
              ? `Completed: ${completed} succeeded, ${failed} failed`
              : `Successfully generated offers for ${completed} companies`,
            severity: failed > 0 ? 'warning' : 'success',
          });
        }
      }
    });
  };

  const handleBulkOfferComplete = () => {
    setShowBulkOfferDialog(false);
    handleClearSelection();
    setSnackbar({
      open: true,
      message: 'Bulk offer analysis complete!',
      severity: 'success',
    });
  };

  const confirmBulkArchive = async () => {
    if (!user) return;

    setBulkArchiving(true);
    try {
      const result = await bulkArchiveCompanies(
        selectedCompanyIds,
        user.uid,
        bulkArchiveReason,
        bulkCascadeToLeads
      );

      if (result.leadsArchived > 0) {
        setSnackbar({
          open: true,
          message: `Archived ${result.companiesArchived} ${result.companiesArchived > 1 ? 'companies' : 'company'} and ${result.leadsArchived} associated lead${result.leadsArchived > 1 ? 's' : ''}`,
          severity: 'success',
        });
      }

      handleClearSelection();
      setBulkArchiveReason('');
      setBulkCascadeToLeads(false);
      setShowBulkArchiveDialog(false);
    } catch (error) {
      console.error('Error archiving companies:', error);
      alert('Failed to archive companies. Please try again.');
    } finally {
      setBulkArchiving(false);
    }
  };

  // Writing program bulk action handlers
  const handleSelectWritingProgramCompany = (companyId: string) => {
    setSelectedWritingProgramIds(prev => {
      if (prev.includes(companyId)) {
        return prev.filter(id => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
  };

  const handleSelectAllWritingPrograms = (selected: boolean) => {
    if (selected) {
      setSelectedWritingProgramIds(filteredCompanies.map(c => c.id));
    } else {
      setSelectedWritingProgramIds([]);
    }
  };

  const handleClearWritingProgramSelection = () => {
    setSelectedWritingProgramIds([]);
  };

  const handleBulkAnalyzePrograms = () => {
    setShowBulkAnalysisDialog(true);
  };

  const handleBulkAnalysisComplete = () => {
    // Clear selection and close dialog
    setSelectedWritingProgramIds([]);
    setShowBulkAnalysisDialog(false);

    // Show success message
    setSnackbar({
      open: true,
      message: 'Writing program analysis complete!',
      severity: 'success',
    });
  };

  const handleAnalyzeSingleCompany = async (company: Company) => {
    // Check if there's an existing URL in the mapped field
    const mappedProgramUrl = getCompanyProgramUrl(company);
    setExistingProgramUrl(mappedProgramUrl);

    // Get website to check if it exists (but don't search yet)
    let website = getCompanyWebsite(company);

    // If no website found, check if we have a field mapping configured
    if (!website) {
      const mapping = getWebsiteFieldMapping();

      if (!mapping) {
        // No mapping configured yet - show the mapping dialog
        setPendingAnalysisCompany(company);
        setWebsiteMappingDialogOpen(true);
        return;
      } else {
        // Mapping exists but still no website - show helpful error in snackbar
        setSnackbar({
          open: true,
          message: 'No website found for this company. Please add a website URL to the configured field.',
          severity: 'error',
        });
        return;
      }
    }

    // Set the current company first
    setCurrentAnalyzingCompany(company);
    setFoundUrls([]);

    // Check if there's a program URL field mapping configured
    const programUrlMapping = getProgramUrlFieldMapping();

    // If mapping exists but company has no URL in that field, auto-search
    if (programUrlMapping && !mappedProgramUrl) {
      // Open dialog and automatically start searching
      setUrlSelectionDialogOpen(true);
      setAnalyzingLoading(true);

      try {
        // Search for writing program URLs
        const result = await analyzeWritingProgram(website);

        // Prepare URL options for selection
        const urlOptions: Array<{
          url: string;
          source: 'pattern' | 'ai';
          confidence?: 'high' | 'medium' | 'low';
          verified?: boolean;
        }> = [];

        // Add pattern-matched URLs
        result.validUrls.forEach((urlResult) => {
          urlOptions.push({
            url: urlResult.url,
            source: 'pattern',
            verified: true,
          });
        });

        // Add AI suggestions
        if (result.aiSuggestions) {
          result.aiSuggestions.forEach((suggestion) => {
            if (!urlOptions.some(u => u.url === suggestion.url)) {
              urlOptions.push({
                url: suggestion.url,
                source: 'ai',
                confidence: suggestion.confidence,
                verified: suggestion.verified,
              });
            }
          });
        }

        // Update dialog with found URLs (or empty array if none found)
        setFoundUrls(urlOptions);
        setAnalyzingLoading(false);

      } catch (error: any) {
        console.error('Error finding writing program URLs:', error);

        // Keep dialog open and show error state
        setFoundUrls([]);
        setAnalyzingLoading(false);

        // Show error in snackbar
        setSnackbar({
          open: true,
          message: error.message || 'Failed to find writing program URLs. You can still enter a custom URL.',
          severity: 'error',
        });
      }

      return;
    }

    // Open dialog without auto-searching (either has existing URL or no mapping)
    setAnalyzingLoading(false);
    setUrlSelectionDialogOpen(true);
  };

  // New function: Actually perform the search when user chooses to search
  const handleStartSearch = async () => {
    if (!currentAnalyzingCompany) return;

    setAnalyzingLoading(true);
    setFoundUrls([]); // Clear any previous results

    try {
      // Get website using the field mapping
      const website = getCompanyWebsite(currentAnalyzingCompany);

      if (!website) {
        throw new Error('No website found for this company');
      }

      // Call analyzeWritingProgram to find URLs
      const result = await analyzeWritingProgram(website);

      // Prepare URLs for selection
      const urlOptions: Array<{
        url: string;
        source: 'pattern' | 'ai';
        confidence?: 'high' | 'medium' | 'low';
        verified?: boolean;
      }> = [];

      // Add pattern-matched URLs
      result.validUrls.forEach((urlResult) => {
        urlOptions.push({
          url: urlResult.url,
          source: 'pattern',
          verified: true,
        });
      });

      // Add AI suggestions
      if (result.aiSuggestions) {
        result.aiSuggestions.forEach((suggestion) => {
          if (!urlOptions.some(u => u.url === suggestion.url)) {
            urlOptions.push({
              url: suggestion.url,
              source: 'ai',
              confidence: suggestion.confidence,
              verified: suggestion.verified,
            });
          }
        });
      }

      // Update dialog with found URLs (or empty array if none found)
      setFoundUrls(urlOptions);
      setAnalyzingLoading(false);
      // Keep dialog open - user can enter custom URL if no URLs found

    } catch (error: any) {
      console.error('Error finding writing program URLs:', error);

      // Keep dialog open and show error state
      setFoundUrls([]);
      setAnalyzingLoading(false);

      // Show error in snackbar
      setSnackbar({
        open: true,
        message: error.message || 'Failed to find writing program URLs. You can still enter a custom URL.',
        severity: 'error',
      });
    }
  };

  const handleUrlSelect = async (selectedUrl: string) => {
    if (!currentAnalyzingCompany) return;

    // Phase 2: Analyze the selected URL
    setAnalyzingLoading(true);
    // Keep dialog open to show "Analyzing..." state

    try {
      const result = await analyzeWritingProgramDetails(
        selectedUrl,
        currentAnalyzingCompany.id
      );

      // Save to Firestore
      await updateCompany(currentAnalyzingCompany.id, {
        writingProgramAnalysis: {
          ...result,
          programUrl: selectedUrl,
          lastAnalyzedAt: new Date(),
        },
      });

      // Success - close dialog and show success message
      setUrlSelectionDialogOpen(false);
      setSnackbar({
        open: true,
        message: `Successfully analyzed writing program for ${currentAnalyzingCompany.name}`,
        severity: 'success',
      });

    } catch (error: any) {
      console.error('Error analyzing writing program:', error);

      // Error - close dialog and show error message
      setUrlSelectionDialogOpen(false);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to analyze writing program',
        severity: 'error',
      });
    } finally {
      setAnalyzingLoading(false);
      setCurrentAnalyzingCompany(null);
      setFoundUrls([]);
    }
  };

  const handleUrlSelectionCancel = () => {
    setUrlSelectionDialogOpen(false);
    setFoundUrls([]);
    setCurrentAnalyzingCompany(null);
    setAnalyzingLoading(false);
    setExistingProgramUrl(undefined);
  };

  const handleWebsiteMappingSave = () => {
    // Close the mapping dialog
    setWebsiteMappingDialogOpen(false);

    // Retry analysis with the newly configured mapping
    if (pendingAnalysisCompany) {
      const company = pendingAnalysisCompany;
      setPendingAnalysisCompany(null);

      // Retry the analysis after a short delay to ensure mapping is saved
      setTimeout(() => {
        handleAnalyzeSingleCompany(company);
      }, 100);
    }
  };

  const handleWebsiteMappingCancel = () => {
    setWebsiteMappingDialogOpen(false);
    setPendingAnalysisCompany(null);
  };

  const handleBulkAddCompanies = async (
    rows: BulkCompanyRow[]
  ): Promise<BulkCompanyImportResult> => {
    // Transform rows to CompanyFormData
    const companiesData = rows.map(row => ({
      name: row.name.trim(),
      website: row.website?.trim() || undefined,
      industry: row.industry?.trim() || undefined,
      description: row.description?.trim() || undefined,
      ratingV2: row.ratingV2?.trim()
        ? parseFloat(row.ratingV2)
        : undefined,
    }));

    const result = await createCompaniesBatch(companiesData);

    // Show success snackbar
    if (result.successful > 0) {
      setSnackbar({
        open: true,
        message: `Successfully created/updated ${result.successful} ${result.successful === 1 ? 'company' : 'companies'}`,
        severity: 'success',
      });
    }

    return result;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress size={48} sx={{ color: '#667eea' }} />
        <Typography variant="body1" color="text.secondary">
          Loading companies...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 1,
              }}
            >
              Companies
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your companies and view associated leads
            </Typography>
          </Box>

          {/* View Toggle Buttons */}
          <ButtonGroup
            variant="outlined"
            sx={{
              bgcolor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderRadius: 2,
              '& .MuiButton-root': {
                borderColor: '#e2e8f0',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '14px',
                px: 3,
                py: 1,
              },
            }}
          >
            <Button
              startIcon={<ViewListIcon />}
              onClick={() => setCurrentView('all')}
              sx={{
                ...(currentView === 'all' && {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  },
                }),
              }}
            >
              All Companies
            </Button>
            <Button
              startIcon={<ArticleIcon />}
              onClick={() => setCurrentView('writing-program')}
              sx={{
                ...(currentView === 'writing-program' && {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  },
                }),
              }}
            >
              Writing Programs
            </Button>
          </ButtonGroup>
        </Box>

        {/* Filter Bar and Column Visibility */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Showing {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'}
          </Typography>
          <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />

          {/* Blog URL Field Mapping Selector - Only in All Companies view */}
          {currentView === 'all' && (
            <>
              <BlogUrlFieldMappingSelector companies={companies} />
              <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
            </>
          )}

          {/* Program URL Field Mapping Selector - Only in Writing Programs view */}
          {currentView === 'writing-program' && (
            <>
              <ProgramUrlFieldMappingSelector companies={companies} />
              <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
            </>
          )}

          <TableColumnVisibilityMenu
            columns={activeColumns}
            onToggleVisibility={handleColumnVisibilityChange}
            onReorderColumns={handleReorderColumns}
            onResetToDefault={handleResetColumnOrder}
          />
          <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />

          {/* Filter Presets */}
          {user && (
            <>
              <FilterPresetsMenu
                userId={user.uid}
                onLoadPreset={handleLoadPreset}
                onSaveNew={handleSaveNewPreset}
                entityType="company"
              />
              <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
            </>
          )}

          {/* Search Filter */}
          <SearchFilter
            value={filters.search}
            onChange={(search) => handleFiltersChange({ search })}
            placeholder="Search companies..."
          />

          {/* Filter Button */}
          <FilterButton
            activeCount={activeFilterCount}
            isExpanded={openFiltersModal}
            onToggle={() => setOpenFiltersModal(!openFiltersModal)}
          />

          {/* Archive Badge Button */}
          <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
          <Tooltip title="View Archived Companies">
            <IconButton
              onClick={() => setShowArchivedView(true)}
              sx={{
                color: '#667eea',
                '&:hover': {
                  bgcolor: 'rgba(102, 126, 234, 0.08)',
                },
              }}
            >
              <Badge badgeContent={archivedCompaniesCount} color="primary" max={999999}>
                <ArchiveIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Show either archived view or companies table */}
      {showArchivedView ? (
        <ArchivedCompaniesView
          onClose={() => setShowArchivedView(false)}
          onCompanyClick={handleCompanyClick}
          onUnarchive={handleUnarchiveCompany}
          leadCounts={leadCounts}
        />
      ) : (
        <>
          {/* Content container with BulkActionsToolbar and Table */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Bulk Actions Toolbar - Conditional based on current view */}
            {currentView === 'all' ? (
              <CompanyBulkActionsToolbar
                selectedCount={selectedCompanyIds.length}
                onEditFields={handleBulkEdit}
                onExportCSV={handleBulkExportCSV}
                onDelete={handleBulkDelete}
                onArchive={handleBulkArchive}
                onGenerateOffers={handleBulkGenerateOffers}
                onClear={handleClearSelection}
              />
            ) : (
              <WritingProgramBulkActionsToolbar
                selectedCount={selectedWritingProgramIds.length}
                onAnalyze={handleBulkAnalyzePrograms}
                onClear={handleClearWritingProgramSelection}
              />
            )}

            {/* Companies Table - Conditional rendering based on current view */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              {currentView === 'all' ? (
                <CompanyTable
                  companies={filteredCompanies}
                  onView={handleViewCompany}
                  visibleColumns={allCompaniesColumns}
                  selectedCompanyIds={selectedCompanyIds}
                  onSelectCompany={(companyId) => {
                    const isSelected = selectedCompanyIds.includes(companyId);
                    handleSelectCompany(companyId, !isSelected);
                  }}
                  onSelectAll={handleSelectAll}
                  onFindCompetitors={handleFindCompetitors}
                  generatingOffersForIds={generatingOffersForIds}
                />
              ) : (
                <WritingProgramTable
                  companies={filteredCompanies}
                  onCompanyClick={handleViewCompany}
                  visibleColumns={writingProgramColumns}
                  selectedCompanyIds={selectedWritingProgramIds}
                  onSelectCompany={handleSelectWritingProgramCompany}
                  onSelectAll={handleSelectAllWritingPrograms}
                  onAnalyzeSingle={handleAnalyzeSingleCompany}
                />
              )}
            </Box>
          </Box>

          {/* Speed Dial for Add Actions */}
          <SpeedDial
            ariaLabel="Add company actions"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              '& .MuiSpeedDial-fab': {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                },
              },
            }}
            icon={<SpeedDialIcon openIcon={<AddIcon />} />}
          >
            <SpeedDialAction
              icon={<AddIcon />}
              tooltipTitle="Add Single Company"
              onClick={handleAddCompany}
              sx={{
                '& .MuiSpeedDialAction-fab': {
                  bgcolor: 'white',
                  color: '#667eea',
                  '&:hover': {
                    bgcolor: '#f7f8fc',
                  },
                },
              }}
            />
            <SpeedDialAction
              icon={<GroupAddIcon />}
              tooltipTitle="Bulk Add Companies"
              onClick={() => setShowBulkAddDialog(true)}
              sx={{
                '& .MuiSpeedDialAction-fab': {
                  bgcolor: 'white',
                  color: '#764ba2',
                  '&:hover': {
                    bgcolor: '#f7f8fc',
                  },
                },
              }}
            />
          </SpeedDial>

          {/* Add Company Dialog (Create mode only) */}
          <CompanyDialog
            open={openDialog}
            onClose={handleDialogClose}
            onSuccess={() => {
              // Dialog will close automatically
              // Companies list will update automatically via subscription
            }}
          />

          {/* Bulk Add Companies Dialog */}
          <BulkCompanyAddDialog
            open={showBulkAddDialog}
            onClose={() => setShowBulkAddDialog(false)}
            onSubmit={handleBulkAddCompanies}
            existingCompanies={companies}
          />

          {/* Advanced Filters Modal with Cross-Entity Support */}
          <AdvancedFiltersModal
            open={openFiltersModal}
            onClose={() => setOpenFiltersModal(false)}
            onApplyFilters={handleApplyAdvancedFilters}
            onClearFilters={handleClearAllFilters}
            data={companies}
            entityType="company"
            initialRules={advancedFilterRules}
            crossEntityData={{ leads: allLeads }}
            enableCrossEntityFiltering={true}
          />

          {/* Save Preset Dialog */}
          {user && (
            <SavePresetDialog
              open={showSavePresetDialog}
              onClose={() => setShowSavePresetDialog(false)}
              userId={user.uid}
              currentPreset={getCurrentPresetData()}
              entityType="company"
            />
          )}

          {/* Bulk Edit Dialog */}
          <CompanyBulkEditDialog
            open={showBulkEditDialog}
            onClose={() => setShowBulkEditDialog(false)}
            onSave={handleBulkEditSave}
            selectedCount={selectedCompanyIds.length}
          />

          {/* Bulk Archive Dialog */}
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
              Archive {selectedCompanyIds.length} {selectedCompanyIds.length === 1 ? 'Company' : 'Companies'}?
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to archive {selectedCompanyIds.length} {selectedCompanyIds.length === 1 ? 'company' : 'companies'}?
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
                placeholder="Enter reason for archiving these companies..."
                sx={{ mt: 2 }}
              />
              {bulkTotalLeadsCount > 0 && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={bulkCascadeToLeads}
                      onChange={(e) => setBulkCascadeToLeads(e.target.checked)}
                      disabled={bulkArchiving}
                      sx={{
                        color: '#667eea',
                        '&.Mui-checked': {
                          color: '#667eea',
                        },
                      }}
                    />
                  }
                  label={`Also archive ${bulkTotalLeadsCount} total associated lead${bulkTotalLeadsCount > 1 ? 's' : ''}`}
                  sx={{ mt: 2 }}
                />
              )}
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

          {/* Bulk Writing Program Analysis Dialog */}
          <BulkWritingProgramDialog
            open={showBulkAnalysisDialog}
            companies={filteredCompanies.filter(c => selectedWritingProgramIds.includes(c.id))}
            onClose={() => setShowBulkAnalysisDialog(false)}
            onComplete={handleBulkAnalysisComplete}
          />

          {/* Bulk Offer Analysis Dialog */}
          <BulkOfferAnalysisDialog
            open={showBulkOfferDialog}
            companies={companies.filter(c => selectedCompanyIds.includes(c.id))}
            onClose={() => setShowBulkOfferDialog(false)}
            onComplete={handleBulkOfferComplete}
          />

          {/* Single Company URL Selection Dialog */}
          <WritingProgramUrlSelectionDialog
            open={urlSelectionDialogOpen}
            onClose={handleUrlSelectionCancel}
            onSelect={handleUrlSelect}
            onStartSearch={handleStartSearch}
            urls={foundUrls}
            loading={analyzingLoading}
            existingUrl={existingProgramUrl}
          />

          {/* Website Field Mapping Dialog */}
          <WebsiteFieldMappingDialog
            open={websiteMappingDialogOpen}
            onClose={handleWebsiteMappingCancel}
            companies={companies}
            onSave={handleWebsiteMappingSave}
          />

          {/* Competitor Workflow Dialog */}
          {selectedCompanyForCompetitors && (
            <CompetitorWorkflowDialog
              open={competitorDialogOpen}
              onClose={() => {
                setCompetitorDialogOpen(false);
                setSelectedCompanyForCompetitors(null);
              }}
              company={selectedCompanyForCompetitors}
            />
          )}
        </>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CompaniesPage;
