// src/pages/events/EventsPage.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useEvents } from '../../hooks/useEvents';
import { EventSummaryCards } from './EventSummaryCards';
import { EventsFilters } from './EventsFilters';
import { EventsTable } from './EventsTable';
import {
  Event,
  EventStatus,
  EventType,
  EVENT_TYPE_LABELS,
  EventFormData,
  EventCategory,
  EducationalTier,
  EDUCATIONAL_TIER_LABELS,
} from '../../types/event';

const modernTheme = createTheme({
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
});

const getDefaultFormData = (category: EventCategory) => ({
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
  category,
  // Educational-specific fields
  organiser: '',
  audienceDescription: '',
  gating: '',
  tier: 'worth_trying' as EducationalTier,
});

export const EventsPage: React.FC = () => {
  // Tab state synced with URL
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tabValue = tabParam === 'educational' ? 1 : 0;
  const activeCategory: EventCategory = tabValue === 0 ? 'client' : 'educational';

  const { events, loading, addEvent, updateEvent } = useEvents(activeCategory);

  const handleUpdatePrice = useCallback(async (eventId: string, pricing: Event['pricing']) => {
    await updateEvent(eventId, { pricing });
  }, [updateEvent]);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');
  const [hideNoIcp, setHideNoIcp] = useState(false);
  const [tierFilter, setTierFilter] = useState<EducationalTier | 'all'>('all');

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState(getDefaultFormData(activeCategory));
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

    if (monthFilter !== 'all') {
      filtered = filtered.filter((e) => {
        const date = new Date(e.startDate);
        return date.getMonth() + 1 === monthFilter;
      });
    }


    if (hideNoIcp && activeCategory === 'client') {
      filtered = filtered.filter((e) => (e.icpSummary?.totalIcpCompanies || 0) > 0);
    }

    if (tierFilter !== 'all' && activeCategory === 'educational') {
      filtered = filtered.filter((e) => e.tier === tierFilter);
    }

    return filtered;
  }, [events, search, statusFilter, typeFilter, monthFilter, hideNoIcp, tierFilter, activeCategory]);

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

  const handleOpenAddDialog = () => {
    setFormData(getDefaultFormData(activeCategory));
    setAddDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.startDate) return;
    setSaving(true);
    try {
      const baseData = {
        name: formData.name,
        website: formData.website || null,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        eventType: formData.eventType,
        tags: formData.tags,
        location: formData.location,
        pricing: formData.pricing,
        estimatedAttendance: formData.estimatedAttendance,
        eventScore: formData.eventScore,
        status: formData.status,
        discoveredBy: formData.discoveredBy,
        discoveredAt: new Date().toISOString(),
        category: activeCategory,
        scoringBreakdown: { attendeeComposition: 0, decisionMakerAccess: 0, formatNetworking: 0, strategicBonus: 0 },
        recommendedActions: [],
      };

      if (activeCategory === 'client') {
        await addEvent({
          ...baseData,
          icpSummary: { totalIcpCompanies: 0, totalDecisionMakers: 0, topCompanies: [] },
        } as Partial<EventFormData>);
      } else {
        await addEvent({
          ...baseData,
          organiser: formData.organiser || undefined,
          audienceDescription: formData.audienceDescription || undefined,
          gating: formData.gating || undefined,
          tier: formData.tier,
        } as Partial<EventFormData>);
      }

      setAddDialogOpen(false);
      setFormData(getDefaultFormData(activeCategory));
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    const tab = newValue === 1 ? 'educational' : 'client';
    setSearchParams({ tab }, { replace: true });
    // Reset filters when switching tabs
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setMonthFilter('all');
    setHideNoIcp(false);
    setTierFilter('all');
  }, [setSearchParams]);

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
                {activeCategory === 'client'
                  ? 'Track developer events, conferences, and meetups with ICP companies'
                  : 'Track agency owner events, masterminds, and networking for learning and growth'}
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
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

          {/* Tabs */}
          <Box sx={{ mb: 2, borderBottom: 1, borderColor: '#e2e8f0' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              TabIndicatorProps={{
                sx: { backgroundColor: '#667eea' },
              }}
              sx={{
                minHeight: 42,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#64748b',
                  minHeight: 42,
                  '&.Mui-selected': {
                    color: '#667eea',
                  },
                },
              }}
            >
              <Tab
                icon={<BusinessIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Client Events"
              />
              <Tab
                icon={<SchoolIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Educational Events"
              />
            </Tabs>
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
              monthFilter={monthFilter}
              hideNoIcp={hideNoIcp}
              onSearchChange={setSearch}
              onStatusChange={setStatusFilter}
              onTypeChange={setTypeFilter}
              onMonthChange={setMonthFilter}
              onHideNoIcpChange={setHideNoIcp}
              category={activeCategory}
              tierFilter={tierFilter}
              onTierChange={setTierFilter}
            />
          </Box>
        </Box>

        {/* Summary Cards */}
        <Box sx={{ mb: 3, flexShrink: 0 }}>
          <EventSummaryCards events={events} category={activeCategory} />
        </Box>

        {/* Table */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <EventsTable events={filteredEvents} category={activeCategory} onUpdatePrice={handleUpdatePrice} />
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
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Add {activeCategory === 'client' ? 'Client' : 'Educational'} Event
            </Typography>
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

              {/* Educational-specific fields */}
              {activeCategory === 'educational' && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Organiser"
                      value={formData.organiser}
                      onChange={(e) => setFormData({ ...formData, organiser: e.target.value })}
                      size="small"
                      placeholder="Who runs this event?"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Tier</InputLabel>
                      <Select
                        value={formData.tier}
                        label="Tier"
                        onChange={(e) => setFormData({ ...formData, tier: e.target.value as EducationalTier })}
                      >
                        {(Object.keys(EDUCATIONAL_TIER_LABELS) as EducationalTier[]).map((t) => (
                          <MenuItem key={t} value={t}>{EDUCATIONAL_TIER_LABELS[t]}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Audience Description"
                      value={formData.audienceDescription}
                      onChange={(e) => setFormData({ ...formData, audienceDescription: e.target.value })}
                      size="small"
                      placeholder="Who attends? e.g. agency owners, freelancers"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Gating"
                      value={formData.gating}
                      onChange={(e) => setFormData({ ...formData, gating: e.target.value })}
                      size="small"
                      placeholder="e.g. Open, Invite-only, Application required"
                    />
                  </Grid>
                </>
              )}

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
