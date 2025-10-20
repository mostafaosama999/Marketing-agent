import React from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  Button,
  Paper,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

export interface CompanyFilters {
  search: string;
  industries: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

interface CompanyFilterBarProps {
  filters: CompanyFilters;
  availableIndustries: string[];
  onFiltersChange: (filters: CompanyFilters) => void;
}

export const CompanyFilterBar: React.FC<CompanyFilterBarProps> = ({
  filters,
  availableIndustries,
  onFiltersChange,
}) => {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleIndustriesChange = (selectedIndustries: string[]) => {
    onFiltersChange({ ...filters, industries: selectedIndustries });
  };

  const handleStartDateChange = (date: Date | null) => {
    onFiltersChange({
      ...filters,
      dateRange: { ...filters.dateRange, start: date },
    });
  };

  const handleEndDateChange = (date: Date | null) => {
    onFiltersChange({
      ...filters,
      dateRange: { ...filters.dateRange, end: date },
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      industries: [],
      dateRange: { start: null, end: null },
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.industries.length > 0 ||
    filters.dateRange.start ||
    filters.dateRange.end;

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        {/* Search */}
        <TextField
          placeholder="Search companies by name, website, or industry..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ minWidth: 300, flexGrow: 1 }}
          size="small"
        />

        {/* Industry Filter */}
        <Autocomplete
          multiple
          options={availableIndustries}
          value={filters.industries}
          onChange={(_, newValue) => handleIndustriesChange(newValue)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                label={option}
                size="small"
                color="primary"
              />
            ))
          }
          renderInput={(params) => <TextField {...params} placeholder="Filter by industry" size="small" />}
          sx={{ minWidth: 250 }}
        />

        {/* Date Range */}
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Start Date"
            value={filters.dateRange.start}
            onChange={handleStartDateChange}
            slotProps={{
              textField: {
                size: 'small',
                sx: { minWidth: 150 },
              },
            }}
          />
          <DatePicker
            label="End Date"
            value={filters.dateRange.end}
            onChange={handleEndDateChange}
            slotProps={{
              textField: {
                size: 'small',
                sx: { minWidth: 150 },
              },
            }}
          />
        </LocalizationProvider>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
            sx={{ ml: 'auto' }}
          >
            Clear Filters
          </Button>
        )}
      </Box>
    </Paper>
  );
};
