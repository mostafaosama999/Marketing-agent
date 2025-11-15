// src/components/features/crm/filters/ActiveFiltersBar.tsx
import React from 'react';
import { Box, Chip } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { LeadStatus } from '../../../../types/lead';

interface ActiveFiltersBarProps {
  search: string;
  statuses?: LeadStatus[];
  owner?: string;
  company?: string;
  month?: string;
  industry?: string;
  employeeRange?: string;
  fundingStage?: string;
  onRemoveSearch: () => void;
  onRemoveStatus?: (status: LeadStatus) => void;
  onRemoveOwner?: () => void;
  onRemoveCompany?: () => void;
  onRemoveMonth?: () => void;
  onRemoveIndustry?: () => void;
  onRemoveEmployeeRange?: () => void;
  onRemoveFundingStage?: () => void;
  onClearAll: () => void;
}

// Status labels matching StatusFilter
const STATUS_LABELS: Record<LeadStatus, string> = {
  new_lead: 'New Lead',
  qualified: 'Qualified',
  contacted: 'Contacted',
  follow_up: 'Follow up',
  nurture: 'Nurture',
  won: 'Won',
  lost: 'Refused',
};

export const ActiveFiltersBar: React.FC<ActiveFiltersBarProps> = ({
  search,
  statuses = [],
  owner,
  company,
  month,
  industry,
  employeeRange,
  fundingStage,
  onRemoveSearch,
  onRemoveStatus,
  onRemoveOwner,
  onRemoveCompany,
  onRemoveMonth,
  onRemoveIndustry,
  onRemoveEmployeeRange,
  onRemoveFundingStage,
  onClearAll,
}) => {
  // Calculate total active filters
  const activeFilterCount =
    (search ? 1 : 0) +
    statuses.length +
    (owner ? 1 : 0) +
    (company ? 1 : 0) +
    (month ? 1 : 0) +
    (industry ? 1 : 0) +
    (employeeRange ? 1 : 0) +
    (fundingStage ? 1 : 0);

  // Don't render if no active filters
  if (activeFilterCount === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
      }}
    >

      {/* Search filter chip */}
      {search && (
        <Chip
          label={`Search: "${search}"`}
          size="small"
          onDelete={onRemoveSearch}
          deleteIcon={<CloseIcon />}
          sx={{
            bgcolor: 'white',
            border: '1px solid #e2e8f0',
            '& .MuiChip-deleteIcon': {
              color: '#64748b',
              '&:hover': {
                color: '#f44336',
              },
            },
          }}
        />
      )}

      {/* Status filter chips */}
      {statuses.map((status) => (
        <Chip
          key={status}
          label={`Status: ${STATUS_LABELS[status]}`}
          size="small"
          onDelete={onRemoveStatus ? () => onRemoveStatus(status) : undefined}
          deleteIcon={<CloseIcon />}
          sx={{
            bgcolor: 'white',
            border: '1px solid #e2e8f0',
            '& .MuiChip-deleteIcon': {
              color: '#64748b',
              '&:hover': {
                color: '#f44336',
              },
            },
          }}
        />
      ))}

      {/* Owner filter chip */}
      {owner && (
        <Chip
          label={`Owner: ${owner}`}
          size="small"
          onDelete={onRemoveOwner}
          deleteIcon={<CloseIcon />}
          sx={{
            bgcolor: 'white',
            border: '1px solid #e2e8f0',
            '& .MuiChip-deleteIcon': {
              color: '#64748b',
              '&:hover': {
                color: '#f44336',
              },
            },
          }}
        />
      )}

      {/* Company filter chip */}
      {company && (
        <Chip
          label={`Company: ${company}`}
          size="small"
          onDelete={onRemoveCompany}
          deleteIcon={<CloseIcon />}
          sx={{
            bgcolor: 'white',
            border: '1px solid #e2e8f0',
            '& .MuiChip-deleteIcon': {
              color: '#64748b',
              '&:hover': {
                color: '#f44336',
              },
            },
          }}
        />
      )}

      {/* Month filter chip */}
      {month && onRemoveMonth && (
        <Chip
          label={`Month: ${month}`}
          size="small"
          onDelete={onRemoveMonth}
          deleteIcon={<CloseIcon />}
          sx={{
            bgcolor: 'white',
            border: '1px solid #e2e8f0',
            '& .MuiChip-deleteIcon': {
              color: '#64748b',
              '&:hover': {
                color: '#f44336',
              },
            },
          }}
        />
      )}

      {/* Industry filter chip (for companies) */}
      {industry && onRemoveIndustry && (
        <Chip
          label={`Industry: ${industry}`}
          size="small"
          onDelete={onRemoveIndustry}
          deleteIcon={<CloseIcon />}
          sx={{
            bgcolor: 'white',
            border: '1px solid #e2e8f0',
            '& .MuiChip-deleteIcon': {
              color: '#64748b',
              '&:hover': {
                color: '#f44336',
              },
            },
          }}
        />
      )}

      {/* Employee Range filter chip (for companies) */}
      {employeeRange && onRemoveEmployeeRange && (
        <Chip
          label={`Employees: ${employeeRange}`}
          size="small"
          onDelete={onRemoveEmployeeRange}
          deleteIcon={<CloseIcon />}
          sx={{
            bgcolor: 'white',
            border: '1px solid #e2e8f0',
            '& .MuiChip-deleteIcon': {
              color: '#64748b',
              '&:hover': {
                color: '#f44336',
              },
            },
          }}
        />
      )}

      {/* Funding Stage filter chip (for companies) */}
      {fundingStage && onRemoveFundingStage && (
        <Chip
          label={`Funding: ${fundingStage}`}
          size="small"
          onDelete={onRemoveFundingStage}
          deleteIcon={<CloseIcon />}
          sx={{
            bgcolor: 'white',
            border: '1px solid #e2e8f0',
            '& .MuiChip-deleteIcon': {
              color: '#64748b',
              '&:hover': {
                color: '#f44336',
              },
            },
          }}
        />
      )}

    </Box>
  );
};
