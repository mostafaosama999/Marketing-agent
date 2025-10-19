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
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { LeadFilters, PipelineStage } from '../../../app/types/crm';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface FilterBarProps {
  filters: LeadFilters;
  stages: PipelineStage[];
  onFiltersChange: (filters: LeadFilters) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, stages, onFiltersChange }) => {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleStagesChange = (selectedStages: string[]) => {
    onFiltersChange({ ...filters, stages: selectedStages });
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
      stages: [],
      dateRange: { start: null, end: null },
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.stages.length > 0 ||
    filters.dateRange.start ||
    filters.dateRange.end;

  const visibleStages = stages.filter((s) => s.visible);

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        {/* Search */}
        <TextField
          placeholder="Search by name, email, or company..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ minWidth: 300, flexGrow: 1 }}
          size="small"
        />

        {/* Stage Filter */}
        <Autocomplete
          multiple
          options={visibleStages.map((s) => s.label)}
          value={filters.stages}
          onChange={(_, newValue) => handleStagesChange(newValue)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const stage = stages.find((s) => s.label === option);
              return (
                <Chip
                  {...getTagProps({ index })}
                  label={option}
                  size="small"
                  sx={{
                    backgroundColor: stage?.color || '#9e9e9e',
                    color: 'white',
                  }}
                />
              );
            })
          }
          renderInput={(params) => <TextField {...params} placeholder="Filter by stage" size="small" />}
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
          >
            Clear Filters
          </Button>
        )}
      </Box>
    </Paper>
  );
};
