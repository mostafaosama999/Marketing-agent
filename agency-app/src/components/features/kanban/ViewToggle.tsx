// src/components/features/kanban/ViewToggle.tsx
import React from 'react';
import { ToggleButtonGroup, ToggleButton, Box } from '@mui/material';
import { ViewKanban, TableRows } from '@mui/icons-material';

interface ViewToggleProps {
  view: 'board' | 'table';
  onViewChange: (view: 'board' | 'table') => void;
}

function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const handleChange = (_event: React.MouseEvent<HTMLElement>, newView: 'board' | 'table' | null) => {
    if (newView !== null) {
      onViewChange(newView);
    }
  };

  return (
    <Box>
      <ToggleButtonGroup
        value={view}
        exclusive
        onChange={handleChange}
        aria-label="view mode"
        sx={{
          '& .MuiToggleButton-root': {
            px: 2,
            py: 0.5,
            border: '1px solid rgba(103, 126, 234, 0.3)',
            color: '#64748b',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '14px',
            '&.Mui-selected': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              },
            },
            '&:hover': {
              backgroundColor: 'rgba(103, 126, 234, 0.08)',
            },
          },
        }}
      >
        <ToggleButton value="board" aria-label="board view">
          <ViewKanban sx={{ mr: 1, fontSize: '20px' }} />
          Board
        </ToggleButton>
        <ToggleButton value="table" aria-label="table view">
          <TableRows sx={{ mr: 1, fontSize: '20px' }} />
          Table
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

export default ViewToggle;
