// src/components/features/analytics/WonLeadsModal.tsx
// Modal component for displaying the list of leads with status = 'won'

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  IconButton,
  Link,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Lead } from '../../../types/lead';

interface WonLeadsModalProps {
  open: boolean;
  onClose: () => void;
  leads: Lead[];
}

interface WonLeadRow {
  id: string;
  name: string;
  company: string;
  companyId?: string;
  email: string;
  dateWon: Date | null;
}

type SortField = 'name' | 'company' | 'dateWon';
type SortDirection = 'asc' | 'desc';

// Won date: prefer the timestamp the lead entered 'won' (stateHistory), fall back to updatedAt
const getDateWon = (lead: Lead): Date | null => {
  if (lead.stateHistory?.won) {
    try {
      return new Date(lead.stateHistory.won);
    } catch (e) {
      // Invalid date format, skip
    }
  }
  if (lead.updatedAt) {
    return lead.updatedAt instanceof Date ? lead.updatedAt : new Date(lead.updatedAt);
  }
  return null;
};

export const WonLeadsModal: React.FC<WonLeadsModalProps> = ({ open, onClose, leads }) => {
  const navigate = useNavigate();

  const [sortBy, setSortBy] = useState<SortField>('dateWon');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const wonLeads = useMemo<WonLeadRow[]>(() => {
    return leads
      .filter(lead => lead.status === 'won')
      .map(lead => ({
        id: lead.id,
        name: lead.name,
        company: lead.company,
        companyId: lead.companyId,
        email: lead.email || '-',
        dateWon: getDateWon(lead),
      }));
  }, [leads]);

  const sortedLeads = useMemo(() => {
    return [...wonLeads].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === 'asc'
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [wonLeads, sortBy, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'No date';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
          background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CheckCircleIcon sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Won Leads
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.5 }}>
              {sortedLeads.length} {sortedLeads.length === 1 ? 'lead' : 'leads'} won
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {sortedLeads.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#64748b', mb: 1, fontWeight: 600 }}>
              No Won Leads Yet
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Won leads will appear here once a lead's status is set to Won
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>
                      <TableSortLabel
                        active={sortBy === 'name'}
                        direction={sortBy === 'name' ? sortDirection : 'asc'}
                        onClick={() => handleSort('name')}
                      >
                        Lead Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>
                      <TableSortLabel
                        active={sortBy === 'company'}
                        direction={sortBy === 'company' ? sortDirection : 'asc'}
                        onClick={() => handleSort('company')}
                      >
                        Company
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>
                      Email
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>
                      <TableSortLabel
                        active={sortBy === 'dateWon'}
                        direction={sortBy === 'dateWon' ? sortDirection : 'asc'}
                        onClick={() => handleSort('dateWon')}
                      >
                        Date Won
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedLeads
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((lead) => (
                      <TableRow
                        key={lead.id}
                        hover
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        sx={{
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                          '&:hover': { bgcolor: '#f8fafc' },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {lead.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {lead.companyId ? (
                            <Link
                              href={`/companies/${lead.companyId}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/companies/${lead.companyId}`);
                              }}
                              sx={{ color: '#667eea', fontWeight: 500, textDecoration: 'none' }}
                            >
                              {lead.company}
                            </Link>
                          ) : (
                            <Typography variant="body2">{lead.company}</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.email === '-' ? (
                            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                              No email
                            </Typography>
                          ) : (
                            <Link
                              href={`mailto:${lead.email}`}
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                color: '#667eea',
                                fontWeight: 500,
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline' },
                              }}
                            >
                              {lead.email}
                            </Link>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {formatDate(lead.dateWon)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={sortedLeads.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
