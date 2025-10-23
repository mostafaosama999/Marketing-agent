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

export const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Array<Company & { leadCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);

  // Table column visibility state
  const [tableColumns, setTableColumns] = useState<TableColumnConfig[]>(DEFAULT_COMPANIES_TABLE_COLUMNS);

  // Subscribe to companies with real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToCompanies(async (companiesData) => {
      // Fetch lead counts for each company and auto-delete those with 0 leads
      const companiesWithCounts = await Promise.all(
        companiesData.map(async (company) => {
          const leadCount = await countLeadsForCompany(company.id);

          // Auto-delete companies with 0 leads
          if (leadCount === 0) {
            try {
              await deleteCompany(company.id);
              console.log(`Auto-deleted company with 0 leads: ${company.name}`);
            } catch (error) {
              console.error(`Failed to delete company ${company.name}:`, error);
            }
            return null; // Mark for filtering
          }

          return { ...company, leadCount };
        })
      );

      // Filter out null entries (deleted companies)
      setCompanies(companiesWithCounts.filter((c): c is Company & { leadCount: number } => c !== null));
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

  // Filter companies based on search term
  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) {
      return companies;
    }

    const term = searchTerm.toLowerCase();
    return companies.filter(company =>
      company.name.toLowerCase().includes(term) ||
      company.industry?.toLowerCase().includes(term) ||
      company.website?.toLowerCase().includes(term)
    );
  }, [companies, searchTerm]);

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
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

        {/* Search Bar and Column Visibility */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder="Search companies by name, industry, or website..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                borderRadius: 2,
                '& fieldset': {
                  borderColor: '#e2e8f0',
                },
                '&:hover fieldset': {
                  borderColor: '#667eea',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#667eea',
                },
              },
            }}
          />

          {/* Column Visibility Menu */}
          <TableColumnVisibilityMenu
            columns={tableColumns}
            onToggleVisibility={handleColumnVisibilityChange}
          />
        </Box>
      </Box>

      {/* Company Count */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}>
          Showing {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'}
          {searchTerm && ` matching "${searchTerm}"`}
        </Typography>
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
