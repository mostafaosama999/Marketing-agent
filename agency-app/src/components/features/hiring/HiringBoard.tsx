import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Button, Snackbar, Alert, CircularProgress } from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { Applicant, ApplicantStatus, HIRING_STAGES } from '../../../types/applicant';
import { subscribeToApplicants, updateApplicantStatus, markHiringSeen, getLastSeenHiring } from '../../../services/api/applicants';
import { useAuth } from '../../../contexts/AuthContext';
import { ApplicantColumn } from './ApplicantColumn';
import { ApplicantDetailDialog } from './ApplicantDetailDialog';
import { CSVImportDialog } from './CSVImportDialog';

const HiringBoard: React.FC = () => {
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeenAt, setLastSeenAt] = useState<Date | null>(null);
  const [draggedApplicant, setDraggedApplicant] = useState<Applicant | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const dragOverRef = useRef<string | null>(null);

  // Load last seen, capture it for NEW badges, then mark current visit
  useEffect(() => {
    if (!user?.uid) return;
    getLastSeenHiring(user.uid).then((date) => {
      setLastSeenAt(date);
      // Mark as seen after a short delay so the user sees the NEW badges briefly
      setTimeout(() => {
        markHiringSeen(user.uid);
        // Update local state so NEW badges disappear
        setLastSeenAt(new Date());
      }, 3000);
    });
  }, [user?.uid]);

  useEffect(() => {
    const unsubscribe = subscribeToApplicants((data) => {
      setApplicants(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getApplicantsForStage = useCallback(
    (stageId: ApplicantStatus) => {
      const filtered = applicants.filter((a) => a.status === stageId);
      // Sort: scored first (highest to lowest), then with LinkedIn, then without LinkedIn at bottom
      return filtered.sort((a, b) => {
        // Scored applicants first
        if (a.score !== null && b.score === null) return -1;
        if (a.score === null && b.score !== null) return 1;
        if (a.score !== null && b.score !== null) return b.score - a.score;
        // Then by LinkedIn presence
        const aHasLi = a.linkedInUrl ? 1 : 0;
        const bHasLi = b.linkedInUrl ? 1 : 0;
        if (aHasLi !== bHasLi) return bHasLi - aHasLi;
        // Then by submission date (newest first)
        return b.submittedAt.getTime() - a.submittedAt.getTime();
      });
    },
    [applicants]
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
            {applicants.length} applicant{applicants.length !== 1 ? 's' : ''}
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
            lastSeenAt={lastSeenAt}
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
