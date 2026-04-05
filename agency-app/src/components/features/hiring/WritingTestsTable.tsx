import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  OpenInNew as OpenInNewIcon,
  AccessTime as AccessTimeIcon,
  Email as EmailIcon,
  MonetizationOn as PaidIcon,
} from '@mui/icons-material';
import { Applicant, ApplicantStatus } from '../../../types/applicant';

interface WritingTestsTableProps {
  applicants: Applicant[];
  onApplicantClick: (applicant: Applicant) => void;
}

const WRITING_TEST_STATUSES: ApplicantStatus[] = ['test_task', 'not_responded', 'responded', 'feedback'];
const WRITING_TEST_REJECTION_STAGES = ['test_task', 'not_responded', 'responded', 'feedback'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  test_task: { label: 'Sent', color: '#ea580c', bg: '#fff7ed' },
  not_responded: { label: 'Ghosted', color: '#6b7280', bg: '#f3f4f6' },
  responded: { label: 'Responded', color: '#7c3aed', bg: '#f5f3ff' },
  feedback: { label: 'Feedback', color: '#0284c7', bg: '#f0f9ff' },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2' },
};

function formatDate(d: Date | any): string {
  if (!d) return '\u2014';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysSince(d: Date | any): number {
  if (!d) return 0;
  const date = d instanceof Date ? d : new Date(d);
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function isPaidTest(applicant: Applicant): boolean {
  const templateName = applicant.outreach?.email?.templateName || '';
  return templateName.toLowerCase().includes('paid');
}

function sourceLabel(source: string): string {
  if (source === 'webflow') return 'Webflow';
  if (source === 'csv_import') return 'CSV';
  return 'Wuzzuf';
}

type SortField = 'days_elapsed' | 'name' | 'status' | 'score';
type SortDir = 'asc' | 'desc';

const WritingTestsTable: React.FC<WritingTestsTableProps> = ({ applicants, onApplicantClick }) => {
  const [sortField, setSortField] = useState<SortField>('days_elapsed');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Helper to get the display status (for rejected candidates, use 'rejected')
  const getDisplayStatus = (a: Applicant): string => {
    if (a.status === 'rejected' && a.rejectionStage && WRITING_TEST_REJECTION_STAGES.includes(a.rejectionStage)) {
      return 'rejected';
    }
    return a.status;
  };

  const writingTestApplicants = useMemo(() => {
    const filtered = applicants.filter((a) =>
      WRITING_TEST_STATUSES.includes(a.status) ||
      (a.status === 'rejected' && a.rejectionStage && WRITING_TEST_REJECTION_STAGES.includes(a.rejectionStage))
    );

    const allStatuses = [...WRITING_TEST_STATUSES, 'rejected' as ApplicantStatus];

    return filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'days_elapsed':
          cmp = daysSince(a.updatedAt) - daysSince(b.updatedAt);
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'status':
          cmp = allStatuses.indexOf(getDisplayStatus(a) as ApplicantStatus) - allStatuses.indexOf(getDisplayStatus(b) as ApplicantStatus);
          break;
        case 'score':
          cmp = (a.score ?? -1) - (b.score ?? -1);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [applicants, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of WRITING_TEST_STATUSES) {
      counts[s] = applicants.filter((a) => a.status === s).length;
    }
    counts['rejected'] = applicants.filter(
      (a) => a.status === 'rejected' && a.rejectionStage && WRITING_TEST_REJECTION_STAGES.includes(a.rejectionStage)
    ).length;
    return counts;
  }, [applicants]);

  const ALL_DISPLAY_STATUSES = [...WRITING_TEST_STATUSES, 'rejected' as ApplicantStatus];

  // Paid test counts
  const paidCounts = useMemo(() => {
    let paid = 0, unpaid = 0;
    for (const a of writingTestApplicants) {
      if (isPaidTest(a)) paid++;
      else unpaid++;
    }
    return { paid, unpaid };
  }, [writingTestApplicants]);

  // Days elapsed distribution
  const elapsedDistribution = useMemo(() => {
    let fresh = 0, moderate = 0, stale = 0, overdue = 0;
    for (const a of writingTestApplicants) {
      const d = daysSince(a.updatedAt);
      if (d <= 2) fresh++;
      else if (d <= 4) moderate++;
      else if (d <= 7) stale++;
      else overdue++;
    }
    return { fresh, moderate, stale, overdue };
  }, [writingTestApplicants]);

  // Derived percentage helper — avoids division-by-zero and keeps JSX clean
  const pct = (count: number) =>
    writingTestApplicants.length > 0 ? Math.round((count / writingTestApplicants.length) * 100) : 0;

  return (
    <Box sx={{ px: 4, pb: 3, flex: 1, overflow: 'auto' }}>

      {/* ── Compact unified stats bar ── */}
      <Box
        sx={{
          mb: 2,
          p: '10px 16px 12px',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 4px 24px rgba(102,126,234,0.08)',
        }}
      >
        {/* Single header row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '10px' }}>
          <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Writing Tests Overview
          </Typography>
          <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
            {writingTestApplicants.length} candidates
          </Typography>
        </Box>

        {/* Three-column layout */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 0, alignItems: 'start' }}>

          {/* ── Column 1: Candidate Status ── */}
          <Box sx={{ pr: 2 }}>
            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', mb: '6px' }}>
              Status
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', mb: '8px' }}>
              {ALL_DISPLAY_STATUSES.map((s) => {
                const cfg = STATUS_CONFIG[s];
                const count = statusCounts[s];
                const p = pct(count);
                return (
                  <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Color dot */}
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
                    {/* Count */}
                    <Typography sx={{ fontSize: '14px', fontWeight: 800, color: cfg.color, lineHeight: 1, minWidth: '20px' }}>
                      {count}
                    </Typography>
                    {/* Label */}
                    <Typography sx={{ fontSize: '11px', fontWeight: 500, color: '#64748b', flex: 1 }}>
                      {cfg.label}
                    </Typography>
                    {/* Percentage */}
                    <Typography sx={{ fontSize: '11px', fontWeight: 600, color: cfg.color, opacity: 0.75, minWidth: '30px', textAlign: 'right' }}>
                      {p}%
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            {/* Segmented bar */}
            <Box sx={{ display: 'flex', height: 4, borderRadius: '2px', overflow: 'hidden', bgcolor: '#f1f5f9' }}>
              {ALL_DISPLAY_STATUSES.filter((s) => statusCounts[s] > 0).map((s) => (
                <Box key={s} sx={{ flex: statusCounts[s], bgcolor: STATUS_CONFIG[s].color, transition: 'flex 0.4s ease' }} />
              ))}
            </Box>
          </Box>

          {/* Divider */}
          <Box sx={{ bgcolor: '#e2e8f0', mx: 0, alignSelf: 'stretch' }} />

          {/* ── Column 2: Test Type ── */}
          <Box sx={{ px: 2 }}>
            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', mb: '6px' }}>
              Test Type
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', mb: '8px' }}>
              {[
                { label: 'Paid', sublabel: '1,000 EGP', count: paidCounts.paid, color: '#16a34a' },
                { label: 'Standard', sublabel: 'Unpaid', count: paidCounts.unpaid, color: '#64748b' },
              ].map((band) => {
                const p = pct(band.count);
                return (
                  <Box key={band.label} sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: band.color, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '14px', fontWeight: 800, color: band.color, lineHeight: 1, minWidth: '20px' }}>
                      {band.count}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 500, color: '#64748b', lineHeight: 1.2 }}>
                        {band.label}
                      </Typography>
                      <Typography sx={{ fontSize: '10px', fontWeight: 400, color: '#94a3b8', lineHeight: 1 }}>
                        {band.sublabel}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '11px', fontWeight: 600, color: band.color, opacity: 0.75, minWidth: '30px', textAlign: 'right' }}>
                      {p}%
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            {/* Segmented bar */}
            <Box sx={{ display: 'flex', height: 4, borderRadius: '2px', overflow: 'hidden', bgcolor: '#f1f5f9' }}>
              {paidCounts.paid > 0 && <Box sx={{ flex: paidCounts.paid, bgcolor: '#16a34a', transition: 'flex 0.4s ease' }} />}
              {paidCounts.unpaid > 0 && <Box sx={{ flex: paidCounts.unpaid, bgcolor: '#94a3b8', transition: 'flex 0.4s ease' }} />}
            </Box>
          </Box>

          {/* Divider */}
          <Box sx={{ bgcolor: '#e2e8f0', mx: 0, alignSelf: 'stretch' }} />

          {/* ── Column 3: Days Elapsed ── */}
          <Box sx={{ pl: 2 }}>
            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', mb: '6px' }}>
              Days Elapsed
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', mb: '8px' }}>
              {[
                { label: '0 – 2d', sublabel: 'Fresh', count: elapsedDistribution.fresh, color: '#16a34a' },
                { label: '3 – 4d', sublabel: 'Moderate', count: elapsedDistribution.moderate, color: '#d97706' },
                { label: '5 – 7d', sublabel: 'Stale', count: elapsedDistribution.stale, color: '#ea580c' },
                { label: '8d+', sublabel: 'Overdue', count: elapsedDistribution.overdue, color: '#dc2626' },
              ].map((band) => {
                const p = pct(band.count);
                return (
                  <Box key={band.label} sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: band.color, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '14px', fontWeight: 800, color: band.color, lineHeight: 1, minWidth: '20px' }}>
                      {band.count}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 500, color: '#64748b', lineHeight: 1.2 }}>
                        {band.label}
                      </Typography>
                      <Typography sx={{ fontSize: '10px', fontWeight: 400, color: '#94a3b8', lineHeight: 1 }}>
                        {band.sublabel}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '11px', fontWeight: 600, color: band.color, opacity: 0.75, minWidth: '30px', textAlign: 'right' }}>
                      {p}%
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            {/* Segmented bar */}
            <Box sx={{ display: 'flex', height: 4, borderRadius: '2px', overflow: 'hidden', bgcolor: '#f1f5f9' }}>
              {[
                { count: elapsedDistribution.fresh, color: '#16a34a' },
                { count: elapsedDistribution.moderate, color: '#d97706' },
                { count: elapsedDistribution.stale, color: '#ea580c' },
                { count: elapsedDistribution.overdue, color: '#dc2626' },
              ].filter((seg) => seg.count > 0).map((seg, i) => (
                <Box key={i} sx={{ flex: seg.count, bgcolor: seg.color, transition: 'flex 0.4s ease' }} />
              ))}
            </Box>
          </Box>

        </Box>
      </Box>

      <TableContainer
        sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                '& th': {
                  fontWeight: 700,
                  fontSize: '12px',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '2px solid #e2e8f0',
                  py: 1.5,
                  px: 2,
                  whiteSpace: 'nowrap',
                },
              }}
            >
              <TableCell>
                <TableSortLabel active={sortField === 'name'} direction={sortField === 'name' ? sortDir : 'asc'} onClick={() => handleSort('name')}>
                  Candidate
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sortField === 'status'} direction={sortField === 'status' ? sortDir : 'asc'} onClick={() => handleSort('status')}>
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sortField === 'score'} direction={sortField === 'score' ? sortDir : 'asc'} onClick={() => handleSort('score')}>
                  Candidate Score
                </TableSortLabel>
              </TableCell>
              <TableCell>Paid Test</TableCell>
              <TableCell>Test Assigned</TableCell>
              <TableCell>
                <TableSortLabel active={sortField === 'days_elapsed'} direction={sortField === 'days_elapsed' ? sortDir : 'asc'} onClick={() => handleSort('days_elapsed')}>
                  Days Elapsed
                </TableSortLabel>
              </TableCell>
              <TableCell>Deadline</TableCell>
              <TableCell>Email Sent</TableCell>
              <TableCell>Source</TableCell>
              <TableCell align="center">Links</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {writingTestApplicants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                  <Typography variant="body2">No candidates in writing test stages</Typography>
                </TableCell>
              </TableRow>
            ) : (
              writingTestApplicants.map((applicant) => {
                const displayStatus = getDisplayStatus(applicant);
                const cfg = STATUS_CONFIG[displayStatus] || STATUS_CONFIG['test_task'];
                const testAssigned = applicant.updatedAt;
                const elapsed = daysSince(testAssigned);
                const draftDate = applicant.outreach?.email?.draftCreatedAt;
                const deadlineBase = draftDate || testAssigned;
                const deadlineDate = deadlineBase ? new Date(
                  (deadlineBase instanceof Date ? deadlineBase : new Date(deadlineBase as any)).getTime() + 7 * 24 * 60 * 60 * 1000
                ) : null;
                const isOverdue = deadlineDate ? new Date() > deadlineDate : false;
                const daysLeft = deadlineDate ? Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                const paid = isPaidTest(applicant);

                return (
                  <TableRow
                    key={applicant.id}
                    onClick={() => onApplicantClick(applicant)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { background: '#f8fafc' },
                      '& td': { py: 1.5, px: 2, fontSize: '13px', borderBottom: '1px solid #f1f5f9' },
                    }}
                  >
                    {/* Candidate */}
                    <TableCell>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                          {applicant.name}
                        </Typography>
                        <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>
                          {[applicant.sex, applicant.age ? `${applicant.age}y` : null, applicant.education].filter(Boolean).join(' \u00B7 ')}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Chip
                        label={cfg.label}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: '11px',
                          color: cfg.color,
                          background: cfg.bg,
                          height: 24,
                        }}
                      />
                    </TableCell>

                    {/* Candidate Score */}
                    <TableCell>
                      {applicant.score != null ? (
                        <Chip
                          label={`${applicant.score}/10`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '12px',
                            height: 24,
                            color: applicant.score >= 8 ? '#16a34a' : applicant.score >= 5 ? '#d97706' : '#dc2626',
                            background: applicant.score >= 8 ? '#f0fdf4' : applicant.score >= 5 ? '#fffbeb' : '#fef2f2',
                          }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: '12px', color: '#cbd5e1', fontStyle: 'italic' }}>Not scored</Typography>
                      )}
                    </TableCell>

                    {/* Paid Test */}
                    <TableCell>
                      {paid ? (
                        <Chip
                          label="Yes"
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: '11px',
                            height: 24,
                            color: '#16a34a',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                          }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: '12px', color: '#cbd5e1' }}>—</Typography>
                      )}
                    </TableCell>

                    {/* Test Assigned */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTimeIcon sx={{ fontSize: 14, color: '#f97316' }} />
                        <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
                          {formatDate(testAssigned)}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Days Elapsed */}
                    <TableCell>
                      <Chip
                        label={`${elapsed}d`}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: '11px',
                          height: 22,
                          color: elapsed > 7 ? '#dc2626' : elapsed > 4 ? '#d97706' : '#16a34a',
                          background: elapsed > 7 ? '#fef2f2' : elapsed > 4 ? '#fffbeb' : '#f0fdf4',
                        }}
                      />
                    </TableCell>

                    {/* Deadline */}
                    <TableCell>
                      {deadlineDate ? (
                        <Typography
                          sx={{
                            fontSize: '12px',
                            fontWeight: isOverdue ? 700 : 400,
                            color: isOverdue ? '#dc2626' : daysLeft != null && daysLeft <= 2 ? '#d97706' : '#64748b',
                          }}
                        >
                          {isOverdue ? `Overdue (${Math.abs(daysLeft!)}d)` : `${daysLeft}d left`}
                        </Typography>
                      ) : (
                        <Typography sx={{ fontSize: '12px', color: '#cbd5e1' }}>—</Typography>
                      )}
                    </TableCell>

                    {/* Email Sent */}
                    <TableCell>
                      {draftDate ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon sx={{ fontSize: 14, color: '#667eea' }} />
                          <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
                            {formatDate(draftDate)}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: '12px', color: '#cbd5e1', fontStyle: 'italic' }}>Not sent</Typography>
                      )}
                    </TableCell>

                    {/* Source */}
                    <TableCell>
                      <Chip
                        label={sourceLabel(applicant.source)}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: '11px',
                          height: 22,
                          borderColor: '#e2e8f0',
                          color: '#64748b',
                        }}
                      />
                    </TableCell>

                    {/* Links */}
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {applicant.linkedInUrl && (
                          <Tooltip title="LinkedIn">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(applicant.linkedInUrl, '_blank');
                              }}
                              sx={{ color: '#0077b5' }}
                            >
                              <LinkedInIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {applicant.testTaskUrl && (
                          <Tooltip title="Test Task">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(applicant.testTaskUrl, '_blank');
                              }}
                              sx={{ color: '#f97316' }}
                            >
                              <OpenInNewIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default WritingTestsTable;
