// src/pages/events/EventsPage.tsx
import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useEvents } from '../../hooks/useEvents';
import { EventSummaryCards } from './EventSummaryCards';
import { EventsFilters } from './EventsFilters';
import { EventsTable } from './EventsTable';
import { EventStatus, EventType } from '../../types/event';

const modernTheme = createTheme({
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
});

export const EventsPage: React.FC = () => {
  const { events, loading } = useEvents();

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');

  // TODO: Replace with AddEventDialog when created
  const [_addDialogOpen, setAddDialogOpen] = useState(false);

  // Apply filters
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Search filter — matches event name and location city
    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          e.location?.city?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((e) => e.eventType === typeFilter);
    }

    return filtered;
  }, [events, search, statusFilter, typeFilter]);

  if (loading) {
    return (
      <ThemeProvider theme={modernTheme}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '80vh',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <CircularProgress size={48} sx={{ color: '#667eea' }} />
          <Typography variant="body1" color="text.secondary">
            Loading events...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={modernTheme}>
      <Box
        sx={{
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          p: 4,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            p: 4,
            mb: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  mb: 0.5,
                }}
              >
                Events
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track developer events, conferences, and meetups with ICP companies
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
                py: 1,
                boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                },
              }}
            >
              Add Event
            </Button>
          </Box>

          {/* Filter Bar */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Showing {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
            </Typography>
            <Box sx={{ width: '1px', height: '32px', bgcolor: '#e2e8f0' }} />
            <EventsFilters
              search={search}
              statusFilter={statusFilter}
              typeFilter={typeFilter}
              onSearchChange={setSearch}
              onStatusChange={setStatusFilter}
              onTypeChange={setTypeFilter}
            />
          </Box>
        </Box>

        {/* Summary Cards */}
        <Box sx={{ mb: 3, flexShrink: 0 }}>
          <EventSummaryCards events={events} />
        </Box>

        {/* Table */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <EventsTable events={filteredEvents} />
        </Box>
      </Box>
    </ThemeProvider>
  );
};
