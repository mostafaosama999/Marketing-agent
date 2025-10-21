// src/pages/tasks/TaskInfoSidebar.tsx
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Edit,
  AutoAwesome as AIIcon,
  CheckCircle,
} from '@mui/icons-material';
import { Ticket } from '../../types';

interface TaskInfoSidebarProps {
  task: Ticket;
  hasAIReview: boolean;
  hasManagerReview: boolean;
  checklistStats: {
    completed: number;
    total: number;
    percentage: number;
  };
  reviewing: boolean;
  onOpenContentModal: () => void;
  onAIReview: () => void;
}

const TaskInfoSidebar: React.FC<TaskInfoSidebarProps> = ({
  task,
  hasAIReview,
  hasManagerReview,
  checklistStats,
  reviewing,
  onOpenContentModal,
  onAIReview,
}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      
      {/* Task Status Card */}
      <Card sx={{ flex: '0 0 auto' }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1rem', mb: 1 }}>
            Task Status
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Status:</Typography>
              <Chip label={task.status} size="small" color="primary" sx={{ fontSize: '0.75rem' }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Writer:</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{task.writerName}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Due:</Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Content Actions */}
      <Card sx={{ flex: '0 0 auto' }}>
        <CardContent sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1rem', mb: 2 }}>
            Content Actions
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={onOpenContentModal}
              size="small"
              fullWidth
              sx={{ fontSize: '0.75rem' }}
            >
              {task.content ? 'Update Content' : 'Add Content'}
            </Button>
            {task.content && (
              <Button
                variant="outlined"
                startIcon={<AIIcon />}
                onClick={onAIReview}
                disabled={reviewing}
                size="small"
                fullWidth
                sx={{ fontSize: '0.75rem' }}
              >
                {reviewing ? 'Analyzing...' : hasAIReview ? 'Re-analyze' : 'AI Analysis'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <Card sx={{ flex: '1 1 auto' }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight="600" sx={{ fontSize: '1rem', mb: 2 }}>
            Review Progress
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            {/* Checklist Progress */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  Guidelines Checklist
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  {checklistStats.completed}/{checklistStats.total}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={checklistStats.percentage}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>

            {/* AI Analysis Status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                AI Analysis
              </Typography>
              <Chip 
                label={hasAIReview ? 'Complete' : 'Pending'} 
                color={hasAIReview ? 'success' : 'default'}
                size="small"
                sx={{ fontSize: '0.7rem' }}
              />
            </Box>

            {/* Manager Review Status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                Manager Review
              </Typography>
              <Chip 
                label={hasManagerReview ? 'Complete' : 'Pending'} 
                color={hasManagerReview ? 'success' : 'default'}
                size="small"
                sx={{ fontSize: '0.7rem' }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TaskInfoSidebar;