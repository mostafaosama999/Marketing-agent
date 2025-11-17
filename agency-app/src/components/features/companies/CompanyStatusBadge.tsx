// src/components/features/companies/CompanyStatusBadge.tsx
import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { LeadStatus } from '../../../types/lead';
import LockIcon from '@mui/icons-material/Lock';

interface CompanyStatusBadgeProps {
  status?: LeadStatus;
  locked?: boolean;
  size?: 'small' | 'medium';
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

// Status configuration matching lead statuses (exact same colors as CRMLeadsTable)
const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  new_lead: {
    label: 'New Lead',
    color: '#9e9e9e',
  },
  qualified: {
    label: 'Qualified',
    color: '#ff9800',
  },
  contacted: {
    label: 'Contacted',
    color: '#2196f3',
  },
  follow_up: {
    label: 'Follow up',
    color: '#9c27b0',
  },
  nurture: {
    label: 'Nurture',
    color: '#00bcd4',
  },
  won: {
    label: 'Won',
    color: '#4caf50',
  },
  lost: {
    label: 'Refused',
    color: '#f44336',
  },
};

export const CompanyStatusBadge: React.FC<CompanyStatusBadgeProps> = ({
  status,
  locked = false,
  size = 'small',
  onClick,
}) => {
  if (!status) {
    return (
      <Chip
        label="No Status"
        size={size}
        sx={{
          backgroundColor: '#e0e0e0',
          color: '#666',
          fontWeight: 500,
        }}
      />
    );
  }

  const config = STATUS_CONFIG[status];

  if (!config) {
    // Fallback if status is not recognized
    return (
      <Chip
        label={status}
        size={size}
        sx={{
          backgroundColor: '#6c757d',
          color: '#fff',
          fontWeight: 500,
        }}
      />
    );
  }

  const tooltipText = locked
    ? `${config.label} (Manually locked - won't auto-update from leads)`
    : `${config.label} (Auto-synced from leads)`;

  return (
    <Tooltip title={tooltipText} arrow>
      <Chip
        label={
          locked ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span>{config.label}</span>
              <LockIcon sx={{ fontSize: 12 }} />
            </span>
          ) : (
            config.label
          )
        }
        size={size}
        onClick={onClick}
        sx={{
          bgcolor: `${config.color}22`,
          color: config.color,
          fontWeight: 500,
          fontSize: '10px',
          height: '20px',
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': onClick
            ? {
                bgcolor: `${config.color}33`,
              }
            : {},
        }}
      />
    </Tooltip>
  );
};

// Helper function to get status label
export function getStatusLabel(status: LeadStatus): string {
  return STATUS_CONFIG[status]?.label || status;
}

// Helper function to get status color
export function getStatusColor(status: LeadStatus): string {
  return STATUS_CONFIG[status]?.color || '#9e9e9e';
}
