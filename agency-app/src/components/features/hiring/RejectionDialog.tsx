import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  Block as BlockIcon,
  Description as DocIcon,
} from '@mui/icons-material';
import {
  Applicant,
  RejectionStage,
  REJECTION_STAGE_LABELS,
  REJECTION_STAGE_COLORS,
} from '../../../types/applicant';
import { HiringEmailTemplate } from '../../../types/settings';
import { getSettings } from '../../../services/api/settings';
import { rejectApplicant } from '../../../services/api/applicants';
import { createHiringDraft } from '../../../services/api/gmailService';

interface RejectionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  applicant: Applicant | null;
  presetRejectionStage?: RejectionStage | null;
}

const REJECTION_STAGES: RejectionStage[] = ['applied', 'shortlisted', 'test_task', 'responded', 'feedback', 'offer'];

export const RejectionDialog: React.FC<RejectionDialogProps> = ({
  open,
  onClose,
  onConfirm,
  applicant,
  presetRejectionStage,
}) => {
  const [rejectionStage, setRejectionStage] = useState<RejectionStage>('applied');
  const [rejectionNote, setRejectionNote] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [templates, setTemplates] = useState<HiringEmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [testTaskUrl, setTestTaskUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSuccess, setDraftSuccess] = useState<string | null>(null);

  // Auto-populate rejection stage from preset or applicant's current status
  useEffect(() => {
    if (open && applicant) {
      if (presetRejectionStage) {
        setRejectionStage(presetRejectionStage);
      } else {
        const currentStatus = applicant.status;
        if (currentStatus !== 'rejected' && currentStatus !== 'hired') {
          setRejectionStage(currentStatus as RejectionStage);
        } else {
          setRejectionStage('applied');
        }
      }
      setRejectionNote('');
      setTestTaskUrl('');
      setSendEmail(false);
      setSelectedTemplateId('');
      setError(null);
      setDraftSuccess(null);
    }
  }, [open, applicant]);

  // Load templates when email toggle is on
  useEffect(() => {
    if (sendEmail && templates.length === 0) {
      const loadTemplates = async () => {
        try {
          const settings = await getSettings();
          setTemplates(settings.hiringEmailTemplates || []);
        } catch {
          // Templates are optional
        }
      };
      loadTemplates();
    }
  }, [sendEmail, templates.length]);

  // Auto-select matching template when rejection stage changes
  useEffect(() => {
    if (sendEmail && templates.length > 0) {
      const matching = templates.find((t) => t.rejectionStage === rejectionStage);
      if (matching) {
        setSelectedTemplateId(matching.id);
      } else {
        setSelectedTemplateId('');
      }
    }
  }, [rejectionStage, sendEmail, templates]);

  if (!applicant) return null;

  const handleConfirm = async () => {
    try {
      setSaving(true);
      setError(null);

      // 1. Reject the applicant
      await rejectApplicant(applicant.id, rejectionStage, rejectionNote, testTaskUrl || undefined);

      // 2. Optionally create email draft
      if (sendEmail && selectedTemplateId) {
        const template = templates.find((t) => t.id === selectedTemplateId);
        if (template) {
          const subject = template.subject
            .replace(/\{\{name\}\}/g, applicant.name)
            .replace(/\{\{email\}\}/g, applicant.email);
          const body = template.body
            .replace(/\{\{name\}\}/g, applicant.name)
            .replace(/\{\{email\}\}/g, applicant.email);
          const bodyHtml = body.replace(/\n/g, '<br>');

          try {
            const result = await createHiringDraft({
              applicantId: applicant.id,
              to: applicant.email,
              subject,
              bodyHtml,
            });
            if (result.success) {
              setDraftSuccess(result.draftUrl || null);
            }
          } catch {
            // Draft failure shouldn't block rejection
          }
        }
      }

      onConfirm();
    } catch (err: any) {
      setError(err.message || 'Failed to reject applicant');
    } finally {
      setSaving(false);
    }
  };

  // Sort templates: matching stage first, then others
  const sortedTemplates = [...templates].sort((a, b) => {
    const aMatch = a.rejectionStage === rejectionStage ? -1 : 0;
    const bMatch = b.rejectionStage === rejectionStage ? -1 : 0;
    return aMatch - bMatch;
  });

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BlockIcon />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Reject {applicant.name}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: '20px !important' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Rejection Stage */}
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569', mb: 1 }}>
          Rejected After Stage
        </Typography>
        <FormControl fullWidth sx={{ mb: 2.5 }}>
          <Select
            value={rejectionStage}
            onChange={(e) => setRejectionStage(e.target.value as RejectionStage)}
            displayEmpty
          >
            {REJECTION_STAGES.map((stage) => (
              <MenuItem key={stage} value={stage}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: REJECTION_STAGE_COLORS[stage],
                    }}
                  />
                  {REJECTION_STAGE_LABELS[stage]}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Rejection Note */}
        <TextField
          label="Rejection Note (optional)"
          value={rejectionNote}
          onChange={(e) => setRejectionNote(e.target.value)}
          fullWidth
          multiline
          rows={2}
          placeholder="e.g., Test task quality was below expectations"
          sx={{ mb: 2.5 }}
        />

        {/* Google Doc URL — shown for writing test rejections, available for all */}
        <TextField
          label="Writing Test Google Doc URL (optional)"
          value={testTaskUrl}
          onChange={(e) => setTestTaskUrl(e.target.value)}
          fullWidth
          placeholder="https://docs.google.com/document/d/..."
          InputProps={{
            startAdornment: (
              <DocIcon sx={{ fontSize: 18, color: '#4285f4', mr: 1 }} />
            ),
          }}
          sx={{
            mb: 2.5,
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: testTaskUrl ? '#4285f4' : undefined,
              },
            },
          }}
        />

        {/* Send Rejection Email Toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#ef4444' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#ef4444' },
              }}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmailIcon sx={{ fontSize: 18, color: '#64748b' }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                Create rejection email draft
              </Typography>
            </Box>
          }
          sx={{ mb: sendEmail ? 2 : 0 }}
        />

        {/* Template Selection (when email toggle is on) */}
        {sendEmail && (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Email Template</InputLabel>
              <Select
                value={selectedTemplateId}
                label="Email Template"
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <MenuItem value="" disabled>
                  <em>Select a template</em>
                </MenuItem>
                {sortedTemplates.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {t.name}
                      {t.rejectionStage && (
                        <Chip
                          label={REJECTION_STAGE_LABELS[t.rejectionStage]}
                          size="small"
                          sx={{
                            fontSize: '10px',
                            height: 18,
                            fontWeight: 600,
                            bgcolor: t.rejectionStage === rejectionStage ? '#dcfce7' : '#f1f5f9',
                            color: t.rejectionStage === rejectionStage ? '#16a34a' : '#64748b',
                          }}
                        />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Email Preview */}
            {selectedTemplate && (
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Subject:
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {selectedTemplate.subject.replace(/\{\{name\}\}/g, applicant.name)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Body:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#475569', fontSize: '13px' }}>
                  {selectedTemplate.body
                    .replace(/\{\{name\}\}/g, applicant.name)
                    .replace(/\{\{email\}\}/g, applicant.email)}
                </Typography>
              </Box>
            )}

            {templates.length === 0 && (
              <Alert severity="info" sx={{ mt: 1 }}>
                No email templates found. Create templates in Settings &gt; Hiring Email Templates.
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={saving || (sendEmail && !selectedTemplateId)}
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <BlockIcon />}
          sx={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            '&:hover': {
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            },
          }}
        >
          {saving ? 'Rejecting...' : sendEmail ? 'Reject & Create Draft' : 'Reject'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
