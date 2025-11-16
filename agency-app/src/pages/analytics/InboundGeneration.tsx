// src/pages/analytics/InboundGeneration.tsx
import React, {useState, useEffect} from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Button,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Email as EmailIcon,
  TrendingUp as TrendingIcon,
  CloudSync as CloudSyncIcon,
  Psychology as PsychologyIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import EmailsList from '../../components/inbound/EmailsList';
import GmailConnectionBanner from '../../components/inbound/GmailConnectionBanner';
import AITrendsList from '../../components/inbound/AITrendsList';
import AITrendsHistory from '../../components/inbound/AITrendsHistory';
import LinkedInPostGeneration from '../../components/inbound/LinkedInPostGeneration';
import {
  EmailData,
  SyncMetadata,
  subscribeToEmails,
  subscribeToSyncMetadata,
  manualSyncEmails,
} from '../../services/api/gmailService';
import {
  generateAITrends,
  subscribeToAITrendsSessions,
} from '../../services/api/aiTrendsService';
import {AITrend, AITrendsSession} from '../../types/aiTrends';
import {useAuth} from '../../contexts/AuthContext';
import CompetitorSyncPasteDialog from '../../components/features/competitors/CompetitorSyncPasteDialog';
import CompetitorContentView from '../../components/features/competitors/CompetitorContentView';

const InboundGeneration: React.FC = () => {
  const {user} = useAuth();
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [emailCount, setEmailCount] = useState<number>(50); // Default: 50 emails
  const [daysBack, setDaysBack] = useState<number>(7); // Default: 7 days
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({open: false, message: '', severity: 'info'});

  // Competitor sync dialog state
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  // AI Trends state
  const [aiTrends, setAiTrends] = useState<AITrend[]>([]);
  const [aiTrendsSessions, setAiTrendsSessions] = useState<AITrendsSession[]>([]);
  const [generatingTrends, setGeneratingTrends] = useState(false);
  const [trendsHistoryOpen, setTrendsHistoryOpen] = useState(false);
  const [trendsEmailCount, setTrendsEmailCount] = useState<number>(50);

  // Accordion expansion state
  const [expandedAccordions, setExpandedAccordions] = useState<{
    emails: boolean;
    competitors: boolean;
    aiTrends: boolean;
  }>({
    emails: false,
    competitors: false,
    aiTrends: false,
  });

  const handleAccordionChange = (panel: 'emails' | 'competitors' | 'aiTrends') => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [panel]: isExpanded,
    }));
  };

  // Subscribe to emails
  useEffect(() => {
    const unsubscribe = subscribeToEmails((fetchedEmails) => {
      setEmails(fetchedEmails);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to sync metadata
  useEffect(() => {
    const unsubscribe = subscribeToSyncMetadata((metadata) => {
      setSyncMetadata(metadata);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to AI trends sessions
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToAITrendsSessions(
      user.uid,
      (sessions) => {
        setAiTrendsSessions(sessions);
        // Set the most recent session's trends as current
        if (sessions.length > 0) {
          setAiTrends(sessions[0].trends);
        }
      },
      10
    );

    return () => unsubscribe();
  }, [user]);

  // Handle manual sync
  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const result = await manualSyncEmails(emailCount, daysBack);

      setSnackbar({
        open: true,
        message: result.message,
        severity: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync emails';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  // Handle AI trends generation
  const handleGenerateTrends = async () => {
    setGeneratingTrends(true);
    try {
      const result = await generateAITrends(trendsEmailCount);

      setSnackbar({
        open: true,
        message: result.message,
        severity: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate AI trends';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setGeneratingTrends(false);
    }
  };

  const formatLastSyncTime = (date: Date | null): string => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      p: 4,
      pb: 10,
    }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <AutoAwesomeIcon sx={{ fontSize: 40, color: '#667eea' }} />
          <Typography variant="h4" sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}>
            Inbound Generation
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ color: '#64748b' }}>
          AI-powered LinkedIn post suggestions from your newsletter emails, competitor content, and AI trends
        </Typography>
      </Box>

      {/* Gmail Connection Banner */}
      <GmailConnectionBanner />

      {/* Context Sources Section - Collapsible Metadata */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{
          mb: 2,
          fontWeight: 600,
          color: '#334155',
        }}>
          Content Sources
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: '#64748b' }}>
          Expand each section to view and manage your content sources for LinkedIn post generation
        </Typography>

        {/* Newsletter Emails Accordion */}
        <Accordion
          expanded={expandedAccordions.emails}
          onChange={handleAccordionChange('emails')}
          sx={{
            borderRadius: 3,
            mb: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: '#667eea' }} />}
            sx={{
              '& .MuiAccordionSummary-content': {
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              },
            }}
          >
            <EmailIcon sx={{ fontSize: 28, color: '#667eea' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Newsletter Emails
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                {emails.length} emails synced
                {syncMetadata && ` • Last sync: ${formatLastSyncTime(syncMetadata.lastSync)}`}
              </Typography>
            </Box>
            {!expandedAccordions.emails && (
              <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                <Chip
                  label={`${emails.length} emails`}
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
              </Box>
            )}
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {/* Sync Status */}
            {syncMetadata && (
              <Box sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                backgroundColor: '#f8fafc',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {syncMetadata.lastSyncSuccess ? (
                      <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />
                    ) : (
                      <ErrorIcon sx={{ color: '#ef4444', fontSize: 20 }} />
                    )}
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Last sync: {formatLastSyncTime(syncMetadata.lastSync)}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${syncMetadata.lastSyncEmailsStored} new / ${syncMetadata.lastSyncEmailsFetched} total`}
                    size="small"
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                  {syncMetadata.lastSyncType && (
                    <Chip
                      label={syncMetadata.lastSyncType === 'manual' ? 'Manual Sync' : 'Scheduled Sync'}
                      size="small"
                      sx={{
                        backgroundColor: '#e2e8f0',
                        color: '#64748b',
                        fontWeight: 600,
                      }}
                    />
                  )}
                  {syncMetadata.lastSyncErrors.length > 0 && (
                    <Typography variant="caption" sx={{ color: '#ef4444', ml: 'auto' }}>
                      {syncMetadata.lastSyncErrors[0]}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* Controls */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Days Back</InputLabel>
                <Select
                  value={daysBack}
                  label="Days Back"
                  onChange={(e) => setDaysBack(Number(e.target.value))}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e2e8f0',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    },
                  }}
                >
                  <MenuItem value={3}>Last 3 days</MenuItem>
                  <MenuItem value={7}>Last 7 days</MenuItem>
                  <MenuItem value={14}>Last 14 days</MenuItem>
                  <MenuItem value={30}>Last 30 days</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Email Count</InputLabel>
                <Select
                  value={emailCount}
                  label="Email Count"
                  onChange={(e) => setEmailCount(Number(e.target.value))}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e2e8f0',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    },
                  }}
                >
                  <MenuItem value={10}>Last 10</MenuItem>
                  <MenuItem value={50}>Last 50</MenuItem>
                  <MenuItem value={100}>Last 100</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={syncing ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SyncIcon />}
                onClick={handleManualSync}
                disabled={syncing}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 600,
                  textTransform: 'none',
                  px: 3,
                  borderRadius: 2,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                  },
                  '&:disabled': {
                    background: '#e2e8f0',
                    color: '#94a3b8',
                  },
                }}
              >
                {syncing ? 'Syncing...' : 'Sync Gmail'}
              </Button>
            </Box>

            {/* Emails List */}
            <EmailsList emails={emails} loading={loading} />
          </AccordionDetails>
        </Accordion>

        {/* Competitor Content Accordion */}
        <Accordion
          expanded={expandedAccordions.competitors}
          onChange={handleAccordionChange('competitors')}
          sx={{
            borderRadius: 3,
            mb: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: '#667eea' }} />}
            sx={{
              '& .MuiAccordionSummary-content': {
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              },
            }}
          >
            <TrendingIcon sx={{ fontSize: 28, color: '#667eea' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Competitor Content
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Track and analyze competitor LinkedIn posts
              </Typography>
            </Box>
            {!expandedAccordions.competitors && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<CloudSyncIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  setSyncDialogOpen(true);
                }}
                sx={{
                  mr: 2,
                  borderColor: '#667eea',
                  color: '#667eea',
                  '&:hover': {
                    borderColor: '#5568d3',
                    backgroundColor: '#ede9fe',
                  },
                }}
              >
                Sync Posts
              </Button>
            )}
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<CloudSyncIcon />}
                onClick={() => setSyncDialogOpen(true)}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                  },
                }}
              >
                Sync Competitor Posts
              </Button>
            </Box>
            <CompetitorContentView />
          </AccordionDetails>
        </Accordion>

        {/* AI Trends Accordion */}
        <Accordion
          expanded={expandedAccordions.aiTrends}
          onChange={handleAccordionChange('aiTrends')}
          sx={{
            borderRadius: 3,
            mb: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: '#667eea' }} />}
            sx={{
              '& .MuiAccordionSummary-content': {
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              },
            }}
          >
            <PsychologyIcon sx={{ fontSize: 28, color: '#667eea' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                AI Trends Analysis
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                {aiTrends.length} trends identified for leadership posts
              </Typography>
            </Box>
            {!expandedAccordions.aiTrends && (
              <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                <Chip
                  label={`${aiTrends.length} trends`}
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
              </Box>
            )}
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Analyze Emails</InputLabel>
                <Select
                  value={trendsEmailCount}
                  label="Analyze Emails"
                  onChange={(e) => setTrendsEmailCount(Number(e.target.value))}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e2e8f0',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    },
                  }}
                >
                  <MenuItem value={10}>Last 10</MenuItem>
                  <MenuItem value={30}>Last 30</MenuItem>
                  <MenuItem value={50}>Last 50</MenuItem>
                  <MenuItem value={100}>Last 100</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<HistoryIcon />}
                onClick={() => setTrendsHistoryOpen(true)}
                disabled={aiTrendsSessions.length === 0}
                sx={{
                  borderColor: '#667eea',
                  color: '#667eea',
                  '&:hover': {
                    borderColor: '#5568d3',
                    backgroundColor: '#ede9fe',
                  },
                }}
              >
                History
              </Button>
              <Button
                variant="contained"
                startIcon={generatingTrends ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <PsychologyIcon />}
                onClick={handleGenerateTrends}
                disabled={generatingTrends || emails.length === 0}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                  },
                  '&:disabled': {
                    background: '#e2e8f0',
                    color: '#94a3b8',
                  },
                }}
              >
                {generatingTrends ? 'Analyzing...' : 'Generate AI Trends'}
              </Button>
            </Box>
            <AITrendsList trends={aiTrends} loading={generatingTrends} />
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* LinkedIn Post Generation Section */}
      <Box sx={{ mb: 4 }}>
        <LinkedInPostGeneration
          aiTrends={aiTrends}
          userId={user?.uid}
        />
      </Box>

      {/* AI Trends History Dialog */}
      {user && (
        <AITrendsHistory
          open={trendsHistoryOpen}
          onClose={() => setTrendsHistoryOpen(false)}
          sessions={aiTrendsSessions}
          userId={user.uid}
        />
      )}

      {/* Speed Dial for Actions */}
      <SpeedDial
        ariaLabel="Inbound generation actions"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
        icon={<SpeedDialIcon />}
        onClose={() => setSpeedDialOpen(false)}
        onOpen={() => setSpeedDialOpen(true)}
        open={speedDialOpen}
        FabProps={{
          sx: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
            },
          },
        }}
      >
        <SpeedDialAction
          icon={syncing ? <CircularProgress size={24} /> : <SyncIcon />}
          tooltipTitle="Sync Gmail"
          onClick={() => {
            if (!syncing) {
              setSpeedDialOpen(false);
              handleManualSync();
            }
          }}
        />
        <SpeedDialAction
          icon={<CloudSyncIcon />}
          tooltipTitle="Sync Competitor Posts"
          onClick={() => {
            setSpeedDialOpen(false);
            setSyncDialogOpen(true);
          }}
        />
      </SpeedDial>

      {/* Competitor Sync Dialog */}
      <CompetitorSyncPasteDialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InboundGeneration;
