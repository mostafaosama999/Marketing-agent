import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  TextField,
  Divider,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  LinkedIn as LinkedInIcon,
  ContentCopy as CopyIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  RestartAlt as RestartAltIcon,
} from '@mui/icons-material';
import {
  SourcedCandidate,
  ArchiveReason,
  ARCHIVE_REASON_LABELS,
  OUTBOUND_STAGES,
} from '../../../types/sourcedCandidate';
import { LinkedInDmTemplate } from '../../../types/linkedinDmTemplate';
import { resolveDmText } from '../../../utils/copyDm';

interface OutboundCandidateDialogProps {
  open: boolean;
  candidate: SourcedCandidate | null;
  defaultTemplate: LinkedInDmTemplate | null;
  onClose: () => void;
  onSaveNotes: (candidate: SourcedCandidate, notes: string) => void;
  onCopyAndMarkSent: (candidate: SourcedCandidate, message: string) => void;
  onArchive: (candidate: SourcedCandidate, reason: ArchiveReason) => void;
  onDelete: (candidate: SourcedCandidate) => void;
}

export const OutboundCandidateDialog: React.FC<OutboundCandidateDialogProps> = ({
  open,
  candidate,
  defaultTemplate,
  onClose,
  onSaveNotes,
  onCopyAndMarkSent,
  onArchive,
  onDelete,
}) => {
  const [dmText, setDmText] = useState('');
  const [notes, setNotes] = useState('');
  const [archiveReason, setArchiveReason] = useState<ArchiveReason | ''>('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const initialDm = useMemo(() => {
    if (!candidate) return '';
    return resolveDmText(candidate, { template: defaultTemplate });
  }, [candidate, defaultTemplate]);

  useEffect(() => {
    if (candidate && open) {
      setDmText(initialDm);
      setNotes(candidate.notes || '');
      setArchiveReason('');
      setCopyFeedback(null);
    }
  }, [candidate, open, initialDm]);

  if (!candidate) return null;

  const stage = OUTBOUND_STAGES.find((s) => s.id === candidate.status);
  const hasDraft = !!candidate.draftOutreach && candidate.draftOutreach.trim().length > 0;
  const showResetLink = !!defaultTemplate && (hasDraft || dmText !== initialDm);

  const handleCopy = async () => {
    if (!dmText.trim()) {
      setCopyFeedback('Nothing to copy.');
      return;
    }
    try {
      await navigator.clipboard.writeText(dmText);
      onCopyAndMarkSent(candidate, dmText);
      setCopyFeedback('Copied and marked as sent.');
    } catch (err) {
      setCopyFeedback('Clipboard write failed.');
    }
  };

  const handleResetToTemplate = () => {
    if (!defaultTemplate) return;
    setDmText(resolveDmText(candidate, { template: defaultTemplate, preferDraft: false }));
  };

  const handleResetToDraft = () => {
    setDmText(candidate.draftOutreach || '');
  };

  const handleSaveNotes = () => {
    if (notes !== candidate.notes) onSaveNotes(candidate, notes);
    onClose();
  };

  const handleArchive = () => {
    if (archiveReason) {
      onArchive(candidate, archiveReason);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{candidate.name}</Typography>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mt: 0.5 }}>
            {stage && (
              <Chip
                label={`${stage.icon} ${stage.label}`}
                size="small"
                sx={{ fontSize: '11px', fontWeight: 700, bgcolor: `${stage.color}15`, color: stage.color }}
              />
            )}
            <Chip
              label={`Score ${candidate.score}/10`}
              size="small"
              sx={{ fontSize: '11px', fontWeight: 700, bgcolor: '#f1f5f9', color: '#475569' }}
            />
            {candidate.tier && (
              <Chip
                label={candidate.tier.toUpperCase()}
                size="small"
                sx={{
                  fontSize: '11px',
                  fontWeight: 700,
                  bgcolor: candidate.tier === 'premium' ? '#fef3c7' : '#dbeafe',
                  color: candidate.tier === 'premium' ? '#b45309' : '#2563eb',
                }}
              />
            )}
            {candidate.linkedInUrl && (
              <Tooltip title="Open LinkedIn" arrow>
                <IconButton
                  size="small"
                  component="a"
                  href={candidate.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: '#0077b5' }}
                >
                  <LinkedInIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Profile */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Profile</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
          <Field label="University" value={candidate.university ? `${candidate.university}${candidate.universityTier ? ` (Tier ${candidate.universityTier})` : ''}` : '—'} />
          <Field label="Current role" value={[candidate.currentRole, candidate.currentCompany].filter(Boolean).join(' @ ') || '—'} />
          <Field label="Estimated age" value={candidate.estimatedAge != null ? `${candidate.estimatedAge}` : '—'} />
          <Field label="Years exp" value={candidate.yearsOfExperience != null ? `${candidate.yearsOfExperience}` : '—'} />
          <Field label="Location" value={candidate.location || '—'} />
          <Field label="English" value={candidate.englishLevel || '—'} />
          <Field label="Tech stack" value={candidate.techStack.length > 0 ? candidate.techStack.join(', ') : '—'} span />
          <Field label="Writing signals" value={candidate.writingSignals || '—'} span />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Reasoning */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Why this person</Typography>
        <Typography sx={{ fontSize: '13px', color: '#475569', mb: 1.5 }}>
          {candidate.whyThisPerson || '—'}
        </Typography>
        {candidate.risks && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: '13px' }}>
            <strong>Risks:</strong> {candidate.risks}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Compensation */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Compensation</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
          <Field
            label="Estimated current salary"
            value={candidate.estimatedCurrentSalaryEgp != null ? `${candidate.estimatedCurrentSalaryEgp.toLocaleString()} EGP/mo` : '—'}
          />
          <Field
            label="Recommended offer"
            value={candidate.recommendedOfferEgp != null ? `${candidate.recommendedOfferEgp.toLocaleString()} EGP/mo` : '—'}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Outreach */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Outreach</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
          <Field label="Sent at" value={candidate.sentAt ? candidate.sentAt.toLocaleString() : 'Not sent'} />
          <Field label="Replied at" value={candidate.repliedAt ? candidate.repliedAt.toLocaleString() : '—'} />
        </Box>

        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>
              LinkedIn DM
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {hasDraft && dmText !== candidate.draftOutreach && (
                <Button size="small" startIcon={<RestartAltIcon fontSize="small" />} onClick={handleResetToDraft} sx={{ fontSize: '11px' }}>
                  Reset to AI draft
                </Button>
              )}
              {showResetLink && !hasDraft && (
                <Button size="small" startIcon={<RestartAltIcon fontSize="small" />} onClick={handleResetToTemplate} sx={{ fontSize: '11px' }}>
                  Reset to template
                </Button>
              )}
            </Box>
          </Box>
          <TextField
            multiline
            minRows={5}
            maxRows={12}
            fullWidth
            value={dmText}
            onChange={(e) => setDmText(e.target.value)}
            placeholder={defaultTemplate ? '' : 'No draft or default template available. Create one in Settings or type a DM here.'}
            sx={{ '& .MuiInputBase-input': { fontSize: '13px' } }}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={<CopyIcon />}
              onClick={handleCopy}
              disabled={!dmText.trim()}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Copy and mark sent
            </Button>
            {copyFeedback && (
              <Typography sx={{ fontSize: '12px', color: '#16a34a' }}>{copyFeedback}</Typography>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Notes */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Notes</Typography>
        <TextField
          multiline
          minRows={2}
          maxRows={6}
          fullWidth
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes about this candidate"
          sx={{ '& .MuiInputBase-input': { fontSize: '13px' } }}
        />

        <Divider sx={{ my: 2 }} />

        {/* Archive */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Archive</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Archive reason</InputLabel>
            <Select
              value={archiveReason}
              label="Archive reason"
              onChange={(e) => setArchiveReason(e.target.value as ArchiveReason | '')}
            >
              <MenuItem value=""><em>Pick a reason</em></MenuItem>
              {(Object.keys(ARCHIVE_REASON_LABELS) as ArchiveReason[]).map((r) => (
                <MenuItem key={r} value={r}>{ARCHIVE_REASON_LABELS[r]}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            startIcon={<ArchiveIcon />}
            disabled={!archiveReason}
            onClick={handleArchive}
            sx={{ textTransform: 'none' }}
          >
            Archive
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              if (window.confirm(`Delete ${candidate.name} permanently? This cannot be undone.`)) {
                onDelete(candidate);
                onClose();
              }
            }}
            sx={{ textTransform: 'none' }}
          >
            Delete
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
        <Button
          variant="contained"
          onClick={handleSaveNotes}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Save notes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Field: React.FC<{ label: string; value: string; span?: boolean }> = ({ label, value, span }) => (
  <Box sx={{ gridColumn: span ? '1 / -1' : 'auto' }}>
    <Typography sx={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: '13px', color: '#1e293b', mt: 0.25 }}>{value}</Typography>
  </Box>
);
