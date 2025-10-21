// src/components/features/crm/LeadColumn.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Lead } from '../../../types/lead';
import { LeadCard } from './LeadCard';

interface Column {
  id: string;
  title: string;
  icon: string;
  color: string;
  headerColor: string;
  count: number;
}

interface LeadColumnProps {
  column: Column;
  leads: Lead[];
  onDragOver: (e: any) => void;
  onDrop: (e: any, columnId: string) => void;
  onDragStart: (e: any, lead: Lead) => void;
  onLeadClick: (lead: Lead) => void;
  onAddLead: () => void;
  userProfile: any;
}

export const LeadColumn: React.FC<LeadColumnProps> = ({
  column,
  leads,
  onDragOver,
  onDrop,
  onDragStart,
  onLeadClick,
  onAddLead,
  userProfile,
}) => {
  return (
    <Box
      sx={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        minWidth: 280,
        maxWidth: 280,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      }}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      {/* Column Header */}
      <Box
        sx={{
          background: column.headerColor,
          color: 'white',
          p: 3,
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, zIndex: 1 }}>
          <Typography sx={{ fontSize: '18px' }}>
            {column.icon}
          </Typography>
          <Typography variant="h6" sx={{
            fontWeight: 600,
            color: 'white',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
          }}>
            {column.title}
          </Typography>
        </Box>

        <Box sx={{
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          px: 1.5,
          py: 0.5,
          zIndex: 1,
          minWidth: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Typography sx={{
            fontWeight: 700,
            fontSize: '13px',
            color: 'white',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
          }}>
            {column.count}
          </Typography>
        </Box>
      </Box>

      {/* Column Content with Gradient Background */}
      <Box
        sx={{
          background: column.color,
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minHeight: 0,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(0, 0, 0, 0.3)',
            },
          },
        }}
      >
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onDragStart={onDragStart}
            onLeadClick={onLeadClick}
            userProfile={userProfile}
            columnId={column.id}
          />
        ))}
      </Box>
    </Box>
  );
};
