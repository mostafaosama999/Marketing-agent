// src/components/features/analytics/BulkBlogAnalysisDialog.tsx
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
  Chip,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  SkipNext as SkipIcon,
  RssFeed as BlogIcon,
} from '@mui/icons-material';
import { Company } from '../../../types/crm';
import { bulkAnalyzeBlogActivity } from '../../../services/api/bulkBlogAnalysisService';

interface BulkBlogAnalysisDialogProps {
  open: boolean;
  companies: Company[];
  onClose: () => void;
  onComplete?: (updatedCompanyIds: string[]) => void;
}

type Phase = 'ready' | 'analyzing' | 'complete';

interface CompanyProgress {
  companyId: string;
  companyName: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  message?: string;
  costInfo?: { totalCost: number; totalTokens: number };
}

export const BulkBlogAnalysisDialog: React.FC<BulkBlogAnalysisDialogProps> = ({
  open,
  companies,
  onClose,
  onComplete,
}) => {
  const [phase, setPhase] = useState<Phase>('ready');
  const [progress, setProgress] = useState<Map<string, CompanyProgress>>(new Map());
  const [overallProgress, setOverallProgress] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [skipRecent, setSkipRecent] = useState(true);
  const cancelledRef = useRef(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPhase('ready');
      setOverallProgress(0);
      setTotalCost(0);
      cancelledRef.current = false;

      const initialProgress = new Map<string, CompanyProgress>();
      companies.forEach(company => {
        initialProgress.set(company.id, {
          companyId: company.id,
          companyName: company.name,
          status: 'pending',
        });
      });
      setProgress(initialProgress);
    }
  }, [open, companies]);

  const handleStart = async () => {
    setPhase('analyzing');

    let completedCount = 0;
    const updatedIds: string[] = [];

    const { totalCost: cost } = await bulkAnalyzeBlogActivity(
      companies,
      (companyId, status, message, costInfo) => {
        setProgress(prev => {
          const next = new Map(prev);
          const entry = next.get(companyId);
          if (entry) {
            entry.status = status;
            entry.message = message;
            entry.costInfo = costInfo;
          }
          return next;
        });

        if (status === 'success' || status === 'error' || status === 'skipped') {
          completedCount++;
          setOverallProgress((completedCount / companies.length) * 100);

          if (status === 'success') {
            updatedIds.push(companyId);
          }
        }
      },
      skipRecent ? 7 : 0
    );

    setTotalCost(cost);
    setPhase('complete');
  };

  const handleClose = () => {
    const updatedIds = Array.from(progress.values())
      .filter(p => p.status === 'success')
      .map(p => p.companyId);
    onComplete?.(updatedIds);
    onClose();
  };

  const getStatusIcon = (status: CompanyProgress['status']) => {
    switch (status) {
      case 'success': return <SuccessIcon sx={{ fontSize: 18, color: '#16a34a' }} />;
      case 'error': return <ErrorIcon sx={{ fontSize: 18, color: '#dc2626' }} />;
      case 'skipped': return <SkipIcon sx={{ fontSize: 18, color: '#94a3b8' }} />;
      case 'running': return <CircularProgress size={16} sx={{ color: '#667eea' }} />;
      default: return <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: '#e2e8f0' }} />;
    }
  };

  const getStatusChip = (status: CompanyProgress['status']) => {
    const config: Record<string, { label: string; bgcolor: string; color: string }> = {
      pending: { label: 'Pending', bgcolor: '#f1f5f9', color: '#64748b' },
      running: { label: 'Analyzing...', bgcolor: '#ede9fe', color: '#7c3aed' },
      success: { label: 'Done', bgcolor: '#dcfce7', color: '#16a34a' },
      error: { label: 'Failed', bgcolor: '#fee2e2', color: '#dc2626' },
      skipped: { label: 'Skipped', bgcolor: '#f1f5f9', color: '#94a3b8' },
    };
    const c = config[status] || config.pending;
    return <Chip label={c.label} size="small" sx={{ fontSize: '11px', height: 22, bgcolor: c.bgcolor, color: c.color, fontWeight: 600 }} />;
  };

  const progressArray = Array.from(progress.values());
  const successCount = progressArray.filter(p => p.status === 'success').length;
  const errorCount = progressArray.filter(p => p.status === 'error').length;
  const skippedCount = progressArray.filter(p => p.status === 'skipped').length;

  return (
    <Dialog
      open={open}
      onClose={phase === 'analyzing' ? undefined : handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}>
        <BlogIcon />
        Bulk Blog Activity Check
      </DialogTitle>

      <DialogContent sx={{ p: 3, mt: 1 }}>
        {/* Ready phase */}
        {phase === 'ready' && (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              This will analyze blog activity for <strong>{companies.length}</strong> {companies.length === 1 ? 'company' : 'companies'} using the blog qualification system.
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={skipRecent}
                  onChange={(e) => setSkipRecent(e.target.checked)}
                  sx={{ color: '#667eea', '&.Mui-checked': { color: '#667eea' } }}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  Skip companies analyzed in the last 7 days
                </Typography>
              }
            />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
              Each analysis uses GPT-4 and costs approximately $0.01-0.05 per company.
            </Typography>
          </Box>
        )}

        {/* Analyzing / Complete phase */}
        {(phase === 'analyzing' || phase === 'complete') && (
          <Box>
            {/* Progress bar */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {phase === 'complete' ? 'Complete' : 'Analyzing blogs...'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {Math.round(overallProgress)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={overallProgress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: '#e2e8f0',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  },
                }}
              />
            </Box>

            {/* Summary stats */}
            {phase === 'complete' && (
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Chip label={`${successCount} Analyzed`} size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 600 }} />
                {skippedCount > 0 && (
                  <Chip label={`${skippedCount} Skipped`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#94a3b8', fontWeight: 600 }} />
                )}
                {errorCount > 0 && (
                  <Chip label={`${errorCount} Failed`} size="small" sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 600 }} />
                )}
                {totalCost > 0 && (
                  <Chip label={`Total: $${totalCost.toFixed(4)}`} size="small" sx={{ bgcolor: '#ede9fe', color: '#7c3aed', fontWeight: 600 }} />
                )}
              </Box>
            )}

            {/* Company progress table */}
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 40 }}></TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {progressArray.map((entry) => (
                    <TableRow key={entry.companyId}>
                      <TableCell>{getStatusIcon(entry.status)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {entry.companyName}
                        </Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(entry.status)}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {entry.message || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {phase === 'ready' && (
          <>
            <Button onClick={onClose} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleStart}
              disabled={companies.length === 0}
              sx={{
                textTransform: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                },
              }}
            >
              Start Analysis ({companies.length} {companies.length === 1 ? 'company' : 'companies'})
            </Button>
          </>
        )}
        {phase === 'analyzing' && (
          <Typography variant="caption" color="text.secondary">
            Analysis in progress... Please don't close this dialog.
          </Typography>
        )}
        {phase === 'complete' && (
          <Button
            variant="contained"
            onClick={handleClose}
            sx={{
              textTransform: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
