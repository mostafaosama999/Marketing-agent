// src/components/features/kanban/LeadsTable.tsx
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
  Checkbox,
  Tooltip,
  Typography,
  Menu,
  MenuItem,
  Button,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Ticket, TicketStatus, TicketPriority } from '../../../types';
import { UserProfile } from '../../../types/auth';

interface LeadsTableProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onDeleteTicket: (ticketId: string) => void;
  onUpdateStatus: (ticketId: string, status: TicketStatus) => void;
  userProfile: UserProfile | null;
}

type SortDirection = 'asc' | 'desc';
type SortableField = 'title' | 'clientName' | 'writerName' | 'status' | 'priority' | 'dueDate' | 'createdAt';

// Status color mapping matching kanban board
const getStatusColor = (status: TicketStatus): string => {
  const colors: Record<TicketStatus, string> = {
    todo: '#6c757d',
    in_progress: '#2196f3',
    internal_review: '#ff9800',
    client_review: '#9c27b0',
    done: '#4caf50',
    invoiced: '#9c27b0',
    paid: '#009688',
  };
  return colors[status] || '#6c757d';
};

// Priority icons and colors
const getPriorityConfig = (priority: TicketPriority): { color: string; icon: string } => {
  const configs: Record<TicketPriority, { color: string; icon: string }> = {
    high: { color: '#f44336', icon: '🔴' },
    medium: { color: '#ff9800', icon: '🟠' },
    low: { color: '#9e9e9e', icon: '⚪' },
  };
  return configs[priority] || configs.medium;
};

// Format date helper
const formatDate = (date: any): string => {
  if (!date) return '-';

  let dateObj: Date | null = null;

  if (date.toDate && typeof date.toDate === 'function') {
    dateObj = date.toDate();
  } else if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  }

  if (!dateObj || isNaN(dateObj.getTime())) return '-';

  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Check if date is overdue
const isOverdue = (dueDate: any): boolean => {
  if (!dueDate) return false;
  const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  return date < new Date();
};

function LeadsTable({ tickets, onTicketClick, onDeleteTicket, onUpdateStatus, userProfile }: LeadsTableProps) {
  const [orderBy, setOrderBy] = useState<SortableField>('createdAt');
  const [order, setOrder] = useState<SortDirection>('desc');
  const [selected, setSelected] = useState<string[]>([]);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedTicketForStatus, setSelectedTicketForStatus] = useState<Ticket | null>(null);

  const handleSort = (field: SortableField) => {
    const isAsc = orderBy === field && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
  };

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      let aValue: any = a[orderBy];
      let bValue: any = b[orderBy];

      // Handle dates
      if (orderBy === 'dueDate' || orderBy === 'createdAt') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      // Handle strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tickets, order, orderBy]);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(tickets.map(t => t.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (ticketId: string) => {
    setSelected(prev =>
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleStatusClick = (event: React.MouseEvent<HTMLElement>, ticket: Ticket) => {
    event.stopPropagation();
    setStatusMenuAnchor(event.currentTarget);
    setSelectedTicketForStatus(ticket);
  };

  const handleStatusChange = (newStatus: TicketStatus) => {
    if (selectedTicketForStatus) {
      onUpdateStatus(selectedTicketForStatus.id, newStatus);
    }
    setStatusMenuAnchor(null);
    setSelectedTicketForStatus(null);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selected.length} selected items?`)) {
      selected.forEach(id => onDeleteTicket(id));
      setSelected([]);
    }
  };

  const isManager = userProfile?.role === 'Manager';
  const isCEO = userProfile?.role === 'CEO';
  const canDelete = isManager || isCEO;

  const statusOptions: TicketStatus[] = ['todo', 'in_progress', 'internal_review', 'client_review', 'done'];
  if (isCEO) {
    statusOptions.push('invoiced', 'paid');
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Bulk Actions Bar */}
      {selected.length > 0 && (
        <Box sx={{
          p: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '8px 8px 0 0',
        }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {selected.length} item{selected.length !== 1 ? 's' : ''} selected
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleBulkDelete}
              disabled={!canDelete}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
              }}
            >
              Delete Selected
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => setSelected([])}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
              }}
            >
              Clear Selection
            </Button>
          </Box>
        </Box>
      )}

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          flex: 1,
          borderRadius: selected.length > 0 ? '0 0 8px 8px' : '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          overflow: 'auto',
        }}
      >
        <Table stickyHeader sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < tickets.length}
                  checked={tickets.length > 0 && selected.length === tickets.length}
                  onChange={handleSelectAll}
                  sx={{
                    color: '#667eea',
                    '&.Mui-checked': { color: '#667eea' },
                    '&.MuiCheckbox-indeterminate': { color: '#667eea' },
                  }}
                />
              </TableCell>

              <TableCell>
                <TableSortLabel
                  active={orderBy === 'title'}
                  direction={orderBy === 'title' ? order : 'asc'}
                  onClick={() => handleSort('title')}
                  sx={{
                    fontWeight: 700,
                    color: '#1e293b',
                    '&:hover': { color: '#667eea' },
                    '&.Mui-active': { color: '#667eea' },
                  }}
                >
                  Title
                </TableSortLabel>
              </TableCell>

              <TableCell>
                <TableSortLabel
                  active={orderBy === 'clientName'}
                  direction={orderBy === 'clientName' ? order : 'asc'}
                  onClick={() => handleSort('clientName')}
                  sx={{
                    fontWeight: 700,
                    color: '#1e293b',
                    '&:hover': { color: '#667eea' },
                    '&.Mui-active': { color: '#667eea' },
                  }}
                >
                  Client
                </TableSortLabel>
              </TableCell>

              <TableCell>
                <TableSortLabel
                  active={orderBy === 'writerName'}
                  direction={orderBy === 'writerName' ? order : 'asc'}
                  onClick={() => handleSort('writerName')}
                  sx={{
                    fontWeight: 700,
                    color: '#1e293b',
                    '&:hover': { color: '#667eea' },
                    '&.Mui-active': { color: '#667eea' },
                  }}
                >
                  Assigned To
                </TableSortLabel>
              </TableCell>

              <TableCell>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleSort('status')}
                  sx={{
                    fontWeight: 700,
                    color: '#1e293b',
                    '&:hover': { color: '#667eea' },
                    '&.Mui-active': { color: '#667eea' },
                  }}
                >
                  Status
                </TableSortLabel>
              </TableCell>

              <TableCell>
                <TableSortLabel
                  active={orderBy === 'priority'}
                  direction={orderBy === 'priority' ? order : 'asc'}
                  onClick={() => handleSort('priority')}
                  sx={{
                    fontWeight: 700,
                    color: '#1e293b',
                    '&:hover': { color: '#667eea' },
                    '&.Mui-active': { color: '#667eea' },
                  }}
                >
                  Priority
                </TableSortLabel>
              </TableCell>

              <TableCell>
                <TableSortLabel
                  active={orderBy === 'dueDate'}
                  direction={orderBy === 'dueDate' ? order : 'asc'}
                  onClick={() => handleSort('dueDate')}
                  sx={{
                    fontWeight: 700,
                    color: '#1e293b',
                    '&:hover': { color: '#667eea' },
                    '&.Mui-active': { color: '#667eea' },
                  }}
                >
                  Due Date
                </TableSortLabel>
              </TableCell>

              <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {sortedTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <Typography variant="body1" color="text.secondary">
                    No items found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedTickets.map((ticket) => {
                const isSelected = selected.includes(ticket.id);
                const priorityConfig = getPriorityConfig(ticket.priority);
                const overdue = isOverdue(ticket.dueDate);

                return (
                  <TableRow
                    key={ticket.id}
                    hover
                    selected={isSelected}
                    onClick={() => onTicketClick(ticket)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(103, 126, 234, 0.04)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(103, 126, 234, 0.08)',
                        '&:hover': {
                          backgroundColor: 'rgba(103, 126, 234, 0.12)',
                        },
                      },
                    }}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectOne(ticket.id)}
                        sx={{
                          color: '#667eea',
                          '&.Mui-checked': { color: '#667eea' },
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: '#1e293b',
                        }}
                      >
                        {ticket.title}
                      </Typography>
                      {ticket.type && (
                        <Chip
                          label={ticket.type}
                          size="small"
                          sx={{
                            mt: 0.5,
                            height: '20px',
                            fontSize: '11px',
                            bgcolor: 'rgba(103, 126, 234, 0.1)',
                            color: '#667eea',
                          }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {ticket.clientName || '-'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {ticket.writerName || '-'}
                      </Typography>
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Chip
                        label={ticket.status.replace('_', ' ').toUpperCase()}
                        size="small"
                        onClick={(e) => handleStatusClick(e, ticket)}
                        sx={{
                          bgcolor: getStatusColor(ticket.status),
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '11px',
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 0.9,
                          },
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span>{priorityConfig.icon}</span>
                        <Typography
                          variant="body2"
                          sx={{
                            color: priorityConfig.color,
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        >
                          {ticket.priority}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          color: overdue ? '#f44336' : 'text.secondary',
                          fontWeight: overdue ? 600 : 400,
                        }}
                      >
                        {formatDate(ticket.dueDate)}
                        {overdue && ' ⚠️'}
                      </Typography>
                    </TableCell>

                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => onTicketClick(ticket)}
                            sx={{
                              color: '#667eea',
                              '&:hover': { bgcolor: 'rgba(103, 126, 234, 0.1)' },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {canDelete && (
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Delete this item?')) {
                                  onDeleteTicket(ticket.id);
                                }
                              }}
                              sx={{
                                color: '#f44336',
                                '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.1)' },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
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
        onClose={() => {
          setStatusMenuAnchor(null);
          setSelectedTicketForStatus(null);
        }}
      >
        {statusOptions.map((status) => (
          <MenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            sx={{
              color: getStatusColor(status),
              fontWeight: selectedTicketForStatus?.status === status ? 700 : 400,
            }}
          >
            {status.replace('_', ' ').toUpperCase()}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

export default LeadsTable;
