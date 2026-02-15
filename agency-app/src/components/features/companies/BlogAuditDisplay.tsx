// src/components/features/companies/BlogAuditDisplay.tsx
// Displays blog audit results: offer paragraph, internal justification,
// company/competitor snapshots, and cost metadata.

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface BlogAuditData {
  offerParagraph: string;
  internalJustification: string;
  companyBlogSnapshot: {
    blogUrl: string;
    postsPerMonth: number;
    recentTopics: string[];
    contentTypes: string[];
    recentPosts: Array<{ title: string; date: string; url?: string }>;
  };
  competitorSnapshots: Array<{
    companyName: string;
    blogUrl: string;
    postsPerMonth: number;
    recentTopics: string[];
    notableStrengths: string;
  }>;
  competitorsAnalyzed: number;
  agentIterations: number;
  toolCallsCount: number;
  costInfo: {
    totalCost: number;
    totalTokens: number;
    iterationCosts: number[];
  };
  generatedAt: string;
  model: string;
}

type AuditStatus = 'idle' | 'generating' | 'complete' | 'error';

interface BlogAuditDisplayProps {
  data: BlogAuditData | null;
  status: AuditStatus;
  error?: string;
}

export const BlogAuditDisplay: React.FC<BlogAuditDisplayProps> = ({
  data,
  status,
  error,
}) => {
  const [copied, setCopied] = useState(false);
  const [showJustification, setShowJustification] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const handleCopy = async () => {
    if (!data?.offerParagraph) return;
    await navigator.clipboard.writeText(data.offerParagraph);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const STEPS = [
    {
      label: 'Browse company blog',
      detail: 'The agent uses the browse_blog tool to fetch the target company\'s blog via RSS feed or HTML scraping. It extracts recent posts, posting frequency, and content topics.',
    },
    {
      label: 'Identify competitors',
      detail: 'Using GPT-4\'s knowledge of the SaaS/devtools landscape (informed by the company\'s industry, tech stack, and Apollo enrichment data), the agent identifies 3-5 competitors likely to have active developer blogs.',
    },
    {
      label: 'Browse competitor blogs',
      detail: 'For each competitor, the agent calls browse_blog to scrape their blog. If a URL fails, it tries alternative paths (/blog, /resources, /articles) or moves on to the next competitor.',
    },
    {
      label: 'Compare & reason',
      detail: 'The agent compares posting frequencies, topic coverage, content types, and identifies specific gaps. It reasons about what the target company is missing relative to competitors.',
    },
    {
      label: 'Generate output',
      detail: 'Finally, the agent produces two things: a short, data-driven offer paragraph (referencing real competitor names and numbers) for the prospect, and a longer internal justification explaining the methodology and evidence.',
    },
  ];

  const howItWorksSection = (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        mt: status === 'idle' || !data ? 2 : 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
        }}
        onClick={() => setShowHowItWorks(!showHowItWorks)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon sx={{ fontSize: 18, color: '#667eea' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#475569' }}>
            How the Blog Audit Agent works
          </Typography>
        </Box>
        {showHowItWorks ? (
          <ExpandLessIcon sx={{ color: '#64748b' }} />
        ) : (
          <ExpandMoreIcon sx={{ color: '#64748b' }} />
        )}
      </Box>
      <Collapse in={showHowItWorks}>
        <Box sx={{ px: 2, pb: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7, mb: 2 }}>
            This pipeline uses a <strong>ReAct agent</strong> (Reason + Act), a pattern where an LLM
            iteratively decides what action to take, executes it, observes the result, and then reasons
            about what to do next. Unlike a fixed multi-step pipeline, the agent dynamically adapts its
            workflow based on what it finds at each step.
          </Typography>

          <Typography variant="caption" sx={{ fontWeight: 700, color: '#667eea', display: 'block', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Agent workflow
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {STEPS.map((step, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    mt: 0.2,
                  }}
                >
                  {i + 1}
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', mb: 0.25 }}>
                    {step.label}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontSize: '13px', lineHeight: 1.6 }}>
                    {step.detail}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 2.5, p: 2, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#667eea', display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Under the hood
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px' }}>
                <strong>Model:</strong> GPT-4 Turbo with function calling (tool_choice: auto)
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px' }}>
                <strong>Tools:</strong> browse_blog (RSS + HTML scraper), scrape_page (general page reader)
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px' }}>
                <strong>Loop:</strong> Up to 15 iterations. Each iteration the model either calls a tool or produces the final JSON output.
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px' }}>
                <strong>Budget:</strong> Hard cap at $3.00 per run. Cost is tracked per iteration.
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px' }}>
                <strong>Competitor discovery:</strong> No external search API. The model suggests competitors from its training data, then verifies each blog exists by scraping.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );

  // Generating state
  if (status === 'generating') {
    return (
      <Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
          }}
        >
          <CircularProgress size={48} thickness={4} sx={{ color: '#667eea', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 0.5 }}>
            Agent is researching...
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', maxWidth: 450 }}>
            Browsing company blog, identifying competitors, analyzing content strategies. This may take 1-3 minutes.
          </Typography>
        </Box>
        {howItWorksSection}
      </Box>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <Box>
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#ef4444', fontWeight: 600, mb: 1 }}>
            Blog audit failed
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {error || 'Unknown error occurred'}
          </Typography>
        </Box>
        {howItWorksSection}
      </Box>
    );
  }

  // Idle state
  if (status === 'idle' || !data) {
    return (
      <Box>
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            No blog audit generated yet. Run analysis with "Blog Audit" selected.
          </Typography>
        </Box>
        {howItWorksSection}
      </Box>
    );
  }

  // Complete state - show results
  return (
    <Box>
      {/* Cost Badge */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 1 }}>
        <Chip
          label={`$${data.costInfo.totalCost.toFixed(4)}`}
          size="small"
          sx={{
            bgcolor: '#f0fdf4',
            color: '#16a34a',
            fontWeight: 600,
            fontSize: '12px',
          }}
        />
        <Chip
          label={`${data.agentIterations} iterations`}
          size="small"
          sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontSize: '12px' }}
        />
        <Chip
          label={`${data.toolCallsCount} tool calls`}
          size="small"
          sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontSize: '12px' }}
        />
        <Chip
          label={`${data.competitorsAnalyzed} competitors`}
          size="small"
          sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontSize: '12px' }}
        />
      </Box>

      {/* Offer Paragraph (main output) */}
      <Box
        sx={{
          p: 3,
          borderRadius: 2,
          border: '2px solid #667eea',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.04) 0%, rgba(118, 75, 162, 0.04) 100%)',
          mb: 3,
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#667eea' }}>
            Offer Paragraph
          </Typography>
          <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
            <IconButton size="small" onClick={handleCopy}>
              {copied ? (
                <CheckIcon sx={{ fontSize: 18, color: '#16a34a' }} />
              ) : (
                <CopyIcon sx={{ fontSize: 18, color: '#667eea' }} />
              )}
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="body2" sx={{ color: '#1e293b', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {data.offerParagraph}
        </Typography>
      </Box>

      {/* Internal Justification (collapsible) */}
      <Box
        sx={{
          mb: 3,
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
          }}
          onClick={() => setShowJustification(!showJustification)}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#475569' }}>
            Internal Analysis (not sent to prospect)
          </Typography>
          {showJustification ? (
            <ExpandLessIcon sx={{ color: '#64748b' }} />
          ) : (
            <ExpandMoreIcon sx={{ color: '#64748b' }} />
          )}
        </Box>
        <Collapse in={showJustification}>
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography
              variant="body2"
              sx={{ color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
            >
              {data.internalJustification}
            </Typography>
          </Box>
        </Collapse>
      </Box>

      {/* Competitor Comparison (collapsible) */}
      <Box
        sx={{
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
          }}
          onClick={() => setShowSnapshots(!showSnapshots)}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#475569' }}>
            Supporting Data
          </Typography>
          {showSnapshots ? (
            <ExpandLessIcon sx={{ color: '#64748b' }} />
          ) : (
            <ExpandMoreIcon sx={{ color: '#64748b' }} />
          )}
        </Box>
        <Collapse in={showSnapshots}>
          <Box sx={{ px: 2, pb: 2 }}>
            {/* Company Blog Snapshot */}
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#667eea', display: 'block', mb: 1 }}>
              Company Blog
            </Typography>
            <Box sx={{ mb: 2, pl: 1 }}>
              <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px' }}>
                URL: {data.companyBlogSnapshot.blogUrl || 'Not found'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', fontSize: '13px' }}>
                Frequency: {data.companyBlogSnapshot.postsPerMonth} posts/month
              </Typography>
              {data.companyBlogSnapshot.recentTopics.length > 0 && (
                <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {data.companyBlogSnapshot.recentTopics.map((topic, i) => (
                    <Chip key={i} label={topic} size="small" sx={{ fontSize: '11px', height: 22 }} />
                  ))}
                </Box>
              )}
            </Box>

            {/* Competitor Snapshots Table */}
            {data.competitorSnapshots.length > 0 && (
              <>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#667eea', display: 'block', mb: 1 }}>
                  Competitors
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, fontSize: '12px' }}>Company</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '12px' }}>Posts/mo</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '12px' }}>Topics</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '12px' }}>Strengths</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.competitorSnapshots.map((comp, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ fontSize: '12px' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '12px' }}>
                              {comp.companyName}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>{comp.postsPerMonth}</TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>
                            {comp.recentTopics.slice(0, 3).join(', ')}
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px' }}>{comp.notableStrengths}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* How It Works */}
      {howItWorksSection}
    </Box>
  );
};
