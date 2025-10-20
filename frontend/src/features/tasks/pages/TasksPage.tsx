import React from 'react';
import { Typography, Box } from '@mui/material';

export const TasksPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Tasks & Follow-ups
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Never miss a follow-up or deadline with automated reminders and task management.
      </Typography>
    </Box>
  );
};export default TasksPage;
