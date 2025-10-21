// src/components/features/tasks/TaskInfoCard.tsx
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { Ticket } from '../../types';

interface TaskInfoCardProps {
  task: Ticket;
}

const TaskInfoCard: React.FC<TaskInfoCardProps> = ({ task }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'success';
      case 'internal_review': return 'warning';
      case 'client_review': return 'info';
      case 'in_progress': return 'primary';
      case 'todo': return 'default';
      default: return 'default';
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Task Information
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Title
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {task.title}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Status
          </Typography>
          <Chip 
            label={task.status.replace('_', ' ').toUpperCase()} 
            color={getStatusColor(task.status) as any}
            size="small"
          />
        </Box>

        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2">
            {task.clientName}
          </Typography>
        </Box>

        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2">
            {task.writerName}
          </Typography>
        </Box>

        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2">
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </Typography>
        </Box>

        {task.estimatedRevenue && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Estimated Revenue
            </Typography>
            <Typography variant="body1" fontWeight="bold" color="success.main">
              ${task.estimatedRevenue.toLocaleString()}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Description
        </Typography>
        {task.description.includes('<') && task.description.includes('>') ? (
          <div dangerouslySetInnerHTML={{ __html: task.description }} />
        ) : (
          <Typography variant="body2">{task.description}</Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskInfoCard;