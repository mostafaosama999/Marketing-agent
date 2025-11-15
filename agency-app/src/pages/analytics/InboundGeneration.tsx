// src/pages/analytics/InboundGeneration.tsx
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';

const InboundGeneration: React.FC = () => {
  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      p: 4,
    }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <AutoAwesomeIcon sx={{ fontSize: 40, color: '#667eea' }} />
          <Typography variant="h4" sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}>
            Inbound Generation
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ color: '#64748b' }}>
          AI-powered LinkedIn post suggestions from your newsletter emails
        </Typography>
      </Box>

      {/* Placeholder Content */}
      <Card sx={{
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
      }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Coming Soon
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            This page will display AI-generated LinkedIn post suggestions based on your newsletter emails.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default InboundGeneration;
