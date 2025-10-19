import React from 'react';
import { Typography, Box } from '@mui/material';

export const PipelinePage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Pipeline
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Track your content partnerships through the entire process with a visual kanban board.
      </Typography>
    </Box>
  );
};