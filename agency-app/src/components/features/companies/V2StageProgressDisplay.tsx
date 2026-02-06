// src/components/features/companies/V2StageProgressDisplay.tsx
// Progressive display component for V2 pipeline stage outputs

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Collapse,
  CircularProgress,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Psychology as ProfileIcon,
  AutoAwesome as ConceptIcon,
  TrendingUp as GapIcon,
  Lightbulb as IdeaIcon,
  Verified as ValidateIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';
import { CompanyProfileV2, ContentGap, BlogIdeaV2, IdeaValidationResult, RawConceptSimple } from '../../../services/firebase/cloudFunctions';

export interface MatchedConceptSimple {
  name: string;
  fitScore: number;
  fitReason: string;
  productIntegration: string;
  tutorialAngle: string;
}

type StageStatus = 'pending' | 'running' | 'complete';

interface V2StageProgressDisplayProps {
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

interface StageCardProps {
  title: string;
  icon: React.ReactNode;
  status: StageStatus;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
  colorScheme: {
    primary: string;
    light: string;
    dark: string;
  };
}

const StageCard: React.FC<StageCardProps> = ({
  title,
  icon,
  status,
  children,
  defaultExpanded = true,
  colorScheme,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckIcon sx={{ color: '#10b981', fontSize: 20 }} />;
      case 'running':
        return <CircularProgress size={18} thickness={5} sx={{ color: colorScheme.primary }} />;
      case 'pending':
        return <PendingIcon sx={{ color: '#94a3b8', fontSize: 20 }} />;
    }
  };

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: status === 'complete' ? '#10b98133' : status === 'running' ? colorScheme.light : '#e2e8f0',
        bgcolor: status === 'complete' ? 'rgba(16, 185, 129, 0.03)' : status === 'running' ? colorScheme.light.replace(')', ', 0.03)').replace('rgb', 'rgba') : 'white',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        mb: 1.5,
      }}
    >
      {/* Header */}
      <Box
        onClick={() => status === 'complete' && children && setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          cursor: status === 'complete' && children ? 'pointer' : 'default',
          '&:hover': status === 'complete' && children ? {
            bgcolor: 'rgba(0,0,0,0.02)',
          } : {},
        }}
      >
        {/* Status Icon */}
        {getStatusIcon()}

        {/* Stage Icon */}
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '6px',
            background: status === 'complete'
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : status === 'running'
              ? `linear-gradient(135deg, ${colorScheme.primary} 0%, ${colorScheme.dark} 100%)`
              : '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          {icon}
        </Box>

        {/* Title */}
        <Typography
          sx={{
            fontWeight: 600,
            color: status === 'pending' ? '#94a3b8' : '#1e293b',
            fontSize: '14px',
            flex: 1,
          }}
        >
          {title}
        </Typography>

        {/* Running indicator */}
        {status === 'running' && (
          <Typography
            sx={{
              fontSize: '11px',
              color: colorScheme.primary,
              fontWeight: 500,
            }}
          >
            Processing...
          </Typography>
        )}

        {/* Expand/Collapse */}
        {status === 'complete' && children && (
          <IconButton size="small" sx={{ color: '#64748b' }}>
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        )}
      </Box>

      {/* Progress bar for running stage */}
      {status === 'running' && (
        <LinearProgress
          sx={{
            height: 2,
            bgcolor: colorScheme.light,
            '& .MuiLinearProgress-bar': {
              background: `linear-gradient(135deg, ${colorScheme.primary} 0%, ${colorScheme.dark} 100%)`,
            },
          }}
        />
      )}

      {/* Content */}
      {status === 'complete' && children && (
        <Collapse in={expanded}>
          <Box
            sx={{
              px: 2,
              pb: 2,
              borderTop: '1px solid',
              borderColor: '#e2e8f0',
              bgcolor: 'rgba(0,0,0,0.01)',
            }}
          >
            {children}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export const V2StageProgressDisplay: React.FC<V2StageProgressDisplayProps> = ({
  profile,
  matchedConcepts,
  allConcepts,
  conceptsEvaluated,
  conceptsCached,
  conceptsStale,
  conceptsAgeHours,
  contentGaps,
  rawIdeas,
  validatedIdeas,
  currentStage,
}) => {
  const getStageStatus = (stage: string): StageStatus => {
    const stageOrder = ['stage1', 'stage1_5', 'stage2', 'stage3', 'stage4'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stage);

    if (currentStage === 'complete' || stageIndex < currentIndex) return 'complete';
    if (stageIndex === currentIndex) return 'running';
    return 'pending';
  };

  return (
    <Box
      sx={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        p: 3,
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Header */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        V2 Pipeline Progress
      </Typography>

      {/* Stage 1: Company Profile */}
      <StageCard
        title="Stage 1: Company Profile & Differentiators"
        icon={<ProfileIcon sx={{ fontSize: 16 }} />}
        status={getStageStatus('stage1')}
        colorScheme={{ primary: '#8b5cf6', light: '#8b5cf622', dark: '#6366f1' }}
      >
        {profile && (
          <Box sx={{ pt: 1.5 }}>
            {/* Company One-liner */}
            <Typography
              sx={{
                fontSize: '13px',
                color: '#475569',
                mb: 1.5,
                fontStyle: 'italic',
              }}
            >
              "{profile.oneLinerDescription}"
            </Typography>

            {/* Differentiators */}
            <Typography
              sx={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 0.75,
              }}
            >
              {profile.uniqueDifferentiators.length} Differentiators Found
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
              {profile.uniqueDifferentiators.slice(0, 4).map((diff, i) => (
                <Tooltip key={i} title={diff.evidence}>
                  <Chip
                    label={diff.claim.length > 40 ? diff.claim.substring(0, 40) + '...' : diff.claim}
                    size="small"
                    sx={{
                      bgcolor: '#8b5cf615',
                      color: '#7c3aed',
                      fontWeight: 500,
                      fontSize: '10px',
                      height: '22px',
                      border: '1px solid #8b5cf633',
                    }}
                  />
                </Tooltip>
              ))}
              {profile.uniqueDifferentiators.length > 4 && (
                <Chip
                  label={`+${profile.uniqueDifferentiators.length - 4} more`}
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

            {/* Tech Stack */}
            {profile.techStack && profile.techStack.length > 0 && (
              <>
                <Typography
                  sx={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    mb: 0.75,
                  }}
                >
                  Tech Stack
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {profile.techStack.slice(0, 6).map((tech, i) => (
                    <Chip
                      key={i}
                      label={tech}
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
                  {profile.techStack.length > 6 && (
                    <Chip
                      label={`+${profile.techStack.length - 6}`}
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
              </>
            )}
          </Box>
        )}
      </StageCard>

      {/* Stage 1.5: AI Concepts */}
      <StageCard
        title="Stage 1.5: AI Concept Matching"
        icon={<ConceptIcon sx={{ fontSize: 16 }} />}
        status={getStageStatus('stage1_5')}
        colorScheme={{ primary: '#ec4899', light: '#ec489922', dark: '#be185d' }}
      >
        {(matchedConcepts || allConcepts) && (
          <Box sx={{ pt: 1.5 }}>
            {/* Concept source status indicator */}
            {conceptsCached !== undefined && (
              <Chip
                label={
                  conceptsStale
                    ? `Cached concepts (${Math.round(conceptsAgeHours || 0)}h old)`
                    : conceptsCached
                    ? 'Concepts from cache (fresh)'
                    : 'Freshly extracted concepts'
                }
                size="small"
                sx={{
                  mb: 1,
                  bgcolor: conceptsStale ? '#f59e0b15' : conceptsCached ? '#3b82f615' : '#10b98115',
                  color: conceptsStale ? '#d97706' : conceptsCached ? '#1d4ed8' : '#059669',
                  fontWeight: 600,
                  fontSize: '9px',
                  height: '20px',
                }}
              />
            )}

            {/* Concept tier indicator */}
            {matchedConcepts && matchedConcepts.length > 0 ? (
              <>
                <Chip
                  label={`${matchedConcepts.length} concepts matched to company`}
                  size="small"
                  sx={{
                    mb: 1,
                    ml: 0.5,
                    bgcolor: '#10b98115',
                    color: '#059669',
                    fontWeight: 600,
                    fontSize: '9px',
                    height: '20px',
                  }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {matchedConcepts.map((concept, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: '#ec489908',
                        border: '1px solid #ec489922',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip
                          label={concept.name}
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '10px',
                            height: '20px',
                          }}
                        />
                        <Chip
                          label={`${concept.fitScore}% fit`}
                          size="small"
                          sx={{
                            bgcolor: '#ec489915',
                            color: '#be185d',
                            fontWeight: 600,
                            fontSize: '9px',
                            height: '18px',
                          }}
                        />
                      </Box>
                      <Typography sx={{ fontSize: '11px', color: '#831843' }}>
                        {concept.fitReason}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            ) : allConcepts && allConcepts.length > 0 ? (
              <>
                <Chip
                  label={`Using ${allConcepts.length} trending concepts (no specific matches)`}
                  size="small"
                  sx={{
                    mb: 1,
                    bgcolor: '#f59e0b15',
                    color: '#d97706',
                    fontWeight: 600,
                    fontSize: '9px',
                    height: '20px',
                  }}
                />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {allConcepts.slice(0, 5).map((concept, i) => (
                    <Tooltip key={i} title={`${concept.whyHot} | ${concept.description}`}>
                      <Chip
                        label={concept.name}
                        size="small"
                        sx={{
                          bgcolor: '#f59e0b15',
                          color: '#92400e',
                          fontWeight: 600,
                          fontSize: '10px',
                          height: '22px',
                          border: '1px solid #f59e0b33',
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
                <Typography sx={{ fontSize: '11px', color: '#92400e', mt: 0.75, fontStyle: 'italic' }}>
                  These trending concepts will be injected into idea generation as inspiration.
                </Typography>
              </>
            ) : (
              <Typography sx={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                No AI concepts available. Ideas will be generated based on company context only.
              </Typography>
            )}
          </Box>
        )}
      </StageCard>

      {/* Stage 2: Content Gaps */}
      <StageCard
        title="Stage 2: Content Gap Analysis"
        icon={<GapIcon sx={{ fontSize: 16 }} />}
        status={getStageStatus('stage2')}
        colorScheme={{ primary: '#3b82f6', light: '#3b82f622', dark: '#1d4ed8' }}
      >
        {contentGaps && (
          <Box sx={{ pt: 1.5 }}>
            <Typography
              sx={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 0.75,
              }}
            >
              {contentGaps.length} Content Gaps Identified
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {contentGaps.slice(0, 5).map((gap, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Chip
                    label={gap.gapType.replace('_', ' ')}
                    size="small"
                    sx={{
                      bgcolor: '#3b82f615',
                      color: '#1d4ed8',
                      fontWeight: 600,
                      fontSize: '9px',
                      height: '18px',
                      textTransform: 'capitalize',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '12px',
                      color: '#475569',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {gap.topic}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '10px',
                      color: '#64748b',
                      fontWeight: 500,
                    }}
                  >
                    {gap.priorityScore}%
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </StageCard>

      {/* Stage 3: Generate Ideas */}
      <StageCard
        title="Stage 3: Idea Generation"
        icon={<IdeaIcon sx={{ fontSize: 16 }} />}
        status={getStageStatus('stage3')}
        colorScheme={{ primary: '#f59e0b', light: '#f59e0b22', dark: '#d97706' }}
      >
        {rawIdeas && (
          <Box sx={{ pt: 1.5 }}>
            <Typography
              sx={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 0.75,
              }}
            >
              {rawIdeas.length} Ideas Generated
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {rawIdeas.map((idea, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: '#f59e0b08',
                    border: '1px solid #f59e0b22',
                  }}
                >
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '4px',
                      bgcolor: '#f59e0b',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#1e293b',
                        mb: 0.25,
                      }}
                    >
                      {idea.title}
                    </Typography>
                    {idea.isConceptTutorial && idea.aiConcept && (
                      <Chip
                        label={`AI: ${idea.aiConcept}`}
                        size="small"
                        sx={{
                          background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '9px',
                          height: '16px',
                        }}
                      />
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </StageCard>

      {/* Stage 4: Validation */}
      <StageCard
        title="Stage 4: Validation & Scoring"
        icon={<ValidateIcon sx={{ fontSize: 16 }} />}
        status={getStageStatus('stage4')}
        defaultExpanded={false}
        colorScheme={{ primary: '#10b981', light: '#10b98122', dark: '#059669' }}
      >
        {validatedIdeas && (
          <Box sx={{ pt: 1.5 }}>
            <Typography
              sx={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 0.75,
              }}
            >
              {validatedIdeas.length} Ideas Validated
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {validatedIdeas.map((result, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <CheckIcon sx={{ color: '#10b981', fontSize: 16 }} />
                  <Typography
                    sx={{
                      fontSize: '12px',
                      color: '#475569',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {result.idea.title.length > 50
                      ? result.idea.title.substring(0, 50) + '...'
                      : result.idea.title}
                  </Typography>
                  <Chip
                    label={`${result.scores.overallScore}%`}
                    size="small"
                    sx={{
                      bgcolor:
                        result.scores.overallScore >= 80
                          ? '#10b98115'
                          : result.scores.overallScore >= 70
                          ? '#f59e0b15'
                          : '#ef444415',
                      color:
                        result.scores.overallScore >= 80
                          ? '#059669'
                          : result.scores.overallScore >= 70
                          ? '#d97706'
                          : '#dc2626',
                      fontWeight: 700,
                      fontSize: '10px',
                      height: '18px',
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </StageCard>
    </Box>
  );
};

export default V2StageProgressDisplay;
