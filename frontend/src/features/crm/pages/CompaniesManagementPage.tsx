import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Box,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
} from '@mui/icons-material';
import { Company, CompanyFormData } from '../../../app/types/crm';
import { CompanyDialog } from '../components/CompanyDialog';
import { CompanyCard } from '../components/CompanyCard';
import { CompanyTableView } from '../components/CompanyTableView';
import { CompanyFilterBar, CompanyFilters } from '../components/CompanyFilterBar';
import { ConfirmDialog } from '../components';
import {
  subscribeToCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../../../services/companiesService';
import { isCompanyNameDuplicate, findCompanyDuplicates } from '../../../services/deduplicationService';

export const CompaniesManagementPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [filters, setFilters] = useState<CompanyFilters>({
    search: '',
    industries: [],
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
    data: CompanyFormData | null;
    duplicateNames: string[];
  }>({
    open: false,
    data: null,
    duplicateNames: [],
  });

  // Subscribe to real-time companies updates
  useEffect(() => {
    const unsubscribe = subscribeToCompanies((updatedCompanies) => {
      setCompanies(updatedCompanies);
    });
    return () => unsubscribe();
  }, []);

  const handleAddCompany = () => {
    setSelectedCompany(null);
    setDialogOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setDialogOpen(true);
  };

  const handleSaveCompany = async (data: CompanyFormData) => {
    try {
      if (selectedCompany) {
        // Editing existing company
        await updateCompany(selectedCompany.id, data);
        showSnackbar('Company updated successfully', 'success');
      } else {
        // Creating new company - check for duplicates
        if (isCompanyNameDuplicate(data.name, companies)) {
          const duplicates = findCompanyDuplicates(data.name, companies);
          const duplicateNames = duplicates.map(c => c.name);
          setDuplicateConfirm({
            open: true,
            data,
            duplicateNames,
          });
          return; // Don't save yet
        }

        await createCompany(data);
        showSnackbar('Company created successfully', 'success');
      }
    } catch (error) {
      showSnackbar('Failed to save company', 'error');
      throw error;
    }
  };

  const handleConfirmDuplicateSave = async () => {
    if (!duplicateConfirm.data) return;

    try {
      await createCompany(duplicateConfirm.data);
      showSnackbar('Company created successfully', 'success');
      setDuplicateConfirm({ open: false, data: null, duplicateNames: [] });
      setDialogOpen(false);
    } catch (error) {
      showSnackbar('Failed to save company', 'error');
      setDuplicateConfirm({ open: false, data: null, duplicateNames: [] });
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (window.confirm('Are you sure you want to delete this company? This will also delete all leads associated with this company. This action cannot be undone.')) {
      try {
        await deleteCompany(companyId);
        showSnackbar('Company deleted successfully', 'success');
      } catch (error) {
        showSnackbar('Failed to delete company', 'error');
      }
    }
  };

  const handleBulkDelete = async (companyIds: string[]) => {
    if (window.confirm(`Are you sure you want to delete ${companyIds.length} companies? This will also delete all leads associated with these companies. This action cannot be undone.`)) {
      try {
        await Promise.all(companyIds.map(id => deleteCompany(id)));
        showSnackbar(`${companyIds.length} companies deleted successfully`, 'success');
      } catch (error) {
        showSnackbar('Failed to delete companies', 'error');
      }
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Get unique industries for filter
  const availableIndustries = useMemo(() => {
    const industries = companies
      .map((c) => c.industry)
      .filter((industry): industry is string => !!industry);
    return Array.from(new Set(industries)).sort();
  }, [companies]);

  // Apply filters
  const filteredCompanies = companies.filter((company) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        company.name.toLowerCase().includes(searchLower) ||
        (company.website && company.website.toLowerCase().includes(searchLower)) ||
        (company.industry && company.industry.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }

    // Industry filter
    if (filters.industries.length > 0 && company.industry) {
      if (!filters.industries.includes(company.industry)) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      const companyDate = company.createdAt.getTime();
      if (filters.dateRange.start && companyDate < filters.dateRange.start.getTime()) {
        return false;
      }
      if (filters.dateRange.end && companyDate > filters.dateRange.end.getTime()) {
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
            Companies
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your company records
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddCompany}>
            Add Company
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <CompanyFilterBar
        filters={filters}
        availableIndustries={availableIndustries}
        onFiltersChange={setFilters}
      />

      {/* Company Count Summary */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Showing {filteredCompanies.length} compan{filteredCompanies.length !== 1 ? 'ies' : 'y'}
        </Typography>
      </Box>

      {/* View Content */}
      {viewMode === 'grid' ? (
        <Grid container spacing={2}>
          {filteredCompanies.map((company) => (
            <Grid key={company.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <CompanyCard
                company={company}
                onEdit={handleEditCompany}
              />
            </Grid>
          ))}
          {filteredCompanies.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body1" color="text.secondary">
                  No companies found
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      ) : (
        <CompanyTableView
          companies={filteredCompanies}
          onEditCompany={handleEditCompany}
          onDeleteCompany={handleDeleteCompany}
          onBulkDelete={handleBulkDelete}
        />
      )}

      {/* Company Dialog */}
      <CompanyDialog
        open={dialogOpen}
        company={selectedCompany}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveCompany}
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

      {/* Duplicate Company Confirmation */}
      <ConfirmDialog
        open={duplicateConfirm.open}
        title="Duplicate Company Detected"
        message={`A company named "${duplicateConfirm.duplicateNames.join(', ')}" already exists. Are you sure you want to create another one with the same name?`}
        confirmText="Create Anyway"
        cancelText="Cancel"
        severity="warning"
        onConfirm={handleConfirmDuplicateSave}
        onCancel={() => setDuplicateConfirm({ open: false, data: null, duplicateNames: [] })}
      />
    </Box>
  );
};
