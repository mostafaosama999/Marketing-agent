// src/pages/clients/components/ClientFilters.tsx
import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { CalendarToday as CalendarIcon } from '@mui/icons-material';

interface ClientFiltersProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

const ClientFilters: React.FC<ClientFiltersProps> = ({
  selectedMonth,
  onMonthChange,
}) => {
  // Generate month options for the last 12 months plus current
  const generateMonthOptions = () => {
    const options = [
      { value: 'current', label: 'Current Month' },
      { value: 'all', label: 'All Time' }
    ];
    
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      
      if (i > 0) { // Don't duplicate current month
        options.push({ value, label });
      }
    }
    
    return options;
  };

  const handleMonthChange = (event: SelectChangeEvent<string>) => {
    onMonthChange(event.target.value);
  };

  return (
    <FormControl sx={{ minWidth: 200 }}>
      <InputLabel sx={{ color: '#64748b' }}>Time Period</InputLabel>
      <Select
        value={selectedMonth}
        label="Time Period"
        onChange={handleMonthChange}
        sx={{
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(148, 163, 184, 0.3)',
          },
        }}
        startAdornment={<CalendarIcon sx={{ mr: 1, color: '#64748b' }} />}
      >
        {generateMonthOptions().map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default ClientFilters;