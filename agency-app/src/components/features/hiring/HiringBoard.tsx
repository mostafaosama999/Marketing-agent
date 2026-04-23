import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Snackbar, Alert, CircularProgress, Select, MenuItem, FormControl, TextField, InputAdornment, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Upload as UploadIcon, FilterList as FilterIcon, PersonAdd as PersonAddIcon, Search as SearchIcon, ViewKanban as ViewKanbanIcon, TableChart as TableChartIcon, BarChart as BarChartIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, Campaign as CampaignIcon } from '@mui/icons-material';
import { Applicant, ApplicantStatus, RejectionStage, HIRING_STAGES } from '../../../types/applicant';
import { subscribeToApplicants, updateApplicantStatus, subscribeToViewedApplicantIds, markApplicantViewed } from '../../../services/api/applicants';
import { getHiringConfig, updateHiringConfig } from '../../../services/api/hiringConfig';
import { RejectionDialog } from './RejectionDialog';
import { useAuth } from '../../../contexts/AuthContext';
import { ApplicantColumn } from './ApplicantColumn';
import { PipelineFunnelStrip } from './PipelineFunnelStrip';
import { ApplicantDetailDialog } from './ApplicantDetailDialog';
import { CSVImportDialog } from './CSVImportDialog';
import { AddCandidateDialog } from './AddCandidateDialog';
import WritingTestsTable from './WritingTestsTable';
import HiringAnalytics from './HiringAnalytics';
import { OutboundBoard } from './OutboundBoard';
import { OutboundTable } from './OutboundTable';
import { OutboundCandidateDialog } from './OutboundCandidateDialog';
import { OutboundFilterBar, OutboundFilters, DEFAULT_OUTBOUND_FILTERS } from './OutboundFilterBar';
import { ArchivedSourcedCandidatesView } from './ArchivedSourcedCandidatesView';
import { SourcedCandidate, OutboundStatus, ArchiveReason } from '../../../types/sourcedCandidate';
import {
  subscribeToSourcedCandidates,
  updateSourcedCandidateStatus,
  markSourcedCandidateSent,
  archiveSourcedCandidate,
  unarchiveSourcedCandidate,
  deleteSourcedCandidate,
  updateSourcedCandidate,
} from '../../../services/api/sourcedCandidates';
import {
  subscribeToLinkedInDmTemplates,
  getDefaultLinkedInDmTemplateId,
  resolveDefaultTemplate,
} from '../../../services/api/linkedinDmTemplates';
import { LinkedInDmTemplate } from '../../../types/linkedinDmTemplate';
import { resolveDmText } from '../../../utils/copyDm';

type HiringView = 'board' | 'writing_tests' | 'outbound' | 'analytics';
type OutboundSubView = 'board' | 'table';

const HiringBoard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const activeView: HiringView = location.pathname === '/hiring/writing-tests'
    ? 'writing_tests'
    : location.pathname === '/hiring/analytics'
      ? 'analytics'
      : location.pathname === '/hiring/outbound'
        ? 'outbound'
        : 'board';
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [draggedApplicant, setDraggedApplicant] = useState<Applicant | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [universityFilter, setUniversityFilter] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [scoreFilter, setScoreFilter] = useState<string | null>(null);
  const [writingTestStatusFilter, setWritingTestStatusFilter] = useState<string | null>(null);
  const [paidTestFilter, setPaidTestFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [pendingRejection, setPendingRejection] = useState<Applicant | null>(null);
  const [pendingRejectionStage, setPendingRejectionStage] = useState<RejectionStage | null>(null);
  const [dragOverRejectionZone, setDragOverRejectionZone] = useState<string | null>(null);
  const [dragOverSubSection, setDragOverSubSection] = useState<string | null>(null);
  const [recruiterOutreachCount, setRecruiterOutreachCount] = useState<number | undefined>(undefined);
  const [hiringFeesFrozen, setHiringFeesFrozen] = useState<boolean>(false);
  const [hiringFeesFrozenAt, setHiringFeesFrozenAt] = useState<Date | undefined>(undefined);
  const dragOverRef = useRef<string | null>(null);

  // Outbound tab state
  const [sourcedCandidates, setSourcedCandidates] = useState<SourcedCandidate[]>([]);
  const [outboundView, setOutboundView] = useState<OutboundSubView>('board');
  const [outboundFilters, setOutboundFilters] = useState<OutboundFilters>(DEFAULT_OUTBOUND_FILTERS);
  const [selectedSourced, setSelectedSourced] = useState<SourcedCandidate | null>(null);
  const [outboundDialogOpen, setOutboundDialogOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [dmTemplates, setDmTemplates] = useState<LinkedInDmTemplate[]>([]);
  const [defaultDmTemplateId, setDefaultDmTemplateId] = useState<string | null>(null);

  // Fetch recruiter outreach count from hiring config
  useEffect(() => {
    getHiringConfig().then((config) => {
      if (config.recruiterOutreachCount) setRecruiterOutreachCount(config.recruiterOutreachCount);
      setHiringFeesFrozen(config.hiringFeesFrozen ?? false);
      setHiringFeesFrozenAt(config.hiringFeesFrozenAt);
    });
  }, []);

  const handleToggleHiringFeesFrozen = useCallback(async () => {
    const nextFrozen = !hiringFeesFrozen;
    const prevFrozenAt = hiringFeesFrozenAt;
    const nextFrozenAt = nextFrozen ? new Date() : prevFrozenAt;
    setHiringFeesFrozen(nextFrozen);
    if (nextFrozen) setHiringFeesFrozenAt(nextFrozenAt);
    try {
      const payload: { hiringFeesFrozen: boolean; hiringFeesFrozenAt?: Date } = { hiringFeesFrozen: nextFrozen };
      if (nextFrozen && nextFrozenAt) payload.hiringFeesFrozenAt = nextFrozenAt;
      await updateHiringConfig(payload);
    } catch (err) {
      console.error('Failed to update hiring fees freeze state', err);
      setHiringFeesFrozen(!nextFrozen);
      setHiringFeesFrozenAt(prevFrozenAt);
    }
  }, [hiringFeesFrozen, hiringFeesFrozenAt]);

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

  // Outbound: subscribe only while tab is active (includeArchived so archived count works)
  useEffect(() => {
    if (activeView !== 'outbound') return;
    const unsub = subscribeToSourcedCandidates(
      (data) => setSourcedCandidates(data),
      { includeArchived: true }
    );
    return () => unsub();
  }, [activeView]);

  // Outbound: subscribe to DM templates (small collection, load when tab active)
  useEffect(() => {
    if (activeView !== 'outbound') return;
    const unsub = subscribeToLinkedInDmTemplates((list) => setDmTemplates(list));
    return () => unsub();
  }, [activeView]);

  // Outbound: load user's default DM template pointer
  useEffect(() => {
    if (activeView !== 'outbound' || !user?.uid) return;
    getDefaultLinkedInDmTemplateId(user.uid).then(setDefaultDmTemplateId);
  }, [activeView, user?.uid]);

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

  // Writing test status filter counts
  const WRITING_TEST_STATUSES: ApplicantStatus[] = ['test_task', 'not_responded', 'responded', 'feedback'];
  const WRITING_TEST_REJECTION_STAGES = ['test_task', 'not_responded', 'responded', 'feedback'];
  const writingTestStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      test_task: 0, not_responded: 0, responded: 0, feedback: 0, wt_rejected: 0,
    };
    for (const a of applicants) {
      if (WRITING_TEST_STATUSES.includes(a.status)) {
        counts[a.status] = (counts[a.status] || 0) + 1;
      } else if (a.status === 'rejected' && a.rejectionStage && WRITING_TEST_REJECTION_STAGES.includes(a.rejectionStage)) {
        counts['wt_rejected'] = (counts['wt_rejected'] || 0) + 1;
      }
    }
    return counts;
  }, [applicants]);
  const totalWritingTestCandidates = Object.values(writingTestStatusCounts).reduce((a, b) => a + b, 0);

  // Paid test helper — matches logic in WritingTestsTable
  const isPaidTest = (a: Applicant): boolean => {
    const templateName = a.outreach?.email?.templateName || '';
    return templateName.toLowerCase().includes('paid');
  };

  // Paid test filter counts (across all writing-test-stage applicants)
  const paidTestCounts = useMemo(() => {
    let paid = 0, unpaid = 0;
    for (const a of applicants) {
      const inWritingTest = WRITING_TEST_STATUSES.includes(a.status) ||
        (a.status === 'rejected' && a.rejectionStage && WRITING_TEST_REJECTION_STAGES.includes(a.rejectionStage));
      if (inWritingTest) {
        if (isPaidTest(a)) paid++;
        else unpaid++;
      }
    }
    return { paid, unpaid, total: paid + unpaid };
  }, [applicants]);

  const filteredApplicants = useMemo(() => {
    return applicants.filter((a) => {
      if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (universityFilter && a.education !== universityFilter) return false;
      if (genderFilter && (a.sex || 'Unknown') !== genderFilter) return false;
      if (scoreFilter) {
        if (scoreFilter === 'not_scored' && a.score !== null && a.score !== undefined) return false;
        if (scoreFilter === 'low' && !(a.score !== null && a.score >= 1 && a.score <= 4)) return false;
        if (scoreFilter === 'medium' && !(a.score !== null && a.score >= 5 && a.score <= 7)) return false;
        if (scoreFilter === 'high' && !(a.score !== null && a.score >= 8 && a.score <= 10)) return false;
      }
      if (writingTestStatusFilter) {
        if (writingTestStatusFilter === 'wt_rejected') {
          if (!(a.status === 'rejected' && a.rejectionStage && WRITING_TEST_REJECTION_STAGES.includes(a.rejectionStage))) return false;
        } else {
          if (a.status !== writingTestStatusFilter) return false;
        }
      }
      if (paidTestFilter) {
        if (paidTestFilter === 'paid' && !isPaidTest(a)) return false;
        if (paidTestFilter === 'unpaid' && isPaidTest(a)) return false;
      }
      return true;
    });
  }, [applicants, universityFilter, genderFilter, scoreFilter, writingTestStatusFilter, paidTestFilter, searchQuery]);

  // Stages to show in the board (exclude 'rejected', 'responded', 'feedback' — they are sub-sections of Writing Test)
  const visibleStages = useMemo(
    () => HIRING_STAGES.filter((s) => s.id !== 'rejected' && s.id !== 'not_responded' && s.id !== 'responded' && s.id !== 'feedback'),
    []
  );

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

  // Get rejected applicants for a given rejection stage
  const getRejectedForStage = useCallback(
    (stageId: string) => {
      return filteredApplicants.filter(
        (a) => a.status === 'rejected' && a.rejectionStage === stageId
      );
    },
    [filteredApplicants]
  );

  // Rejected applicants with no rejectionStage (legacy) — show under 'applied'
  const legacyRejected = useMemo(
    () => filteredApplicants.filter((a) => a.status === 'rejected' && !a.rejectionStage),
    [filteredApplicants]
  );

  // Outbound derived state + handlers
  const activeSourcedCandidates = useMemo(
    () => sourcedCandidates.filter((c) => !c.archived),
    [sourcedCandidates]
  );
  const archivedSourcedCandidates = useMemo(
    () => sourcedCandidates.filter((c) => c.archived),
    [sourcedCandidates]
  );

  const filteredSourcedCandidates = useMemo(() => {
    const [minScore, maxScore] = outboundFilters.scoreRange;
    return activeSourcedCandidates.filter((c) => {
      if (c.score < minScore || c.score > maxScore) return false;
      if (outboundFilters.statuses.length > 0 && !outboundFilters.statuses.includes(c.status)) return false;
      return true;
    });
  }, [activeSourcedCandidates, outboundFilters]);

  const effectiveDefaultTemplate = useMemo(
    () => resolveDefaultTemplate(dmTemplates, defaultDmTemplateId),
    [dmTemplates, defaultDmTemplateId]
  );

  const copyDisabledForCandidate = useCallback(
    (candidate: SourcedCandidate) => {
      return !resolveDmText(candidate, { template: effectiveDefaultTemplate });
    },
    [effectiveDefaultTemplate]
  );

  const handleSourcedCandidateClick = (candidate: SourcedCandidate) => {
    setSelectedSourced(candidate);
    setOutboundDialogOpen(true);
  };

  const handleOutboundStatusChange = async (candidate: SourcedCandidate, newStatus: OutboundStatus) => {
    try {
      await updateSourcedCandidateStatus(candidate.id, newStatus, {
        sentAt: candidate.sentAt,
        repliedAt: candidate.repliedAt,
      });
      setSnackbar({
        open: true,
        message: `Moved ${candidate.name} to ${newStatus}`,
        severity: 'success',
      });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }
  };

  const handleCopyDmFromList = async (candidate: SourcedCandidate) => {
    const text = resolveDmText(candidate, { template: effectiveDefaultTemplate });
    if (!text) {
      setSnackbar({
        open: true,
        message: 'No draft or default template. Set one in Settings.',
        severity: 'error',
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      await markSourcedCandidateSent(candidate.id, text);
      setSnackbar({
        open: true,
        message: `Copied DM for ${candidate.name} and marked as sent`,
        severity: 'success',
      });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Clipboard copy failed', severity: 'error' });
    }
  };

  const handleCopyAndMarkSentFromDialog = async (candidate: SourcedCandidate, message: string) => {
    try {
      await markSourcedCandidateSent(candidate.id, message);
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveSourced = async (candidate: SourcedCandidate, reason: ArchiveReason) => {
    try {
      await archiveSourcedCandidate(candidate.id, reason);
      setSnackbar({ open: true, message: `Archived ${candidate.name}`, severity: 'success' });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Failed to archive', severity: 'error' });
    }
  };

  const handleUnarchiveSourced = async (candidate: SourcedCandidate) => {
    try {
      await unarchiveSourcedCandidate(candidate.id);
      setSnackbar({ open: true, message: `Unarchived ${candidate.name}`, severity: 'success' });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Failed to unarchive', severity: 'error' });
    }
  };

  const handleDeleteSourced = async (candidate: SourcedCandidate) => {
    try {
      await deleteSourcedCandidate(candidate.id);
      setSnackbar({ open: true, message: `Deleted ${candidate.name}`, severity: 'success' });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Failed to delete', severity: 'error' });
    }
  };

  const handleSaveSourcedNotes = async (candidate: SourcedCandidate, notes: string) => {
    try {
      await updateSourcedCandidate(candidate.id, { notes });
    } catch (err) {
      console.error(err);
    }
  };

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
    setDragOverRejectionZone(null);
    setDragOverSubSection(null);
    dragOverRef.current = null;

    if (!draggedApplicant || draggedApplicant.status === targetStageId) {
      setDraggedApplicant(null);
      return;
    }

    // Intercept rejection: open dialog instead of direct status change
    if (targetStageId === 'rejected') {
      setPendingRejection(draggedApplicant);
      setRejectionDialogOpen(true);
      setDraggedApplicant(null);
      return;
    }

    // Block manual drops into AI Rejected — it is set automatically by the cloud function
    if (targetStageId === 'ai_rejected') {
      setSnackbar({
        open: true,
        message: 'AI Rejected is set automatically. Drag out to recover a candidate.',
        severity: 'error',
      });
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

  // Handle drop on a sub-section (e.g., Responded zone in Writing Test column)
  const handleSubSectionDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);
    setDragOverRejectionZone(null);
    setDragOverSubSection(null);
    dragOverRef.current = null;

    if (!draggedApplicant || draggedApplicant.status === targetStageId) {
      setDraggedApplicant(null);
      return;
    }

    try {
      await updateApplicantStatus(draggedApplicant.id, targetStageId as ApplicantStatus);
      setSnackbar({
        open: true,
        message: `Moved ${draggedApplicant.name} to ${HIRING_STAGES.find((s) => s.id === targetStageId)?.label || targetStageId}`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }

    setDraggedApplicant(null);
  };

  // Handle drop on a rejection zone within a column
  const handleRejectionZoneDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);
    setDragOverRejectionZone(null);
    setDragOverSubSection(null);
    dragOverRef.current = null;

    if (!draggedApplicant || draggedApplicant.status === 'rejected') {
      setDraggedApplicant(null);
      return;
    }

    // Open rejection dialog with the column's stage pre-selected
    setPendingRejection(draggedApplicant);
    setPendingRejectionStage(stageId as RejectionStage);
    setRejectionDialogOpen(true);
    setDraggedApplicant(null);
  };

  const handleColumnDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverRejectionZone(null);
    setDragOverSubSection(null);
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
            {activeView === 'outbound'
              ? `${activeSourcedCandidates.length} sourced candidate${activeSourcedCandidates.length !== 1 ? 's' : ''}`
              : (universityFilter || genderFilter || scoreFilter || writingTestStatusFilter || paidTestFilter)
                ? `${filteredApplicants.length} of ${applicants.length} applicants`
                : `${applicants.length} applicant${applicants.length !== 1 ? 's' : ''}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {/* Primary section toggle: Inbound vs Outbound (top-level) */}
          <ToggleButtonGroup
            value={activeView === 'outbound' ? 'outbound' : 'inbound'}
            exclusive
            onChange={(_, v) => {
              if (!v) return;
              navigate(v === 'outbound' ? '/hiring/outbound' : '/hiring');
            }}
            sx={{
              mr: 1,
              background: 'white',
              borderRadius: 2.5,
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)',
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '15px',
                letterSpacing: '0.3px',
                px: 3,
                py: 1.25,
                borderColor: '#e2e8f0',
                color: '#475569',
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  borderColor: '#667eea',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
                  },
                },
              },
            }}
          >
            <ToggleButton value="inbound">
              <PersonAddIcon sx={{ fontSize: 20, mr: 1 }} />
              Inbound
            </ToggleButton>
            <ToggleButton value="outbound">
              <CampaignIcon sx={{ fontSize: 20, mr: 1 }} />
              Outbound
            </ToggleButton>
          </ToggleButtonGroup>
          {activeView !== 'outbound' && (
          <>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setAddCandidateOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
              },
            }}
          >
            Add Candidate
          </Button>
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
          </>
          )}
        </Box>
      </Box>

      {/* Secondary sub-view toggle row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 4,
          pb: 2,
          flexShrink: 0,
        }}
      >
        {activeView !== 'outbound' ? (
          <ToggleButtonGroup
            value={activeView}
            exclusive
            onChange={(_, v) => v && navigate(
              v === 'writing_tests' ? '/hiring/writing-tests' :
              v === 'analytics' ? '/hiring/analytics' :
              '/hiring'
            )}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '12px',
                px: 1.75,
                py: 0.5,
                borderColor: '#e2e8f0',
                color: '#64748b',
                '&.Mui-selected': {
                  background: '#eef2ff',
                  color: '#667eea',
                  borderColor: '#c7d2fe',
                  '&:hover': { background: '#e0e7ff' },
                },
              },
            }}
          >
            <ToggleButton value="board">
              <ViewKanbanIcon sx={{ fontSize: 15, mr: 0.5 }} />
              Board
            </ToggleButton>
            <ToggleButton value="writing_tests">
              <TableChartIcon sx={{ fontSize: 15, mr: 0.5 }} />
              Writing Tests
            </ToggleButton>
            <ToggleButton value="analytics">
              <BarChartIcon sx={{ fontSize: 15, mr: 0.5 }} />
              Analytics
            </ToggleButton>
          </ToggleButtonGroup>
        ) : (
          <ToggleButtonGroup
            value={outboundView}
            exclusive
            onChange={(_, v) => v && setOutboundView(v)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '12px',
                px: 1.75,
                py: 0.5,
                borderColor: '#e2e8f0',
                color: '#64748b',
                '&.Mui-selected': {
                  background: '#eef2ff',
                  color: '#667eea',
                  borderColor: '#c7d2fe',
                  '&:hover': { background: '#e0e7ff' },
                },
              },
            }}
          >
            <ToggleButton value="board">
              <ViewKanbanIcon sx={{ fontSize: 15, mr: 0.5 }} />
              Board
            </ToggleButton>
            <ToggleButton value="table">
              <TableChartIcon sx={{ fontSize: 15, mr: 0.5 }} />
              Table
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {/* Filter Bar (inbound-specific; hidden on Outbound) */}
      {activeView !== 'outbound' && (
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

        {/* Search Bar */}
        <TextField
          size="small"
          placeholder="Search candidates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            minWidth: 220,
            '& .MuiOutlinedInput-root': {
              fontSize: '13px',
              borderRadius: 2,
              background: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: searchQuery ? '#667eea' : '#e2e8f0',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
            },
          }}
        />

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

        {/* Writing Test Status Filter */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={writingTestStatusFilter || ''}
            onChange={(e) => setWritingTestStatusFilter(e.target.value || null)}
            displayEmpty
            sx={{
              fontSize: '13px',
              borderRadius: 2,
              background: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: writingTestStatusFilter ? '#667eea' : '#e2e8f0',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
            }}
          >
            <MenuItem value="" sx={{ fontSize: '13px' }}>
              All Test States ({totalWritingTestCandidates})
            </MenuItem>
            <MenuItem value="test_task" sx={{ fontSize: '13px', color: '#ea580c' }}>
              Sent ({writingTestStatusCounts.test_task})
            </MenuItem>
            <MenuItem value="not_responded" sx={{ fontSize: '13px', color: '#6b7280' }}>
              Ghosted ({writingTestStatusCounts.not_responded})
            </MenuItem>
            <MenuItem value="responded" sx={{ fontSize: '13px', color: '#7c3aed' }}>
              Responded ({writingTestStatusCounts.responded})
            </MenuItem>
            <MenuItem value="feedback" sx={{ fontSize: '13px', color: '#0284c7' }}>
              Feedback ({writingTestStatusCounts.feedback})
            </MenuItem>
            <MenuItem value="wt_rejected" sx={{ fontSize: '13px', color: '#dc2626' }}>
              Rejected ({writingTestStatusCounts.wt_rejected})
            </MenuItem>
          </Select>
        </FormControl>

        {/* Paid Test Filter */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={paidTestFilter || ''}
            onChange={(e) => setPaidTestFilter(e.target.value || null)}
            displayEmpty
            sx={{
              fontSize: '13px',
              borderRadius: 2,
              background: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: paidTestFilter ? '#667eea' : '#e2e8f0',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
            }}
          >
            <MenuItem value="" sx={{ fontSize: '13px' }}>
              All Tests ({paidTestCounts.total})
            </MenuItem>
            <MenuItem value="paid" sx={{ fontSize: '13px', color: '#16a34a' }}>
              Paid ({paidTestCounts.paid})
            </MenuItem>
            <MenuItem value="unpaid" sx={{ fontSize: '13px', color: '#64748b' }}>
              Unpaid ({paidTestCounts.unpaid})
            </MenuItem>
          </Select>
        </FormControl>
      </Box>
      )}

      {/* Pipeline Funnel Stats — hidden in writing tests view */}
      {activeView === 'board' && (
        <PipelineFunnelStrip
          applicants={filteredApplicants}
          recruiterOutreachCount={recruiterOutreachCount}
          hiringFeesFrozen={hiringFeesFrozen}
          hiringFeesFrozenAt={hiringFeesFrozenAt}
          onToggleHiringFeesFrozen={handleToggleHiringFeesFrozen}
        />
      )}

      {/* Writing Tests Table View */}
      {activeView === 'writing_tests' && (
        <WritingTestsTable
          applicants={filteredApplicants}
          onApplicantClick={handleApplicantClick}
        />
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && (
        <HiringAnalytics applicants={applicants} />
      )}

      {/* Outbound View */}
      {activeView === 'outbound' && (
        <>
          <OutboundFilterBar
            filters={outboundFilters}
            onChange={setOutboundFilters}
            onShowArchived={() => setArchivedOpen(true)}
            archivedCount={archivedSourcedCandidates.length}
            totalCount={filteredSourcedCandidates.length}
          />
          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {outboundView === 'board' ? (
              <OutboundBoard
                candidates={filteredSourcedCandidates}
                onStatusChange={handleOutboundStatusChange}
                onCandidateClick={handleSourcedCandidateClick}
                onCopyDm={handleCopyDmFromList}
                copyDisabledForCandidate={copyDisabledForCandidate}
              />
            ) : (
              <OutboundTable
                candidates={filteredSourcedCandidates}
                onCandidateClick={handleSourcedCandidateClick}
                onStatusChange={handleOutboundStatusChange}
                onCopyDm={handleCopyDmFromList}
                onArchive={handleArchiveSourced}
                onDelete={handleDeleteSourced}
                copyDisabledForCandidate={copyDisabledForCandidate}
              />
            )}
          </Box>
        </>
      )}

      {/* Kanban Board */}
      {activeView === 'board' && (
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
        {visibleStages.map((stage) => {
          // Only applied, test_task, offer get rejection zones
          const hasRejectionZone = ['applied', 'test_task', 'interview'].includes(stage.id);
          const rejected = hasRejectionZone
            ? [
                ...getRejectedForStage(stage.id),
                // Also include 'responded' and 'feedback' rejections under test_task since they are merged there
                ...(stage.id === 'test_task' ? [...getRejectedForStage('not_responded'), ...getRejectedForStage('responded'), ...getRejectedForStage('feedback')] : []),
                ...(stage.id === 'applied' ? legacyRejected : []),
              ]
            : [];

          // Writing Test column gets sub-sections for all writing test states (including test_task itself)
          const writingTestApplicants = getApplicantsForStage('test_task');
          const notRespondedApplicants = getApplicantsForStage('not_responded');
          const respondedApplicants = getApplicantsForStage('responded');
          const feedbackApplicants = getApplicantsForStage('feedback');

          const subSections = stage.id === 'test_task'
            ? [
                {
                  label: 'Writing Test',
                  icon: '\u{1F4DD}',
                  color: '#f97316',
                  applicants: writingTestApplicants,
                  droppable: true,
                  dropStageId: 'test_task',
                  defaultExpanded: true,
                },
                {
                  label: 'Not Responded',
                  icon: '\u{1F47B}',
                  color: '#6b7280',
                  applicants: notRespondedApplicants,
                  droppable: true,
                  dropStageId: 'not_responded',
                },
                {
                  label: 'Responded',
                  icon: '\u{1F4E9}',
                  color: '#8b5cf6',
                  applicants: respondedApplicants,
                  droppable: true,
                  dropStageId: 'responded',
                },
                {
                  label: 'Feedback',
                  icon: '\u{1F4AC}',
                  color: '#0ea5e9',
                  applicants: feedbackApplicants,
                  droppable: true,
                  dropStageId: 'feedback',
                },
              ]
            : [];

          // Writing Test column header shows total across all sub-states
          const totalCount = stage.id === 'test_task'
            ? writingTestApplicants.length + notRespondedApplicants.length + respondedApplicants.length + feedbackApplicants.length
            : undefined;

          return (
            <ApplicantColumn
              key={stage.id}
              stage={stage}
              applicants={stage.id === 'test_task' ? [] : getApplicantsForStage(stage.id)}
              rejectedApplicants={rejected}
              subSections={subSections}
              viewedIds={viewedIds}
              onDragOver={(e) => handleColumnDragOver(e, stage.id)}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onApplicantClick={handleApplicantClick}
              isDraggedOver={dragOverColumn === stage.id}
              isDraggedOverRejection={dragOverRejectionZone === stage.id}
              isDraggedOverSubSection={dragOverSubSection}
              totalCount={totalCount}
              onRejectionDragOver={hasRejectionZone ? (e) => {
                e.preventDefault();
                setDragOverRejectionZone(stage.id);
              } : undefined}
              onRejectionDrop={hasRejectionZone ? (e) => handleRejectionZoneDrop(e, stage.id) : undefined}
              onSubSectionDragOver={(e, dropStageId) => {
                e.preventDefault();
                setDragOverSubSection(dropStageId);
              }}
              onSubSectionDrop={(e, dropStageId) => handleSubSectionDrop(e, dropStageId)}
            />
          );
        })}
      </Box>
      )}

      {/* Detail Dialog */}
      <ApplicantDetailDialog
        applicant={selectedApplicant}
        open={detailOpen}
        onClose={handleDetailClose}
      />

      {/* Rejection Dialog */}
      <RejectionDialog
        open={rejectionDialogOpen}
        onClose={() => {
          setRejectionDialogOpen(false);
          setPendingRejection(null);
          setPendingRejectionStage(null);
        }}
        onConfirm={() => {
          setRejectionDialogOpen(false);
          setSnackbar({
            open: true,
            message: `Rejected ${pendingRejection?.name}`,
            severity: 'success',
          });
          setPendingRejection(null);
          setPendingRejectionStage(null);
        }}
        applicant={pendingRejection}
        presetRejectionStage={pendingRejectionStage}
      />

      {/* Add Candidate Dialog */}
      <AddCandidateDialog
        open={addCandidateOpen}
        onClose={() => setAddCandidateOpen(false)}
        onSuccess={() => {
          setAddCandidateOpen(false);
          setSnackbar({ open: true, message: 'Candidate added successfully', severity: 'success' });
        }}
      />

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Outbound candidate detail dialog */}
      <OutboundCandidateDialog
        open={outboundDialogOpen}
        candidate={selectedSourced}
        defaultTemplate={effectiveDefaultTemplate}
        onClose={() => {
          setOutboundDialogOpen(false);
          setSelectedSourced(null);
        }}
        onSaveNotes={handleSaveSourcedNotes}
        onCopyAndMarkSent={handleCopyAndMarkSentFromDialog}
        onArchive={handleArchiveSourced}
        onDelete={handleDeleteSourced}
      />

      {/* Archived sourced candidates modal */}
      <ArchivedSourcedCandidatesView
        open={archivedOpen}
        onClose={() => setArchivedOpen(false)}
        archivedCandidates={archivedSourcedCandidates}
        onUnarchive={handleUnarchiveSourced}
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
