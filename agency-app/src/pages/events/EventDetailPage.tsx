// src/pages/events/EventDetailPage.tsx
import React, { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Tabs,
  Tab,
  Typography,
  ThemeProvider,
  createTheme,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useEventDetail } from '../../hooks/useEventDetail';
import {
  EventCategory,
  EducationalTier,
  EDUCATIONAL_TIER_LABELS,
  EDUCATIONAL_TIER_COLORS,
  EVENT_CATEGORY_LABELS,
} from '../../types/event';
import { EventStatusStepper } from './EventStatusStepper';
import { EventOverviewTab } from './EventOverviewTab';
import { EventCompaniesTab } from './EventCompaniesTab';
import { EventLeadsTab } from './EventLeadsTab';
import { EventNotesTab } from './EventNotesTab';

const modernTheme = createTheme({
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
});

const CLIENT_TAB_NAMES = ['overview', 'companies', 'leads', 'notes'] as const;
const EDUCATIONAL_TAB_NAMES = ['overview', 'notes'] as const;

export const EventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    event,
    companies,
    leads,
    loading,
    companiesLoading,
    leadsLoading,
    error,
    updateEvent,
    addCompany,
    updateCompany,
    deleteCompany,
    addLead,
    updateLead,
    deleteLead,
  } = useEventDetail(eventId);

  const isEducational = event?.category === 'educational';
  const tabNames = isEducational ? EDUCATIONAL_TAB_NAMES : CLIENT_TAB_NAMES;

  // Tab state from URL
  const tabParam = searchParams.get('tab') || 'overview';
  const tabValue = Math.max(0, (tabNames as readonly string[]).indexOf(tabParam));

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    const nativeEvent = event.nativeEvent as MouseEvent;
    if (
      nativeEvent.ctrlKey ||
      nativeEvent.metaKey ||
      nativeEvent.shiftKey ||
      nativeEvent.button === 1
    ) {
      return;
    }
    setSearchParams({ tab: tabNames[newValue] });
  };

  // Derived metrics
  const icpCompaniesCount = useMemo(
    () => companies.filter((c) => c.icpMatch === 'yes').length,
    [companies]
  );
  const decisionMakersCount = useMemo(
    () => leads.filter((l) => l.persona === 'decision_maker').length,
    [leads]
  );
  const cwpCount = useMemo(
    () => companies.filter((c) => c.hasCwp).length,
    [companies]
  );

  const handleStatusChange = async (newStatus: typeof event extends null ? never : NonNullable<typeof event>['status']) => {
    await updateEvent({ status: newStatus });
  };

  const handleNotesSave = async (notes: string) => {
    await updateEvent({ notes });
  };

  if (loading) {
    return (
      <ThemeProvider theme={modernTheme}>
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CircularProgress size={48} sx={{ color: 'white' }} />
        </Box>
      </ThemeProvider>
    );
  }

  if (!event) {
    return (
      <ThemeProvider theme={modernTheme}>
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography variant="h6" sx={{ color: 'white' }}>
            {error || 'Event not found'}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/events')}
            sx={{
              background: 'white',
              color: '#667eea',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.9)',
              },
            }}
          >
            Back to Events
          </Button>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={modernTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          p: 4,
        }}
      >
        {/* Main Content Card */}
        <Box
          sx={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box sx={{ p: 4, pb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/events')}
              sx={{
                mb: 3,
                textTransform: 'none',
                color: '#667eea',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: 'rgba(102, 126, 234, 0.08)',
                },
              }}
            >
              Back to Events
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    {event.name}
                  </Typography>
                  <Chip
                    label={isEducational ? 'Educational Event' : 'Client Event'}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      bgcolor: isEducational ? '#f3e8ff' : '#dbeafe',
                      color: isEducational ? '#7c3aed' : '#1e40af',
                      border: 'none',
                    }}
                  />
                  {event.website && (
                    <IconButton
                      href={event.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{
                        color: '#667eea',
                        '&:hover': {
                          bgcolor: 'rgba(102, 126, 234, 0.08)',
                        },
                      }}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                {event.description && (
                  <Typography variant="body2" sx={{ color: '#64748b', mb: 2, maxWidth: 600 }}>
                    {event.description}
                  </Typography>
                )}
                <EventStatusStepper
                  currentStatus={event.status}
                  onStatusChange={handleStatusChange}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  startIcon={<EditIcon />}
                  variant="outlined"
                  onClick={() => {
                    // TODO: Open edit dialog or navigate to edit page
                  }}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: '#667eea',
                    color: '#667eea',
                    '&:hover': {
                      borderColor: '#5568d3',
                      bgcolor: 'rgba(102, 126, 234, 0.08)',
                    },
                  }}
                >
                  Edit Event
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Error Alert */}
          {error && (
            <Box sx={{ px: 4 }}>
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            </Box>
          )}

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 4 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Overview" {...({ component: Link, to: `?tab=overview` } as any)} />
              {!isEducational && (
                <Tab
                  label={`Companies (${companies.length})`}
                  {...({ component: Link, to: `?tab=companies` } as any)}
                />
              )}
              {!isEducational && (
                <Tab
                  label={`Leads (${leads.length})`}
                  {...({ component: Link, to: `?tab=leads` } as any)}
                />
              )}
              <Tab label="Notes" {...({ component: Link, to: `?tab=notes` } as any)} />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box>
            {tabNames[tabValue] === 'overview' && (
              <>
                <EventOverviewTab
                  event={event}
                  companiesCount={companies.length}
                  icpCompaniesCount={icpCompaniesCount}
                  decisionMakersCount={decisionMakersCount}
                  cwpCount={cwpCount}
                />

                {/* Educational event additional details */}
                {isEducational && (
                  <Box sx={{ px: 4, pb: 4 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gap: 3,
                      }}
                    >
                      {/* Left column: metadata fields */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {event.organiser && (
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                              Organiser
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#334155' }}>
                              {event.organiser}
                            </Typography>
                          </Box>
                        )}
                        {event.audienceDescription && (
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                              Audience
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#334155' }}>
                              {event.audienceDescription}
                            </Typography>
                          </Box>
                        )}
                        {event.gating && (
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                              Gating
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#334155' }}>
                              {event.gating}
                            </Typography>
                          </Box>
                        )}
                        {event.tier && (
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                              Tier
                            </Typography>
                            <Chip
                              label={EDUCATIONAL_TIER_LABELS[event.tier]}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                bgcolor: EDUCATIONAL_TIER_COLORS[event.tier].bg,
                                color: EDUCATIONAL_TIER_COLORS[event.tier].text,
                                border: 'none',
                              }}
                            />
                          </Box>
                        )}
                        {event.collaborationPotential && (
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.5, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                              Collaboration Potential
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#334155' }}>
                              {event.collaborationPotential}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Right column: lists */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {event.keyTopics && event.keyTopics.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 600, mb: 1, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                              Key Topics
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                              {event.keyTopics.map((topic, idx) => (
                                <Chip
                                  key={idx}
                                  label={topic}
                                  size="small"
                                  sx={{
                                    fontWeight: 500,
                                    fontSize: '0.75rem',
                                    bgcolor: '#f1f5f9',
                                    color: '#475569',
                                    border: 'none',
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                        {event.questionsToAsk && event.questionsToAsk.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 600, mb: 1, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                              Questions to Ask
                            </Typography>
                            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                              {event.questionsToAsk.map((question, idx) => (
                                <Box component="li" key={idx} sx={{ mb: 0.5 }}>
                                  <Typography variant="body2" sx={{ color: '#334155' }}>
                                    {question}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                )}
              </>
            )}
            {!isEducational && tabNames[tabValue] === 'companies' && (
              companiesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress size={36} sx={{ color: '#667eea' }} />
                </Box>
              ) : (
                <EventCompaniesTab
                  eventId={eventId!}
                  companies={companies}
                  onAddCompany={addCompany}
                  onUpdateCompany={updateCompany}
                  onDeleteCompany={deleteCompany}
                />
              )
            )}
            {!isEducational && tabNames[tabValue] === 'leads' && (
              leadsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress size={36} sx={{ color: '#667eea' }} />
                </Box>
              ) : (
                <EventLeadsTab
                  eventId={eventId!}
                  leads={leads}
                  onAddLead={addLead}
                  onUpdateLead={updateLead}
                  onDeleteLead={deleteLead}
                />
              )
            )}
            {tabNames[tabValue] === 'notes' && (
              <EventNotesTab
                notes={event.notes || ''}
                onSave={handleNotesSave}
              />
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};
