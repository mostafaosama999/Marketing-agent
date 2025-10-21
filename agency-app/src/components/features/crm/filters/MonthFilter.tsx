// src/components/features/crm/filters/MonthFilter.tsx
import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  SelectChangeEvent
} from '@mui/material';
import { Lead } from '../../../../types/lead';

interface MonthFilterProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  leads: Lead[];
}

export const MonthFilter: React.FC<MonthFilterProps> = ({
  selectedMonth,
  onMonthChange,
  leads,
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onMonthChange(event.target.value);
  };

  // Helper to get the most recent update date from stateHistory or updatedAt
  const getLastUpdateDate = (lead: Lead): Date | null => {
    // First, try to get the most recent timestamp from stateHistory
    if (lead.stateHistory) {
      const timestamps = Object.values(lead.stateHistory)
        .filter((timestamp): timestamp is string => timestamp !== undefined && timestamp !== null)
        .map(ts => new Date(ts))
        .filter(date => !isNaN(date.getTime()));

      if (timestamps.length > 0) {
        return new Date(Math.max(...timestamps.map(d => d.getTime())));
      }
    }

    // Fallback to updatedAt if available
    if (lead.updatedAt) {
      if (lead.updatedAt instanceof Date) {
        return lead.updatedAt;
      }
      if (typeof lead.updatedAt === 'string') {
        return new Date(lead.updatedAt);
      }
    }

    return null;
  };

  // Get the range of available months based on actual lead data
  const getAvailableMonthRange = (leads: Lead[]) => {
    if (!leads.length) return { earliest: null, latest: null };

    const dates = leads
      .map(lead => getLastUpdateDate(lead))
      .filter((date): date is Date => date !== null && !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (!dates.length) return { earliest: null, latest: null };

    return {
      earliest: dates[0],
      latest: new Date() // Current date as latest
    };
  };

  // Generate month options based on available data
  const generateMonthOptions = () => {
    const { earliest, latest } = getAvailableMonthRange(leads);

    if (!earliest || !latest) {
      return [];
    }

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const options = [];

    const startDate = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const endDate = new Date(latest.getFullYear(), latest.getMonth(), 1);

    let currentDate = new Date(endDate); // Start from latest and go backwards

    while (currentDate >= startDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const label = `${months[currentDate.getMonth()]} ${year}`;

      options.push({ value, label });

      // Move to previous month
      currentDate.setMonth(currentDate.getMonth() - 1);
    }

    return options;
  };

  const monthOptions = generateMonthOptions();
  const selectedMonthLabel = monthOptions.find(opt => opt.value === selectedMonth)?.label || 'All Months';

  return (
    <Box sx={{ minWidth: 180 }}>
      <FormControl fullWidth size="small">
        <InputLabel>Filter by Month</InputLabel>
        <Select
          value={selectedMonth}
          label="Filter by Month"
          onChange={handleChange}
          renderValue={(value) => {
            if (!value) return 'All Months';
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">{selectedMonthLabel}</Typography>
              </Box>
            );
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
          <MenuItem value="">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="All"
                size="small"
                variant="outlined"
                sx={{
                  color: '#667eea',
                  borderColor: '#667eea',
                }}
              />
              <Typography>All Months</Typography>
            </Box>
          </MenuItem>
          {monthOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Typography variant="body2" fontWeight={500}>
                {option.label}
              </Typography>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
