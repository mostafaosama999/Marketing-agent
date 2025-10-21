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
  Button,
  Checkbox,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  ViewColumn as ViewColumnIcon,
  ArrowBack as ArrowLeftIcon,
  ArrowForward as ArrowRightIcon,
} from '@mui/icons-material';
import { Lead, LeadStatus } from '../../../types/lead';
import { usePipelineConfigContext } from '../../../contexts/PipelineConfigContext';

interface CRMLeadsTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  columnVisibility: Record<string, boolean>;
  onToggleColumnVisibility: (columnId: string) => void;
}

type SortDirection = 'asc' | 'desc';
type SortableField = 'name' | 'email' | 'company' | 'phone' | 'status' | 'createdAt';

// Column configuration
interface ColumnConfig {
  id: string;
  label: string;
  field: SortableField | 'actions';
  visible: boolean;
  required: boolean; // Can't be hidden
  sortable: boolean;
  order: number; // Position in table
}

const getDefaultColumns = (): ColumnConfig[] => [
  { id: 'name', label: 'Name', field: 'name', visible: true, required: true, sortable: true, order: 0 },
  { id: 'email', label: 'Email', field: 'email', visible: true, required: false, sortable: true, order: 1 },
  { id: 'phone', label: 'Phone', field: 'phone', visible: true, required: false, sortable: true, order: 2 },
  { id: 'company', label: 'Company', field: 'company', visible: true, required: false, sortable: true, order: 3 },
  { id: 'status', label: 'Status', field: 'status', visible: true, required: false, sortable: true, order: 4 },
  { id: 'created', label: 'Created', field: 'createdAt', visible: true, required: false, sortable: true, order: 5 },
  { id: 'actions', label: 'Actions', field: 'actions', visible: true, required: true, sortable: false, order: 6 },
];

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

// Format date helper
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const CRMLeadsTable: React.FC<CRMLeadsTableProps> = ({
  leads,
  onLeadClick,
  onDeleteLead,
  onUpdateStatus,
  columnVisibility,
  onToggleColumnVisibility,
}) => {
  const { stages, getLabel } = usePipelineConfigContext();
  const [orderBy, setOrderBy] = useState<SortableField>('createdAt');
  const [order, setOrder] = useState<SortDirection>('desc');
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedLeadForStatus, setSelectedLeadForStatus] = useState<Lead | null>(null);

  // Column order and visibility state
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('crmTableColumnOrder');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved column order:', e);
      }
    }
    return getDefaultColumns();
  });

  // Sorting handler
  const handleRequestSort = (property: SortableField) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
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

  // Column reordering
  const moveColumn = (columnId: string, direction: 'left' | 'right') => {
    const visibleColumns = columns.filter((c) => columnVisibility[c.id]);
    const currentIndex = visibleColumns.findIndex((c) => c.id === columnId);

    if (currentIndex === -1) return;

    // Check bounds
    if (direction === 'left' && currentIndex === 0) return;
    if (direction === 'right' && currentIndex === visibleColumns.length - 1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

    // Swap positions in the full columns array
    const fullCurrentIndex = columns.findIndex((c) => c.id === columnId);
    const fullTargetIndex = columns.findIndex((c) => c.id === visibleColumns[newIndex].id);

    const newColumns = [...columns];
    [newColumns[fullCurrentIndex], newColumns[fullTargetIndex]] = [
      newColumns[fullTargetIndex],
      newColumns[fullCurrentIndex],
    ];

    // Recalculate order values
    const reorderedColumns = newColumns.map((col, index) => ({
      ...col,
      order: index,
    }));

    setColumns(reorderedColumns);
    localStorage.setItem('crmTableColumnOrder', JSON.stringify(reorderedColumns));
  };

  // Sort leads (filtering is now handled by parent CRMBoard component)
  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let aValue: any = a[orderBy];
      let bValue: any = b[orderBy];

      // Handle date comparison
      if (orderBy === 'createdAt') {
        aValue = a.createdAt.getTime();
        bValue = b.createdAt.getTime();
      }

      // Handle string comparison
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [leads, orderBy, order]);

  return (
    <Box>
      {/* Table */}
      <TableContainer component={Paper} sx={{ maxHeight: '100%' }}>
        <Table>
          <TableHead>
            <TableRow>
              {columns
                .filter((column) => columnVisibility[column.id])
                .sort((a, b) => a.order - b.order)
                .map((column, index, visibleColumns) => (
                  <TableCell key={column.id} align={column.id === 'actions' ? 'right' : 'left'}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: column.id === 'actions' ? 'flex-end' : 'flex-start' }}>
                      {column.sortable ? (
                        <TableSortLabel
                          active={orderBy === column.field}
                          direction={orderBy === column.field ? order : 'asc'}
                          onClick={() => handleRequestSort(column.field as SortableField)}
                        >
                          {column.label}
                        </TableSortLabel>
                      ) : (
                        <Typography variant="body2" fontWeight={600}>
                          {column.label}
                        </Typography>
                      )}

                      {/* Column reordering arrows */}
                      {!column.required && (
                        <Box sx={{ display: 'flex', gap: 0.25 }}>
                          <IconButton
                            size="small"
                            disabled={index === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveColumn(column.id, 'left');
                            }}
                            sx={{
                              padding: '2px',
                              opacity: index === 0 ? 0.3 : 0.6,
                              '&:hover': { opacity: 1 },
                            }}
                          >
                            <ArrowLeftIcon sx={{ fontSize: 16, color: '#64748b' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            disabled={index === visibleColumns.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveColumn(column.id, 'right');
                            }}
                            sx={{
                              padding: '2px',
                              opacity: index === visibleColumns.length - 1 ? 0.3 : 0.6,
                              '&:hover': { opacity: 1 },
                            }}
                          >
                            <ArrowRightIcon sx={{ fontSize: 16, color: '#64748b' }} />
                          </IconButton>
                        </Box>
                      )}

                      {/* Visibility toggle */}
                      {!column.required && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleColumnVisibility(column.id);
                          }}
                          sx={{
                            ml: 0.5,
                            opacity: 0.6,
                            transition: 'opacity 0.2s',
                            '&:hover': {
                              opacity: 1,
                            },
                          }}
                        >
                          <VisibilityIcon sx={{ fontSize: 18, color: '#64748b' }} />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Object.values(columnVisibility).filter((v) => v).length} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No leads found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  hover
                  onClick={() => onLeadClick(lead)}
                  sx={{ cursor: 'pointer' }}
                >
                  {columnVisibility.name && (
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {lead.name}
                      </Typography>
                    </TableCell>
                  )}
                  {columnVisibility.email && <TableCell>{lead.email}</TableCell>}
                  {columnVisibility.phone && <TableCell>{lead.phone}</TableCell>}
                  {columnVisibility.company && <TableCell>{lead.company}</TableCell>}
                  {columnVisibility.status && (
                    <TableCell>
                      <Chip
                        label={getLabel(lead.status)}
                        size="small"
                        onClick={(e) => handleStatusClick(e, lead)}
                        sx={{
                          bgcolor: `${getStatusColor(lead.status)}22`,
                          color: getStatusColor(lead.status),
                          fontWeight: 500,
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: `${getStatusColor(lead.status)}33`,
                          },
                        }}
                      />
                    </TableCell>
                  )}
                  {columnVisibility.created && <TableCell>{formatDate(lead.createdAt)}</TableCell>}
                  {columnVisibility.actions && (
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLeadClick(lead);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLead(lead.id);
                        }}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
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
