import React from 'react';
import { Box } from '@mui/material';

interface ResizeHandleProps {
  onMouseDown: (event: React.MouseEvent) => void;
  isResizing?: boolean;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ onMouseDown, isResizing }) => {
  return (
    <Box
      onMouseDown={onMouseDown}
      sx={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '8px',
        cursor: 'col-resize',
        userSelect: 'none',
        touchAction: 'none',
        backgroundColor: isResizing ? 'primary.main' : 'transparent',
        opacity: isResizing ? 0.5 : 0,
        transition: 'opacity 0.2s, background-color 0.2s',
        '&:hover': {
          opacity: 0.3,
          backgroundColor: 'primary.main',
        },
        zIndex: 1,
      }}
    />
  );
};
