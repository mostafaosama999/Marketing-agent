// src/components/features/companies/BulkOfferAnalysisDialog.tsx
// Dialog for running bulk offer analysis on multiple companies

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
  Block as SkippedIcon,
  Close as CloseIcon,
  AutoAwesome as AnalyzeIcon,
  BugReport as DebugIcon,
} from '@mui/icons-material';
import { Company } from '../../../types/crm';
import {
  analyzeCompanyWebsite,
  generateOfferIdeas,
  generateOfferIdeasV3,
  CompanyAnalysis,
} from '../../../services/firebase/cloudFunctions';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase/firestore';

interface BulkOfferAnalysisDialogProps {
  open: boolean;
  companies: Company[];
  onClose: () => void;
  onComplete?: () => void;
}

type Status = 'pending' | 'stage1' | 'stage2' | 'success' | 'error' | 'skipped';

interface CompanyProgress {
  companyId: string;
  companyName: string;
  status: Status;
  message?: string;
  cost?: number;
  ideasCount?: number;
  companyType?: string;
  v3Debug?: any;
}

export const BulkOfferAnalysisDialog: React.FC<BulkOfferAnalysisDialogProps> = ({
  open,
  companies,
  onClose,
  onComplete,
}) => {
  const [progress, setProgress] = useState<Map<string, CompanyProgress>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [v3DebugDialog, setV3DebugDialog] = useState<{
    companyName: string;
    debug: any;
  } | null>(null);
  const cancelledRef = useRef(false);

  // Initialize progress map when dialog opens
  useEffect(() => {
    if (open) {
      cancelledRef.current = false;
      const initialProgress = new Map<string, CompanyProgress>();

      companies.forEach((company) => {
        // Check if company has a valid URL
        const hasUrl = !!(
          company.website ||
          company.customFields?.website_blog_link ||
          company.blogAnalysis?.blogUrl
        );

        initialProgress.set(company.id, {
          companyId: company.id,
          companyName: company.name,
          status: hasUrl ? 'pending' : 'skipped',
          message: hasUrl ? undefined : 'No website URL',
        });
      });

      setProgress(initialProgress);
      setIsRunning(false);
      setIsComplete(false);
      setCurrentIndex(0);
      setTotalCost(0);
    }
  }, [open, companies]);

  const updateProgress = (
    companyId: string,
    status: Status,
    message?: string,
    cost?: number,
    ideasCount?: number,
    companyType?: string,
    v3Debug?: any
  ) => {
    console.log(`[updateProgress] Called with: companyId=${companyId}, status=${status}, message=${message}`);
    setProgress((prev) => {
      const newProgress = new Map(prev);
      const companyProgress = newProgress.get(companyId);
      console.log(`[updateProgress] Found company in map:`, !!companyProgress);
      if (companyProgress) {
        // Create a NEW object instead of mutating the existing one
        const updatedEntry = {
          ...companyProgress,
          status,
          message,
          ...(cost !== undefined && { cost }),
          ...(ideasCount !== undefined && { ideasCount }),
          ...(companyType !== undefined && { companyType }),
          ...(v3Debug !== undefined && { v3Debug }),
        };
        console.log(`[updateProgress] Setting new entry:`, updatedEntry);
        newProgress.set(companyId, updatedEntry);
      }
      console.log(`[updateProgress] New map size:`, newProgress.size);
      return newProgress;
    });
  };

  const runBulkAnalysis = async () => {
    console.log('[BulkAnalysis] Starting bulk analysis...');
    console.log('[BulkAnalysis] Companies:', companies.length);
    setIsRunning(true);
    setIsComplete(false);
    cancelledRef.current = false;

    const companiesToProcess = companies.filter((company) => {
      const cp = progress.get(company.id);
      return cp && cp.status !== 'skipped';
    });
    console.log('[BulkAnalysis] Companies to process:', companiesToProcess.length);

    for (let i = 0; i < companiesToProcess.length; i++) {
      if (cancelledRef.current) break;

      const company = companiesToProcess[i];
      setCurrentIndex(i + 1);

      const websiteUrl =
        company.website ||
        (company.customFields?.website_blog_link as string) ||
        company.blogAnalysis?.blogUrl;

      if (!websiteUrl) {
        updateProgress(company.id, 'skipped', 'No website URL');
        continue;
      }

      let stage1Cost = 0;
      let companyAnalysis: CompanyAnalysis | null = null;

      // ========================================
      // STAGE 1: Analyze company website
      // ========================================
      updateProgress(company.id, 'stage1', 'Analyzing website...');
      console.log(`[BulkAnalysis] Stage 1 for ${company.name} - URL: ${websiteUrl}`);

      try {
        const stage1Result = await analyzeCompanyWebsite(
          company.id,
          company.name,
          websiteUrl,
          company.blogAnalysis?.blogUrl || undefined
        );
        console.log(`[BulkAnalysis] Stage 1 complete for ${company.name}:`, stage1Result.companyAnalysis?.companyType);

        companyAnalysis = stage1Result.companyAnalysis;
        stage1Cost = stage1Result.costInfo.totalCost;

        // Update with Stage 1 result
        updateProgress(
          company.id,
          'stage2',
          `${companyAnalysis.companyType} - Generating ideas...`,
          stage1Cost,
          undefined,
          companyAnalysis.companyType
        );

        if (cancelledRef.current) break;

        // ========================================
        // STAGE 2: Generate V1 ideas
        // ========================================
        const stage2Result = await generateOfferIdeas(
          company.id,
          company.name,
          websiteUrl,
          companyAnalysis,
          company.blogAnalysis?.blogUrl || undefined
        );

        // ========================================
        // STAGE 3: Generate independent V3 ideas (best-effort)
        // ========================================
        let v3IdeasCount = 0;
        let v3Cost = 0;
        let v3Debug: any = undefined;
        try {
          const v3Result = await generateOfferIdeasV3(
            company.id,
            company.name,
            websiteUrl,
            undefined,
            undefined,
            companyAnalysis.companyType
          );

          v3IdeasCount = v3Result.ideas.length;
          v3Cost = v3Result.costInfo.totalCost;
          v3Debug = v3Result.debug;

          await updateDoc(doc(db, 'entities', company.id), {
            'offerAnalysis.v3': {
              ideas: v3Result.ideas,
              validationResults: v3Result.validationResults,
              matchedConcepts: v3Result.matchedConcepts,
              trendConceptsUsed: v3Result.trendConceptsUsed,
              debug: v3Result.debug,
              costInfo: v3Result.costInfo,
              generatedAt: v3Result.generatedAt,
              regenerationAttempts: v3Result.regenerationAttempts,
              rejectedCount: v3Result.rejectedCount,
            },
            'offerAnalysis.tripleVersionGeneration': true,
            updatedAt: serverTimestamp(),
          });
        } catch (v3Error) {
          console.error(`[BulkAnalysis] V3 failed for ${company.name}:`, v3Error);
        }

        const totalCostForCompany = stage1Cost + stage2Result.costInfo.totalCost + v3Cost;

        updateProgress(
          company.id,
          'success',
          companyAnalysis.companyType,
          totalCostForCompany,
          stage2Result.ideas.length + v3IdeasCount,
          companyAnalysis.companyType,
          v3Debug
        );

        setTotalCost((prev) => prev + totalCostForCompany);
      } catch (error: any) {
        console.error(`Error analyzing ${company.name}:`, error);

        // If Stage 1 completed but Stage 2 failed, show partial success
        if (companyAnalysis) {
          updateProgress(
            company.id,
            'error',
            `${companyAnalysis.companyType} - Ideas failed: ${error.message}`,
            stage1Cost,
            undefined,
            companyAnalysis.companyType
          );
          setTotalCost((prev) => prev + stage1Cost);
        } else {
          updateProgress(company.id, 'error', error.message || 'Analysis failed');
        }
      }
    }

    setIsRunning(false);
    setIsComplete(true);
  };

  const handleCancel = () => {
    if (isRunning) {
      cancelledRef.current = true;
    }
  };

  const handleClose = () => {
    if (isRunning) {
      cancelledRef.current = true;
    }
    if (isComplete && onComplete) {
      onComplete();
    }
    onClose();
  };

  // Calculate stats
  const stats = {
    total: companies.length,
    pending: Array.from(progress.values()).filter((p) => p.status === 'pending').length,
    stage1: Array.from(progress.values()).filter((p) => p.status === 'stage1').length,
    stage2: Array.from(progress.values()).filter((p) => p.status === 'stage2').length,
    success: Array.from(progress.values()).filter((p) => p.status === 'success').length,
    error: Array.from(progress.values()).filter((p) => p.status === 'error').length,
    skipped: Array.from(progress.values()).filter((p) => p.status === 'skipped').length,
  };
  const inProgress = stats.stage1 + stats.stage2;

  const processable = stats.total - stats.skipped;
  const completed = stats.success + stats.error;
  const progressPercent = processable > 0 ? (completed / processable) * 100 : 0;

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case 'success':
        return <SuccessIcon sx={{ color: '#10b981', fontSize: 20 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#ef4444', fontSize: 20 }} />;
      case 'stage1':
        return <CircularProgress size={18} sx={{ color: '#667eea' }} />;
      case 'stage2':
        return <CircularProgress size={18} sx={{ color: '#764ba2' }} />;
      case 'skipped':
        return <SkippedIcon sx={{ color: '#94a3b8', fontSize: 20 }} />;
      default:
        return <PendingIcon sx={{ color: '#94a3b8', fontSize: 20 }} />;
    }
  };

  const getStatusChip = (status: Status, message?: string) => {
    const config: Record<Status, { label: string; color: string; bg: string }> = {
      pending: { label: 'Pending', color: '#64748b', bg: '#f1f5f9' },
      stage1: { label: message || 'Step 1: Analyzing...', color: '#667eea', bg: '#667eea15' },
      stage2: { label: message || 'Step 2: Generating...', color: '#764ba2', bg: '#764ba215' },
      success: { label: message || 'Success', color: '#10b981', bg: '#10b98115' },
      error: { label: message || 'Error', color: '#ef4444', bg: '#ef444415' },
      skipped: { label: message || 'Skipped', color: '#94a3b8', bg: '#f1f5f9' },
    };

    const { label, color, bg } = config[status];

    return (
      <Chip
        label={label}
        size="small"
        sx={{
          bgcolor: bg,
          color: color,
          fontWeight: 500,
          fontSize: '11px',
          height: '24px',
          maxWidth: '200px',
          '& .MuiChip-label': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
        }}
      />
    );
  };

  return (
    <Dialog
      open={open}
      onClose={isRunning ? undefined : handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AnalyzeIcon sx={{ color: '#667eea' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Generate Offers for {companies.length} Companies
          </Typography>
        </Box>
        {!isRunning && (
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* Progress Section */}
        <Box sx={{ p: 3, bgcolor: '#fafafa', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
              {isComplete
                ? `Completed: ${stats.success} successful, ${stats.error} failed, ${stats.skipped} skipped`
                : isRunning
                ? `Processing: ${currentIndex}/${processable} companies`
                : `Ready to process ${processable} companies (${stats.skipped} will be skipped)`}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
              {Math.round(progressPercent)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: '#e2e8f0',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              },
            }}
          />
        </Box>

        {/* Companies Table */}
        <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa', width: 40 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>Company</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa', width: 200 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa', width: 80 }} align="center">
                  Ideas
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa', width: 80 }} align="center">
                  Debug
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa', width: 80 }} align="right">
                  Cost
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.map((company, index) => {
                const cp = progress.get(company.id);
                if (!cp) return null;

                return (
                  <TableRow
                    key={company.id}
                    sx={{
                      bgcolor:
                        cp.status === 'stage1'
                          ? 'rgba(102, 126, 234, 0.05)'
                          : cp.status === 'stage2'
                          ? 'rgba(118, 75, 162, 0.05)'
                          : cp.status === 'success'
                          ? 'rgba(16, 185, 129, 0.03)'
                          : cp.status === 'error'
                          ? 'rgba(239, 68, 68, 0.03)'
                          : 'transparent',
                      '&:hover': { bgcolor: '#f8fafc' },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getStatusIcon(cp.status)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          color: cp.status === 'skipped' ? '#94a3b8' : '#1e293b',
                        }}
                      >
                        {cp.companyName}
                      </Typography>
                    </TableCell>
                    <TableCell>{getStatusChip(cp.status, cp.message)}</TableCell>
                    <TableCell align="center">
                      {cp.ideasCount !== undefined && (
                        <Chip
                          label={cp.ideasCount}
                          size="small"
                          sx={{
                            bgcolor: '#667eea15',
                            color: '#667eea',
                            fontWeight: 600,
                            fontSize: '12px',
                            height: '22px',
                            minWidth: '32px',
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {cp.v3Debug && (
                        <Tooltip title="View V3 debug">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setV3DebugDialog({
                                companyName: cp.companyName,
                                debug: cp.v3Debug,
                              })
                            }
                            sx={{
                              color: '#6366f1',
                              '&:hover': {
                                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                              },
                            }}
                          >
                            <DebugIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {cp.cost !== undefined && (
                        <Typography
                          variant="body2"
                          sx={{ color: '#64748b', fontWeight: 500, fontSize: '12px' }}
                        >
                          ${cp.cost.toFixed(4)}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Total Cost */}
        <Box
          sx={{
            p: 2,
            bgcolor: '#fafafa',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
            Total Cost:
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 700,
              color: '#1e293b',
              fontSize: '16px',
            }}
          >
            ${totalCost.toFixed(4)}
          </Typography>
        </Box>

        {v3DebugDialog && (
          <Dialog
            open={Boolean(v3DebugDialog)}
            onClose={() => setV3DebugDialog(null)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>V3 Debug Trace - {v3DebugDialog.companyName}</DialogTitle>
            <DialogContent dividers>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  maxHeight: 480,
                  overflow: 'auto',
                  bgcolor: '#0f172a',
                  color: '#e2e8f0',
                  borderRadius: 1,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                {JSON.stringify(v3DebugDialog.debug || {}, null, 2)}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setV3DebugDialog(null)}>Close</Button>
            </DialogActions>
          </Dialog>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {isRunning ? (
          <Button
            onClick={handleCancel}
            variant="outlined"
            sx={{
              borderColor: '#ef4444',
              color: '#ef4444',
              '&:hover': {
                borderColor: '#dc2626',
                bgcolor: 'rgba(239, 68, 68, 0.08)',
              },
            }}
          >
            Cancel
          </Button>
        ) : isComplete ? (
          <Button
            onClick={handleClose}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              },
            }}
          >
            Done
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} sx={{ color: '#64748b' }}>
              Cancel
            </Button>
            <Button
              onClick={runBulkAnalysis}
              variant="contained"
              disabled={processable === 0}
              startIcon={<AnalyzeIcon />}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                },
                '&:disabled': {
                  background: '#e2e8f0',
                  color: '#94a3b8',
                },
              }}
            >
              Start Analysis ({processable})
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
