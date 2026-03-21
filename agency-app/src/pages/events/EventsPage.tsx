// src/pages/events/EventsPage.tsx
import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  ThemeProvider,
  createTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { useEvents } from '../../hooks/useEvents';
import { EventSummaryCards } from './EventSummaryCards';
import { EventsFilters } from './EventsFilters';
import { EventsTable } from './EventsTable';
import {
  EventStatus,
  EventType,
  EVENT_TYPE_LABELS,
  EventFormData,
} from '../../types/event';

const modernTheme = createTheme({
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
});

const defaultFormData = {
  name: '',
  website: '',
  description: '',
  startDate: '',
  endDate: '',
  eventType: 'conference' as EventType,
  tags: [] as string[],
  location: { venue: '', city: 'London', country: 'GB' },
  pricing: { ticketPrice: null as number | null, currency: 'GBP', ticketStatus: 'available' as const },
  estimatedAttendance: null as number | null,
  eventScore: 0,
  status: 'discovered' as EventStatus,
  discoveredBy: 'manual' as const,
};

export const EventsPage: React.FC = () => {
  const { events, loading, addEvent } = useEvents();

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ ...defaultFormData });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Apply filters
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          e.location?.city?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((e) => e.eventType === typeFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter((e) => e.startDate >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter((e) => e.startDate <= dateTo);
    }

    return filtered;
  }, [events, search, statusFilter, typeFilter, dateFrom, dateTo]);

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.startDate) return;
    setSaving(true);
    try {
      await addEvent({
        ...formData,
        website: formData.website || null,
        endDate: formData.endDate || formData.startDate,
        discoveredAt: new Date().toISOString(),
        icpSummary: { totalIcpCompanies: 0, totalDecisionMakers: 0, topCompanies: [] },
        scoringBreakdown: { attendeeComposition: 0, decisionMakerAccess: 0, formatNetworking: 0, strategicBonus: 0 },
        recommendedActions: [],
      } as Partial<EventFormData>);
      setAddDialogOpen(false);
      setFormData({ ...defaultFormData });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={modernTheme}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: 2 }}>
          <CircularProgress size={48} sx={{ color: '#667eea' }} />
          <Typography variant="body1" color="text.secondary">Loading events...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={modernTheme}>
      <Box
        sx={{
          height: '100%',
          overflow: 'auto',
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
              dateFrom={dateFrom}
              dateTo={dateTo}
              onSearchChange={setSearch}
              onStatusChange={setStatusFilter}
              onTypeChange={setTypeFilter}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
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

        {/* Add Event Dialog */}
        <Dialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
            },
          }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Add Event</Typography>
            <IconButton onClick={() => setAddDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Event Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} size="small" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Start Date *" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} size="small" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="End Date" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} size="small" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Website" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} size="small" placeholder="https://..." />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={formData.eventType}
                    label="Event Type"
                    onChange={(e) => setFormData({ ...formData, eventType: e.target.value as EventType })}
                  >
                    {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
                      <MenuItem key={type} value={type}>{EVENT_TYPE_LABELS[type]}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Venue" value={formData.location.venue} onChange={(e) => setFormData({ ...formData, location: { ...formData.location, venue: e.target.value } })} size="small" />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField fullWidth label="City" value={formData.location.city} onChange={(e) => setFormData({ ...formData, location: { ...formData.location, city: e.target.value } })} size="small" />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField fullWidth label="Country" value={formData.location.country} onChange={(e) => setFormData({ ...formData, location: { ...formData.location, country: e.target.value } })} size="small" />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="Ticket Price" type="number" value={formData.pricing.ticketPrice ?? ''} onChange={(e) => setFormData({ ...formData, pricing: { ...formData.pricing, ticketPrice: e.target.value ? Number(e.target.value) : null } })} size="small" />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="Currency" value={formData.pricing.currency} onChange={(e) => setFormData({ ...formData, pricing: { ...formData.pricing, currency: e.target.value } })} size="small" />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="Est. Attendance" type="number" value={formData.estimatedAttendance ?? ''} onChange={(e) => setFormData({ ...formData, estimatedAttendance: e.target.value ? Number(e.target.value) : null })} size="small" />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="Event Score (0-100)" type="number" value={formData.eventScore || ''} onChange={(e) => setFormData({ ...formData, eventScore: Number(e.target.value) || 0 })} size="small" inputProps={{ min: 0, max: 100 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    label="Add Tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <Button onClick={handleAddTag} variant="outlined" size="small" sx={{ textTransform: 'none', borderColor: '#667eea', color: '#667eea' }}>Add</Button>
                </Box>
                {formData.tags.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                    {formData.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" onDelete={() => handleRemoveTag(tag)} />
                    ))}
                  </Box>
                )}
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} size="small" multiline rows={3} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAddDialogOpen(false)} sx={{ textTransform: 'none', color: '#64748b' }}>Cancel</Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={!formData.name || !formData.startDate || saving}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)' },
              }}
            >
              {saving ? 'Saving...' : 'Add Event'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};
