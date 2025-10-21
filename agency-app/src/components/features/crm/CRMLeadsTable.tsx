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
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { Lead, LeadStatus } from '../../../types/lead';
import { LEAD_STATUS_TO_LABEL } from '../../../types/crm';

interface CRMLeadsTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
}

type SortDirection = 'asc' | 'desc';
type SortableField = 'name' | 'email' | 'company' | 'phone' | 'status' | 'createdAt';

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
}) => {
  const [orderBy, setOrderBy] = useState<SortableField>('createdAt');
  const [order, setOrder] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedLeadForStatus, setSelectedLeadForStatus] = useState<Lead | null>(null);

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

  // Filter and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = leads;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = leads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(searchLower) ||
          lead.email.toLowerCase().includes(searchLower) ||
          lead.company.toLowerCase().includes(searchLower) ||
          lead.phone.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
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
  }, [leads, orderBy, order, searchTerm]);

  return (
    <Box>
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search leads by name, email, company, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'email'}
                  direction={orderBy === 'email' ? order : 'asc'}
                  onClick={() => handleRequestSort('email')}
                >
                  Email
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'phone'}
                  direction={orderBy === 'phone' ? order : 'asc'}
                  onClick={() => handleRequestSort('phone')}
                >
                  Phone
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'company'}
                  direction={orderBy === 'company' ? order : 'asc'}
                  onClick={() => handleRequestSort('company')}
                >
                  Company
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleRequestSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'createdAt'}
                  direction={orderBy === 'createdAt' ? order : 'asc'}
                  onClick={() => handleRequestSort('createdAt')}
                >
                  Created
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm ? 'No leads found matching your search' : 'No leads yet'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  hover
                  onClick={() => onLeadClick(lead)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {lead.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>{lead.company}</TableCell>
                  <TableCell>
                    <Chip
                      label={LEAD_STATUS_TO_LABEL[lead.status]}
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
                  <TableCell>{formatDate(lead.createdAt)}</TableCell>
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
        {Object.entries(LEAD_STATUS_TO_LABEL).map(([status, label]) => (
          <MenuItem
            key={status}
            onClick={() => handleStatusChange(status as LeadStatus)}
            selected={selectedLeadForStatus?.status === status}
          >
            <Chip
              label={label}
              size="small"
              sx={{
                bgcolor: `${getStatusColor(status as LeadStatus)}22`,
                color: getStatusColor(status as LeadStatus),
                fontWeight: 500,
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};
