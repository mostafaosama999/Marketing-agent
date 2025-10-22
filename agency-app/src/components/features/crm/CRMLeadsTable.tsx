// src/components/features/crm/CRMLeadsTable.tsx
import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import {
  Edit as EditIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowRight as ChevronRightIcon,
  ArrowBack as ArrowLeftIcon,
  ArrowForward as ArrowRightIcon,
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
  onMoveColumnLeft: (columnId: string) => void;
  onMoveColumnRight: (columnId: string) => void;
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
  onMoveColumnLeft,
  onMoveColumnRight,
}) => {
  // Filter to only show visible columns
  const displayColumns = visibleColumns.filter(col => col.visible);
  const { stages, getLabel } = usePipelineConfigContext();

  const [orderBy, setOrderBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<SortDirection>('desc');
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedLeadForStatus, setSelectedLeadForStatus] = useState<Lead | null>(null);
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set());

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

  // Check if all leads are selected
  const allSelected = leads.length > 0 && selectedLeadIds.length === leads.length;
  const someSelected = selectedLeadIds.length > 0 && selectedLeadIds.length < leads.length;

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

  // Get company names sorted by number of leads (descending) then alphabetically
  const sortedCompanies = useMemo(() => {
    return Object.keys(groupedLeads).sort((a, b) => {
      const countDiff = groupedLeads[b].length - groupedLeads[a].length;
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });
  }, [groupedLeads]);

  // Render cell content based on column id
  const renderCell = (columnId: string, lead: Lead) => {
    switch (columnId) {
      case 'name':
        return (
          <TableCell key={columnId} onClick={() => onLeadClick(lead)} sx={{ cursor: 'pointer' }}>
            <Typography variant="body2" sx={{ fontSize: '13px' }}>
              {lead.name || '-'}
            </Typography>
          </TableCell>
        );

      case 'email':
        return (
          <TableCell key={columnId}>
            <Typography variant="body2" sx={{ fontSize: '13px' }}>
              {lead.email || '-'}
            </Typography>
          </TableCell>
        );

      case 'company':
        return (
          <TableCell key={columnId}>
            <Typography variant="body2" sx={{ fontSize: '13px' }}>
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
                fontSize: '11px',
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
              <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.secondary' }}>-</Typography>
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
                fontSize: '11px',
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
              <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.secondary' }}>-</Typography>
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
                fontSize: '11px',
              }}
            />
          </TableCell>
        );
      }

      case 'createdAt': {
        const date = lead.createdAt instanceof Date ? lead.createdAt : new Date(lead.createdAt);
        return (
          <TableCell key={columnId}>
            <Typography variant="body2" sx={{ fontSize: '13px' }}>
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
                <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.secondary' }}>-</Typography>
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
                    fontSize: '13px',
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
              <Typography variant="body2" sx={{ fontSize: '13px' }}>
                {String(value)}
              </Typography>
            </TableCell>
          );
        }

        return <TableCell key={columnId}>-</TableCell>;
    }
  };

  return (
    <Box>
      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: '8px',
          maxHeight: 'calc(100vh - 320px)',
          overflow: 'auto',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#fafafa', borderBottom: '2px solid #e0e0e0' }}>
              {/* Checkbox column */}
              <TableCell
                padding="checkbox"
                sx={{
                  width: 48,
                  py: 1,
                  px: 1.5,
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
              {displayColumns.map((column, index) => (
                <TableCell
                  key={column.id}
                  sx={{
                    py: 1,
                    px: 1.5,
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {/* Left arrow button */}
                    <IconButton
                      size="small"
                      onClick={() => onMoveColumnLeft(column.id)}
                      disabled={index === 0}
                      sx={{
                        p: 0.25,
                        color: '#667eea',
                        '&:hover': {
                          bgcolor: 'rgba(102, 126, 234, 0.1)',
                        },
                        '&.Mui-disabled': {
                          color: '#cbd5e1',
                        },
                      }}
                    >
                      <ArrowLeftIcon fontSize="small" sx={{ fontSize: '14px' }} />
                    </IconButton>

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

                    {/* Right arrow button */}
                    <IconButton
                      size="small"
                      onClick={() => onMoveColumnRight(column.id)}
                      disabled={index === displayColumns.length - 1}
                      sx={{
                        p: 0.25,
                        color: '#667eea',
                        '&:hover': {
                          bgcolor: 'rgba(102, 126, 234, 0.1)',
                        },
                        '&.Mui-disabled': {
                          color: '#cbd5e1',
                        },
                      }}
                    >
                      <ArrowRightIcon fontSize="small" sx={{ fontSize: '14px' }} />
                    </IconButton>
                  </Box>
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
              sortedCompanies.map((companyName) => {
                const companyLeads = groupedLeads[companyName];
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
                        '&:hover': { bgcolor: '#f1f5f9' },
                        '& .MuiTableCell-root': {
                          borderBottom: '2px solid #e2e8f0',
                          py: 1.5,
                          px: 1.5,
                        },
                      }}
                    >
                      <TableCell padding="checkbox" sx={{ py: 1.5, px: 1.5 }}>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => toggleCompanyCollapse(companyName)}
                            sx={{ p: 0.5 }}
                          >
                            {isCollapsed ? <ChevronRightIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '14px' }}>
                            {companyName}
                          </Typography>
                          <Chip
                            label={`${companyLeads.length} lead${companyLeads.length > 1 ? 's' : ''}`}
                            size="small"
                            sx={{
                              height: '20px',
                              fontSize: '11px',
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
                            '&:hover': {
                              bgcolor: '#f5f5f5',
                            },
                            '& .MuiTableCell-root': {
                              borderBottom: '1px solid #e0e0e0',
                              py: 1,
                              px: 1.5,
                            },
                          }}
                        >
                          {/* Checkbox cell */}
                          <TableCell
                            padding="checkbox"
                            onClick={(e) => e.stopPropagation()}
                            sx={{ py: 1, px: 1.5, pl: 3 }}
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
                                <TableCell key={column.id} onClick={() => onLeadClick(lead)} sx={{ cursor: 'pointer', pl: 5 }}>
                                  <Typography variant="body2" sx={{ fontSize: '13px' }}>
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
