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
} from '@mui/material';
import {
  Add as AddIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { Company } from '../../types/crm';
import {
  subscribeToCompanies,
  countLeadsForCompany,
  subscribeToArchivedCompanies,
  unarchiveCompany,
  getLeadCountsForAllCompanies,
  bulkUpdateCompanyFields,
} from '../../services/api/companies';
import { CompanyDialog } from '../../components/features/companies/CompanyDialog';
import { CompanyTable } from '../../components/features/companies/CompanyTable';
import { ArchivedCompaniesView } from '../../components/features/companies/ArchivedCompaniesView';
import { CompanyBulkActionsToolbar } from '../../components/features/companies/CompanyBulkActionsToolbar';
import { CompanyBulkEditDialog } from '../../components/features/companies/CompanyBulkEditDialog';
import { TableColumnVisibilityMenu } from '../../components/features/crm/TableColumnVisibilityMenu';
import {
  TableColumnConfig,
  DEFAULT_COMPANIES_TABLE_COLUMNS,
  COMPANIES_TABLE_COLUMNS_STORAGE_KEY,
} from '../../types/table';
import {
  buildCompaniesTableColumns,
  columnsToPreferences,
  applyColumnPreferences,
} from '../../services/api/tableColumnsService';
import { CompanyFilterState, DEFAULT_COMPANY_FILTER_STATE, SaveCompanyPresetRequest } from '../../types/companyFilter';
import { FilterRule } from '../../types/filter';
import { applyCompanyAdvancedFilters } from '../../services/api/companyFilterService';
import { AdvancedFiltersModal, SearchFilter, FilterButton } from '../../components/features/crm/filters';
import { FilterPresetsMenu } from '../../components/features/crm/filters/FilterPresetsMenu';
import { SavePresetDialog } from '../../components/features/crm/filters/SavePresetDialog';
import {
  loadCompanyPreset,
  getDefaultCompanyPreset,
} from '../../services/api/companyFilterPresetsService';

export const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Array<Company & { leadCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openFiltersModal, setOpenFiltersModal] = useState(false);

  // Archived companies state
  const [showArchivedView, setShowArchivedView] = useState(false);
  const [archivedCompaniesCount, setArchivedCompaniesCount] = useState(0);
  const [leadCounts, setLeadCounts] = useState<Map<string, number>>(new Map());

  // Selection state for bulk actions
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<CompanyFilterState>(DEFAULT_COMPANY_FILTER_STATE);
  const [advancedFilterRules, setAdvancedFilterRules] = useState<FilterRule[]>([]);

  // Preset dialog state
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);

  // Table column visibility state
  const [tableColumns, setTableColumns] = useState<TableColumnConfig[]>(DEFAULT_COMPANIES_TABLE_COLUMNS);

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

  // Load default preset on mount
  useEffect(() => {
    if (!user) return;

    async function loadDefaultPreset() {
      try {
        const defaultPreset = await getDefaultCompanyPreset(user.uid);
        if (defaultPreset) {
          // Apply preset filters
          setFilters(defaultPreset.basicFilters);
          setAdvancedFilterRules(defaultPreset.advancedRules);

          // Apply table column preferences if saved in preset
          if (defaultPreset.tableColumns) {
            const preferences = defaultPreset.tableColumns;
            const columnsWithPreferences = applyColumnPreferences(tableColumns, preferences);
            setTableColumns(columnsWithPreferences);
          }
        }
      } catch (error) {
        console.error('Error loading default preset:', error);
      }
    }

    loadDefaultPreset();
  }, [user, tableColumns]); // Include tableColumns dependency

  // Load table columns (default + custom fields from companies)
  useEffect(() => {
    async function initializeTableColumns() {
      try {
        // Build complete column list from default + company custom fields
        const allColumns = await buildCompaniesTableColumns(companies);

        // Load saved preferences (visibility + order) from localStorage
        const savedPrefs = localStorage.getItem(COMPANIES_TABLE_COLUMNS_STORAGE_KEY);
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
        setTableColumns(DEFAULT_COMPANIES_TABLE_COLUMNS);
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

    // Apply advanced filters if any rules are set
    if (advancedFilterRules.length > 0) {
      filtered = applyCompanyAdvancedFilters(filtered, advancedFilterRules) as Array<Company & { leadCount: number }>;
    }

    return filtered;
  }, [companies, filters, advancedFilterRules]);

  const handleAddCompany = () => {
    setOpenDialog(true);
  };

  const handleViewCompany = (company: Company) => {
    navigate(`/companies/${company.id}`);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
  };

  // Column visibility handlers
  const handleColumnVisibilityChange = (columnId: string, visible: boolean) => {
    const updatedColumns = tableColumns.map(col =>
      col.id === columnId ? { ...col, visible } : col
    );
    setTableColumns(updatedColumns);

    // Save preferences (visibility + order) to localStorage
    const preferences = columnsToPreferences(updatedColumns);
    localStorage.setItem(COMPANIES_TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(preferences));
  };

  // Column reordering handler
  const handleReorderColumns = (reorderedColumns: TableColumnConfig[]) => {
    setTableColumns(reorderedColumns);

    // Save preferences (visibility + order) to localStorage
    const preferences = columnsToPreferences(reorderedColumns);
    localStorage.setItem(COMPANIES_TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(preferences));
  };

  // Reset column order to default (auto-grouped by section)
  const handleResetColumnOrder = async () => {
    try {
      // Clear saved preferences
      localStorage.removeItem(COMPANIES_TABLE_COLUMNS_STORAGE_KEY);

      // Rebuild columns with auto-grouping (no saved preferences)
      const allColumns = await buildCompaniesTableColumns(companies);

      // Update state with auto-grouped columns
      setTableColumns(allColumns);

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
          const columnsWithPreferences = applyColumnPreferences(tableColumns, preferences);
          setTableColumns(columnsWithPreferences);
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
      tableColumns: columnsToPreferences(tableColumns),
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
      ['Name', 'Website', 'Industry', 'Description', 'Lead Count'].join(','),
      // Data rows
      ...selectedCompanies.map(company =>
        [
          `"${company.name || ''}"`,
          `"${company.website || ''}"`,
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
        </Box>

        {/* Filter Bar and Column Visibility */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Showing {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'}
          </Typography>
          <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
          <TableColumnVisibilityMenu
            columns={tableColumns}
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
              <Badge badgeContent={archivedCompaniesCount} color="primary">
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
            {/* Bulk Actions Toolbar */}
            <CompanyBulkActionsToolbar
              selectedCount={selectedCompanyIds.length}
              onEditFields={handleBulkEdit}
              onExportCSV={handleBulkExportCSV}
              onDelete={handleBulkDelete}
              onClear={handleClearSelection}
            />

            {/* Companies Table */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              <CompanyTable
                companies={filteredCompanies}
                onView={handleViewCompany}
                visibleColumns={tableColumns}
                selectedCompanyIds={selectedCompanyIds}
                onSelectCompany={(companyId) => {
                  const isSelected = selectedCompanyIds.includes(companyId);
                  handleSelectCompany(companyId, !isSelected);
                }}
                onSelectAll={handleSelectAll}
              />
            </Box>
          </Box>

          {/* Add Company FAB */}
          <Fab
            color="primary"
            aria-label="add company"
            onClick={handleAddCompany}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <AddIcon />
          </Fab>

          {/* Add Company Dialog (Create mode only) */}
          <CompanyDialog
            open={openDialog}
            onClose={handleDialogClose}
            onSuccess={() => {
              // Dialog will close automatically
              // Companies list will update automatically via subscription
            }}
          />

          {/* Advanced Filters Modal */}
          <AdvancedFiltersModal
            open={openFiltersModal}
            onClose={() => setOpenFiltersModal(false)}
            onApplyFilters={handleApplyAdvancedFilters}
            onClearFilters={handleClearAllFilters}
            data={companies}
            entityType="company"
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
