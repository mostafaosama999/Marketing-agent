// src/pages/companies/CompaniesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Fab,
  TextField,
  InputAdornment,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  ViewColumn as ViewColumnIcon,
} from '@mui/icons-material';
import { Company } from '../../types/crm';
import { subscribeToCompanies, countLeadsForCompany, deleteCompany } from '../../services/api/companies';
import { CompanyDialog } from '../../components/features/companies/CompanyDialog';
import { CompanyTable } from '../../components/features/companies/CompanyTable';
import { TableColumnVisibilityMenu } from '../../components/features/crm/TableColumnVisibilityMenu';
import {
  TableColumnConfig,
  DEFAULT_COMPANIES_TABLE_COLUMNS,
  COMPANIES_TABLE_COLUMNS_STORAGE_KEY,
  applyVisibilityPreferences,
} from '../../types/table';
import {
  buildCompaniesTableColumns,
  columnsToVisibilityMap,
} from '../../services/api/tableColumnsService';
import { CompanyFilterState, DEFAULT_COMPANY_FILTER_STATE } from '../../types/companyFilter';
import { FilterRule } from '../../types/filter';
import { applyCompanyAdvancedFilters } from '../../services/api/companyFilterService';
import { CollapsibleFilterBar } from '../../components/features/crm/filters';

export const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Array<Company & { leadCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<CompanyFilterState>(DEFAULT_COMPANY_FILTER_STATE);
  const [advancedFilterRules, setAdvancedFilterRules] = useState<FilterRule[]>([]);

  // Table column visibility state
  const [tableColumns, setTableColumns] = useState<TableColumnConfig[]>(DEFAULT_COMPANIES_TABLE_COLUMNS);

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

  // Load table columns (default + custom fields from companies)
  useEffect(() => {
    async function initializeTableColumns() {
      try {
        // Build complete column list from default + company custom fields
        const allColumns = await buildCompaniesTableColumns(companies);

        // Load saved visibility preferences from localStorage
        const savedPrefs = localStorage.getItem(COMPANIES_TABLE_COLUMNS_STORAGE_KEY);
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

    // Save to localStorage
    const visibilityMap = columnsToVisibilityMap(updatedColumns);
    localStorage.setItem(COMPANIES_TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibilityMap));
  };

  const handleMoveColumnLeft = (columnId: string) => {
    const columnIndex = tableColumns.findIndex(col => col.id === columnId);
    if (columnIndex <= 0) return; // Already at start or not found

    const newColumns = [...tableColumns];
    const temp = newColumns[columnIndex];
    newColumns[columnIndex] = newColumns[columnIndex - 1];
    newColumns[columnIndex - 1] = temp;

    // Update order values
    newColumns.forEach((col, idx) => {
      col.order = idx;
    });

    setTableColumns(newColumns);

    // Save to localStorage
    const visibilityMap = columnsToVisibilityMap(newColumns);
    localStorage.setItem(COMPANIES_TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibilityMap));
  };

  const handleMoveColumnRight = (columnId: string) => {
    const columnIndex = tableColumns.findIndex(col => col.id === columnId);
    if (columnIndex === -1 || columnIndex >= tableColumns.length - 1) return; // Already at end or not found

    const newColumns = [...tableColumns];
    const temp = newColumns[columnIndex];
    newColumns[columnIndex] = newColumns[columnIndex + 1];
    newColumns[columnIndex + 1] = temp;

    // Update order values
    newColumns.forEach((col, idx) => {
      col.order = idx;
    });

    setTableColumns(newColumns);

    // Save to localStorage
    const visibilityMap = columnsToVisibilityMap(newColumns);
    localStorage.setItem(COMPANIES_TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibilityMap));
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
        minHeight: '100vh',
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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Showing {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'}
          </Typography>
          <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
          <TableColumnVisibilityMenu
            columns={tableColumns}
            onToggleVisibility={handleColumnVisibilityChange}
          />
          <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />

          {/* Collapsible Filter Bar */}
          <CollapsibleFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearAll={handleClearAllFilters}
            onApplyAdvancedFilters={handleApplyAdvancedFilters}
            data={companies}
            entityType="company"
            searchPlaceholder="Search companies..."
          />
        </Box>
      </Box>

      {/* Companies Table */}
      <CompanyTable
        companies={filteredCompanies}
        onView={handleViewCompany}
        visibleColumns={tableColumns}
        onMoveColumnLeft={handleMoveColumnLeft}
        onMoveColumnRight={handleMoveColumnRight}
      />

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
    </Box>
  );
};

export default CompaniesPage;
