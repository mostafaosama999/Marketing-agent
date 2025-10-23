// src/components/features/companies/WritingProgramSection.tsx
import React from 'react';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  RadioButtonUnchecked as UnknownIcon,
  AttachMoney as MoneyIcon,
  Circle as StatusIcon,
  Refresh as RefreshIcon,
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

export const WritingProgramSection: React.FC<WritingProgramSectionProps> = ({
  company,
  onAnalyze,
  loading,
  error,
}) => {
  const analysis = company.writingProgramAnalysis;

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
            startIcon={loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <RefreshIcon />}
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
              value={analysis.paymentAmount || 'Unknown'}
              subtitle={
                analysis.historicalPayment
                  ? `Previously: ${analysis.historicalPayment}`
                  : analysis.paymentAmount
                  ? 'Current rate'
                  : 'Payment information not available'
              }
              status={analysis.paymentAmount ? 'success' : 'info'}
            >
              {!analysis.paymentAmount && !analysis.historicalPayment && (
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
      )}
    </Box>
  );
};
