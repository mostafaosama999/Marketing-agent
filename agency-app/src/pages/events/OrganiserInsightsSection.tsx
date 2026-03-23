// src/pages/events/OrganiserInsightsSection.tsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  VerifiedUser as VerifiedUserIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Language as LanguageIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material';
import {
  Event,
  CredibilityLevel,
  ReputationRating,
  RelevanceLevel,
  OrganizerResearch,
} from '../../types/event';

// ── Props ──

interface OrganiserInsightsSectionProps {
  event: Event;
  onResearch: () => Promise<void>;
  researching: boolean;
}

// ── Color Maps ──

const credibilityColors: Record<CredibilityLevel, string> = {
  high: '#16a34a',
  medium: '#f59e0b',
  low: '#ef4444',
  unknown: '#94a3b8',
};

const reputationColors: Record<ReputationRating, string> = {
  excellent: '#16a34a',
  good: '#22c55e',
  mixed: '#f59e0b',
  poor: '#ef4444',
  unknown: '#94a3b8',
};

const relevanceColors: Record<RelevanceLevel, string> = {
  high: '#16a34a',
  medium: '#f59e0b',
  low: '#ef4444',
};

// ── Helpers ──

const glassCard = {
  p: 2.5,
  borderRadius: 2.5,
  background: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    transform: 'translateY(-2px)',
  },
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function scoreChip(label: string, color: string) {
  return (
    <Chip
      label={label.charAt(0).toUpperCase() + label.slice(1)}
      size="small"
      sx={{
        bgcolor: `${color}18`,
        color,
        fontWeight: 600,
        fontSize: '0.75rem',
        border: `1px solid ${color}40`,
      }}
    />
  );
}

// ── Sub-components ──

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="subtitle2"
    sx={{ color: '#64748b', fontWeight: 600, mb: 1, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}
  >
    {children}
  </Typography>
);

// ── Empty State ──

const EmptyState: React.FC<{
  onResearch: () => Promise<void>;
  researching: boolean;
}> = ({ onResearch, researching }) => (
  <Paper elevation={0} sx={{ ...glassCard, p: 5, textAlign: 'center' }}>
    <Box
      sx={{
        width: 64,
        height: 64,
        borderRadius: 3,
        mx: 'auto',
        mb: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
      }}
    >
      <SearchIcon sx={{ fontSize: 32, color: '#764ba2' }} />
    </Box>
    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
      No Organizer Research Yet
    </Typography>
    <Typography variant="body2" sx={{ color: '#64748b', mb: 3, maxWidth: 420, mx: 'auto' }}>
      Run background research to learn about the credibility, reputation, and relevance of this
      event's organizer.
    </Typography>
    <Button
      variant="contained"
      disabled={researching}
      onClick={onResearch}
      startIcon={researching ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <SearchIcon />}
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        fontWeight: 600,
        textTransform: 'none',
        borderRadius: 2,
        px: 3,
        py: 1,
        '&:hover': {
          background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4192 100%)',
        },
        '&.Mui-disabled': {
          background: 'linear-gradient(135deg, #667eea80 0%, #764ba280 100%)',
          color: '#ffffffcc',
        },
      }}
    >
      {researching ? 'Researching...' : 'Research Organizer'}
    </Button>
    <Collapse in={researching}>
      <LinearProgress
        sx={{
          mt: 2,
          borderRadius: 1,
          bgcolor: '#667eea15',
          '& .MuiLinearProgress-bar': {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          },
        }}
      />
    </Collapse>
  </Paper>
);

// ── Research Results ──

const ResearchResults: React.FC<{
  research: OrganizerResearch;
  organizerName: string;
}> = ({ research, organizerName }) => {
  const { credibility, reputation, relevanceToCodeContent, notableSpeakers, typicalAttendeeProfile, socialPresence } =
    research;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 2.5,
      }}
    >
      {/* ── Left Column ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Summary */}
        <Paper elevation={0} sx={glassCard}>
          <SectionLabel>Summary</SectionLabel>
          <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.7 }}>
            {research.summary}
          </Typography>
        </Paper>

        {/* Credibility */}
        <Paper elevation={0} sx={glassCard}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <VerifiedUserIcon sx={{ fontSize: 18, color: credibilityColors[credibility.score] }} />
            <SectionLabel>Credibility</SectionLabel>
            <Box sx={{ ml: 'auto' }}>{scoreChip(credibility.score, credibilityColors[credibility.score])}</Box>
          </Box>
          <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6, mb: 1.5 }}>
            {credibility.reasoning}
          </Typography>
          {(credibility.yearsActive || credibility.pastEditions) && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {credibility.yearsActive != null && (
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  <strong>Years active:</strong> {credibility.yearsActive}
                </Typography>
              )}
              {credibility.pastEditions != null && (
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  <strong>Past editions:</strong> {credibility.pastEditions}
                </Typography>
              )}
            </Box>
          )}
        </Paper>

        {/* Reputation */}
        <Paper elevation={0} sx={glassCard}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <StarIcon sx={{ fontSize: 18, color: reputationColors[reputation.rating] }} />
            <SectionLabel>Reputation</SectionLabel>
            <Box sx={{ ml: 'auto' }}>{scoreChip(reputation.rating, reputationColors[reputation.rating])}</Box>
          </Box>
          {reputation.highlights.length > 0 && (
            <Box sx={{ mb: 1 }}>
              {reputation.highlights.map((h, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 0.5 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: '#16a34a',
                      mt: '7px',
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6 }}>
                    {h}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          {reputation.concerns.length > 0 && (
            <Box>
              {reputation.concerns.map((c, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 0.5 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: '#f59e0b',
                      mt: '7px',
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="body2" sx={{ color: '#92400e', lineHeight: 1.6 }}>
                    {c}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Box>

      {/* ── Right Column ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Relevance to CodeContent */}
        <Paper elevation={0} sx={glassCard}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <TrendingUpIcon sx={{ fontSize: 18, color: relevanceColors[relevanceToCodeContent.score] }} />
            <SectionLabel>Relevance to CodeContent</SectionLabel>
            <Box sx={{ ml: 'auto' }}>
              {scoreChip(relevanceToCodeContent.score, relevanceColors[relevanceToCodeContent.score])}
            </Box>
          </Box>
          <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6, mb: 1 }}>
            {relevanceToCodeContent.reasoning}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            <strong>Target audience:</strong> {relevanceToCodeContent.targetAudience}
          </Typography>
        </Paper>

        {/* Notable Speakers */}
        {notableSpeakers && notableSpeakers.length > 0 && (
          <Paper elevation={0} sx={glassCard}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <PeopleIcon sx={{ fontSize: 18, color: '#667eea' }} />
              <SectionLabel>Notable Speakers</SectionLabel>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {notableSpeakers.map((name, i) => (
                <Chip
                  key={i}
                  label={name}
                  size="small"
                  sx={{
                    bgcolor: '#667eea12',
                    color: '#4338ca',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    border: '1px solid #667eea25',
                  }}
                />
              ))}
            </Box>
          </Paper>
        )}

        {/* Social Presence */}
        {(socialPresence.website || socialPresence.linkedin || socialPresence.twitter || socialPresence.followersEstimate) && (
          <Paper elevation={0} sx={glassCard}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <LanguageIcon sx={{ fontSize: 18, color: '#667eea' }} />
              <SectionLabel>Social Presence</SectionLabel>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {socialPresence.website && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LanguageIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                  <Typography
                    variant="body2"
                    component="a"
                    href={socialPresence.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: '#667eea', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    Website
                  </Typography>
                </Box>
              )}
              {socialPresence.linkedin && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinkedInIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                  <Typography
                    variant="body2"
                    component="a"
                    href={socialPresence.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: '#667eea', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    LinkedIn
                  </Typography>
                </Box>
              )}
              {socialPresence.twitter && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 14, color: '#94a3b8', fontWeight: 700, lineHeight: 1 }}>𝕏</Typography>
                  <Typography
                    variant="body2"
                    component="a"
                    href={socialPresence.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: '#667eea', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    Twitter / X
                  </Typography>
                </Box>
              )}
              {socialPresence.followersEstimate && (
                <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5 }}>
                  <strong>Followers:</strong> {socialPresence.followersEstimate}
                </Typography>
              )}
            </Box>
          </Paper>
        )}

        {/* Typical Attendee Profile */}
        {typicalAttendeeProfile && (
          <Paper elevation={0} sx={glassCard}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <PeopleIcon sx={{ fontSize: 18, color: '#667eea' }} />
              <SectionLabel>Typical Attendee Profile</SectionLabel>
            </Box>
            <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6 }}>
              {typicalAttendeeProfile}
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

// ── Main Component ──

export const OrganiserInsightsSection: React.FC<OrganiserInsightsSectionProps> = ({
  event,
  onResearch,
  researching,
}) => {
  const research = event.organizerResearch;
  const organizerName = event.organiser || event.name;

  return (
    <Box sx={{ mt: 3 }}>
      {/* ── Section Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Organizer Insights
        </Typography>

        {research && (
          <>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Researched on {formatDate(research.researchedAt)}
            </Typography>
            <Tooltip title="Refresh Research">
              <span>
                <IconButton
                  size="small"
                  disabled={researching}
                  onClick={onResearch}
                  sx={{
                    color: '#667eea',
                    '&:hover': { bgcolor: '#667eea12' },
                  }}
                >
                  {researching ? <CircularProgress size={16} sx={{ color: '#667eea' }} /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          </>
        )}
      </Box>

      {/* ── Loading bar when refreshing existing research ── */}
      {research && researching && (
        <LinearProgress
          sx={{
            mb: 2,
            borderRadius: 1,
            bgcolor: '#667eea15',
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            },
          }}
        />
      )}

      {/* ── Content ── */}
      {research ? (
        <ResearchResults research={research} organizerName={organizerName} />
      ) : (
        <EmptyState onResearch={onResearch} researching={researching} />
      )}
    </Box>
  );
};
