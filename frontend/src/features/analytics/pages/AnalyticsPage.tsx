import React from 'react';
import { Typography, Box } from '@mui/material';

export const AnalyticsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Analytics & Insights
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Get data-driven insights to improve your success rate and optimize your content marketing strategy.
      </Typography>
    </Box>
  );
};