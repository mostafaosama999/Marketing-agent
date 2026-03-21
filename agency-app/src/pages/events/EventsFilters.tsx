// src/pages/events/EventsFilters.tsx
import React from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import {
  EventStatus,
  EventType,
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
} from '../../types/event';

interface EventsFiltersProps {
  search: string;
  statusFilter: EventStatus | 'all';
  typeFilter: EventType | 'all';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: EventStatus | 'all') => void;
  onTypeChange: (value: EventType | 'all') => void;
}

export const EventsFilters: React.FC<EventsFiltersProps> = ({
  search,
  statusFilter,
  typeFilter,
  onSearchChange,
  onStatusChange,
  onTypeChange,
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
          minWidth: 260,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: 'white',
            fontSize: '14px',
            '& fieldset': {
              borderColor: '#e2e8f0',
            },
            '&:hover fieldset': {
              borderColor: '#667eea',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#667eea',
            },
          },
        }}
      />

      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel
          sx={{
            fontSize: '14px',
            '&.Mui-focused': { color: '#667eea' },
          }}
        >
          Status
        </InputLabel>
        <Select
          value={statusFilter}
          label="Status"
          onChange={(e) => onStatusChange(e.target.value as EventStatus | 'all')}
          sx={{
            borderRadius: 2,
            bgcolor: 'white',
            fontSize: '14px',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#e2e8f0',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
            },
          }}
        >
          <MenuItem value="all">All Statuses</MenuItem>
          {(Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map((status) => (
            <MenuItem key={status} value={status}>
              {EVENT_STATUS_LABELS[status]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel
          sx={{
            fontSize: '14px',
            '&.Mui-focused': { color: '#667eea' },
          }}
        >
          Type
        </InputLabel>
        <Select
          value={typeFilter}
          label="Type"
          onChange={(e) => onTypeChange(e.target.value as EventType | 'all')}
          sx={{
            borderRadius: 2,
            bgcolor: 'white',
            fontSize: '14px',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#e2e8f0',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
            },
          }}
        >
          <MenuItem value="all">All Types</MenuItem>
          {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
            <MenuItem key={type} value={type}>
              {EVENT_TYPE_LABELS[type]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
