import React from 'react';
import { Typography, Box } from '@mui/material';

export const IdeasPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Content Ideas
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Generate and manage AI-powered content ideas tailored to each company.
      </Typography>
    </Box>
  );
};export default IdeasPage;
