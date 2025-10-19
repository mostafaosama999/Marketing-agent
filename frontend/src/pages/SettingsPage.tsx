import React from 'react';
import { Typography, Box } from '@mui/material';

export const SettingsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Configure your preferences, integrations, and account settings.
      </Typography>
    </Box>
  );
};