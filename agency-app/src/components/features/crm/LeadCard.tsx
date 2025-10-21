// src/components/features/crm/LeadCard.tsx
import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import {
  Business as CompanyIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { Lead } from '../../../types/lead';

interface LeadCardProps {
  lead: Lead;
  onDragStart: (e: any, lead: Lead) => void;
  onLeadClick: (lead: Lead) => void;
  userProfile: any;
  columnId: string;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onDragStart,
  onLeadClick,
  userProfile,
  columnId,
}) => {
  // Calculate days in current state - includes cumulative time across multiple entries
  const getDaysInCurrentState = (lead: Lead): number => {
    const now = new Date();
    let currentSessionDays = 0;
    let cumulativeDays = 0;

    // Get cumulative time from stateDurations if available
    if (lead.stateDurations && typeof lead.stateDurations[lead.status] === 'number') {
      cumulativeDays = lead.stateDurations[lead.status] || 0;
    }

    // Calculate current session time
    let stateStartDate: Date | null = null;

    // Use timeline state history if available
    if (lead.stateHistory && lead.stateHistory[lead.status]) {
      stateStartDate = new Date(lead.stateHistory[lead.status]!);
    }
    // Fallback: use updatedAt
    else if (lead.updatedAt) {
      if (lead.updatedAt instanceof Date) {
        stateStartDate = lead.updatedAt;
      } else if (typeof lead.updatedAt === 'string') {
        stateStartDate = new Date(lead.updatedAt);
      }
    }

    // Calculate current session days if we have a start date
    if (stateStartDate) {
      const diffTime = now.getTime() - stateStartDate.getTime();
      currentSessionDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    // Return total: cumulative + current session, ensuring no NaN values
    const total = (cumulativeDays || 0) + (currentSessionDays || 0);
    return Math.max(0, isNaN(total) ? 0 : total);
  };

  // Get color for state duration indicator
  const getStateDurationColor = (days: number): string => {
    if (days <= 3) return '#10b981'; // Green
    if (days <= 7) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const daysInState = getDaysInCurrentState(lead);
  const indicatorColor = getStateDurationColor(daysInState);

  // Get priority from custom fields
  const priority = lead.customFields?.priority || 'medium';

  return (
    <Box
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onClick={() => onLeadClick(lead)}
      sx={{
        background: 'white',
        borderRadius: 2.5,
        p: 3,
        cursor: 'pointer',
        border: '1px solid #e2e8f0',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        flexShrink: 0,
        '&:hover': {
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          transform: 'translateY(-2px)',
          borderColor: '#667eea',
        },
        '&:active': {
          transform: 'translateY(0px)',
        },
      }}
    >
      {/* Priority Indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          borderRadius: '8px 8px 0 0',
          background:
            priority === 'High' || priority === 'Urgent' ? 'linear-gradient(90deg, #ef4444, #dc2626)' :
            priority === 'Medium' ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
            'linear-gradient(90deg, #10b981, #059669)'
        }}
      />

      {/* State Duration Indicator */}
      {daysInState > 0 && (
        <Tooltip title={`${daysInState} day${daysInState !== 1 ? 's' : ''} in ${lead.status.replace('_', ' ')}`} arrow>
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: indicatorColor,
              color: 'white',
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 600,
              boxShadow: `0 2px 4px ${indicatorColor}40`,
            }}
          >
            {daysInState}
          </Box>
        </Tooltip>
      )}

      {/* Lead Name */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          fontSize: '15px',
          color: '#1e293b',
          mb: 2,
          pr: 4, // Make room for duration indicator
        }}
      >
        {lead.name}
      </Typography>

      {/* Company */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #3b82f620, #3b82f610)',
            border: '1px solid #3b82f640',
            borderRadius: 2,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CompanyIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: '#64748b',
            fontWeight: 500,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {lead.company}
        </Typography>
      </Box>

      {/* Email */}
      {lead.email && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Box
            sx={{
              background: 'linear-gradient(135deg, #8b5cf620, #8b5cf610)',
              border: '1px solid #8b5cf640',
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EmailIcon sx={{ fontSize: 16, color: '#8b5cf6' }} />
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: '#64748b',
              fontWeight: 500,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {lead.email}
          </Typography>
        </Box>
      )}

      {/* Phone */}
      {lead.phone && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Box
            sx={{
              background: 'linear-gradient(135deg, #10b98120, #10b98110)',
              border: '1px solid #10b98140',
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PhoneIcon sx={{ fontSize: 16, color: '#10b981' }} />
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: '#64748b',
              fontWeight: 500,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {lead.phone}
          </Typography>
        </Box>
      )}

      {/* Custom Fields (show priority and deal value if present) */}
      {(lead.customFields?.priority || lead.customFields?.deal_value) && (
        <Box
          sx={{
            mt: 2,
            pt: 2,
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {lead.customFields?.priority && (
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                background: '#f1f5f9',
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748b',
              }}
            >
              {lead.customFields.priority}
            </Box>
          )}
          {lead.customFields?.deal_value && (
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                background: '#ecfdf5',
                fontSize: '11px',
                fontWeight: 600,
                color: '#059669',
              }}
            >
              ${lead.customFields.deal_value}
            </Box>
          )}
        </Box>
      )}

      {/* Apollo Enriched Badge */}
      {lead.apolloEnriched && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            color: 'white',
            borderRadius: '8px',
            px: 1.5,
            py: 0.5,
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)',
          }}
        >
          Enriched
        </Box>
      )}
    </Box>
  );
};
