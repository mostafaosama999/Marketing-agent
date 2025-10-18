import React from 'react';
import { Card, CardContent, Typography, Box, IconButton } from '@mui/material';
import { Edit as EditIcon, Email as EmailIcon, Phone as PhoneIcon, Business as BusinessIcon } from '@mui/icons-material';
import { Lead } from '../../../app/types/crm';

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  isDragging?: boolean;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onEdit, isDragging = false }) => {
  return (
    <Card
      sx={{
        mb: 2,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
            {lead.name}
          </Typography>
          <IconButton size="small" onClick={() => onEdit(lead)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {lead.company}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
            {lead.email}
          </Typography>
        </Box>

        {lead.phone && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {lead.phone}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
