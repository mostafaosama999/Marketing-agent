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
} from '@mui/material';
import {
  Close as CloseIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LinkOff as LinkOffIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Cake as CakeIcon,
} from '@mui/icons-material';
import { Applicant, ApplicantStatus, HIRING_STAGES } from '../../../types/applicant';
import { updateApplicant, deleteApplicant } from '../../../services/api/applicants';

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
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (applicant) {
      setScore(applicant.score);
      setNotes(applicant.notes);
      setStatus(applicant.status);
    }
  }, [applicant]);

  if (!applicant) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateApplicant(applicant.id, { score, notes, status });
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
    status !== applicant.status;

  const hasLinkedIn = !!applicant.linkedInUrl;

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
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
            {applicant.name}
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
            Applied {applicant.submittedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' via '}
            {applicant.source === 'webflow' ? 'Webflow' : applicant.source === 'csv_import' ? 'CSV Import' : 'Manual'}
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
              onChange={(e) => setStatus(e.target.value as ApplicantStatus)}
            >
              {HIRING_STAGES.map((stage) => (
                <MenuItem key={stage.id} value={stage.id}>
                  {stage.icon} {stage.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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

        {/* Key Info Summary */}
        {(applicant.age || applicant.sex || applicant.education) && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            {applicant.sex && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: 2, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                <PersonIcon sx={{ fontSize: 16, color: '#6366f1' }} />
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{applicant.sex}</Typography>
              </Box>
            )}
            {applicant.age && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: 2, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                <CakeIcon sx={{ fontSize: 16, color: '#ec4899' }} />
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{applicant.age} years old</Typography>
              </Box>
            )}
            {applicant.education && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: 2, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                <SchoolIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{applicant.education}</Typography>
              </Box>
            )}
          </Box>
        )}

        <Divider sx={{ mb: 3 }} />

        {/* Contact Info */}
        <Typography variant="subtitle2" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, mb: 2, fontSize: '11px', fontWeight: 700 }}>
          Contact Information
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <EmailIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
            <Link href={`mailto:${applicant.email}`} sx={{ color: '#1e293b', fontSize: '14px' }}>
              {applicant.email}
            </Link>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {hasLinkedIn ? (
              <>
                <LinkedInIcon sx={{ fontSize: 18, color: '#0077b5' }} />
                <Link
                  href={applicant.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: '#1e293b', wordBreak: 'break-all', fontSize: '14px' }}
                >
                  {applicant.linkedInUrl.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\?.*$/, '').replace(/\/$/, '')}
                </Link>
              </>
            ) : (
              <>
                <LinkOffIcon sx={{ fontSize: 18, color: '#d97706' }} />
                <Typography variant="body2" sx={{ color: '#d97706', fontStyle: 'italic' }}>
                  No LinkedIn provided
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {/* Bio */}
        {applicant.bio && (
          <>
            <Typography variant="subtitle2" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5, fontSize: '11px', fontWeight: 700 }}>
              Why They're Interested
            </Typography>
            <Box sx={{ background: '#f8fafc', borderRadius: 2, p: 2.5, border: '1px solid #e2e8f0', mb: 3 }}>
              <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {renderTextWithLinks(applicant.bio)}
              </Typography>
            </Box>
          </>
        )}

        <Divider sx={{ mb: 3 }} />

        {/* Form Answers */}
        {Object.keys(applicant.formAnswers).length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, mb: 2.5, fontSize: '11px', fontWeight: 700 }}>
              Application Answers
            </Typography>

            {Object.entries(applicant.formAnswers).map(([question, answer]) => (
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
                  {question}
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
            ))}

            <Divider sx={{ mb: 3 }} />
          </>
        )}

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
    </Dialog>
  );
};
