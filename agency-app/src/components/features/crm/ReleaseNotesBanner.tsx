// src/components/features/crm/ReleaseNotesBanner.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Collapse,
  Button,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  AutoAwesome as SparkleIcon,
} from '@mui/icons-material';
import { ReleaseNote, UserReleaseNoteState } from '../../../types/releaseNotes';
import {
  markReleaseAsSeen,
  dismissRelease,
  shouldShowRelease,
  shouldAutoExpand,
} from '../../../services/api/releaseNotesService';

interface ReleaseNotesBannerProps {
  release: ReleaseNote | null;
  userState: UserReleaseNoteState | null;
  userId: string;
  onDismiss?: () => void;
}

export const ReleaseNotesBanner: React.FC<ReleaseNotesBannerProps> = ({
  release,
  userState,
  userId,
  onDismiss,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);

  // Determine if banner should be shown and auto-expanded
  useEffect(() => {
    if (!release || !userState) {
      setVisible(false);
      return;
    }

    // Check if user has dismissed this release
    if (!shouldShowRelease(release, userState)) {
      setVisible(false);
      return;
    }

    setVisible(true);

    // Auto-expand if user hasn't seen this release
    if (shouldAutoExpand(release, userState)) {
      setExpanded(true);
      // Mark as seen when auto-expanded
      markReleaseAsSeen(userId, release.id);
    }
  }, [release, userState, userId]);

  // Handle expand/collapse toggle
  const handleExpandClick = () => {
    if (!release) return;

    const newExpanded = !expanded;
    setExpanded(newExpanded);

    // Mark as seen when user manually expands
    if (newExpanded && userState && shouldAutoExpand(release, userState)) {
      markReleaseAsSeen(userId, release.id);
    }
  };

  // Handle dismiss (Don't show again)
  const handleDismiss = async () => {
    if (!release) return;

    try {
      await dismissRelease(userId, release.id);
      setVisible(false);
      onDismiss?.();
    } catch (error) {
      console.error('Error dismissing release note:', error);
    }
  };

  // Don't render if no release or not visible
  if (!release || !visible) {
    return null;
  }

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 100%)',
        backdropFilter: 'blur(30px)',
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
        mb: 2,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Header - Always visible */}
      <Box
        sx={{
          py: 1,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.15)',
          },
          transition: 'all 0.2s ease',
        }}
        onClick={handleExpandClick}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          {/* Changelog Icon */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <SparkleIcon sx={{ fontSize: '14px', color: 'white' }} />
          </Box>
          {/* Expand/Collapse Icon */}
          <IconButton
            size="small"
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
              color: 'white',
              p: 0.5,
            }}
          >
            <ExpandMoreIcon fontSize="small" />
          </IconButton>

          {/* Version Badge */}
          <Chip
            label={release.version}
            size="small"
            sx={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              fontWeight: 600,
              fontSize: '10px',
              height: '22px',
              padding: '0 10px',
              borderRadius: '11px',
            }}
          />

          {/* Title */}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.95)',
            }}
          >
            {release.title}
          </Typography>

          {/* Date */}
          <Chip
            label={release.createdAt.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            size="small"
            sx={{
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(10px)',
              color: 'rgba(255, 255, 255, 0.95)',
              fontWeight: 500,
              fontSize: '11px',
              height: '22px',
              borderRadius: '11px',
              ml: 'auto',
            }}
          />
        </Box>

        {/* Dismiss Button */}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          sx={{
            color: 'rgba(255, 255, 255, 0.8)',
            '&:hover': {
              color: 'white',
              background: 'rgba(255, 255, 255, 0.15)',
            },
          }}
          title="Don't show again"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Collapsible Content */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            px: 2.5,
            pb: 2.5,
            pt: 1.5,
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          {/* Description */}
          {release.description && (
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                mb: 1.5,
                lineHeight: 1.5,
                fontSize: '13px',
                whiteSpace: 'pre-line',
              }}
            >
              {release.description}
            </Typography>
          )}

          {/* Highlights */}
          {release.highlights && release.highlights.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: 'white',
                  mb: 1,
                  fontSize: '12px',
                }}
              >
                What's New:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {release.highlights.map((highlight, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                    }}
                  >
                    <CheckCircleIcon
                      sx={{
                        fontSize: '14px',
                        color: '#3b82f6',
                        mt: '2px',
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        lineHeight: 1.6,
                        fontSize: '12px',
                      }}
                    >
                      {highlight}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Action Buttons */}
          <Box sx={{ mt: 2.5, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              size="small"
              onClick={handleDismiss}
              sx={{
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '8px',
                textTransform: 'none',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              Don't show again
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleDismiss}
              sx={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white',
                fontSize: '12px',
                fontWeight: 500,
                padding: '6px 16px',
                borderRadius: '8px',
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 16px rgba(59, 130, 246, 0.35)',
                },
                transition: 'all 0.2s ease, transform 0.15s ease',
              }}
            >
              Got it!
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};
