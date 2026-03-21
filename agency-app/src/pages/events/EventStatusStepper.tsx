// src/pages/events/EventStatusStepper.tsx
import React from 'react';
import { Box, Chip } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import {
  EventStatus,
  EVENT_STATUS_ORDER,
  EVENT_STATUS_LABELS,
  EVENT_STATUS_COLORS,
} from '../../types/event';

interface EventStatusStepperProps {
  currentStatus: EventStatus;
  onStatusChange: (status: EventStatus) => void;
}

export const EventStatusStepper: React.FC<EventStatusStepperProps> = ({
  currentStatus,
  onStatusChange,
}) => {
  const currentIndex = EVENT_STATUS_ORDER.indexOf(currentStatus);

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
      {EVENT_STATUS_ORDER.map((status, index) => {
        const isPast = index < currentIndex;
        const isCurrent = status === currentStatus;
        const isFuture = index > currentIndex;
        const colors = EVENT_STATUS_COLORS[status];

        return (
          <Chip
            key={status}
            label={EVENT_STATUS_LABELS[status]}
            icon={isPast ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : undefined}
            onClick={() => onStatusChange(status)}
            variant={isCurrent ? 'filled' : 'outlined'}
            sx={{
              fontWeight: isCurrent ? 700 : 500,
              fontSize: '13px',
              height: '32px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              ...(isCurrent && {
                bgcolor: colors.bg,
                color: colors.text,
                borderColor: colors.text,
                boxShadow: `0 2px 8px ${colors.bg}`,
                '&:hover': {
                  bgcolor: colors.bg,
                  opacity: 0.9,
                },
              }),
              ...(isPast && {
                bgcolor: 'rgba(102, 126, 234, 0.06)',
                color: '#667eea',
                borderColor: 'rgba(102, 126, 234, 0.3)',
                '& .MuiChip-icon': {
                  color: '#667eea',
                },
                '&:hover': {
                  bgcolor: 'rgba(102, 126, 234, 0.12)',
                },
              }),
              ...(isFuture && {
                bgcolor: 'transparent',
                color: '#94a3b8',
                borderColor: '#e2e8f0',
                '&:hover': {
                  bgcolor: 'rgba(148, 163, 184, 0.08)',
                  borderColor: '#94a3b8',
                },
              }),
            }}
          />
        );
      })}
    </Box>
  );
};
