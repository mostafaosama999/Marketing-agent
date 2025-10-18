import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  TableSortLabel,
  Box,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Lead, PipelineStage } from '../../../app/types/crm';

interface TableViewProps {
  leads: Lead[];
  stages: PipelineStage[];
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
}

type SortField = 'name' | 'email' | 'company' | 'phone' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export const TableView: React.FC<TableViewProps> = ({ leads, stages, onEditLead, onDeleteLead }) => {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStageConfig = (status: string) => {
    return stages.find((s) => s.label === status);
  };

  const sortedLeads = [...leads].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'createdAt') {
      aValue = a.createdAt.getTime();
      bValue = b.createdAt.getTime();
    } else {
      aValue = (aValue || '').toString().toLowerCase();
      bValue = (bValue || '').toString().toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={sortField === 'name'}
                direction={sortField === 'name' ? sortDirection : 'asc'}
                onClick={() => handleSort('name')}
              >
                Name
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'email'}
                direction={sortField === 'email' ? sortDirection : 'asc'}
                onClick={() => handleSort('email')}
              >
                Email
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'company'}
                direction={sortField === 'company' ? sortDirection : 'asc'}
                onClick={() => handleSort('company')}
              >
                Company
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'phone'}
                direction={sortField === 'phone' ? sortDirection : 'asc'}
                onClick={() => handleSort('phone')}
              >
                Phone
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'status'}
                direction={sortField === 'status' ? sortDirection : 'asc'}
                onClick={() => handleSort('status')}
              >
                Status
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'createdAt'}
                direction={sortField === 'createdAt' ? sortDirection : 'asc'}
                onClick={() => handleSort('createdAt')}
              >
                Created
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedLeads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                No leads found
              </TableCell>
            </TableRow>
          ) : (
            sortedLeads.map((lead) => {
              const statusConfig = getStageConfig(lead.status);
              return (
                <TableRow key={lead.id} hover sx={{ cursor: 'pointer' }} onClick={() => onEditLead(lead)}>
                  <TableCell>{lead.name}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.company}</TableCell>
                  <TableCell>{lead.phone || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={statusConfig?.label || lead.status}
                      size="small"
                      sx={{
                        backgroundColor: statusConfig?.color || '#9e9e9e',
                        color: 'white',
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell>{formatDate(lead.createdAt)}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditLead(lead);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete ${lead.name}?`)) {
                            onDeleteLead(lead.id);
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
