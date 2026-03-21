// src/pages/events/EventSummaryCards.tsx
import React, { useMemo } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import {
  Event as EventIcon,
  CalendarMonth,
  People,
  Timer,
} from '@mui/icons-material';
import { Event } from '../../types/event';

interface EventSummaryCardsProps {
  events: Event[];
}

interface MetricCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export const EventSummaryCards: React.FC<EventSummaryCardsProps> = ({ events }) => {
  const metrics = useMemo((): MetricCard[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingEvents = events.filter((e) => {
      if (e.status === 'archived') return false;
      const start = new Date(e.startDate);
      return start >= today;
    });

    // Events this month
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const eventsThisMonth = events.filter((e) => {
      const start = new Date(e.startDate);
      return start.getMonth() === currentMonth && start.getFullYear() === currentYear;
    });

    // Total ICP companies across upcoming events
    const totalIcpCompanies = upcomingEvents.reduce(
      (sum, e) => sum + (e.icpSummary?.totalIcpCompanies || 0),
      0
    );

    // Next event countdown
    const futureEvents = events
      .filter((e) => {
        if (e.status === 'archived') return false;
        return new Date(e.startDate) >= today;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    let countdownText = 'N/A';
    if (futureEvents.length > 0) {
      const nextDate = new Date(futureEvents[0].startDate);
      const diffTime = nextDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      countdownText = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day' : `${diffDays} days`;
    }

    return [
      {
        label: 'Upcoming Events',
        value: upcomingEvents.length,
        icon: <EventIcon sx={{ fontSize: 28 }} />,
        color: '#667eea',
      },
      {
        label: 'Events This Month',
        value: eventsThisMonth.length,
        icon: <CalendarMonth sx={{ fontSize: 28 }} />,
        color: '#764ba2',
      },
      {
        label: 'Total ICP Companies',
        value: totalIcpCompanies,
        icon: <People sx={{ fontSize: 28 }} />,
        color: '#22c55e',
      },
      {
        label: 'Next Event Countdown',
        value: countdownText,
        icon: <Timer sx={{ fontSize: 28 }} />,
        color: '#f59e0b',
      },
    ];
  }, [events]);

  return (
    <Grid container spacing={3}>
      {metrics.map((metric) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={metric.label}>
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              border: '1px solid rgba(0,0,0,0.05)',
              p: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.10)',
              },
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${metric.color}15`,
                color: metric.color,
                flexShrink: 0,
              }}
            >
              {metric.icon}
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}
              >
                {metric.value}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                {metric.label}
              </Typography>
            </Box>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
};
