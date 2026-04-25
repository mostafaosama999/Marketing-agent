import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Link,
  Divider,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,

  School as SchoolIcon,
  Person as PersonIcon,
  Cake as CakeIcon,
  CalendarToday as CalendarIcon,
  AccessTime as AccessTimeIcon,
  WarningAmber as WarningAmberIcon,
  MailOutline as MailOutlineIcon,
} from '@mui/icons-material';
import { Alert } from '@mui/material';
import { Applicant, ApplicantStatus, HIRING_STAGES, REJECTION_STAGE_LABELS, REJECTION_STAGE_COLORS, AiScore } from '../../../types/applicant';
import { updateApplicant, deleteApplicant } from '../../../services/api/applicants';
import { HiringEmailComposeDialog } from './HiringEmailComposeDialog';
import { RejectionDialog } from './RejectionDialog';

interface ApplicantDetailDialogProps {
  applicant: Applicant | null;
  open: boolean;
  onClose: () => void;
}

// Extract URLs from text and make them clickable
function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s,)"]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <Link
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ wordBreak: 'break-all', color: '#667eea' }}
      >
        {part}
      </Link>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function getScoreColor(score: number): string {
  if (score >= 8) return '#16a34a';
  if (score >= 5) return '#d97706';
  return '#dc2626';
}

function getScoreBg(score: number): string {
  if (score >= 8) return '#dcfce7';
  if (score >= 5) return '#fef3c7';
  return '#fee2e2';
}

export const ApplicantDetailDialog: React.FC<ApplicantDetailDialogProps> = ({
  applicant,
  open,
  onClose,
}) => {
  const [score, setScore] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ApplicantStatus>('applied');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState('');
  const [sex, setSex] = useState('');
  const [age, setAge] = useState('');
  const [availability, setAvailability] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);

  useEffect(() => {
    if (applicant) {
      setScore(applicant.score);
      setNotes(applicant.notes);
      setStatus(applicant.status);
      setName(applicant.name);
      setEmail(applicant.email);
      setPhone(applicant.phone || '');
      setLinkedInUrl(applicant.linkedInUrl || '');
      setBio(applicant.bio || '');
      setEducation(applicant.education || '');
      setSex(applicant.sex || '');
      setAge(applicant.age || '');
      setAvailability(applicant.availability || '');
    }
  }, [applicant]);

  if (!applicant) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateApplicant(applicant.id, {
        score, notes, status, name, email, phone, linkedInUrl, bio, education, sex, age, availability,
      });
      onClose();
    } catch (error) {
      console.error('Error saving applicant:', error);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    score !== applicant.score ||
    notes !== applicant.notes ||
    status !== applicant.status ||
    name !== applicant.name ||
    email !== applicant.email ||
    phone !== (applicant.phone || '') ||
    linkedInUrl !== (applicant.linkedInUrl || '') ||
    bio !== (applicant.bio || '') ||
    education !== (applicant.education || '') ||
    sex !== (applicant.sex || '') ||
    age !== (applicant.age || '') ||
    availability !== (applicant.availability || '');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, maxHeight: '90vh' },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          pb: 1,
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <TextField
            value={name}
            onChange={(e) => setName(e.target.value)}
            variant="standard"
            fullWidth
            InputProps={{
              disableUnderline: true,
              sx: { fontWeight: 700, fontSize: '1.5rem', color: '#1e293b', '&:hover': { background: '#f1f5f9', borderRadius: 1 } },
            }}
          />
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
            Applied {applicant.submittedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' via '}
            {applicant.source === 'webflow' ? 'Careers Page' : applicant.source === 'tally' ? 'Tally' : applicant.source === 'csv_import' ? 'CSV Import' : 'Wuzzuf'}
            {applicant.jobPost && ` · Job Post: ${applicant.jobPost}`}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 4, py: 3 }}>
        {/* Status + Score Row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => {
                const newStatus = e.target.value as ApplicantStatus;
                if (newStatus === 'rejected' && status !== 'rejected') {
                  setRejectionDialogOpen(true);
                  return;
                }
                setStatus(newStatus);
              }}
            >
              {HIRING_STAGES.filter((s) => s.id !== 'ai_rejected').map((stage) => (
                <MenuItem
                  key={stage.id}
                  value={stage.id}
                  sx={
                    stage.id === 'not_responded' || stage.id === 'responded' || stage.id === 'feedback'
                      ? { pl: 4, fontSize: '14px', color: '#64748b' }
                      : {}
                  }
                >
                  {stage.icon} {stage.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Rejection Info */}
          {applicant.status === 'rejected' && applicant.rejectionStage && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                borderRadius: 2,
                background: '#fef2f2',
                border: '1px solid #fecaca',
              }}
            >
              <Chip
                label={REJECTION_STAGE_LABELS[applicant.rejectionStage]}
                size="small"
                sx={{
                  fontSize: '11px',
                  fontWeight: 600,
                  height: 22,
                  bgcolor: `${REJECTION_STAGE_COLORS[applicant.rejectionStage]}15`,
                  color: REJECTION_STAGE_COLORS[applicant.rejectionStage],
                  border: `1px solid ${REJECTION_STAGE_COLORS[applicant.rejectionStage]}40`,
                }}
              />
              {applicant.rejectionNote && (
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '12px' }}>
                  {applicant.rejectionNote}
                </Typography>
              )}
              {applicant.testTaskUrl && (
                <Link
                  href={applicant.testTaskUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#4285f4',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Writing Test
                </Link>
              )}
              {applicant.rejectedAt && (
                <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '11px', ml: 'auto' }}>
                  {applicant.rejectedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </Typography>
              )}
            </Box>
          )}

          {/* Score Input */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
              Score:
            </Typography>
            <TextField
              type="number"
              size="small"
              value={score !== null ? score : ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Math.min(10, Math.max(0, parseInt(e.target.value) || 0));
                setScore(val);
              }}
              inputProps={{ min: 0, max: 10, style: { textAlign: 'center', fontWeight: 700, fontSize: '16px' } }}
              sx={{
                width: 65,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  background: score !== null && score > 0 ? getScoreBg(score) : '#f1f5f9',
                },
              }}
            />
            <Typography sx={{ fontSize: '14px', color: '#94a3b8', fontWeight: 600 }}>/10</Typography>
          </Box>
        </Box>

        {/* AI Score Breakdown */}
        {applicant.aiScore && (() => {
          const ai = applicant.aiScore as AiScore;
          const tierColors: Record<string, { bg: string; color: string; border: string }> = {
            ADVANCE: { bg: '#dcfce7', color: '#16a34a', border: '#86efac' },
            REVIEW: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
            HOLD: { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
            REJECT: { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
          };
          const tc = tierColors[ai.tier] || tierColors.REJECT;
          const dimensions = [
            { label: 'Location & University', score: ai.dimensions.locationUniversityFit, max: 2 },
            { label: 'Engineering Experience', score: ai.dimensions.engineeringExperience, max: 3 },
            { label: 'Answer Quality', score: ai.dimensions.answerQuality, max: 2 },
            { label: 'Writing & Communication', score: ai.dimensions.writingCommunication, max: 1.5 },
            { label: 'Authenticity & Role Fit', score: ai.dimensions.authenticityRoleFit, max: 1.5 },
            { label: 'Bonus Signals', score: ai.dimensions.bonusSignals, max: 1 },
          ];

          return (
            <Box sx={{ mb: 3, p: 2.5, borderRadius: 2, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
                    AI Score
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, px: 1.5, py: 0.25, borderRadius: 1.5, background: tc.bg, border: `1px solid ${tc.border}` }}>
                    <Typography sx={{ fontSize: '18px', fontWeight: 800, color: tc.color }}>{ai.total}</Typography>
                    <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>/10</Typography>
                  </Box>
                  <Chip label={ai.tier} size="small" sx={{ fontSize: '10px', fontWeight: 800, height: 22, bgcolor: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }} />
                  {ai.overQualified && <Chip label="Over-qualified" size="small" sx={{ fontSize: '10px', fontWeight: 700, height: 22, bgcolor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }} />}
                  {ai.instantReject && <Chip label="Instant Reject" size="small" sx={{ fontSize: '10px', fontWeight: 700, height: 22, bgcolor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }} />}
                </Box>
                {ai.scoredAt && (
                  <Typography sx={{ fontSize: '10px', color: '#94a3b8' }}>
                    {ai.scoredAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Typography>
                )}
              </Box>

              {/* Dimension Breakdown */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                {dimensions.map((d) => (
                  <Box key={d.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '11px', color: '#64748b', minWidth: 150 }}>{d.label}</Typography>
                    <Box sx={{ flex: 1, height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                      <Box sx={{ width: `${(d.score / d.max) * 100}%`, height: '100%', borderRadius: 3, background: d.score / d.max >= 0.7 ? '#4ade80' : d.score / d.max >= 0.4 ? '#fbbf24' : '#f87171' }} />
                    </Box>
                    <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#334155', minWidth: 35, textAlign: 'right' }}>{d.score}/{d.max}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Reasoning */}
              {ai.reasoning && (
                <Typography sx={{ fontSize: '12px', color: '#475569', lineHeight: 1.6, mb: 1.5, whiteSpace: 'pre-wrap' }}>
                  {ai.reasoning}
                </Typography>
              )}

              {/* Strengths + Red Flags */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                {ai.strengths.length > 0 && (
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>Strengths</Typography>
                    {ai.strengths.map((s, i) => (
                      <Typography key={i} sx={{ fontSize: '11px', color: '#15803d', lineHeight: 1.6 }}>• {s}</Typography>
                    ))}
                  </Box>
                )}
                {ai.redFlags.length > 0 && (
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>Red Flags</Typography>
                    {ai.redFlags.map((f, i) => (
                      <Typography key={i} sx={{ fontSize: '11px', color: '#b91c1c', lineHeight: 1.6 }}>• {f}</Typography>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          );
        })()}

        {/* Verified LinkedIn Profile (Apify enrichment) */}
        {(applicant.enrichmentStatus || applicant.apifyEnrichment) && (() => {
          const status = applicant.enrichmentStatus;
          const profile = applicant.apifyEnrichment as Record<string, any> | null | undefined;

          if (status === 'skipped_no_url' || status === 'skipped_invalid_url') {
            return (
              <Box sx={{ mb: 3, p: 1.5, borderRadius: 2, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                <Typography sx={{ fontSize: '11px', color: '#64748b' }}>
                  No valid LinkedIn URL provided — scored on form data only.
                </Typography>
              </Box>
            );
          }
          if (status === 'skipped_no_token') {
            return (
              <Box sx={{ mb: 3, p: 1.5, borderRadius: 2, background: '#fef3c7', border: '1px solid #fde68a' }}>
                <Typography sx={{ fontSize: '11px', color: '#92400e' }}>
                  Apify token not configured — LinkedIn enrichment skipped.
                </Typography>
              </Box>
            );
          }
          if (status === 'failed') {
            return (
              <Box sx={{ mb: 3, p: 1.5, borderRadius: 2, background: '#fef3c7', border: '1px solid #fde68a' }} title={applicant.enrichmentError || ''}>
                <Typography sx={{ fontSize: '11px', color: '#92400e' }}>
                  LinkedIn enrichment failed — scored on form data only. {applicant.enrichmentError ? `(${String(applicant.enrichmentError).slice(0, 120)})` : ''}
                </Typography>
              </Box>
            );
          }
          if (status !== 'enriched' || !profile) return null;

          const claimedEdu = (applicant.education || '').trim().toLowerCase();
          const verifiedEdu: any[] = Array.isArray(profile.education) ? profile.education : [];
          const eduMismatch = claimedEdu.length > 0 && verifiedEdu.length > 0 && !verifiedEdu.some((e) => {
            const school = String(e.schoolName || e.school || '').toLowerCase();
            if (!school) return false;
            return school.includes(claimedEdu) || claimedEdu.includes(school);
          });

          const verifiedExp: any[] = Array.isArray(profile.experience) ? profile.experience : [];
          const langs: any[] = Array.isArray(profile.languages) ? profile.languages : [];
          const followers = typeof profile.followers === 'number' ? profile.followers : null;
          const loc = profile.location?.parsed || profile.location || null;
          const locStr = loc ? [loc.city || loc.locality, loc.country || loc.countryName].filter(Boolean).join(', ') : '';
          const headline = profile.headline ? String(profile.headline) : '';

          return (
            <Box sx={{ mb: 3, p: 2.5, borderRadius: 2, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinkedInIcon sx={{ fontSize: 18, color: '#0a66c2' }} />
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Verified LinkedIn Profile
                  </Typography>
                  <Chip label="Apify" size="small" sx={{ fontSize: '9px', fontWeight: 700, height: 18, bgcolor: '#e0e7ff', color: '#4338ca' }} />
                  {eduMismatch && (
                    <Chip label="UNIVERSITY MISMATCH" size="small" sx={{ fontSize: '9px', fontWeight: 800, height: 18, bgcolor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }} />
                  )}
                </Box>
                {applicant.enrichmentScrapedAt && (
                  <Typography sx={{ fontSize: '10px', color: '#94a3b8' }}>
                    {applicant.enrichmentScrapedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Typography>
                )}
              </Box>

              {headline && (
                <Typography sx={{ fontSize: '12px', color: '#475569', mb: 1, fontStyle: 'italic' }}>
                  {headline}
                </Typography>
              )}

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                {locStr && <Chip label={locStr} size="small" sx={{ fontSize: '10px', height: 22, bgcolor: '#fff', border: '1px solid #cbd5e1' }} />}
                {followers !== null && <Chip label={`${followers.toLocaleString()} followers`} size="small" sx={{ fontSize: '10px', height: 22, bgcolor: '#fff', border: '1px solid #cbd5e1' }} />}
                {langs.slice(0, 4).map((l, i) => (
                  <Chip key={i} label={`${l.name || l.language || ''}${l.proficiency ? ` (${l.proficiency})` : ''}`} size="small" sx={{ fontSize: '10px', height: 22, bgcolor: '#fff', border: '1px solid #cbd5e1' }} />
                ))}
              </Box>

              {verifiedEdu.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>Education</Typography>
                  {verifiedEdu.slice(0, 3).map((e, i) => {
                    const school = e.schoolName || e.school || '';
                    const degree = e.degree || '';
                    const field = e.fieldOfStudy || e.field || '';
                    return (
                      <Typography key={i} sx={{ fontSize: '11px', color: '#334155', lineHeight: 1.6 }}>
                        • <strong>{school}</strong>{degree ? ` — ${degree}` : ''}{field ? `, ${field}` : ''}
                      </Typography>
                    );
                  })}
                  {claimedEdu && (
                    <Typography sx={{ fontSize: '10px', color: eduMismatch ? '#dc2626' : '#16a34a', mt: 0.5 }}>
                      Claimed on form: <strong>{applicant.education}</strong>{eduMismatch ? ' ✗' : ' ✓'}
                    </Typography>
                  )}
                </Box>
              )}

              {verifiedExp.length > 0 && (
                <Box>
                  <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>Experience (most recent)</Typography>
                  {verifiedExp.slice(0, 3).map((x, i) => {
                    const title = x.title || x.position || '';
                    const company = x.companyName || x.company || '';
                    const duration = x.duration || [x.startDate, x.endDate || 'Present'].filter(Boolean).join(' – ');
                    return (
                      <Typography key={i} sx={{ fontSize: '11px', color: '#334155', lineHeight: 1.6 }}>
                        • <strong>{title}</strong>{company ? ` @ ${company}` : ''}{duration ? ` (${duration})` : ''}
                      </Typography>
                    );
                  })}
                </Box>
              )}
            </Box>
          );
        })()}

        {/* Editable Key Info */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5, borderRadius: 2, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
            <PersonIcon sx={{ fontSize: 16, color: '#6366f1' }} />
            <TextField
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              variant="standard"
              placeholder="Gender"
              InputProps={{ disableUnderline: true, sx: { fontSize: '13px', fontWeight: 600, color: '#334155', width: 60 } }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5, borderRadius: 2, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
            <CakeIcon sx={{ fontSize: 16, color: '#ec4899' }} />
            <TextField
              value={age}
              onChange={(e) => setAge(e.target.value)}
              variant="standard"
              placeholder="Age"
              InputProps={{ disableUnderline: true, sx: { fontSize: '13px', fontWeight: 600, color: '#334155', width: 40 } }}
            />
            <Typography sx={{ fontSize: '13px', color: '#64748b' }}>years old</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5, borderRadius: 2, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
            <SchoolIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
            <TextField
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              variant="standard"
              placeholder="University"
              InputProps={{ disableUnderline: true, sx: { fontSize: '13px', fontWeight: 600, color: '#334155', width: 180 } }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5, borderRadius: 2, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
            <CalendarIcon sx={{ fontSize: 16, color: '#0ea5e9' }} />
            <Typography sx={{ fontSize: '13px', color: '#64748b' }}>Start:</Typography>
            <TextField
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              variant="standard"
              placeholder="Availability"
              InputProps={{ disableUnderline: true, sx: { fontSize: '13px', fontWeight: 600, color: '#334155', width: 100 } }}
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Contact Info */}
        <Typography variant="subtitle2" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, mb: 2, fontSize: '11px', fontWeight: 700 }}>
          Contact Information
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <EmailIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
            <TextField
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="standard"
              placeholder="Email"
              InputProps={{ disableUnderline: true, sx: { fontSize: '14px', color: '#1e293b', '&:hover': { background: '#f1f5f9', borderRadius: 1 } } }}
              sx={{ flex: 1 }}
            />
            <Button
              size="small"
              startIcon={<EmailIcon sx={{ fontSize: 14 }} />}
              onClick={() => setComposeOpen(true)}
              sx={{
                ml: 1,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '12px',
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
                minHeight: 0,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                },
              }}
            >
              Compose
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PhoneIcon sx={{ fontSize: 18, color: '#10b981' }} />
            <TextField
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              variant="standard"
              placeholder="Phone number"
              InputProps={{ disableUnderline: true, sx: { fontSize: '14px', color: '#1e293b', '&:hover': { background: '#f1f5f9', borderRadius: 1 } } }}
              sx={{ flex: 1 }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LinkedInIcon sx={{ fontSize: 18, color: '#0077b5' }} />
            <TextField
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              variant="standard"
              placeholder="LinkedIn URL"
              InputProps={{ disableUnderline: true, sx: { fontSize: '14px', color: '#1e293b', '&:hover': { background: '#f1f5f9', borderRadius: 1 } } }}
              sx={{ flex: 1 }}
            />
            {linkedInUrl && (
              <Link
                href={linkedInUrl.startsWith('http') ? linkedInUrl : `https://${linkedInUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                sx={{ fontSize: '12px', color: '#0077b5', whiteSpace: 'nowrap' }}
              >
                Open
              </Link>
            )}
          </Box>
        </Box>

        {/* Writing Test Deadline */}
        {applicant.status === 'test_task' && (() => {
          const draftDate = applicant.outreach?.email?.draftCreatedAt;
          if (!draftDate) return null;

          const deadline = new Date(draftDate);
          deadline.setDate(deadline.getDate() + 7);
          const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const isOverdue = daysLeft < 0;
          const isUrgent = daysLeft >= 0 && daysLeft <= 3;
          const accentColor = isOverdue ? '#ef4444' : isUrgent ? '#f97316' : '#22c55e';
          const elapsed = Math.min(7, 7 - daysLeft);
          const progressPct = Math.min(100, (elapsed / 7) * 100);

          return (
            <>
              <Typography variant="subtitle2" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5, fontSize: '11px', fontWeight: 700 }}>
                Writing Test
              </Typography>
              <Box sx={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: `3px solid ${accentColor}`, borderRadius: 2, p: 2.5, mb: 3 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', rowGap: 1, mb: 2 }}>
                  <Typography sx={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Test sent</Typography>
                  <Typography sx={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                    {draftDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Deadline</Typography>
                  <Typography sx={{ fontSize: '12px', color: isOverdue ? '#dc2626' : '#334155', fontWeight: 700 }}>
                    {deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Typography>
                </Box>

                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ height: 8, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}>
                    <Box sx={{
                      width: `${progressPct}%`,
                      height: '100%',
                      background: isOverdue ? '#ef4444' : isUrgent ? 'linear-gradient(90deg, #fb923c, #f97316)' : 'linear-gradient(90deg, #4ade80, #22c55e)',
                      borderRadius: 4,
                      transition: 'width 0.4s ease',
                    }} />
                  </Box>
                </Box>

                {isOverdue ? (
                  <Alert severity="error" icon={<WarningAmberIcon fontSize="small" />} sx={{ fontSize: '12px', borderRadius: 2, py: 0.5, '& .MuiAlert-message': { py: 0 } }}>
                    Overdue by {Math.abs(daysLeft)} day(s) — consider following up or moving to Rejected
                  </Alert>
                ) : (
                  <Typography sx={{ fontSize: '12px', fontWeight: 600, color: isUrgent ? '#c2410c' : '#15803d' }}>
                    {daysLeft === 0 ? 'Due today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}{isUrgent && daysLeft > 0 ? ' — respond soon' : ''}
                  </Typography>
                )}
              </Box>
            </>
          );
        })()}

        {/* Bio */}
        <Typography variant="subtitle2" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5, fontSize: '11px', fontWeight: 700 }}>
          Why They're Interested
        </Typography>
        <TextField
          multiline
          rows={3}
          fullWidth
          placeholder="Add a bio or summary..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              fontSize: '14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              '& fieldset': { border: 'none' },
              '&:hover': { background: '#f1f5f9' },
            },
          }}
        />

        <Divider sx={{ mb: 3 }} />

        {/* Form Answers */}
        {Object.keys(applicant.formAnswers).length > 0 && (() => {
          // Map old short labels to full question text for existing data
          const LABEL_TO_QUESTION: Record<string, string> = {
            'Role Fit': "This role involves writing long-form technical blogs and tutorials, implementing and running real code, and revising work based on feedback. Does this match what you're looking for?",
            'Technical Writing Experience': "Describe a technical concept you've written about before. What made it difficult to explain, and how did you approach it?",
            'LLM Experience': "Have you ever built or worked with an LLM-based system (e.g., RAG, agents, embeddings, APIs)? If yes, briefly describe what you built or experimented with.",
            'Languages & Tools': "What programming languages and tools have you used recently in hands-on work? Please be specific (language, framework, and what you built).",
            'Writing Samples': "Share 1–2 technical writing samples (blog posts or tutorials) that you personally wrote and that include code you implemented and ran yourself.",
            'Career Goals': "What are your 1–3 year goals as a freelancer or in your career?",
          };
          return (
          <>
            <Typography variant="subtitle2" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, mb: 2.5, fontSize: '11px', fontWeight: 700 }}>
              Application Answers
            </Typography>

            {Object.entries(applicant.formAnswers).map(([question, answer]) => {
              const displayQuestion = LABEL_TO_QUESTION[question] || question;
              return (
              <Box key={question} sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    color: '#334155',
                    mb: 1,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      flexShrink: 0,
                    }}
                  />
                  {displayQuestion}
                </Typography>
                <Box
                  sx={{
                    color: '#475569',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                    background: '#f8fafc',
                    borderRadius: 2,
                    p: 2.5,
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    borderLeft: '3px solid #667eea',
                  }}
                >
                  <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
                    {renderTextWithLinks(answer)}
                  </Typography>
                </Box>
              </Box>
              );
            })}

            <Divider sx={{ mb: 3 }} />
          </>
          );
        })()}

        {/* Notes */}
        <Typography variant="subtitle2" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5, fontSize: '11px', fontWeight: 700 }}>
          Evaluation Notes
        </Typography>
        <TextField
          multiline
          rows={4}
          fullWidth
          placeholder="Add your evaluation notes here... What stood out? Any concerns? Next steps?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              fontSize: '14px',
            },
          }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 4, py: 2, background: '#f8fafc', justifyContent: 'space-between' }}>
        <Box>
          {!confirmDelete ? (
            <Button
              onClick={() => setConfirmDelete(true)}
              sx={{ color: '#ef4444', textTransform: 'none', fontSize: '13px' }}
            >
              Delete
            </Button>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '13px', color: '#ef4444' }}>Are you sure?</Typography>
              <Button
                size="small"
                onClick={async () => {
                  await deleteApplicant(applicant.id);
                  setConfirmDelete(false);
                  onClose();
                }}
                sx={{ color: '#ef4444', textTransform: 'none', fontWeight: 700, minWidth: 'auto' }}
              >
                Yes, delete
              </Button>
              <Button
                size="small"
                onClick={() => setConfirmDelete(false)}
                sx={{ color: '#64748b', textTransform: 'none', minWidth: 'auto' }}
              >
                No
              </Button>
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} sx={{ color: '#64748b', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
              px: 4,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </DialogActions>

      {/* Compose Email Dialog */}
      {applicant && (
        <HiringEmailComposeDialog
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          applicantId={applicant.id}
          applicantName={applicant.name}
          applicantEmail={applicant.email}
        />
      )}

      {/* Rejection Dialog */}
      <RejectionDialog
        open={rejectionDialogOpen}
        onClose={() => setRejectionDialogOpen(false)}
        onConfirm={() => {
          setRejectionDialogOpen(false);
          onClose();
        }}
        applicant={applicant}
      />
    </Dialog>
  );
};
