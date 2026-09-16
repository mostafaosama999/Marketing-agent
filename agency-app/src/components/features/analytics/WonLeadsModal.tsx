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
  Chip,
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

// new Date() on a bad value yields an Invalid Date rather than throwing, which used to
// render as "undefined NaN, NaN" — normalise those to null here instead.
const toValidDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value as string | number);
  return isNaN(date.getTime()) ? null : date;
};

// Won date: prefer the timestamp the lead entered 'won' (stateHistory), fall back to updatedAt
const getDateWon = (lead: Lead): Date | null => {
  return toValidDate(lead.stateHistory?.won) ?? toValidDate(lead.updatedAt);
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Month bucket a won lead belongs to; leads without a usable date get their own trailing group
const getMonthKey = (date: Date | null): string =>
  date ? `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}` : 'no-date';

const getMonthLabel = (date: Date | null): string =>
  date ? `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}` : 'No date won';

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

  // Month is always the primary grouping; the chosen sort field orders rows inside each month.
  // Month order follows the Date Won direction, newest first for the other sort fields.
  const groupedLeads = useMemo(() => {
    const buckets = new Map<string, { key: string; label: string; sortValue: number; leads: WonLeadRow[] }>();

    wonLeads.forEach(lead => {
      const key = getMonthKey(lead.dateWon);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          key,
          label: getMonthLabel(lead.dateWon),
          // Undated leads always sort last
          sortValue: lead.dateWon
            ? new Date(lead.dateWon.getFullYear(), lead.dateWon.getMonth(), 1).getTime()
            : -Infinity,
          leads: [],
        };
        buckets.set(key, bucket);
      }
      bucket.leads.push(lead);
    });

    const monthDirection = sortBy === 'dateWon' ? sortDirection : 'desc';

    const compare = (a: WonLeadRow, b: WonLeadRow) => {
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
    };

    return Array.from(buckets.values())
      .sort((a, b) => {
        if (a.sortValue === b.sortValue) return 0;
        if (a.sortValue === -Infinity) return 1;
        if (b.sortValue === -Infinity) return -1;
        return monthDirection === 'asc' ? a.sortValue - b.sortValue : b.sortValue - a.sortValue;
      })
      .map(bucket => ({ ...bucket, leads: [...bucket.leads].sort(compare) }));
  }, [wonLeads, sortBy, sortDirection]);

  const sortedLeads = useMemo(
    () => groupedLeads.flatMap(group => group.leads),
    [groupedLeads]
  );

  // Slice the flattened list for the current page, then re-split it into its month headers
  const monthGroups = useMemo(() => {
    const visible = sortedLeads.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const groups: { key: string; label: string; total: number; leads: WonLeadRow[] }[] = [];

    visible.forEach(lead => {
      const key = getMonthKey(lead.dateWon);
      const last = groups[groups.length - 1];
      if (last && last.key === key) {
        last.leads.push(lead);
      } else {
        groups.push({
          key,
          label: getMonthLabel(lead.dateWon),
          total: groupedLeads.find(g => g.key === key)?.leads.length ?? 1,
          leads: [lead],
        });
      }
    });

    return groups;
  }, [sortedLeads, groupedLeads, page, rowsPerPage]);

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
    return `${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
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
          // Fill the viewport vertically so the table shows as many rows as the
          // screen allows instead of being capped at a fixed height.
          height: 'calc(100vh - 64px)',
          maxHeight: 'calc(100vh - 64px)',
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

      <DialogContent
        dividers
        sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
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
            <TableContainer sx={{ flex: 1, minHeight: 0 }}>
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
                  {monthGroups.map((group) => (
                    <React.Fragment key={group.key}>
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          sx={{
                            py: 1,
                            bgcolor: '#f1f5f9',
                            borderBottom: '1px solid #e2e8f0',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 700, color: '#334155', letterSpacing: 0.3 }}
                            >
                              {group.label}
                            </Typography>
                            <Chip
                              label={`${group.total} ${group.total === 1 ? 'lead' : 'leads'}`}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                bgcolor: '#dcfce7',
                                color: '#166534',
                              }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                      {group.leads.map((lead) => (
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
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              sx={{ flexShrink: 0, borderTop: '1px solid', borderColor: 'divider' }}
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
