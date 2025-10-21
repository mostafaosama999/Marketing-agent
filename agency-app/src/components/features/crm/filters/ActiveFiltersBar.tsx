// src/components/features/crm/filters/ActiveFiltersBar.tsx
import React from 'react';
import { Box, Chip, Button, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { LeadStatus } from '../../../../types/lead';

interface ActiveFiltersBarProps {
  search: string;
  statuses: LeadStatus[];
  owner: string;
  company: string;
  month: string;
  onRemoveSearch: () => void;
  onRemoveStatus: (status: LeadStatus) => void;
  onRemoveOwner: () => void;
  onRemoveCompany: () => void;
  onRemoveMonth: () => void;
  onClearAll: () => void;
}

// Status labels matching StatusFilter
const STATUS_LABELS: Record<LeadStatus, string> = {
  new_lead: 'New Lead',
  qualified: 'Qualified',
  contacted: 'Contacted',
  follow_up: 'Follow up',
  won: 'Won',
  lost: 'Lost',
};

export const ActiveFiltersBar: React.FC<ActiveFiltersBarProps> = ({
  search,
  statuses,
  owner,
  company,
  month,
  onRemoveSearch,
  onRemoveStatus,
  onRemoveOwner,
  onRemoveCompany,
  onRemoveMonth,
  onClearAll,
}) => {
  // Calculate total active filters
  const activeFilterCount =
    (search ? 1 : 0) +
    statuses.length +
    (owner ? 1 : 0) +
    (company ? 1 : 0) +
    (month ? 1 : 0);

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
        mt: 1.5,
        py: 1,
        px: 2,
        bgcolor: 'rgba(103, 126, 234, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(103, 126, 234, 0.15)',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: '#667eea',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Active Filters ({activeFilterCount}):
      </Typography>

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
          onDelete={() => onRemoveStatus(status)}
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
      {month && (
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

      {/* Clear all button */}
      <Button
        size="small"
        onClick={onClearAll}
        sx={{
          ml: 'auto',
          textTransform: 'none',
          fontSize: '12px',
          color: '#f44336',
          fontWeight: 600,
          '&:hover': {
            bgcolor: 'rgba(244, 67, 54, 0.08)',
          },
        }}
      >
        Clear All
      </Button>
    </Box>
  );
};
