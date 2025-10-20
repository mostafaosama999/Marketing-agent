import React from 'react';
import { Box } from '@mui/material';

interface StickyScrollbarProps {
  scrollbarRef: React.RefObject<HTMLDivElement>;
  scrollbarWidth: number;
  visible: boolean;
}

export const StickyScrollbar: React.FC<StickyScrollbarProps> = ({
  scrollbarRef,
  scrollbarWidth,
  visible,
}) => {
  if (!visible) return null;

  return (
    <Box
      ref={scrollbarRef}
      sx={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        overflowX: 'scroll',
        overflowY: 'hidden',
        height: '14px',
        backgroundColor: '#f1f1f1',
        borderTop: '1px solid #e0e0e0',
        zIndex: 10,
        // Style the scrollbar
        '&::-webkit-scrollbar': {
          height: 14,
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: '#f1f1f1',
          borderRadius: 4,
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#888',
          borderRadius: 4,
          '&:hover': {
            backgroundColor: '#555',
          },
        },
        // For Firefox
        scrollbarWidth: 'auto',
        scrollbarColor: '#888 #f1f1f1',
      }}
    >
      {/* Inner div that creates the scrollable width */}
      <Box
        sx={{
          width: `${scrollbarWidth}px`,
          height: '1px',
        }}
      />
    </Box>
  );
};
