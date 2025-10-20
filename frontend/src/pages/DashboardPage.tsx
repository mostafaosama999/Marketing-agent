import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Lightbulb as LightbulbIcon,
  ViewKanban as ViewKanbanIcon,
  Task as TaskIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface QuickActionCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  path: string;
}

const quickActions: QuickActionCard[] = [
  {
    title: 'Add New Company',
    description: 'Research a new content partnership opportunity',
    icon: <BusinessIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
    action: 'Add Company',
    path: '/companies',
  },
  {
    title: 'Generate Ideas',
    description: 'Create AI-powered content ideas for your companies',
    icon: <LightbulbIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
    action: 'Generate Ideas',
    path: '/ideas',
  },
  {
    title: 'View Pipeline',
    description: 'Track your partnerships through the sales funnel',
    icon: <ViewKanbanIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
    action: 'View Pipeline',
    path: '/pipeline',
  },
  {
    title: 'Check Tasks',
    description: 'Review follow-ups and upcoming deadlines',
    icon: <TaskIcon sx={{ fontSize: 40, color: 'success.main' }} />,
    action: 'Check Tasks',
    path: '/tasks',
  },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to Marketing Ops Pipeline Manager
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Streamline your content marketing partnerships with automated research, idea generation, and pipeline management.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 3,
          mb: 6,
        }}
      >
        {quickActions.map((action) => (
          <Card
            key={action.title}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
              },
            }}
          >
            <CardContent sx={{ flex: 1, textAlign: 'center', p: 3 }}>
              <Box sx={{ mb: 2 }}>
                {action.icon}
              </Box>
              <Typography variant="h6" component="h2" gutterBottom>
                {action.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {action.description}
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate(action.path)}
                sx={{ mt: 'auto' }}
              >
                {action.action}
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Stats Overview - Placeholder for future implementation */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Quick Stats
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 3,
          }}
        >
          <Card>
            <CardContent>
              <Typography variant="h4" component="div" color="primary.main">
                0
              </Typography>
              <Typography color="text.secondary">
                Total Companies
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h4" component="div" color="warning.main">
                0
              </Typography>
              <Typography color="text.secondary">
                Active Partnerships
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h4" component="div" color="success.main">
                0
              </Typography>
              <Typography color="text.secondary">
                Published Articles
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h4" component="div" color="secondary.main">
                0
              </Typography>
              <Typography color="text.secondary">
                Pending Tasks
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardPage;