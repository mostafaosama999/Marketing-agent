// src/components/features/crm/filters/FilterButton.tsx
import React from 'react';
import { Button, Badge, Box } from '@mui/material';
import { FilterList as FilterIcon, ExpandMore, ExpandLess } from '@mui/icons-material';

interface FilterButtonProps {
  activeCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export const FilterButton: React.FC<FilterButtonProps> = ({
  activeCount,
  isExpanded,
  onToggle,
}) => {
  return (
    <Button
      onClick={onToggle}
      endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
      sx={{
        textTransform: 'none',
        fontSize: '14px',
        fontWeight: 500,
        px: 2,
        py: 0.75,
        bgcolor: activeCount > 0 ? 'rgba(103, 126, 234, 0.08)' : 'rgba(255, 255, 255, 0.95)',
        border: activeCount > 0 ? '1px solid #667eea' : '1px solid rgba(255, 255, 255, 0.3)',
        color: activeCount > 0 ? '#667eea' : '#64748b',
        backdropFilter: 'blur(20px)',
        '&:hover': {
          bgcolor: 'rgba(103, 126, 234, 0.12)',
          borderColor: '#667eea',
          color: '#667eea',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Badge
          badgeContent={activeCount}
          color="primary"
          sx={{
            '& .MuiBadge-badge': {
              bgcolor: '#667eea',
              color: 'white',
              fontWeight: 600,
              fontSize: '11px',
              height: '18px',
              minWidth: '18px',
              padding: '0 4px',
            },
          }}
        >
          <FilterIcon sx={{ fontSize: '20px' }} />
        </Badge>
        <span>Filters</span>
      </Box>
    </Button>
  );
};
