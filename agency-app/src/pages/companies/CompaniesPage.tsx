// src/pages/companies/CompaniesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Fab,
  TextField,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  DialogContentText,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { Company } from '../../types/crm';
import { subscribeToCompanies, countLeadsForCompany, deleteCompany } from '../../services/api/companies';
import { CompanyDialog } from '../../components/features/companies/CompanyDialog';
import { CompanyTable } from '../../components/features/companies/CompanyTable';

export const CompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<Array<Company & { leadCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<(Company & { leadCount: number}) | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    setSelectedCompany(null);
    setOpenDialog(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setOpenDialog(true);
  };

  const handleDeleteCompany = (company: Company & { leadCount: number }) => {
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;

    setDeleting(true);
    try {
      await deleteCompany(companyToDelete.id);
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Failed to delete company. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setSelectedCompany(null);
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

        {/* Search Bar */}
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
        onEdit={handleEditCompany}
        onDelete={handleDeleteCompany}
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

      {/* Add/Edit Company Dialog */}
      <CompanyDialog
        open={openDialog}
        onClose={handleDialogClose}
        company={selectedCompany}
        onSuccess={() => {
          // Dialog will close automatically
          // Companies list will update automatically via subscription
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {companyToDelete?.leadCount === 0 ? 'Delete Company?' : 'Cannot Delete Company'}
        </DialogTitle>
        <DialogContent>
          {companyToDelete?.leadCount === 0 ? (
            <DialogContentText>
              Are you sure you want to delete <strong>{companyToDelete?.name}</strong>?
              This action cannot be undone.
            </DialogContentText>
          ) : (
            <DialogContentText>
              Cannot delete <strong>{companyToDelete?.name}</strong> because it has{' '}
              <strong>{companyToDelete?.leadCount} associated lead{companyToDelete?.leadCount !== 1 ? 's' : ''}</strong>.
              <br /><br />
              Please delete or reassign all leads first, then try again.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {companyToDelete?.leadCount === 0 ? 'Cancel' : 'Close'}
          </Button>
          {companyToDelete?.leadCount === 0 && (
            <Button
              onClick={confirmDelete}
              disabled={deleting}
              variant="contained"
              color="error"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {deleting ? <CircularProgress size={24} /> : 'Delete'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompaniesPage;
