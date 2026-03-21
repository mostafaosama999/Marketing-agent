// src/pages/events/EventDetailPage.tsx
import React, { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Box,
  Button,
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

const TAB_NAMES = ['overview', 'companies', 'leads', 'notes'] as const;

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

  // Tab state from URL
  const tabParam = searchParams.get('tab') || 'overview';
  const tabValue = Math.max(0, TAB_NAMES.indexOf(tabParam as typeof TAB_NAMES[number]));

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
    setSearchParams({ tab: TAB_NAMES[newValue] });
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
              <Tab
                label={`Companies (${companies.length})`}
                {...({ component: Link, to: `?tab=companies` } as any)}
              />
              <Tab
                label={`Leads (${leads.length})`}
                {...({ component: Link, to: `?tab=leads` } as any)}
              />
              <Tab label="Notes" {...({ component: Link, to: `?tab=notes` } as any)} />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box>
            {tabValue === 0 && (
              <EventOverviewTab
                event={event}
                companiesCount={companies.length}
                icpCompaniesCount={icpCompaniesCount}
                decisionMakersCount={decisionMakersCount}
                cwpCount={cwpCount}
              />
            )}
            {tabValue === 1 && (
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
            {tabValue === 2 && (
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
            {tabValue === 3 && (
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
