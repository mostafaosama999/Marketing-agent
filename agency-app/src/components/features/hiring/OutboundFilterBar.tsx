import React from 'react';
import {
  Box,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Checkbox,
  ListItemText,
  OutlinedInput,
  SelectChangeEvent,
} from '@mui/material';
import { OUTBOUND_STAGES, OutboundStatus } from '../../../types/sourcedCandidate';

export interface OutboundFilters {
  scoreRange: [number, number];
  statuses: OutboundStatus[];
}

export const DEFAULT_OUTBOUND_FILTERS: OutboundFilters = {
  scoreRange: [0, 10],
  statuses: [],
};

interface OutboundFilterBarProps {
  filters: OutboundFilters;
  onChange: (filters: OutboundFilters) => void;
  onShowArchived: () => void;
  archivedCount: number;
  totalCount: number;
}

export const OutboundFilterBar: React.FC<OutboundFilterBarProps> = ({
  filters,
  onChange,
  onShowArchived,
  archivedCount,
  totalCount,
}) => {
  const handleScoreChange = (_e: Event, value: number | number[]) => {
    const [a, b] = value as number[];
    onChange({ ...filters, scoreRange: [a, b] });
  };

  const handleStatusChange = (e: SelectChangeEvent<OutboundStatus[]>) => {
    const value = e.target.value as OutboundStatus[] | string;
    onChange({
      ...filters,
      statuses: typeof value === 'string' ? (value.split(',') as OutboundStatus[]) : value,
    });
  };

  const handleClear = () => onChange(DEFAULT_OUTBOUND_FILTERS);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        alignItems: 'center',
        px: 2,
        py: 1.5,
        mx: 2,
        mb: 2,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      }}
    >
      <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
        {totalCount} candidate{totalCount === 1 ? '' : 's'}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 240 }}>
        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Score</Typography>
        <Slider
          value={filters.scoreRange}
          onChange={handleScoreChange}
          valueLabelDisplay="auto"
          min={0}
          max={10}
          step={1}
          marks
          sx={{
            color: '#667eea',
            '& .MuiSlider-valueLabel': { fontSize: '11px' },
          }}
        />
      </Box>

      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>Status</InputLabel>
        <Select
          multiple
          value={filters.statuses}
          onChange={handleStatusChange}
          input={<OutlinedInput label="Status" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {(selected as OutboundStatus[]).map((s) => {
                const stage = OUTBOUND_STAGES.find((st) => st.id === s);
                return (
                  <Chip
                    key={s}
                    label={stage?.label || s}
                    size="small"
                    sx={{ fontSize: '10px', height: 18, bgcolor: `${stage?.color}15`, color: stage?.color }}
                  />
                );
              })}
            </Box>
          )}
        >
          {OUTBOUND_STAGES.map((stage) => (
            <MenuItem key={stage.id} value={stage.id}>
              <Checkbox checked={filters.statuses.includes(stage.id)} />
              <ListItemText primary={`${stage.icon} ${stage.label}`} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button size="small" onClick={handleClear} sx={{ textTransform: 'none', fontSize: '12px' }}>
        Clear
      </Button>

      <Box sx={{ flex: 1 }} />

      <Button
        size="small"
        onClick={onShowArchived}
        sx={{ textTransform: 'none', fontSize: '12px', color: '#64748b' }}
      >
        Archived ({archivedCount})
      </Button>
    </Box>
  );
};
