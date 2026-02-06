// src/components/features/companies/BlogIdeasDisplay.tsx
// Displays blog ideas as compact cards with approval functionality
// Now supports V1/V2 version comparison tabs

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Collapse,
  Divider,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Badge,
  LinearProgress,
  CircularProgress,
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
  Science as V2Icon,
  History as V1Icon,
  Star as StarIcon,
  TrendingUp as ScoreIcon,
  Psychology as AIConceptIcon,
  Bolt as TutorialIcon,
  Merge as V3Icon,
  Error as ErrorIcon,
  BugReport as DebugIcon,
} from '@mui/icons-material';
import { V2StageProgressDisplay } from './V2StageProgressDisplay';
import { CompanyProfileV2, ContentGap, RawConceptSimple, BlogIdeaV3 as BlogIdeaV3Type } from '../../../services/firebase/cloudFunctions';
import { MatchedConceptSimple } from './V2StageProgressDisplay';

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

// V2 enhanced idea interface
export interface BlogIdeaV2 {
  title: string;
  whyOnlyTheyCanWriteThis: string;
  specificEvidence: string;
  targetGap: string;
  audienceFit: string;
  whatReaderLearns: string[];
  keyStackTools: string[];
  angleToAvoidDuplication: string;
  differentiatorUsed?: string;
  contentGapFilled?: string;
  probability?: number;
  // AI Concept fields (V2 enhancement)
  aiConcept?: string;              // Which AI concept this relates to (if any)
  isConceptTutorial?: boolean;     // Is this a bottom-of-funnel AI tutorial?
  conceptFitScore?: number;        // How well the concept fits (from matching)
}

// Validation scores for V2 ideas
export interface IdeaValidationScores {
  personalization: number;
  uniqueness: number;
  buzzwordDensity: number;
  audienceRelevance: number;
  timeliness: number;
  overallScore: number;
}

export interface IdeaValidationResult {
  idea: BlogIdeaV2;
  isValid: boolean;
  scores: IdeaValidationScores;
  rejectionReason?: string;
  improvementSuggestion?: string;
}

// Props for single-version display (backward compatible)
interface BlogIdeasDisplayProps {
  ideas: BlogIdea[];
  chosenIdeaTitle?: string | null;
  onChooseIdea?: (ideaTitle: string, sourceVersion?: 'v1' | 'v2') => void;
  onClearChoice?: () => void;
}

// Matched AI concept for display
export interface MatchedConceptDisplay {
  name: string;
  fitScore: number;
  fitReason: string;
}

// Props for dual-version display
export interface BlogIdeasDisplayDualProps {
  v1Ideas: BlogIdea[];
  v2Ideas: BlogIdeaV2[];
  v2ValidationResults?: IdeaValidationResult[];
  // AI Concept matching info (NEW)
  matchedConcepts?: MatchedConceptDisplay[];
  conceptsEvaluated?: number;
  chosenIdeaTitle?: string | null;
  chosenIdeaVersion?: 'v1' | 'v2' | null;
  onChooseIdea?: (ideaTitle: string, sourceVersion: 'v1' | 'v2') => void;
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

/**
 * V2 Idea Card Component
 * Enhanced display for V2 ideas with validation scores
 */
const V2IdeaCard: React.FC<{
  idea: BlogIdeaV2;
  index: number;
  isChosen: boolean;
  isExpanded: boolean;
  validationResult?: IdeaValidationResult;
  onToggleExpand: () => void;
  onChoose: () => void;
  onUnchoose: () => void;
}> = ({
  idea,
  index,
  isChosen,
  isExpanded,
  validationResult,
  onToggleExpand,
  onChoose,
  onUnchoose,
}) => {
  const scores = validationResult?.scores;

  return (
    <Box
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
        {/* Row 1: Number + Title + Score Badge */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          {/* Number Badge with Score Indicator */}
          <Box sx={{ position: 'relative' }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '6px',
                background: isChosen
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
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
          </Box>

          {/* Title + Badges */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Typography
                sx={{
                  fontWeight: 600,
                  color: '#1e293b',
                  fontSize: '14px',
                  lineHeight: 1.4,
                  flex: 1,
                  minWidth: '200px',
                }}
              >
                {idea.title}
              </Typography>

              {/* AI Concept Tutorial Badge */}
              {idea.isConceptTutorial && idea.aiConcept && (
                <Tooltip title={`AI Concept Tutorial: ${idea.aiConcept}${idea.conceptFitScore ? ` (${idea.conceptFitScore}% fit)` : ''}`}>
                  <Chip
                    icon={<AIConceptIcon sx={{ fontSize: '14px !important' }} />}
                    label={idea.aiConcept}
                    size="small"
                    sx={{
                      background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
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
                </Tooltip>
              )}

              {/* Score Badge */}
              {scores && (
                <Chip
                  icon={<ScoreIcon sx={{ fontSize: '14px !important' }} />}
                  label={`${scores.overallScore}%`}
                  size="small"
                  sx={{
                    background:
                      scores.overallScore >= 80
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : scores.overallScore >= 70
                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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

            {/* Row 2: Tool Chips + Target Gap */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                mt: 1,
              }}
            >
              {idea.targetGap && (
                <Chip
                  label={idea.targetGap}
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #8b5cf622 0%, #6366f122 100%)',
                    color: '#7c3aed',
                    fontWeight: 600,
                    fontSize: '10px',
                    height: '22px',
                    border: '1px solid #8b5cf644',
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

        {/* Validation Scores Bar (mini) */}
        {scores && (
          <Box sx={{ mt: 1.5, ml: 5 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Tooltip title="Personalization: References company-specific facts">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '10px', color: '#64748b' }}>Personal</Typography>
                  <Box sx={{ width: 40, height: 4, bgcolor: '#e2e8f0', borderRadius: 2 }}>
                    <Box
                      sx={{
                        width: `${scores.personalization}%`,
                        height: '100%',
                        bgcolor: scores.personalization >= 70 ? '#10b981' : '#f59e0b',
                        borderRadius: 2,
                      }}
                    />
                  </Box>
                </Box>
              </Tooltip>
              <Tooltip title="Uniqueness: Only this company could write this">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '10px', color: '#64748b' }}>Unique</Typography>
                  <Box sx={{ width: 40, height: 4, bgcolor: '#e2e8f0', borderRadius: 2 }}>
                    <Box
                      sx={{
                        width: `${scores.uniqueness}%`,
                        height: '100%',
                        bgcolor: scores.uniqueness >= 70 ? '#10b981' : '#f59e0b',
                        borderRadius: 2,
                      }}
                    />
                  </Box>
                </Box>
              </Tooltip>
              <Tooltip title="Audience Fit: Matches their content style">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '10px', color: '#64748b' }}>Audience</Typography>
                  <Box sx={{ width: 40, height: 4, bgcolor: '#e2e8f0', borderRadius: 2 }}>
                    <Box
                      sx={{
                        width: `${scores.audienceRelevance}%`,
                        height: '100%',
                        bgcolor: scores.audienceRelevance >= 70 ? '#10b981' : '#f59e0b',
                        borderRadius: 2,
                      }}
                    />
                  </Box>
                </Box>
              </Tooltip>
            </Box>
          </Box>
        )}

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
            onClick={onToggleExpand}
            startIcon={
              isExpanded ? (
                <ExpandLessIcon sx={{ fontSize: '18px' }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: '18px' }} />
              )
            }
            sx={{
              color: '#8b5cf6',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '12px',
              px: 1,
              '&:hover': {
                backgroundColor: 'rgba(139, 92, 246, 0.08)',
              },
            }}
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </Button>

          {/* Choose/Unchoose Button */}
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
            onClick={isChosen ? onUnchoose : onChoose}
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
            {/* Why Only They Can Write This */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                <StarIcon sx={{ color: '#8b5cf6', fontSize: '16px' }} />
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
                  Why Only They Can Write This
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
                {idea.whyOnlyTheyCanWriteThis}
              </Typography>
            </Box>

            {/* Specific Evidence */}
            {idea.specificEvidence && (
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
                    Specific Evidence
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
                  {idea.specificEvidence}
                </Typography>
              </Box>
            )}

            {/* Audience Fit */}
            {idea.audienceFit && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  <PlatformIcon sx={{ color: '#6366f1', fontSize: '16px' }} />
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
                    Audience Fit
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
                  {idea.audienceFit}
                </Typography>
              </Box>
            )}

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
                      color: '#8b5cf6',
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

            {/* AI Concept Tutorial Info */}
            {idea.isConceptTutorial && idea.aiConcept && (
              <Box
                sx={{
                  p: 1.5,
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(190, 24, 93, 0.08) 100%)',
                  borderRadius: 2,
                  border: '1px solid rgba(236, 72, 153, 0.2)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                  <TutorialIcon sx={{ color: '#ec4899', fontSize: '16px' }} />
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      color: '#be185d',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    AI Concept Tutorial
                  </Typography>
                  {idea.conceptFitScore && (
                    <Chip
                      label={`${idea.conceptFitScore}% fit`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(236, 72, 153, 0.15)',
                        color: '#be185d',
                        fontWeight: 600,
                        fontSize: '9px',
                        height: '18px',
                      }}
                    />
                  )}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#831843',
                    fontSize: '12px',
                    lineHeight: 1.6,
                  }}
                >
                  This idea combines <strong>{idea.aiConcept}</strong> with the company's product to create a practical, implementation-focused tutorial.
                </Typography>
              </Box>
            )}

            {/* Differentiator Used / Content Gap Filled */}
            {(idea.differentiatorUsed || idea.contentGapFilled) && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, pt: 1 }}>
                {idea.differentiatorUsed && (
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
                      Differentiator Used
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#475569',
                        fontSize: '12px',
                      }}
                    >
                      {idea.differentiatorUsed}
                    </Typography>
                  </Box>
                )}
                {idea.contentGapFilled && (
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
                      Content Gap Filled
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#475569',
                        fontSize: '12px',
                      }}
                    >
                      {idea.contentGapFilled}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

/**
 * Dual Version Blog Ideas Display
 * Shows V1 and V2 ideas in separate tabs for comparison
 */
export const BlogIdeasDisplayDual: React.FC<BlogIdeasDisplayDualProps> = ({
  v1Ideas,
  v2Ideas,
  v2ValidationResults,
  matchedConcepts,
  conceptsEvaluated,
  chosenIdeaTitle,
  chosenIdeaVersion,
  onChooseIdea,
  onClearChoice,
}) => {
  const [activeTab, setActiveTab] = useState<'v1' | 'v2'>('v2'); // Default to V2
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleExpand = (version: string, index: number) => {
    const key = `${version}-${index}`;
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const getValidationResult = (index: number): IdeaValidationResult | undefined => {
    return v2ValidationResults?.[index];
  };

  const handleChoose = (title: string, version: 'v1' | 'v2') => {
    if (onChooseIdea) {
      onChooseIdea(title, version);
    }
  };

  const isIdeaChosen = (title: string, version: 'v1' | 'v2'): boolean => {
    return chosenIdeaTitle === title && chosenIdeaVersion === version;
  };

  return (
    <Box>
      {/* Section Header with Version Tabs */}
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
          Blog Ideas
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

      {/* Version Tabs */}
      <Box
        sx={{
          borderBottom: '1px solid #e2e8f0',
          mb: 2,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            minHeight: 42,
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              background: activeTab === 'v2'
                ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            },
          }}
        >
          <Tab
            value="v2"
            icon={
              <Badge
                badgeContent={v2Ideas.length}
                color="secondary"
                sx={{
                  '& .MuiBadge-badge': {
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '10px',
                  },
                }}
              >
                <V2Icon sx={{ fontSize: '18px' }} />
              </Badge>
            }
            label="V2 (Personalized)"
            iconPosition="start"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13px',
              minHeight: 42,
              color: activeTab === 'v2' ? '#8b5cf6' : '#64748b',
              '&.Mui-selected': {
                color: '#8b5cf6',
              },
            }}
          />
          <Tab
            value="v1"
            icon={
              <Badge
                badgeContent={v1Ideas.length}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '10px',
                  },
                }}
              >
                <V1Icon sx={{ fontSize: '18px' }} />
              </Badge>
            }
            label="V1 (Template)"
            iconPosition="start"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13px',
              minHeight: 42,
              color: activeTab === 'v1' ? '#667eea' : '#64748b',
              '&.Mui-selected': {
                color: '#667eea',
              },
            }}
          />
        </Tabs>
      </Box>

      {/* Version Description */}
      <Box
        sx={{
          mb: 2,
          p: 1.5,
          background: activeTab === 'v2'
            ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)'
            : 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)',
          borderRadius: 2,
          border: `1px solid ${activeTab === 'v2' ? '#8b5cf622' : '#667eea22'}`,
        }}
      >
        <Typography
          sx={{
            fontSize: '12px',
            color: activeTab === 'v2' ? '#7c3aed' : '#667eea',
            fontWeight: 500,
          }}
        >
          {activeTab === 'v2'
            ? 'V2 ideas are generated using a 5-stage pipeline that analyzes company differentiators, matches trending AI concepts, content gaps, and validates each idea for personalization and uniqueness.'
            : 'V1 ideas are generated using template-based prompts with trending AI concepts. These may be more generic across different companies.'}
        </Typography>
      </Box>

      {/* Matched AI Concepts Summary (V2 only) */}
      {activeTab === 'v2' && matchedConcepts && matchedConcepts.length > 0 && (
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.06) 0%, rgba(190, 24, 93, 0.06) 100%)',
            borderRadius: 2,
            border: '1px solid rgba(236, 72, 153, 0.15)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AIConceptIcon sx={{ color: '#ec4899', fontSize: '18px' }} />
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#be185d',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              AI Concepts Matched ({matchedConcepts.length}/{conceptsEvaluated || '?'})
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {matchedConcepts.map((concept, idx) => (
              <Tooltip key={idx} title={concept.fitReason}>
                <Chip
                  icon={<TutorialIcon sx={{ fontSize: '12px !important' }} />}
                  label={`${concept.name} (${concept.fitScore}%)`}
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(190, 24, 93, 0.15) 100%)',
                    color: '#be185d',
                    fontWeight: 600,
                    fontSize: '10px',
                    height: '24px',
                    border: '1px solid rgba(236, 72, 153, 0.3)',
                    '& .MuiChip-icon': {
                      color: '#ec4899',
                    },
                  }}
                />
              </Tooltip>
            ))}
          </Box>
          <Typography
            sx={{
              fontSize: '11px',
              color: '#831843',
              mt: 1,
              fontStyle: 'italic',
            }}
          >
            Ideas marked with the pink AI badge are bottom-of-funnel tutorials combining these concepts with the company's product.
          </Typography>
        </Box>
      )}

      {/* Ideas List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {activeTab === 'v2' ? (
          // V2 Ideas with validation scores
          v2Ideas.map((idea, index) => (
            <V2IdeaCard
              key={index}
              idea={idea}
              index={index}
              isChosen={isIdeaChosen(idea.title, 'v2')}
              isExpanded={expandedCards.has(`v2-${index}`)}
              validationResult={getValidationResult(index)}
              onToggleExpand={() => toggleExpand('v2', index)}
              onChoose={() => handleChoose(idea.title, 'v2')}
              onUnchoose={() => onClearChoice?.()}
            />
          ))
        ) : (
          // V1 Ideas - use existing card style
          v1Ideas.map((idea, index) => {
            const isChosen = isIdeaChosen(idea.title, 'v1');
            const isExpanded = expandedCards.has(`v1-${index}`);

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
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                    }}
                  >
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
                          }}
                        >
                          {idea.title}
                        </Typography>

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
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mt: 1.5,
                      ml: 5,
                    }}
                  >
                    <Button
                      size="small"
                      onClick={() => toggleExpand('v1', index)}
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
                          handleChoose(idea.title, 'v1');
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
                  </Box>
                </Box>

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
                    </Box>
                  </Box>
                </Collapse>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

// ============================================================
// Triple Version Display (V1/V2/V3) with independent tab states
// ============================================================

export type VersionStatus = 'idle' | 'generating' | 'complete' | 'error';

export interface V2StageResultsForDisplay {
  profile?: CompanyProfileV2;
  matchedConcepts?: MatchedConceptSimple[];
  allConcepts?: RawConceptSimple[];
  conceptsEvaluated?: number;
  conceptsCached?: boolean;
  conceptsStale?: boolean;
  conceptsAgeHours?: number;
  contentGaps?: ContentGap[];
  rawIdeas?: BlogIdeaV2[];
  validatedIdeas?: IdeaValidationResult[];
  currentStage: 'idle' | 'stage1' | 'stage1_5' | 'stage2' | 'stage3' | 'stage4' | 'complete';
}

export interface BlogIdeasDisplayTripleProps {
  // V1
  v1Ideas: BlogIdea[];
  v1Status: VersionStatus;
  // V2
  v2Ideas: BlogIdeaV2[];
  v2Status: VersionStatus;
  v2ValidationResults?: IdeaValidationResult[];
  v2MatchedConcepts?: MatchedConceptDisplay[];
  v2StageResults?: V2StageResultsForDisplay;
  // V3
  v3Ideas: BlogIdeaV3Type[];
  v3Status: VersionStatus;
  v3Debug?: any;
  onOpenV3Debug?: () => void;
  // Common
  chosenIdeaTitle?: string | null;
  chosenIdeaVersion?: 'v1' | 'v2' | 'v3' | null;
  onChooseIdea?: (title: string, version: 'v1' | 'v2' | 'v3') => void;
  onClearChoice?: () => void;
}

const mapV3IdeaForDisplay = (idea: BlogIdeaV3Type): BlogIdea => ({
  title: idea.title,
  whyItFits: `${idea.whyOnlyTheyCanWriteThis} Trend signal: ${idea.trendEvidence}`,
  whatReaderLearns: idea.whatReaderLearns,
  keyStackTools: idea.keyStackTools,
  angleToAvoidDuplication: idea.angleToAvoidDuplication,
  platform: idea.aiConcept || undefined,
  specificUse: idea.productTrendIntegration || undefined,
  companyTool: idea.differentiatorUsed || undefined,
});

/**
 * Tab loading/error/empty state renderer
 */
const TabStatusDisplay: React.FC<{
  status: VersionStatus;
  version: string;
  color: string;
}> = ({ status, version, color }) => {
  if (status === 'generating') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 6,
        }}
      >
        <CircularProgress size={40} thickness={4} sx={{ color, mb: 2 }} />
        <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '14px', mb: 0.5 }}>
          {version} is generating...
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '12px' }}>
          Ideas will appear here when ready
        </Typography>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 6,
        }}
      >
        <ErrorIcon sx={{ color: '#ef4444', fontSize: 40, mb: 1 }} />
        <Typography sx={{ fontWeight: 600, color: '#ef4444', fontSize: '14px' }}>
          {version} generation failed
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '12px', mt: 0.5 }}>
          Other versions may still succeed
        </Typography>
      </Box>
    );
  }

  // idle
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
      }}
    >
      <Typography sx={{ color: '#94a3b8', fontSize: '13px' }}>
        {version} has not started yet
      </Typography>
    </Box>
  );
};

export const BlogIdeasDisplayTriple: React.FC<BlogIdeasDisplayTripleProps> = ({
  v1Ideas,
  v1Status,
  v2Ideas,
  v2Status,
  v2ValidationResults,
  v2MatchedConcepts,
  v2StageResults,
  v3Ideas,
  v3Status,
  v3Debug,
  onOpenV3Debug,
  chosenIdeaTitle,
  chosenIdeaVersion,
  onChooseIdea,
  onClearChoice,
}) => {
  const [activeTab, setActiveTab] = useState<'v1' | 'v2' | 'v3'>('v1');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const userSwitchedTab = useRef(false);

  // Auto-switch to first completed tab if user hasn't manually switched
  useEffect(() => {
    if (userSwitchedTab.current) return;

    // Priority: V1 > V2 > V3 for auto-switch
    if (v1Status === 'complete' && v1Ideas.length > 0) {
      setActiveTab('v1');
    } else if (v2Status === 'complete' && v2Ideas.length > 0) {
      setActiveTab('v2');
    } else if (v3Status === 'complete' && v3Ideas.length > 0) {
      setActiveTab('v3');
    }
  }, [v1Status, v2Status, v3Status, v1Ideas.length, v2Ideas.length, v3Ideas.length]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: 'v1' | 'v2' | 'v3') => {
    userSwitchedTab.current = true;
    setActiveTab(newValue);
  };

  const toggleExpand = (version: string, index: number) => {
    const key = `${version}-${index}`;
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const getValidationResult = (index: number): IdeaValidationResult | undefined => {
    return v2ValidationResults?.[index];
  };

  const handleChoose = (title: string, version: 'v1' | 'v2' | 'v3') => {
    if (onChooseIdea) {
      onChooseIdea(title, version);
    }
  };

  const isIdeaChosen = (title: string, version: 'v1' | 'v2' | 'v3'): boolean => {
    return chosenIdeaTitle === title && chosenIdeaVersion === version;
  };

  const getTabBadge = (status: VersionStatus, count: number) => {
    if (status === 'generating') {
      return (
        <CircularProgress size={14} thickness={5} sx={{ color: 'inherit' }} />
      );
    }
    if (status === 'error') {
      return <ErrorIcon sx={{ fontSize: 14, color: '#ef4444' }} />;
    }
    if (status === 'complete' && count > 0) {
      return count;
    }
    return 0;
  };

  const versionDescriptions: Record<string, string> = {
    v2: 'V2 ideas are generated using a 5-stage pipeline that analyzes company differentiators, matches trending AI concepts, content gaps, and validates each idea for personalization and uniqueness.',
    v1: 'V1 ideas are generated using template-based prompts with trending AI concepts. These may be more generic across different companies.',
    v3: 'V3 ideas combine curated + dynamic AI trend concepts with company-specific differentiators, using trend-relevance fusion scoring.',
  };

  const versionColors: Record<string, { primary: string; gradient: string; light: string }> = {
    v2: { primary: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', light: 'rgba(139, 92, 246, 0.08)' },
    v1: { primary: '#667eea', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', light: 'rgba(102, 126, 234, 0.08)' },
    v3: { primary: '#0f766e', gradient: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)', light: 'rgba(15, 118, 110, 0.08)' },
  };

  const colors = versionColors[activeTab];

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
          Blog Ideas
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* V3 Debug Button */}
          {activeTab === 'v3' && onOpenV3Debug && v3Debug && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<DebugIcon />}
              onClick={onOpenV3Debug}
              sx={{
                borderColor: '#0f766e',
                color: '#0f766e',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '12px',
                '&:hover': {
                  borderColor: '#115e59',
                  backgroundColor: 'rgba(15, 118, 110, 0.06)',
                },
              }}
            >
              V3 Debug
            </Button>
          )}

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
      </Box>

      {/* Version Tabs */}
      <Box sx={{ borderBottom: '1px solid #e2e8f0', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            minHeight: 42,
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              background: colors.gradient,
            },
          }}
        >
          <Tab
            value="v1"
            icon={
              <Badge
                badgeContent={getTabBadge(v1Status, v1Ideas.length)}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    background: versionColors.v1.gradient,
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '10px',
                  },
                }}
              >
                <V1Icon sx={{ fontSize: '18px' }} />
              </Badge>
            }
            label="V1 (Template)"
            iconPosition="start"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13px',
              minHeight: 42,
              color: activeTab === 'v1' ? '#667eea' : '#64748b',
              '&.Mui-selected': { color: '#667eea' },
            }}
          />
          <Tab
            value="v2"
            icon={
              <Badge
                badgeContent={getTabBadge(v2Status, v2Ideas.length)}
                color="secondary"
                sx={{
                  '& .MuiBadge-badge': {
                    background: versionColors.v2.gradient,
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '10px',
                  },
                }}
              >
                <V2Icon sx={{ fontSize: '18px' }} />
              </Badge>
            }
            label="V2 (Personalized)"
            iconPosition="start"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13px',
              minHeight: 42,
              color: activeTab === 'v2' ? '#8b5cf6' : '#64748b',
              '&.Mui-selected': { color: '#8b5cf6' },
            }}
          />
          <Tab
            value="v3"
            icon={
              <Badge
                badgeContent={getTabBadge(v3Status, v3Ideas.length)}
                color="success"
                sx={{
                  '& .MuiBadge-badge': {
                    background: versionColors.v3.gradient,
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '10px',
                  },
                }}
              >
                <V3Icon sx={{ fontSize: '18px' }} />
              </Badge>
            }
            label="V3 (Trend Fusion)"
            iconPosition="start"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13px',
              minHeight: 42,
              color: activeTab === 'v3' ? '#0f766e' : '#64748b',
              '&.Mui-selected': { color: '#0f766e' },
            }}
          />
        </Tabs>
      </Box>

      {/* Version Description */}
      <Box
        sx={{
          mb: 2,
          p: 1.5,
          background: colors.light,
          borderRadius: 2,
          border: `1px solid ${colors.primary}22`,
        }}
      >
        <Typography
          sx={{
            fontSize: '12px',
            color: colors.primary,
            fontWeight: 500,
          }}
        >
          {versionDescriptions[activeTab]}
        </Typography>
      </Box>

      {/* ===== V2 TAB CONTENT ===== */}
      {activeTab === 'v2' && (
        <>
          {v2Status === 'complete' && v2Ideas.length > 0 ? (
            <>
              {/* AI Concepts Summary */}
              {v2MatchedConcepts && v2MatchedConcepts.length > 0 && (
                <Box
                  sx={{
                    mb: 2,
                    p: 1.5,
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.06) 0%, rgba(190, 24, 93, 0.06) 100%)',
                    borderRadius: 2,
                    border: '1px solid rgba(236, 72, 153, 0.15)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AIConceptIcon sx={{ color: '#ec4899', fontSize: '18px' }} />
                    <Typography
                      sx={{ fontSize: '12px', fontWeight: 700, color: '#be185d', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                    >
                      AI Concepts Matched ({v2MatchedConcepts.length})
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {v2MatchedConcepts.map((concept, idx) => (
                      <Tooltip key={idx} title={concept.fitReason}>
                        <Chip
                          icon={<TutorialIcon sx={{ fontSize: '12px !important' }} />}
                          label={`${concept.name} (${concept.fitScore}%)`}
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(190, 24, 93, 0.15) 100%)',
                            color: '#be185d',
                            fontWeight: 600,
                            fontSize: '10px',
                            height: '24px',
                            border: '1px solid rgba(236, 72, 153, 0.3)',
                            '& .MuiChip-icon': { color: '#ec4899' },
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </Box>
              )}

              {/* V2 Idea Cards */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {v2Ideas.map((idea, index) => (
                  <V2IdeaCard
                    key={index}
                    idea={idea}
                    index={index}
                    isChosen={isIdeaChosen(idea.title, 'v2')}
                    isExpanded={expandedCards.has(`v2-${index}`)}
                    validationResult={getValidationResult(index)}
                    onToggleExpand={() => toggleExpand('v2', index)}
                    onChoose={() => handleChoose(idea.title, 'v2')}
                    onUnchoose={() => onClearChoice?.()}
                  />
                ))}
              </Box>
            </>
          ) : v2Status === 'generating' && v2StageResults ? (
            /* V2 Progressive Stage Display */
            <V2StageProgressDisplay
              profile={v2StageResults.profile}
              matchedConcepts={v2StageResults.matchedConcepts}
              allConcepts={v2StageResults.allConcepts}
              conceptsEvaluated={v2StageResults.conceptsEvaluated}
              conceptsCached={v2StageResults.conceptsCached}
              conceptsStale={v2StageResults.conceptsStale}
              conceptsAgeHours={v2StageResults.conceptsAgeHours}
              contentGaps={v2StageResults.contentGaps}
              rawIdeas={v2StageResults.rawIdeas}
              validatedIdeas={v2StageResults.validatedIdeas}
              currentStage={v2StageResults.currentStage}
            />
          ) : (
            <TabStatusDisplay status={v2Status} version="V2" color="#8b5cf6" />
          )}
        </>
      )}

      {/* ===== V1 TAB CONTENT ===== */}
      {activeTab === 'v1' && (
        <>
          {v1Status === 'complete' && v1Ideas.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {v1Ideas.map((idea, index) => {
                const isChosen = isIdeaChosen(idea.title, 'v1');
                const isExpanded = expandedCards.has(`v1-${index}`);

                return (
                  <Box
                    key={index}
                    sx={{
                      background: isChosen ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 2,
                      border: isChosen ? '2px solid #10b981' : '1px solid #e2e8f0',
                      boxShadow: isChosen ? '0 4px 20px rgba(16, 185, 129, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: isChosen ? '0 6px 24px rgba(16, 185, 129, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.08)',
                      },
                    }}
                  >
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 28, height: 28, borderRadius: '6px',
                            background: isChosen
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 700, fontSize: '13px', flexShrink: 0,
                          }}
                        >
                          {index + 1}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '14px', lineHeight: 1.4, flex: 1 }}>
                              {idea.title}
                            </Typography>
                            {isChosen && (
                              <Chip icon={<CheckIcon sx={{ fontSize: '14px !important' }} />} label="CHOSEN" size="small"
                                sx={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', fontWeight: 700, fontSize: '10px', height: '22px', flexShrink: 0, '& .MuiChip-icon': { color: 'white' } }}
                              />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {idea.platform && (
                              <Chip icon={<PlatformIcon sx={{ fontSize: '12px !important' }} />} label={idea.platform} size="small"
                                sx={{ background: 'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)', color: '#667eea', fontWeight: 600, fontSize: '10px', height: '22px', border: '1px solid #667eea44' }}
                              />
                            )}
                            {idea.keyStackTools.slice(0, 3).map((tool, i) => (
                              <Chip key={i} label={tool} size="small" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 500, fontSize: '10px', height: '22px' }} />
                            ))}
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, ml: 5 }}>
                        <Button size="small" onClick={() => toggleExpand('v1', index)}
                          startIcon={isExpanded ? <ExpandLessIcon sx={{ fontSize: '18px' }} /> : <ExpandMoreIcon sx={{ fontSize: '18px' }} />}
                          sx={{ color: '#667eea', textTransform: 'none', fontWeight: 500, fontSize: '12px', px: 1, '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.08)' } }}
                        >
                          {isExpanded ? 'Hide Details' : 'Show Details'}
                        </Button>
                        <Button size="small" variant={isChosen ? 'outlined' : 'contained'}
                          startIcon={isChosen ? <UnchooseIcon sx={{ fontSize: '16px' }} /> : <ChooseIcon sx={{ fontSize: '16px' }} />}
                          onClick={() => { if (isChosen && onClearChoice) { onClearChoice(); } else { handleChoose(idea.title, 'v1'); } }}
                          sx={isChosen
                            ? { borderColor: '#ef4444', color: '#ef4444', textTransform: 'none', fontWeight: 600, fontSize: '12px', px: 2, '&:hover': { borderColor: '#dc2626', backgroundColor: 'rgba(239, 68, 68, 0.08)' } }
                            : { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', textTransform: 'none', fontWeight: 600, fontSize: '12px', px: 2, boxShadow: 'none', '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' } }
                          }
                        >
                          {isChosen ? 'Unchoose' : 'Choose This'}
                        </Button>
                      </Box>
                    </Box>
                    <Collapse in={isExpanded}>
                      <Box sx={{ px: 2, pb: 2, pt: 0, borderTop: '1px solid', borderColor: isChosen ? '#10b98133' : '#e2e8f0', bgcolor: isChosen ? 'rgba(16, 185, 129, 0.02)' : '#fafafa' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                              <CheckIcon sx={{ color: '#10b981', fontSize: '16px' }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Why It Fits</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px', lineHeight: 1.6, pl: 3 }}>{idea.whyItFits}</Typography>
                          </Box>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                              <LearnIcon sx={{ color: '#667eea', fontSize: '16px' }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>What You'll Learn</Typography>
                            </Box>
                            <Box component="ul" sx={{ pl: 4.5, pr: 1, m: 0, '& li': { color: '#475569', fontSize: '12px', lineHeight: 1.7, mb: 0.25, '&::marker': { color: '#667eea' } } }}>
                              {idea.whatReaderLearns.map((item, i) => (<li key={i}>{item}</li>))}
                            </Box>
                          </Box>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                              <AngleIcon sx={{ color: '#f59e0b', fontSize: '16px' }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Differentiation Angle</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px', lineHeight: 1.6, pl: 3 }}>{idea.angleToAvoidDuplication}</Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <TabStatusDisplay status={v1Status} version="V1" color="#667eea" />
          )}
        </>
      )}

      {/* ===== V3 TAB CONTENT ===== */}
      {activeTab === 'v3' && (
        <>
          {v3Status === 'complete' && v3Ideas.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {v3Ideas.map((v3Idea, index) => {
                const idea = mapV3IdeaForDisplay(v3Idea);
                const isChosen = isIdeaChosen(idea.title, 'v3');
                const isExpanded = expandedCards.has(`v3-${index}`);

                return (
                  <Box
                    key={index}
                    sx={{
                      background: isChosen ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 2,
                      border: isChosen ? '2px solid #10b981' : '1px solid #e2e8f0',
                      boxShadow: isChosen ? '0 4px 20px rgba(16, 185, 129, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: isChosen ? '0 6px 24px rgba(16, 185, 129, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.08)',
                      },
                    }}
                  >
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 28, height: 28, borderRadius: '6px',
                            background: isChosen
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                              : 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 700, fontSize: '13px', flexShrink: 0,
                          }}
                        >
                          {index + 1}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '14px', lineHeight: 1.4, flex: 1 }}>
                              {idea.title}
                            </Typography>
                            {v3Idea.aiConcept && (
                              <Chip icon={<AIConceptIcon sx={{ fontSize: '12px !important' }} />} label={v3Idea.aiConcept} size="small"
                                sx={{ background: 'linear-gradient(135deg, #0f766e22 0%, #0d948822 100%)', color: '#0f766e', fontWeight: 600, fontSize: '10px', height: '22px', border: '1px solid #0f766e44', '& .MuiChip-icon': { color: '#0f766e' } }}
                              />
                            )}
                            {isChosen && (
                              <Chip icon={<CheckIcon sx={{ fontSize: '14px !important' }} />} label="CHOSEN" size="small"
                                sx={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', fontWeight: 700, fontSize: '10px', height: '22px', flexShrink: 0, '& .MuiChip-icon': { color: 'white' } }}
                              />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {idea.keyStackTools.slice(0, 3).map((tool, i) => (
                              <Chip key={i} label={tool} size="small" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 500, fontSize: '10px', height: '22px' }} />
                            ))}
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, ml: 5 }}>
                        <Button size="small" onClick={() => toggleExpand('v3', index)}
                          startIcon={isExpanded ? <ExpandLessIcon sx={{ fontSize: '18px' }} /> : <ExpandMoreIcon sx={{ fontSize: '18px' }} />}
                          sx={{ color: '#0f766e', textTransform: 'none', fontWeight: 500, fontSize: '12px', px: 1, '&:hover': { backgroundColor: 'rgba(15, 118, 110, 0.08)' } }}
                        >
                          {isExpanded ? 'Hide Details' : 'Show Details'}
                        </Button>
                        <Button size="small" variant={isChosen ? 'outlined' : 'contained'}
                          startIcon={isChosen ? <UnchooseIcon sx={{ fontSize: '16px' }} /> : <ChooseIcon sx={{ fontSize: '16px' }} />}
                          onClick={() => { if (isChosen && onClearChoice) { onClearChoice(); } else { handleChoose(idea.title, 'v3'); } }}
                          sx={isChosen
                            ? { borderColor: '#ef4444', color: '#ef4444', textTransform: 'none', fontWeight: 600, fontSize: '12px', px: 2, '&:hover': { borderColor: '#dc2626', backgroundColor: 'rgba(239, 68, 68, 0.08)' } }
                            : { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', textTransform: 'none', fontWeight: 600, fontSize: '12px', px: 2, boxShadow: 'none', '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' } }
                          }
                        >
                          {isChosen ? 'Unchoose' : 'Choose This'}
                        </Button>
                      </Box>
                    </Box>
                    <Collapse in={isExpanded}>
                      <Box sx={{ px: 2, pb: 2, pt: 0, borderTop: '1px solid', borderColor: isChosen ? '#10b98133' : '#e2e8f0', bgcolor: isChosen ? 'rgba(16, 185, 129, 0.02)' : '#fafafa' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                              <CheckIcon sx={{ color: '#10b981', fontSize: '16px' }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Why It Fits</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px', lineHeight: 1.6, pl: 3 }}>{idea.whyItFits}</Typography>
                          </Box>
                          {idea.specificUse && (
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                                <StarIcon sx={{ color: '#0f766e', fontSize: '16px' }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Product + Trend Integration</Typography>
                              </Box>
                              <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px', lineHeight: 1.6, pl: 3 }}>{idea.specificUse}</Typography>
                            </Box>
                          )}
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                              <LearnIcon sx={{ color: '#0f766e', fontSize: '16px' }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>What You'll Learn</Typography>
                            </Box>
                            <Box component="ul" sx={{ pl: 4.5, pr: 1, m: 0, '& li': { color: '#475569', fontSize: '12px', lineHeight: 1.7, mb: 0.25, '&::marker': { color: '#0f766e' } } }}>
                              {idea.whatReaderLearns.map((item, i) => (<li key={i}>{item}</li>))}
                            </Box>
                          </Box>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                              <AngleIcon sx={{ color: '#f59e0b', fontSize: '16px' }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Differentiation Angle</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px', lineHeight: 1.6, pl: 3 }}>{idea.angleToAvoidDuplication}</Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <TabStatusDisplay status={v3Status} version="V3" color="#0f766e" />
          )}
        </>
      )}
    </Box>
  );
};