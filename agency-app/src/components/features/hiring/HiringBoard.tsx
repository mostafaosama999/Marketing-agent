import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Box, Typography, Button, Chip, Snackbar, Alert, CircularProgress } from '@mui/material';
import { Upload as UploadIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { Applicant, ApplicantStatus, HIRING_STAGES } from '../../../types/applicant';
import { subscribeToApplicants, updateApplicantStatus, subscribeToViewedApplicantIds, markApplicantViewed } from '../../../services/api/applicants';
import { useAuth } from '../../../contexts/AuthContext';
import { ApplicantColumn } from './ApplicantColumn';
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

  // University filter data
  const universityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of applicants) {
      if (a.education) {
        counts[a.education] = (counts[a.education] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [applicants]);

  const filteredApplicants = useMemo(() => {
    if (!universityFilter) return applicants;
    return applicants.filter((a) => a.education === universityFilter);
  }, [applicants, universityFilter]);

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
            {universityFilter ? `${filteredApplicants.length} of ${applicants.length}` : applicants.length} applicant{applicants.length !== 1 ? 's' : ''}
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

      {/* University Filter */}
      {universityCounts.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 4,
            pb: 2,
            flexShrink: 0,
            flexWrap: 'wrap',
          }}
        >
          <FilterIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
          <Chip
            label={`All (${applicants.length})`}
            size="small"
            onClick={() => setUniversityFilter(null)}
            sx={{
              fontWeight: 600,
              fontSize: '11px',
              background: !universityFilter ? '#667eea' : '#f1f5f9',
              color: !universityFilter ? 'white' : '#64748b',
              '&:hover': { background: !universityFilter ? '#5a6fd6' : '#e2e8f0' },
            }}
          />
          {universityCounts.map(([uni, count]) => (
            <Chip
              key={uni}
              label={`${uni} (${count})`}
              size="small"
              onClick={() => setUniversityFilter(universityFilter === uni ? null : uni)}
              sx={{
                fontWeight: 600,
                fontSize: '11px',
                background: universityFilter === uni ? '#667eea' : '#f1f5f9',
                color: universityFilter === uni ? 'white' : '#64748b',
                '&:hover': { background: universityFilter === uni ? '#5a6fd6' : '#e2e8f0' },
              }}
            />
          ))}
        </Box>
      )}

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
