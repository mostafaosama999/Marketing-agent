// src/components/features/companies/WritingProgramSection.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  RadioButtonUnchecked as UnknownIcon,
  AttachMoney as MoneyIcon,
  Circle as StatusIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import { Company } from '../../../types/crm';
import { AnalysisCard } from './AnalysisCard';
import { formatCost } from '../../../services/firebase/cloudFunctions';

interface WritingProgramSectionProps {
  company: Company;
  onAnalyze: () => void;
  loading: boolean;
  error: string | null;
}

// Color mapping for requirement type chips
const REQUIREMENT_TYPE_COLORS: Record<string, string> = {
  'Idea': '#22c55e', // green
  'Case study': '#3b82f6', // blue
  'Keyword analysis': '#6366f1', // indigo
  'Outline': '#a855f7', // purple
  'Free article': '#f59e0b', // amber
  'Questionnaire': '#06b6d4', // cyan
  'Email': '#ec4899', // pink
  'Introduction': '#8b5cf6', // violet
  'Pitch': '#eab308', // yellow
  'Join Slack/Discord': '#14b8a6', // teal
  'Zoom Call': '#f97316', // orange
  'Apply for Jobs': '#ef4444', // red
  'Article Summary': '#10b981', // emerald
};

export const WritingProgramSection: React.FC<WritingProgramSectionProps> = ({
  company,
  onAnalyze,
  loading,
  error,
}) => {
  const analysis = company.writingProgramAnalysis;
  const [copiedEmail, setCopiedEmail] = useState(false);

  const getTimeSinceAnalysis = () => {
    if (!analysis?.lastAnalyzedAt) return null;

    const now = new Date();
    const analyzed = new Date(analysis.lastAnalyzedAt);
    const daysSince = Math.floor((now.getTime() - analyzed.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince === 0) return 'Today';
    if (daysSince === 1) return '1 day ago';
    return `${daysSince} days ago`;
  };

  const needsRefresh = () => {
    if (!analysis?.lastAnalyzedAt) return true;

    const now = new Date();
    const analyzed = new Date(analysis.lastAnalyzedAt);
    const daysSince = Math.floor((now.getTime() - analyzed.getTime()) / (1000 * 60 * 60 * 24));

    return daysSince > 30;
  };

  const handleCopyEmail = () => {
    if (analysis?.contactEmail) {
      navigator.clipboard.writeText(analysis.contactEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              mb: 0.5,
            }}
          >
            Community Writing Program
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analysis of guest author and contributor programs
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onAnalyze}
            disabled={loading}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              fontWeight: 600,
              mb: 1,
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              },
            }}
          >
            {analysis ? 'Re-analyze' : 'Analyze Program'}
          </Button>
          {analysis?.lastAnalyzedAt && (
            <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
              Last analyzed: {getTimeSinceAnalysis()}
              {needsRefresh() && ' (Refresh recommended)'}
            </Typography>
          )}
          {analysis?.costInfo && (
            <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
              Cost: {formatCost(analysis.costInfo)}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* No Data State */}
      {!analysis && !loading && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No analysis available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Click "Analyze Program" to discover writing opportunities
          </Typography>
        </Box>
      )}

      {/* Loading State */}
      {loading && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <CircularProgress size={48} sx={{ color: '#667eea', mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Analyzing writing program...
          </Typography>
          <Typography variant="caption" color="text.secondary">
            This may take 30-60 seconds
          </Typography>
        </Box>
      )}

      {/* Analysis Results */}
      {analysis && !loading && (
        <>
          <Grid container spacing={3}>
          {/* Card 1: Program Existence */}
          <Grid size={{ xs: 12, md: 4 }}>
            <AnalysisCard
              icon={analysis.hasProgram ? <CheckIcon /> : <CancelIcon />}
              title="Writing Program"
              value={analysis.hasProgram ? 'Found' : 'Not Found'}
              subtitle={analysis.hasProgram ? 'Program URL available' : 'No program detected'}
              status={analysis.hasProgram ? 'success' : 'error'}
              link={analysis.programUrl || undefined}
            >
              {analysis.programUrl && (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#667eea',
                    wordBreak: 'break-all',
                    display: 'block',
                    fontSize: '11px',
                  }}
                >
                  {analysis.programUrl}
                </Typography>
              )}
            </AnalysisCard>
          </Grid>

          {/* Card 2: Status */}
          <Grid size={{ xs: 12, md: 4 }}>
            <AnalysisCard
              icon={
                analysis.isOpen === true ? (
                  <StatusIcon sx={{ color: '#10b981' }} />
                ) : analysis.isOpen === false ? (
                  <StatusIcon sx={{ color: '#ef4444' }} />
                ) : (
                  <UnknownIcon />
                )
              }
              title="Status"
              value={
                analysis.isOpen === true
                  ? 'Open'
                  : analysis.isOpen === false
                  ? 'Closed'
                  : 'Unknown'
              }
              subtitle={
                analysis.openDates
                  ? `Open: ${analysis.openDates.openFrom}, Closed: ${analysis.openDates.closedFrom}`
                  : analysis.isOpen === null
                  ? 'Status information not available'
                  : undefined
              }
              status={
                analysis.isOpen === true
                  ? 'success'
                  : analysis.isOpen === false
                  ? 'error'
                  : 'info'
              }
            >
              {analysis.aiReasoning && (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontSize: '11px',
                    fontStyle: 'italic',
                  }}
                >
                  {analysis.aiReasoning.substring(0, 150)}
                  {analysis.aiReasoning.length > 150 && '...'}
                </Typography>
              )}
            </AnalysisCard>
          </Grid>

          {/* Card 3: Payment */}
          <Grid size={{ xs: 12, md: 4 }}>
            <AnalysisCard
              icon={<MoneyIcon />}
              title="Payment"
              value={
                analysis.payment?.amount
                  ? analysis.payment.amount
                  : analysis.payment?.details
                  ? analysis.payment.details
                  : 'Unknown'
              }
              subtitle={
                analysis.payment?.sourceSnippet
                  ? 'See details below'
                  : analysis.payment?.method
                  ? `Method: ${analysis.payment.method}`
                  : analysis.payment?.historical
                  ? `Previously: ${analysis.payment.historical}`
                  : analysis.payment?.amount
                  ? 'Current rate'
                  : 'Payment information not available'
              }
              status={
                analysis.payment?.amount
                  ? 'success'
                  : analysis.payment?.details
                  ? 'info'
                  : 'info'
              }
            >
              {/* Show payment source snippet as proof */}
              {analysis.payment?.sourceSnippet && (
                <Box
                  sx={{
                    mt: 1,
                    p: 1.5,
                    background: '#f8fafc',
                    borderRadius: '8px',
                    borderLeft: '3px solid #667eea',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#475569',
                      fontSize: '11px',
                      fontStyle: 'italic',
                      lineHeight: 1.5,
                      display: 'block',
                    }}
                  >
                    "{analysis.payment.sourceSnippet}"
                  </Typography>
                </Box>
              )}

              {/* Show payment details (bonuses, performance-based, etc.) */}
              {analysis.payment?.details && (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontSize: '11px',
                    display: 'block',
                    mt: analysis.payment.sourceSnippet ? 1 : 0.5,
                  }}
                >
                  {analysis.payment.details}
                </Typography>
              )}

              {/* Show payment method if available */}
              {analysis.payment?.method && (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontSize: '11px',
                    display: 'block',
                    mt: 0.5,
                  }}
                >
                  Method: {analysis.payment.method}
                </Typography>
              )}

              {/* Show historical payment */}
              {analysis.payment?.historical && (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontSize: '11px',
                    display: 'block',
                    mt: 0.5,
                  }}
                >
                  Previously: {analysis.payment.historical}
                </Typography>
              )}

              {/* Show message if no payment info at all */}
              {!analysis.payment?.amount && !analysis.payment?.details && !analysis.payment?.historical && (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontSize: '11px',
                  }}
                >
                  No payment details found in program documentation
                </Typography>
              )}
            </AnalysisCard>
          </Grid>
        </Grid>

        {/* Program Details Section */}
        {analysis.programDetails && (
          <Box
            sx={{
              mt: 4,
              p: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: '16px',
                mb: 2,
                color: '#334155',
              }}
            >
              Program Overview
            </Typography>
            <Typography
              sx={{
                fontSize: '14px',
                color: '#475569',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}
            >
              {analysis.programDetails}
            </Typography>
          </Box>
        )}

        {/* Requirements Section */}
        {((analysis.requirementTypes && analysis.requirementTypes.length > 0) ||
         (analysis.requirements && analysis.requirements.length > 0) ||
         analysis.submissionGuidelines ||
         analysis.contactEmail ||
         analysis.responseTime) && (
          <Box sx={{ mt: 4 }}>
            {/* Requirement Type Chips */}
            {analysis.requirementTypes && analysis.requirementTypes.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: '16px',
                    mb: 2,
                    color: '#334155',
                  }}
                >
                  Submission Requirements
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {analysis.requirementTypes.map((type, index) => (
                    <Chip
                      key={index}
                      label={type}
                      sx={{
                        backgroundColor: REQUIREMENT_TYPE_COLORS[type] || '#94a3b8',
                        color: 'white',
                        fontWeight: 500,
                        fontSize: '13px',
                        '&:hover': {
                          backgroundColor: REQUIREMENT_TYPE_COLORS[type] || '#94a3b8',
                          opacity: 0.9,
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Contact & Response Time */}
            {(analysis.contactEmail || analysis.responseTime) && (
              <Box sx={{ mb: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {analysis.contactEmail && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon sx={{ color: '#667eea', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      {analysis.contactEmail}
                    </Typography>
                    <Tooltip title={copiedEmail ? 'Copied!' : 'Copy email'}>
                      <IconButton
                        size="small"
                        onClick={handleCopyEmail}
                        sx={{ padding: '4px' }}
                      >
                        <CopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
                {analysis.responseTime && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon sx={{ color: '#667eea', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Response time: {analysis.responseTime}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Detailed Requirements Accordion */}
            {analysis.requirements && analysis.requirements.length > 0 && (
              <Accordion
                sx={{
                  mb: 2,
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '12px !important',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    },
                  }}
                >
                  <AssignmentIcon sx={{ color: '#667eea' }} />
                  <Typography sx={{ fontWeight: 600, color: '#334155' }}>
                    Detailed Requirements ({analysis.requirements.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List sx={{ py: 0 }}>
                    {analysis.requirements.map((req, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          py: 1,
                          px: 0,
                          alignItems: 'flex-start',
                        }}
                      >
                        <ListItemText
                          primary={req}
                          primaryTypographyProps={{
                            sx: {
                              fontSize: '14px',
                              color: '#475569',
                              '&:before': {
                                content: '"•"',
                                color: '#667eea',
                                fontWeight: 'bold',
                                marginRight: '8px',
                              },
                            },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Submission Guidelines Accordion */}
            {analysis.submissionGuidelines && (
              <Accordion
                sx={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '12px !important',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    },
                  }}
                >
                  <AssignmentIcon sx={{ color: '#764ba2' }} />
                  <Typography sx={{ fontWeight: 600, color: '#334155' }}>
                    Submission Guidelines
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography
                    sx={{
                      fontSize: '14px',
                      color: '#475569',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {analysis.submissionGuidelines}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        )}
        </>
      )}
    </Box>
  );
};
