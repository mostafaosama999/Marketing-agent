// src/components/features/crm/filters/StatusFilter.tsx
import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  SelectChangeEvent,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material';
import { LeadStatus } from '../../../../types/lead';

interface StatusFilterProps {
  selectedStatuses: LeadStatus[];
  onStatusesChange: (statuses: LeadStatus[]) => void;
}

// Status configuration matching CRMBoard LEAD_COLUMNS
const STATUS_CONFIG: Record<LeadStatus, { label: string; icon: string; color: string }> = {
  new_lead: {
    label: 'New Lead',
    icon: '📋',
    color: '#6c757d',
  },
  qualified: {
    label: 'Qualified',
    icon: '🎯',
    color: '#ff9800',
  },
  contacted: {
    label: 'Contacted',
    icon: '📞',
    color: '#2196f3',
  },
  follow_up: {
    label: 'Follow up',
    icon: '🔄',
    color: '#9c27b0',
  },
  won: {
    label: 'Won',
    icon: '✅',
    color: '#4caf50',
  },
  lost: {
    label: 'Lost',
    icon: '❌',
    color: '#607d8b',
  },
};

const ALL_STATUSES: LeadStatus[] = ['new_lead', 'qualified', 'contacted', 'follow_up', 'won', 'lost'];

export const StatusFilter: React.FC<StatusFilterProps> = ({
  selectedStatuses,
  onStatusesChange,
}) => {
  const handleChange = (event: SelectChangeEvent<typeof selectedStatuses>) => {
    const value = event.target.value;
    // Handle "Select All" / "Deselect All"
    if (typeof value === 'string') {
      onStatusesChange([]);
      return;
    }
    onStatusesChange(value as LeadStatus[]);
  };

  const handleSelectAll = () => {
    if (selectedStatuses.length === ALL_STATUSES.length) {
      onStatusesChange([]);
    } else {
      onStatusesChange([...ALL_STATUSES]);
    }
  };

  const isAllSelected = selectedStatuses.length === ALL_STATUSES.length;
  const isNoneSelected = selectedStatuses.length === 0;

  return (
    <Box sx={{ minWidth: 200 }}>
      <FormControl fullWidth size="small">
        <InputLabel>Filter by Status</InputLabel>
        <Select
          multiple
          value={selectedStatuses}
          onChange={handleChange}
          input={<OutlinedInput label="Filter by Status" />}
          renderValue={(selected) => {
            if (isNoneSelected || isAllSelected) {
              return (
                <Typography variant="body2" color="text.secondary">
                  All Statuses
                </Typography>
              );
            }
            return (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.slice(0, 2).map((status) => (
                  <Chip
                    key={status}
                    label={STATUS_CONFIG[status].icon + ' ' + STATUS_CONFIG[status].label}
                    size="small"
                    sx={{
                      height: '20px',
                      fontSize: '11px',
                      bgcolor: STATUS_CONFIG[status].color,
                      color: 'white',
                    }}
                  />
                ))}
                {selected.length > 2 && (
                  <Typography variant="caption" sx={{ alignSelf: 'center', ml: 0.5 }}>
                    +{selected.length - 2} more
                  </Typography>
                )}
              </Box>
            );
          }}
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: 400,
              },
            },
          }}
          sx={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
            },
          }}
        >
          {/* Select All / Deselect All option */}
          <MenuItem
            onClick={handleSelectAll}
            sx={{
              borderBottom: '1px solid #e2e8f0',
              fontWeight: 600,
              color: '#667eea',
            }}
          >
            <Checkbox
              checked={isAllSelected}
              indeterminate={!isAllSelected && !isNoneSelected}
              sx={{
                color: '#667eea',
                '&.Mui-checked': { color: '#667eea' },
                '&.MuiCheckbox-indeterminate': { color: '#667eea' },
              }}
            />
            <ListItemText
              primary={isAllSelected ? 'Deselect All' : 'Select All'}
              primaryTypographyProps={{ fontWeight: 600 }}
            />
          </MenuItem>

          {/* Individual status options */}
          {ALL_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              <Checkbox
                checked={selectedStatuses.indexOf(status) > -1}
                sx={{
                  color: STATUS_CONFIG[status].color,
                  '&.Mui-checked': { color: STATUS_CONFIG[status].color },
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: STATUS_CONFIG[status].color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                  }}
                >
                  {STATUS_CONFIG[status].icon}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {STATUS_CONFIG[status].label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                    {status.replace('_', ' ')}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
