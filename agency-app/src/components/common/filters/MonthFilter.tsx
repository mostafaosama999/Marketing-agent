// src/components/common/filters/MonthFilter.tsx
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
import { Ticket } from '../../../types';

interface MonthFilterProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  tickets: Ticket[];
}

const MonthFilter: React.FC<MonthFilterProps> = ({
  selectedMonth,
  onMonthChange,
  tickets,
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onMonthChange(event.target.value);
  };

  // Helper to get the most recent update date from stateHistory or updatedAt
  const getLastUpdateDate = (ticket: Ticket): Date | null => {
    // First, try to get the most recent timestamp from stateHistory
    if (ticket.stateHistory) {
      const timestamps = Object.values(ticket.stateHistory)
        .filter((timestamp): timestamp is string => timestamp !== undefined && timestamp !== null)
        .map(ts => new Date(ts))
        .filter(date => !isNaN(date.getTime()));

      if (timestamps.length > 0) {
        // Return the most recent timestamp
        return new Date(Math.max(...timestamps.map(d => d.getTime())));
      }
    }

    // Fallback to updatedAt if available
    if (ticket.updatedAt) {
      // Handle different date formats (Firestore timestamp, Date, string)
      if (ticket.updatedAt.toDate && typeof ticket.updatedAt.toDate === 'function') {
        return ticket.updatedAt.toDate();
      }
      if (ticket.updatedAt instanceof Date) {
        return ticket.updatedAt;
      }
      if (typeof ticket.updatedAt === 'string') {
        return new Date(ticket.updatedAt);
      }
    }

    return null;
  };

  // Get the range of available months based on actual ticket data (using last update date)
  const getAvailableMonthRange = (tickets: Ticket[]) => {
    if (!tickets.length) return { earliest: null, latest: null };

    const dates = tickets
      .map(ticket => getLastUpdateDate(ticket))
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
    const { earliest, latest } = getAvailableMonthRange(tickets);

    if (!earliest || !latest) {
      // No data available, return empty array
      return [];
    }

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const options = [];

    // Create start date from the first day of the earliest month
    const startDate = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    // Create end date from the first day of the latest month
    const endDate = new Date(latest.getFullYear(), latest.getMonth(), 1);

    // Generate months from earliest to latest
    const current = new Date(startDate);
    while (current <= endDate) {
      const monthValue = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${months[current.getMonth()]} ${current.getFullYear()}`;
      options.push({ value: monthValue, label: monthLabel });
      current.setMonth(current.getMonth() + 1);
    }

    // Sort by year and month (newest first)
    return options.sort((a, b) => b.value.localeCompare(a.value));
  };

  const monthOptions = generateMonthOptions();

  const getSelectedMonthLabel = () => {
    if (!selectedMonth) return 'All Months';
    const option = monthOptions.find(opt => opt.value === selectedMonth);
    return option ? option.label : selectedMonth;
  };

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
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}
                >
                  📅
                </Box>
                <Typography variant="body2">{getSelectedMonthLabel()}</Typography>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  📅
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {option.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Updated in this month
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

export default MonthFilter;
