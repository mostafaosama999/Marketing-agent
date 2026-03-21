// src/pages/events/EventOverviewTab.tsx
import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { Event, EVENT_TYPE_LABELS } from '../../types/event';

interface EventOverviewTabProps {
  event: Event;
  companiesCount: number;
  icpCompaniesCount: number;
  decisionMakersCount: number;
  cwpCount: number;
}

const MetricCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      borderRadius: 2.5,
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(0, 0, 0, 0.06)',
      transition: 'all 0.2s ease',
      '&:hover': {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        transform: 'translateY(-2px)',
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `${color}15`,
          color: color,
        }}
      >
        {icon}
      </Box>
      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
        {label}
      </Typography>
    </Box>
    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
      {value}
    </Typography>
  </Paper>
);

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
};

export const EventOverviewTab: React.FC<EventOverviewTabProps> = ({
  event,
  companiesCount,
  icpCompaniesCount,
  decisionMakersCount,
  cwpCount,
}) => {
  const scoreColor = getScoreColor(event.eventScore);
  const breakdown = event.scoringBreakdown;

  const breakdownItems = [
    { label: 'Attendee Composition', value: breakdown.attendeeComposition, max: 40 },
    { label: 'Decision Maker Access', value: breakdown.decisionMakerAccess, max: 25 },
    { label: 'Format & Networking', value: breakdown.formatNetworking, max: 20 },
    { label: 'Strategic Bonus', value: breakdown.strategicBonus, max: 15 },
  ];

  const formatDateRange = () => {
    const start = new Date(event.startDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const end = new Date(event.endDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return start === end ? start : `${start} - ${end}`;
  };

  const formatLocation = () => {
    const parts = [event.location.venue, event.location.city, event.location.country].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="ICP Companies"
            value={icpCompaniesCount}
            icon={<BusinessIcon />}
            color="#667eea"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Decision Makers"
            value={decisionMakersCount}
            icon={<PersonIcon />}
            color="#764ba2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="Total Companies"
            value={companiesCount}
            icon={<GroupsIcon />}
            color="#3b82f6"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            label="CWP Signals"
            value={cwpCount}
            icon={<CodeIcon />}
            color="#10b981"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recommended Actions */}
        {event.recommendedActions && event.recommendedActions.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2.5,
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                height: '100%',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Recommended Actions
              </Typography>
              <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
                {event.recommendedActions.map((action, index) => (
                  <Box
                    component="li"
                    key={index}
                    sx={{
                      mb: 1,
                      color: '#475569',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      '&::marker': {
                        color: '#667eea',
                      },
                    }}
                  >
                    {action}
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Event Details */}
        <Grid
          size={{ xs: 12, md: event.recommendedActions && event.recommendedActions.length > 0 ? 6 : 12 }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2.5,
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              height: '100%',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                mb: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Event Details
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <DetailRow label="Date" value={formatDateRange()} />
              <DetailRow label="Location" value={formatLocation()} />
              <DetailRow label="Type" value={EVENT_TYPE_LABELS[event.eventType]} />
              <DetailRow
                label="Price"
                value={
                  event.pricing.ticketPrice !== null
                    ? `${event.pricing.currency} ${event.pricing.ticketPrice}`
                    : event.pricing.ticketStatus === 'free'
                    ? 'Free'
                    : 'Unknown'
                }
              />
              {event.estimatedAttendance && (
                <DetailRow
                  label="Est. Attendance"
                  value={event.estimatedAttendance.toLocaleString()}
                />
              )}
            </Box>

            {/* Score Section */}
            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Event Score
                </Typography>
                <Chip
                  label={`${event.eventScore}/100`}
                  size="small"
                  sx={{
                    bgcolor: `${scoreColor}15`,
                    color: scoreColor,
                    fontWeight: 700,
                    fontSize: '14px',
                  }}
                />
              </Box>

              {breakdownItems.map((item) => (
                <Box key={item.label} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#1e293b', fontWeight: 600 }}>
                      {item.value}/{item.max}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(item.value / item.max) * 100}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'rgba(102, 126, 234, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: 600 }}>
      {value}
    </Typography>
  </Box>
);
