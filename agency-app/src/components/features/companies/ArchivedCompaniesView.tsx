// src/components/features/companies/ArchivedCompaniesView.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Button,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Unarchive as UnarchiveIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { Company } from '../../../types/crm';
import { subscribeToArchivedCompanies } from '../../../services/api/companies';

interface ArchivedCompaniesViewProps {
  onClose: () => void;
  onCompanyClick: (company: Company) => void;
  onUnarchive: (companyId: string) => Promise<void>;
  leadCounts?: Map<string, number>;
}

export const ArchivedCompaniesView: React.FC<ArchivedCompaniesViewProps> = ({
  onClose,
  onCompanyClick,
  onUnarchive,
  leadCounts = new Map(),
}) => {
  const [archivedCompanies, setArchivedCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToArchivedCompanies((companies) => {
      setArchivedCompanies(companies);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleUnarchive = async (e: React.MouseEvent, companyId: string) => {
    e.stopPropagation();
    if (window.confirm('Restore this company to the active list?')) {
      try {
        await onUnarchive(companyId);
      } catch (error) {
        console.error('Error unarchiving company:', error);
        alert('Failed to unarchive company. Please try again.');
      }
    }
  };

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: 'calc(100vh - 48px)',
        display: 'flex',
        flexDirection: 'column',
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                fontWeight: 700,
                mb: 1,
              }}
            >
              Archived Companies
            </Typography>
            <Typography variant="subtitle1" sx={{ color: '#64748b', fontWeight: 400 }}>
              {archivedCompanies.length} archived {archivedCompanies.length === 1 ? 'company' : 'companies'}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<CloseIcon />}
            onClick={onClose}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#667eea',
              color: '#667eea',
              '&:hover': {
                borderColor: '#5568d3',
                bgcolor: 'rgba(102, 126, 234, 0.08)',
              },
            }}
          >
            Back to Companies
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#667eea' }} />
          </Box>
        ) : archivedCompanies.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Archived Companies
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Archived companies will appear here
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ flex: 1 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Website</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Industry</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc', textAlign: 'center' }}>
                    Lead Count
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Archived Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc', textAlign: 'center' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {archivedCompanies.map((company) => (
                  <TableRow
                    key={company.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'rgba(102, 126, 234, 0.04)',
                      },
                    }}
                  >
                    <TableCell onClick={() => onCompanyClick(company)}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {company.name}
                      </Typography>
                    </TableCell>
                    <TableCell onClick={() => onCompanyClick(company)}>
                      <Typography variant="body2" color="text.secondary">
                        {company.website || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell onClick={() => onCompanyClick(company)}>
                      <Typography variant="body2" color="text.secondary">
                        {company.industry || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell onClick={() => onCompanyClick(company)} sx={{ textAlign: 'center' }}>
                      <Chip
                        label={leadCounts.get(company.id) || 0}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(102, 126, 234, 0.1)',
                          color: '#667eea',
                          fontWeight: 500,
                          minWidth: 40,
                        }}
                      />
                    </TableCell>
                    <TableCell onClick={() => onCompanyClick(company)}>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(company.archivedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="Unarchive">
                        <IconButton
                          size="small"
                          onClick={(e) => handleUnarchive(e, company.id)}
                          sx={{
                            color: '#f59e0b',
                            '&:hover': {
                              bgcolor: 'rgba(245, 158, 11, 0.08)',
                            },
                          }}
                        >
                          <UnarchiveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => onCompanyClick(company)}
                          sx={{
                            color: '#667eea',
                            '&:hover': {
                              bgcolor: 'rgba(102, 126, 234, 0.08)',
                            },
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};
