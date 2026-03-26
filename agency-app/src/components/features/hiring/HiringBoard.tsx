import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Box, Typography, Button, Snackbar, Alert, CircularProgress, Select, MenuItem, FormControl } from '@mui/material';
import { Upload as UploadIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { Applicant, ApplicantStatus, HIRING_STAGES } from '../../../types/applicant';
import { subscribeToApplicants, updateApplicantStatus, subscribeToViewedApplicantIds, markApplicantViewed } from '../../../services/api/applicants';
import { useAuth } from '../../../contexts/AuthContext';
import { ApplicantColumn } from './ApplicantColumn';
import { PipelineFunnelStrip } from './PipelineFunnelStrip';
import { ApplicantDetailDialog } from './ApplicantDetailDialog';
import { CSVImportDialog } from './CSVImportDialog';

const HiringBoard: React.FC = () => {
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [draggedApplicant, setDraggedApplicant] = useState<Applicant | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [universityFilter, setUniversityFilter] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [scoreFilter, setScoreFilter] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const dragOverRef = useRef<string | null>(null);

  // Subscribe to viewed applicant IDs
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToViewedApplicantIds(user.uid, (ids) => {
      setViewedIds(ids);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const unsubscribe = subscribeToApplicants((data) => {
      setApplicants(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter option data with counts
  const universityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of applicants) {
      if (a.education) {
        counts[a.education] = (counts[a.education] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [applicants]);

  const genderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of applicants) {
      const g = a.sex || 'Unknown';
      counts[g] = (counts[g] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [applicants]);

  const scoreCounts = useMemo(() => {
    let notScored = 0, low = 0, medium = 0, high = 0;
    for (const a of applicants) {
      if (a.score === null || a.score === undefined) notScored++;
      else if (a.score >= 1 && a.score <= 4) low++;
      else if (a.score >= 5 && a.score <= 7) medium++;
      else if (a.score >= 8 && a.score <= 10) high++;
      else notScored++;
    }
    return { not_scored: notScored, low, medium, high };
  }, [applicants]);

  const filteredApplicants = useMemo(() => {
    return applicants.filter((a) => {
      if (universityFilter && a.education !== universityFilter) return false;
      if (genderFilter && (a.sex || 'Unknown') !== genderFilter) return false;
      if (scoreFilter) {
        if (scoreFilter === 'not_scored' && a.score !== null && a.score !== undefined) return false;
        if (scoreFilter === 'low' && !(a.score !== null && a.score >= 1 && a.score <= 4)) return false;
        if (scoreFilter === 'medium' && !(a.score !== null && a.score >= 5 && a.score <= 7)) return false;
        if (scoreFilter === 'high' && !(a.score !== null && a.score >= 8 && a.score <= 10)) return false;
      }
      return true;
    });
  }, [applicants, universityFilter, genderFilter, scoreFilter]);

  const getApplicantsForStage = useCallback(
    (stageId: ApplicantStatus) => {
      const filtered = filteredApplicants.filter((a) => a.status === stageId);
      // Sort: with LinkedIn first, then without LinkedIn at bottom, then by date
      return filtered.sort((a, b) => {
        const aHasLi = a.linkedInUrl ? 1 : 0;
        const bHasLi = b.linkedInUrl ? 1 : 0;
        if (aHasLi !== bHasLi) return bHasLi - aHasLi;
        // Then by submission date (newest first)
        return b.submittedAt.getTime() - a.submittedAt.getTime();
      });
    },
    [filteredApplicants]
  );

  const handleDragStart = (e: React.DragEvent, applicant: Applicant) => {
    setDraggedApplicant(applicant);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    dragOverRef.current = null;

    if (!draggedApplicant || draggedApplicant.status === targetStageId) {
      setDraggedApplicant(null);
      return;
    }

    try {
      await updateApplicantStatus(draggedApplicant.id, targetStageId as ApplicantStatus);
      setSnackbar({
        open: true,
        message: `Moved ${draggedApplicant.name} to ${HIRING_STAGES.find((s) => s.id === targetStageId)?.label}`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }

    setDraggedApplicant(null);
  };

  const handleColumnDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (dragOverRef.current !== stageId) {
      dragOverRef.current = stageId;
      setDragOverColumn(stageId);
    }
  };

  const handleApplicantClick = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setDetailOpen(true);
    // Mark as viewed
    if (user?.uid && !viewedIds.has(applicant.id)) {
      markApplicantViewed(user.uid, applicant.id);
    }
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setSelectedApplicant(null);
  };

  const handleImportSuccess = (imported: number, duplicates: number) => {
    setCsvOpen(false);
    setSnackbar({
      open: true,
      message: `Imported ${imported} applicants${duplicates > 0 ? ` (${duplicates} duplicates skipped)` : ''}`,
      severity: 'success',
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #fff1f2 100%)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 4,
          py: 2,
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Hiring Pipeline
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {(universityFilter || genderFilter || scoreFilter) ? `${filteredApplicants.length} of ${applicants.length}` : applicants.length} applicant{applicants.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={() => setCsvOpen(true)}
          sx={{
            borderColor: '#667eea',
            color: '#667eea',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            '&:hover': {
              borderColor: '#764ba2',
              background: '#667eea10',
            },
          }}
        >
          Import CSV
        </Button>
      </Box>

      {/* Filter Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 4,
          pb: 2,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <FilterIcon sx={{ fontSize: 18, color: '#94a3b8' }} />

        {/* University Filter */}
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <Select
            value={universityFilter || ''}
            onChange={(e) => setUniversityFilter(e.target.value || null)}
            displayEmpty
            sx={{
              fontSize: '13px',
              borderRadius: 2,
              background: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: universityFilter ? '#667eea' : '#e2e8f0',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
            }}
          >
            <MenuItem value="" sx={{ fontSize: '13px' }}>
              All Universities ({applicants.length})
            </MenuItem>
            {universityCounts.map(([uni, count]) => (
              <MenuItem key={uni} value={uni} sx={{ fontSize: '13px' }}>
                {uni} ({count})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Gender Filter */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={genderFilter || ''}
            onChange={(e) => setGenderFilter(e.target.value || null)}
            displayEmpty
            sx={{
              fontSize: '13px',
              borderRadius: 2,
              background: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: genderFilter ? '#667eea' : '#e2e8f0',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
            }}
          >
            <MenuItem value="" sx={{ fontSize: '13px' }}>
              All Genders ({applicants.length})
            </MenuItem>
            {genderCounts.map(([gender, count]) => (
              <MenuItem key={gender} value={gender} sx={{ fontSize: '13px' }}>
                {gender} ({count})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Score Filter */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            value={scoreFilter || ''}
            onChange={(e) => setScoreFilter(e.target.value || null)}
            displayEmpty
            sx={{
              fontSize: '13px',
              borderRadius: 2,
              background: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: scoreFilter ? '#667eea' : '#e2e8f0',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
            }}
          >
            <MenuItem value="" sx={{ fontSize: '13px' }}>
              All Scores ({applicants.length})
            </MenuItem>
            <MenuItem value="not_scored" sx={{ fontSize: '13px' }}>
              Not Scored ({scoreCounts.not_scored})
            </MenuItem>
            <MenuItem value="low" sx={{ fontSize: '13px' }}>
              Low 1-4 ({scoreCounts.low})
            </MenuItem>
            <MenuItem value="medium" sx={{ fontSize: '13px' }}>
              Medium 5-7 ({scoreCounts.medium})
            </MenuItem>
            <MenuItem value="high" sx={{ fontSize: '13px' }}>
              High 8-10 ({scoreCounts.high})
            </MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Pipeline Funnel Stats */}
      <PipelineFunnelStrip applicants={filteredApplicants} />

      {/* Kanban Board */}
      <Box
        sx={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          px: 4,
          pb: 3,
          display: 'flex',
          gap: 3,
          '&::-webkit-scrollbar': { height: 8 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: '#cbd5e1',
            borderRadius: 4,
          },
        }}
      >
        {HIRING_STAGES.map((stage) => (
          <ApplicantColumn
            key={stage.id}
            stage={stage}
            applicants={getApplicantsForStage(stage.id)}
            viewedIds={viewedIds}
            onDragOver={(e) => handleColumnDragOver(e, stage.id)}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            onApplicantClick={handleApplicantClick}
            isDraggedOver={dragOverColumn === stage.id}
          />
        ))}
      </Box>

      {/* Detail Dialog */}
      <ApplicantDetailDialog
        applicant={selectedApplicant}
        open={detailOpen}
        onClose={handleDetailClose}
      />

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HiringBoard;
