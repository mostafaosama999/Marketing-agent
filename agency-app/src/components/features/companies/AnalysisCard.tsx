// src/components/features/companies/AnalysisCard.tsx
import React, { ReactNode } from 'react';
import { Box, Typography, Chip, Link as MuiLink } from '@mui/material';

interface AnalysisCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  link?: string;
  badges?: Array<{
    label: string;
    color: string;
  }>;
  children?: ReactNode;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({
  icon,
  title,
  value,
  subtitle,
  status,
  link,
  badges,
  children,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      case 'info':
        return '#667eea';
      default:
        return '#64748b';
    }
  };

  return (
    <Box
      sx={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        p: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          fontSize: '32px',
          mb: 2,
          color: getStatusColor(),
        }}
      >
        {icon}
      </Box>

      {/* Title */}
      <Typography
        variant="body2"
        sx={{
          color: '#64748b',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontSize: '11px',
          mb: 1,
        }}
      >
        {title}
      </Typography>

      {/* Value */}
      {link ? (
        <MuiLink
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#667eea',
            textDecoration: 'none',
            mb: subtitle || badges ? 1 : 0,
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          {value}
        </MuiLink>
      ) : (
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: '#1e293b',
            mb: subtitle || badges ? 1 : 0,
          }}
        >
          {value}
        </Typography>
      )}

      {/* Subtitle */}
      {subtitle && (
        <Typography
          variant="body2"
          sx={{
            color: '#64748b',
            fontSize: '13px',
            mb: badges ? 1.5 : 0,
          }}
        >
          {subtitle}
        </Typography>
      )}

      {/* Badges */}
      {badges && badges.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
          {badges.map((badge, index) => (
            <Chip
              key={index}
              label={badge.label}
              size="small"
              sx={{
                bgcolor: `${badge.color}22`,
                color: badge.color,
                fontWeight: 500,
                fontSize: '11px',
                height: '20px',
              }}
            />
          ))}
        </Box>
      )}

      {/* Custom children */}
      {children && <Box sx={{ mt: 'auto', pt: 2 }}>{children}</Box>}
    </Box>
  );
};
