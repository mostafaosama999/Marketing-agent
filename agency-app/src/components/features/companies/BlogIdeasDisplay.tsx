// src/components/features/companies/BlogIdeasDisplay.tsx
// Displays blog ideas as compact cards with approval functionality

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Collapse,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Lightbulb as IdeaIcon,
  CheckCircle as CheckIcon,
  School as LearnIcon,
  AutoAwesome as AngleIcon,
  Category as PlatformIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Check as ChooseIcon,
  Close as UnchooseIcon,
  ClearAll as ClearAllIcon,
} from '@mui/icons-material';

export interface BlogIdea {
  title: string;
  whyItFits: string;
  whatReaderLearns: string[];
  keyStackTools: string[];
  angleToAvoidDuplication: string;
  platform?: string;
  specificUse?: string;
  companyTool?: string;
}

interface BlogIdeasDisplayProps {
  ideas: BlogIdea[];
  chosenIdeaTitle?: string | null;
  onChooseIdea?: (ideaTitle: string) => void;
  onClearChoice?: () => void;
}

export const BlogIdeasDisplay: React.FC<BlogIdeasDisplayProps> = ({
  ideas,
  chosenIdeaTitle,
  onChooseIdea,
  onClearChoice,
}) => {
  // Track which cards are expanded - all expanded by default
  const [expandedCards, setExpandedCards] = useState<Set<number>>(
    new Set(ideas.map((_, index) => index))
  );

  const toggleExpand = (index: number) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <Box>
      {/* Section Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          mt: 4,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <IdeaIcon sx={{ color: '#667eea' }} />
          Blog Ideas ({ideas.length})
        </Typography>

        {/* Clear Choice Button */}
        {chosenIdeaTitle && onClearChoice && (
          <Tooltip title="Clear selected idea">
            <Button
              variant="text"
              size="small"
              startIcon={<ClearAllIcon />}
              onClick={onClearChoice}
              sx={{
                color: '#64748b',
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  color: '#ef4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                },
              }}
            >
              Clear Choice
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* Compact Cards List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {ideas.map((idea, index) => {
          const isChosen = chosenIdeaTitle === idea.title;
          const isExpanded = expandedCards.has(index);

          return (
            <Box
              key={index}
              sx={{
                background: isChosen
                  ? 'rgba(16, 185, 129, 0.05)'
                  : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: 2,
                border: isChosen
                  ? '2px solid #10b981'
                  : '1px solid #e2e8f0',
                boxShadow: isChosen
                  ? '0 4px 20px rgba(16, 185, 129, 0.15)'
                  : '0 2px 8px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: isChosen
                    ? '0 6px 24px rgba(16, 185, 129, 0.2)'
                    : '0 4px 16px rgba(0, 0, 0, 0.08)',
                },
              }}
            >
              {/* Compact Header */}
              <Box sx={{ p: 2 }}>
                {/* Row 1: Number + Title + Chosen Badge */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                  }}
                >
                  {/* Number Badge */}
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '6px',
                      background: isChosen
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </Box>

                  {/* Title + Badge */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 600,
                          color: '#1e293b',
                          fontSize: '14px',
                          lineHeight: 1.4,
                          flex: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {idea.title}
                      </Typography>

                      {/* Chosen Badge */}
                      {isChosen && (
                        <Chip
                          icon={<CheckIcon sx={{ fontSize: '14px !important' }} />}
                          label="CHOSEN"
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '10px',
                            height: '22px',
                            flexShrink: 0,
                            '& .MuiChip-icon': {
                              color: 'white',
                            },
                          }}
                        />
                      )}
                    </Box>

                    {/* Row 2: Tool Chips */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        mt: 1,
                      }}
                    >
                      {idea.platform && (
                        <Chip
                          icon={<PlatformIcon sx={{ fontSize: '12px !important' }} />}
                          label={idea.platform}
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)',
                            color: '#667eea',
                            fontWeight: 600,
                            fontSize: '10px',
                            height: '22px',
                            border: '1px solid #667eea44',
                          }}
                        />
                      )}
                      {idea.keyStackTools.slice(0, 3).map((tool, i) => (
                        <Chip
                          key={i}
                          label={tool}
                          size="small"
                          sx={{
                            bgcolor: '#f1f5f9',
                            color: '#475569',
                            fontWeight: 500,
                            fontSize: '10px',
                            height: '22px',
                          }}
                        />
                      ))}
                      {idea.keyStackTools.length > 3 && (
                        <Chip
                          label={`+${idea.keyStackTools.length - 3} more`}
                          size="small"
                          sx={{
                            bgcolor: '#f1f5f9',
                            color: '#64748b',
                            fontWeight: 500,
                            fontSize: '10px',
                            height: '22px',
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Row 3: Actions */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 1.5,
                    ml: 5,
                  }}
                >
                  {/* Details Toggle */}
                  <Button
                    size="small"
                    onClick={() => toggleExpand(index)}
                    startIcon={
                      isExpanded ? (
                        <ExpandLessIcon sx={{ fontSize: '18px' }} />
                      ) : (
                        <ExpandMoreIcon sx={{ fontSize: '18px' }} />
                      )
                    }
                    sx={{
                      color: '#667eea',
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '12px',
                      px: 1,
                      '&:hover': {
                        backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      },
                    }}
                  >
                    {isExpanded ? 'Hide Details' : 'Show Details'}
                  </Button>

                  {/* Choose/Unchoose Button */}
                  {onChooseIdea && (
                    <Button
                      size="small"
                      variant={isChosen ? 'outlined' : 'contained'}
                      startIcon={
                        isChosen ? (
                          <UnchooseIcon sx={{ fontSize: '16px' }} />
                        ) : (
                          <ChooseIcon sx={{ fontSize: '16px' }} />
                        )
                      }
                      onClick={() => {
                        if (isChosen && onClearChoice) {
                          onClearChoice();
                        } else {
                          onChooseIdea(idea.title);
                        }
                      }}
                      sx={
                        isChosen
                          ? {
                              borderColor: '#ef4444',
                              color: '#ef4444',
                              textTransform: 'none',
                              fontWeight: 600,
                              fontSize: '12px',
                              px: 2,
                              '&:hover': {
                                borderColor: '#dc2626',
                                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              },
                            }
                          : {
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              textTransform: 'none',
                              fontWeight: 600,
                              fontSize: '12px',
                              px: 2,
                              boxShadow: 'none',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                              },
                            }
                      }
                    >
                      {isChosen ? 'Unchoose' : 'Choose This'}
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Expandable Details */}
              <Collapse in={isExpanded}>
                <Box
                  sx={{
                    px: 2,
                    pb: 2,
                    pt: 0,
                    borderTop: '1px solid',
                    borderColor: isChosen ? '#10b98133' : '#e2e8f0',
                    bgcolor: isChosen ? 'rgba(16, 185, 129, 0.02)' : '#fafafa',
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    {/* Why It Fits */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <CheckIcon sx={{ color: '#10b981', fontSize: '16px' }} />
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            color: '#1e293b',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          Why It Fits
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#475569',
                          fontSize: '13px',
                          lineHeight: 1.6,
                          pl: 3,
                        }}
                      >
                        {idea.whyItFits}
                      </Typography>
                    </Box>

                    {/* What Reader Learns */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <LearnIcon sx={{ color: '#667eea', fontSize: '16px' }} />
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            color: '#1e293b',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          What You'll Learn
                        </Typography>
                      </Box>
                      <Box
                        component="ul"
                        sx={{
                          pl: 4.5,
                          pr: 1,
                          m: 0,
                          '& li': {
                            color: '#475569',
                            fontSize: '12px',
                            lineHeight: 1.7,
                            mb: 0.25,
                            '&::marker': {
                              color: '#667eea',
                            },
                          },
                        }}
                      >
                        {idea.whatReaderLearns.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </Box>
                    </Box>

                    {/* Differentiation Angle */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <AngleIcon sx={{ color: '#f59e0b', fontSize: '16px' }} />
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            color: '#1e293b',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          Differentiation Angle
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#475569',
                          fontSize: '13px',
                          lineHeight: 1.6,
                          pl: 3,
                        }}
                      >
                        {idea.angleToAvoidDuplication}
                      </Typography>
                    </Box>

                    {/* Additional Details (if available) */}
                    {(idea.specificUse || idea.companyTool) && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, pt: 1 }}>
                        {idea.specificUse && (
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#64748b',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                fontSize: '9px',
                                letterSpacing: '0.5px',
                                display: 'block',
                                mb: 0.25,
                              }}
                            >
                              Specific Use
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: '#475569',
                                fontSize: '12px',
                              }}
                            >
                              {idea.specificUse}
                            </Typography>
                          </Box>
                        )}
                        {idea.companyTool && (
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#64748b',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                fontSize: '9px',
                                letterSpacing: '0.5px',
                                display: 'block',
                                mb: 0.25,
                              }}
                            >
                              Company Tool
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: '#475569',
                                fontSize: '12px',
                              }}
                            >
                              {idea.companyTool}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    {/* All Tools (Full List) */}
                    {idea.keyStackTools.length > 3 && (
                      <Box sx={{ pt: 1 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#64748b',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            fontSize: '9px',
                            letterSpacing: '0.5px',
                            display: 'block',
                            mb: 0.75,
                          }}
                        >
                          All Tools & Technologies
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {idea.keyStackTools.map((tool, i) => (
                            <Chip
                              key={i}
                              label={tool}
                              size="small"
                              sx={{
                                bgcolor: '#f1f5f9',
                                color: '#475569',
                                fontWeight: 500,
                                fontSize: '10px',
                                height: '22px',
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
