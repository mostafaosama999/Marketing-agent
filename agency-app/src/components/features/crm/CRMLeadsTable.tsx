// src/components/features/crm/CRMLeadsTable.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Checkbox,
  Link,
  TablePagination,
} from '@mui/material';
import {
  Edit as EditIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowRight as ChevronRightIcon,
} from '@mui/icons-material';
import { Lead, LeadStatus } from '../../../types/lead';
import { usePipelineConfigContext } from '../../../contexts/PipelineConfigContext';
import { TableColumnConfig } from '../../../types/table';

interface CRMLeadsTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  selectedLeadIds: string[];
  onSelectLead: (leadId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onClearSelection: () => void;
  visibleColumns: TableColumnConfig[];
}

type SortDirection = 'asc' | 'desc';

// Status color mapping
const getStatusColor = (status: LeadStatus): string => {
  const colors: Record<LeadStatus, string> = {
    new_lead: '#9e9e9e',
    qualified: '#ff9800',
    contacted: '#2196f3',
    follow_up: '#9c27b0',
    won: '#4caf50',
    lost: '#607d8b',
  };
  return colors[status] || '#9e9e9e';
};

// Outreach status colors
const getOutreachStatusColor = (status: string): { bg: string; color: string } => {
  if (status === 'replied') {
    return { bg: '#dcfce7', color: '#16a34a' };
  }
  if (status === 'no_response' || status === 'bounced') {
    return { bg: '#fee2e2', color: '#dc2626' };
  }
  if (status === 'sent' || status === 'opened') {
    return { bg: '#dbeafe', color: '#0077b5' };
  }
  return { bg: '#f3f4f6', color: '#6b7280' };
};

export const CRMLeadsTable: React.FC<CRMLeadsTableProps> = ({
  leads,
  onLeadClick,
  onUpdateStatus,
  selectedLeadIds,
  onSelectLead,
  onSelectAll,
  onClearSelection,
  visibleColumns,
}) => {
  // Filter to only show visible columns
  const displayColumns = visibleColumns.filter(col => col.visible);
  const { stages, getLabel } = usePipelineConfigContext();

  const [orderBy, setOrderBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<SortDirection>('desc');
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedLeadForStatus, setSelectedLeadForStatus] = useState<Lead | null>(null);
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set());

  // Pagination state
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem('crm_table_page');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const saved = localStorage.getItem('crm_table_rows_per_page');
    return saved ? parseInt(saved, 10) : 25;
  });

  // Toggle company collapse/expand
  const toggleCompanyCollapse = (companyName: string) => {
    setCollapsedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyName)) {
        newSet.delete(companyName);
      } else {
        newSet.add(companyName);
      }
      return newSet;
    });
  };

  // Handle company group checkbox
  const handleCompanySelect = (companyLeadIds: string[], selected: boolean) => {
    if (selected) {
      // Add all company leads to selection
      companyLeadIds.forEach(id => {
        if (!selectedLeadIds.includes(id)) {
          onSelectLead(id);
        }
      });
    } else {
      // Remove all company leads from selection
      companyLeadIds.forEach(id => {
        if (selectedLeadIds.includes(id)) {
          onSelectLead(id);
        }
      });
    }
  };

  // Sorting handler
  const handleRequestSort = (fieldId: string) => {
    const isAsc = orderBy === fieldId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(fieldId);
  };

  // Status menu handlers
  const handleStatusClick = (event: React.MouseEvent<HTMLElement>, lead: Lead) => {
    event.stopPropagation();
    setStatusMenuAnchor(event.currentTarget);
    setSelectedLeadForStatus(lead);
  };

  const handleStatusMenuClose = () => {
    setStatusMenuAnchor(null);
    setSelectedLeadForStatus(null);
  };

  const handleStatusChange = (newStatus: LeadStatus) => {
    if (selectedLeadForStatus) {
      onUpdateStatus(selectedLeadForStatus.id, newStatus);
    }
    handleStatusMenuClose();
  };

  // Sort leads
  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Get values based on column id
      switch (orderBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'company':
          aValue = a.company || a.companyName;
          bValue = b.company || b.companyName;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'linkedin_status':
          aValue = a.outreach?.linkedIn?.status;
          bValue = b.outreach?.linkedIn?.status;
          break;
        case 'email_outreach_status':
          aValue = a.outreach?.email?.status;
          bValue = b.outreach?.email?.status;
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        default:
          // Check if this is a custom field
          const column = displayColumns.find(col => col.id === orderBy);
          if (column && column.type === 'custom' && column.fieldName) {
            aValue = a.customFields?.[column.fieldName];
            bValue = b.customFields?.[column.fieldName];
          } else {
            return 0;
          }
      }

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle date comparison
      if (orderBy === 'createdAt' || aValue instanceof Date) {
        const aTime = aValue instanceof Date ? aValue.getTime() : new Date(aValue).getTime();
        const bTime = bValue instanceof Date ? bValue.getTime() : new Date(bValue).getTime();
        return order === 'asc' ? aTime - bTime : bTime - aTime;
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return order === 'asc' ? comparison : -comparison;
      }

      // Handle numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [leads, orderBy, order, displayColumns]);

  // Group leads by company
  const groupedLeads = useMemo(() => {
    const groups: { [company: string]: Lead[] } = {};

    sortedLeads.forEach(lead => {
      const company = lead.company || lead.companyName || 'No Company';
      if (!groups[company]) {
        groups[company] = [];
      }
      groups[company].push(lead);
    });

    return groups;
  }, [sortedLeads]);

  // Paginate leads (not companies)
  const paginatedLeads = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedLeads.slice(start, end);
  }, [sortedLeads, page, rowsPerPage]);

  // Group only the paginated leads by company
  const paginatedGroupedLeads = useMemo(() => {
    const groups: { [company: string]: Lead[] } = {};
    paginatedLeads.forEach(lead => {
      const company = lead.company || lead.companyName || 'No Company';
      if (!groups[company]) {
        groups[company] = [];
      }
      groups[company].push(lead);
    });
    return groups;
  }, [paginatedLeads]);

  // Get companies for current page only, sorted by lead count then alphabetically
  const paginatedCompanies = useMemo(() => {
    return Object.keys(paginatedGroupedLeads).sort((a, b) => {
      const countDiff = paginatedGroupedLeads[b].length - paginatedGroupedLeads[a].length;
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });
  }, [paginatedGroupedLeads]);

  // Calculate current page lead IDs
  const currentPageLeadIds = useMemo(() => {
    return paginatedLeads.map(lead => lead.id);
  }, [paginatedLeads]);

  // Check if all leads on current page are selected
  const allSelected = currentPageLeadIds.length > 0 &&
                      currentPageLeadIds.every(id => selectedLeadIds.includes(id));
  const someSelected = selectedLeadIds.length > 0 && !allSelected;

  // Reset page when sorting changes
  useEffect(() => {
    setPage(0);
    localStorage.setItem('crm_table_page', '0');
  }, [orderBy, order]);

  // Save pagination preferences
  useEffect(() => {
    localStorage.setItem('crm_table_page', page.toString());
  }, [page]);

  useEffect(() => {
    localStorage.setItem('crm_table_rows_per_page', rowsPerPage.toString());
  }, [rowsPerPage]);

  // Render cell content based on column id
  const renderCell = (columnId: string, lead: Lead) => {
    switch (columnId) {
      case 'name':
        return (
          <TableCell key={columnId} onClick={() => onLeadClick(lead)} sx={{ cursor: 'pointer' }}>
            <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
              {lead.name || '-'}
            </Typography>
          </TableCell>
        );

      case 'email':
        return (
          <TableCell key={columnId}>
            <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
              {lead.email || '-'}
            </Typography>
          </TableCell>
        );

      case 'company':
        return (
          <TableCell key={columnId}>
            <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
              {lead.company || lead.companyName || '-'}
            </Typography>
          </TableCell>
        );

      case 'status':
        return (
          <TableCell key={columnId}>
            <Chip
              label={getLabel(lead.status)}
              size="small"
              onClick={(e) => handleStatusClick(e, lead)}
              sx={{
                bgcolor: `${getStatusColor(lead.status)}22`,
                color: getStatusColor(lead.status),
                fontWeight: 500,
                fontSize: '10px',
                height: '20px',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: `${getStatusColor(lead.status)}33`,
                },
              }}
            />
          </TableCell>
        );

      case 'linkedin_status': {
        const status = lead.outreach?.linkedIn?.status;
        if (!status || status === 'not_sent') {
          return (
            <TableCell key={columnId}>
              <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2, color: 'text.secondary' }}>-</Typography>
            </TableCell>
          );
        }
        const colors = getOutreachStatusColor(status);
        const labels: Record<string, string> = {
          sent: 'Sent',
          opened: 'Opened',
          replied: 'Replied',
          no_response: 'No Response',
        };
        return (
          <TableCell key={columnId}>
            <Chip
              label={labels[status] || status}
              size="small"
              sx={{
                bgcolor: colors.bg,
                color: colors.color,
                fontWeight: 500,
                fontSize: '10px',
                height: '20px',
              }}
            />
          </TableCell>
        );
      }

      case 'email_outreach_status': {
        const status = lead.outreach?.email?.status;
        if (!status || status === 'not_sent') {
          return (
            <TableCell key={columnId}>
              <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2, color: 'text.secondary' }}>-</Typography>
            </TableCell>
          );
        }
        const colors = getOutreachStatusColor(status);
        const labels: Record<string, string> = {
          sent: 'Sent',
          opened: 'Opened',
          replied: 'Replied',
          bounced: 'Bounced',
          no_response: 'No Response',
        };
        return (
          <TableCell key={columnId}>
            <Chip
              label={labels[status] || status}
              size="small"
              sx={{
                bgcolor: colors.bg,
                color: colors.color,
                fontWeight: 500,
                fontSize: '10px',
                height: '20px',
              }}
            />
          </TableCell>
        );
      }

      case 'createdAt': {
        const date = lead.createdAt instanceof Date ? lead.createdAt : new Date(lead.createdAt);
        return (
          <TableCell key={columnId}>
            <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
              {date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Typography>
          </TableCell>
        );
      }

      default:
        // Check if this is a custom field column
        const column = displayColumns.find(col => col.id === columnId);
        if (column && column.type === 'custom' && column.fieldName) {
          const value = lead.customFields?.[column.fieldName];

          if (!value || value === '') {
            return (
              <TableCell key={columnId}>
                <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2, color: 'text.secondary' }}>-</Typography>
              </TableCell>
            );
          }

          // Check if value is a URL
          const isUrl = typeof value === 'string' &&
                        (value.startsWith('http://') || value.startsWith('https://'));

          if (isUrl) {
            return (
              <TableCell key={columnId}>
                <Link
                  href={value as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    fontSize: '11px',
                    lineHeight: 1.2,
                    color: '#667eea',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {String(value)}
                </Link>
              </TableCell>
            );
          }

          return (
            <TableCell key={columnId}>
              <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
                {String(value)}
              </Typography>
            </TableCell>
          );
        }

        return <TableCell key={columnId}>-</TableCell>;
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden',
    }}>
      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: '8px 8px 0 0',
          flex: 1,
          overflow: 'auto',
        }}
      >
        <Table size="small">
          <TableHead sx={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            bgcolor: '#fafafa',
          }}>
            <TableRow sx={{ bgcolor: '#fafafa', borderBottom: '2px solid #e0e0e0', height: '36px' }}>
              {/* Checkbox column */}
              <TableCell
                padding="checkbox"
                sx={{
                  width: 48,
                  py: 0,
                  px: 1,
                  height: '36px',
                }}
              >
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  size="small"
                  sx={{
                    color: '#667eea',
                    '&.Mui-checked': { color: '#667eea' },
                    '&.MuiCheckbox-indeterminate': { color: '#667eea' },
                  }}
                />
              </TableCell>

              {/* Table columns */}
              {displayColumns.map((column) => (
                <TableCell
                  key={column.id}
                  sx={{
                    py: 0,
                    px: 1,
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    height: '36px',
                  }}
                >
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={() => handleRequestSort(column.id)}
                    disabled={!column.sortable}
                    sx={{
                      fontSize: '12px',
                      color: '#64748b',
                      '&:hover': {
                        color: '#475569',
                      },
                      '&.Mui-active': {
                        color: '#667eea',
                      },
                      '& .MuiTableSortLabel-icon': {
                        fontSize: '16px',
                        opacity: 1,
                        color: 'inherit',
                      },
                    }}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={displayColumns.length + 1} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No leads found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCompanies.map((companyName) => {
                const companyLeads = paginatedGroupedLeads[companyName];
                const isCollapsed = collapsedCompanies.has(companyName);
                const companyLeadIds = companyLeads.map(l => l.id);
                const allCompanySelected = companyLeadIds.every(id => selectedLeadIds.includes(id));
                const someCompanySelected = companyLeadIds.some(id => selectedLeadIds.includes(id)) && !allCompanySelected;

                return (
                  <React.Fragment key={companyName}>
                    {/* Company Header Row */}
                    <TableRow
                      sx={{
                        bgcolor: '#f8fafc',
                        height: '36px',
                        '&:hover': { bgcolor: '#f1f5f9' },
                        '& .MuiTableCell-root': {
                          borderBottom: '2px solid #e2e8f0',
                          py: 0,
                          px: 1,
                          height: '36px',
                        },
                      }}
                    >
                      <TableCell padding="checkbox" sx={{ py: 0, px: 1 }}>
                        <Checkbox
                          checked={allCompanySelected}
                          indeterminate={someCompanySelected}
                          onChange={(e) => handleCompanySelect(companyLeadIds, e.target.checked)}
                          size="small"
                          sx={{
                            color: '#667eea',
                            '&.Mui-checked': { color: '#667eea' },
                            '&.MuiCheckbox-indeterminate': { color: '#667eea' },
                          }}
                        />
                      </TableCell>
                      <TableCell colSpan={displayColumns.length}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => toggleCompanyCollapse(companyName)}
                            sx={{ p: 0.25 }}
                          >
                            {isCollapsed ? <ChevronRightIcon sx={{ fontSize: '16px' }} /> : <ExpandMoreIcon sx={{ fontSize: '16px' }} />}
                          </IconButton>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '11px', lineHeight: 1.2 }}>
                            {companyName}
                          </Typography>
                          <Chip
                            label={`${companyLeads.length} lead${companyLeads.length > 1 ? 's' : ''}`}
                            size="small"
                            sx={{
                              height: '18px',
                              fontSize: '9px',
                              bgcolor: '#e0e7ff',
                              color: '#667eea',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Company Leads */}
                    {!isCollapsed && companyLeads.map((lead) => {
                      const isSelected = selectedLeadIds.includes(lead.id);
                      return (
                        <TableRow
                          key={lead.id}
                          hover
                          selected={isSelected}
                          onClick={() => onLeadClick(lead)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: '#fafbfc',
                            height: '32px',
                            '&:hover': {
                              bgcolor: '#f5f5f5',
                            },
                            '& .MuiTableCell-root': {
                              borderBottom: '1px solid #e0e0e0',
                              py: 0,
                              px: 1,
                              height: '32px',
                            },
                          }}
                        >
                          {/* Checkbox cell */}
                          <TableCell
                            padding="checkbox"
                            onClick={(e) => e.stopPropagation()}
                            sx={{ py: 0, px: 1, pl: 2 }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => onSelectLead(lead.id)}
                              size="small"
                              sx={{
                                color: '#667eea',
                                '&.Mui-checked': { color: '#667eea' },
                              }}
                            />
                          </TableCell>

                          {/* Table column cells with indentation on first column */}
                          {displayColumns.map((column, index) => {
                            if (index === 0 && column.id === 'name') {
                              // Add indentation to name column
                              return (
                                <TableCell key={column.id} onClick={() => onLeadClick(lead)} sx={{ cursor: 'pointer', pl: 3 }}>
                                  <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
                                    {lead.name || '-'}
                                  </Typography>
                                </TableCell>
                              );
                            }
                            return renderCell(column.id, lead);
                          })}
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component={Paper}
        count={sortedLeads.length}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100, 250, 500, 1000]}
        labelRowsPerPage="Leads per page:"
        sx={{
          borderTop: '1px solid #e2e8f0',
          bgcolor: '#fafafa',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          flexShrink: 0,
          '.MuiTablePagination-toolbar': {
            px: 2,
            pr: 20, // Large right padding to avoid FAB (160px)
          },
          '.MuiTablePagination-actions': {
            mr: 4, // Extra margin on action buttons
          },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            fontSize: '13px',
            color: '#64748b',
          },
        }}
      />

      {/* Status Change Menu */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={handleStatusMenuClose}
      >
        {stages.map((stage) => (
          <MenuItem
            key={stage.id}
            onClick={() => handleStatusChange(stage.id)}
            selected={selectedLeadForStatus?.status === stage.id}
          >
            <Chip
              label={stage.label}
              size="small"
              sx={{
                bgcolor: `${getStatusColor(stage.id)}22`,
                color: getStatusColor(stage.id),
                fontWeight: 500,
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};
