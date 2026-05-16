// src/pages/events/EventsFilters.tsx
import React from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  InputLabel,
  InputAdornment,
  Checkbox,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import {
  EventStatus,
  EventType,
  EventCategory,
  EducationalTier,
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  EDUCATIONAL_TIER_LABELS,
} from '../../types/event';

const MONTH_LABELS: Record<number, string> = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December',
};

interface EventsFiltersProps {
  search: string;
  statusFilter: EventStatus | 'all';
  typeFilter: EventType | 'all';
  monthFilter: number | 'all';
  hideNoIcp: boolean;
  showPastEvents: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: EventStatus | 'all') => void;
  onTypeChange: (value: EventType | 'all') => void;
  onMonthChange: (value: number | 'all') => void;
  onHideNoIcpChange: (value: boolean) => void;
  onShowPastEventsChange: (value: boolean) => void;
  // Educational-specific
  category?: EventCategory;
  tierFilter?: EducationalTier | 'all';
  onTierChange?: (value: EducationalTier | 'all') => void;
}

const selectSx = {
  borderRadius: 2,
  bgcolor: 'white',
  fontSize: '14px',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
};

const inputLabelSx = {
  fontSize: '14px',
  '&.Mui-focused': { color: '#667eea' },
};


export const EventsFilters: React.FC<EventsFiltersProps> = ({
  search,
  statusFilter,
  typeFilter,
  monthFilter,
  hideNoIcp,
  showPastEvents,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onMonthChange,
  onHideNoIcpChange,
  onShowPastEventsChange,
  category,
  tierFilter,
  onTierChange,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <TextField
        size="small"
        placeholder="Search events..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
        sx={{
          minWidth: 220,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: 'white',
            fontSize: '14px',
            '& fieldset': { borderColor: '#e2e8f0' },
            '&:hover fieldset': { borderColor: '#667eea' },
            '&.Mui-focused fieldset': { borderColor: '#667eea' },
          },
        }}
      />

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel sx={inputLabelSx}>Status</InputLabel>
        <Select
          value={statusFilter}
          label="Status"
          onChange={(e) => onStatusChange(e.target.value as EventStatus | 'all')}
          sx={selectSx}
        >
          <MenuItem value="all">All Statuses</MenuItem>
          {(Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map((status) => (
            <MenuItem key={status} value={status}>
              {EVENT_STATUS_LABELS[status]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel sx={inputLabelSx}>Type</InputLabel>
        <Select
          value={typeFilter}
          label="Type"
          onChange={(e) => onTypeChange(e.target.value as EventType | 'all')}
          sx={selectSx}
        >
          <MenuItem value="all">All Types</MenuItem>
          {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
            <MenuItem key={type} value={type}>
              {EVENT_TYPE_LABELS[type]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel sx={inputLabelSx}>Month</InputLabel>
        <Select
          value={monthFilter}
          label="Month"
          onChange={(e) => {
            const val = e.target.value;
            onMonthChange(val === 'all' ? 'all' : Number(val));
          }}
          sx={selectSx}
        >
          <MenuItem value="all">All Months</MenuItem>
          {Object.entries(MONTH_LABELS).map(([num, label]) => (
            <MenuItem key={num} value={Number(num)}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {category === 'client' && (
        <FormControlLabel
          control={
            <Checkbox
              checked={hideNoIcp}
              onChange={(e) => onHideNoIcpChange(e.target.checked)}
              size="small"
              sx={{
                color: '#94a3b8',
                '&.Mui-checked': { color: '#667eea' },
              }}
            />
          }
          label="Has ICP Companies"
          sx={{
            ml: 0,
            '& .MuiFormControlLabel-label': {
              fontSize: '14px',
              color: '#64748b',
              whiteSpace: 'nowrap',
            },
          }}
        />
      )}

      <FormControlLabel
        control={
          <Checkbox
            checked={showPastEvents}
            onChange={(e) => onShowPastEventsChange(e.target.checked)}
            size="small"
            sx={{
              color: '#94a3b8',
              '&.Mui-checked': { color: '#667eea' },
            }}
          />
        }
        label="Show past events"
        sx={{
          ml: 0,
          '& .MuiFormControlLabel-label': {
            fontSize: '14px',
            color: '#64748b',
            whiteSpace: 'nowrap',
          },
        }}
      />

      {category === 'educational' && onTierChange && (
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel sx={inputLabelSx}>Tier</InputLabel>
          <Select
            value={tierFilter ?? 'all'}
            label="Tier"
            onChange={(e) => onTierChange(e.target.value as EducationalTier | 'all')}
            sx={selectSx}
          >
            <MenuItem value="all">All Tiers</MenuItem>
            {(Object.keys(EDUCATIONAL_TIER_LABELS) as EducationalTier[]).map((tier) => (
              <MenuItem key={tier} value={tier}>
                {EDUCATIONAL_TIER_LABELS[tier]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

    </Box>
  );
};
