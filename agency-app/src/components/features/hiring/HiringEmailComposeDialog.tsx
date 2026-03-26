import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Link,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { createHiringDraft } from '../../../services/api/gmailService';
import { getSettings } from '../../../services/api/settings';
import { HiringEmailTemplate } from '../../../types/settings';

interface HiringEmailComposeDialogProps {
  open: boolean;
  onClose: () => void;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
}

export const HiringEmailComposeDialog: React.FC<HiringEmailComposeDialogProps> = ({
  open,
  onClose,
  applicantId,
  applicantName,
  applicantEmail,
}) => {
  const [templates, setTemplates] = useState<HiringEmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ draftUrl?: string } | null>(null);

  useEffect(() => {
    if (open) {
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
  }, [open]);

  const handleCreateDraft = async () => {
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) {
      setError('Please select a template');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const replaceName = (text: string) =>
        text.replace(/\{\{name\}\}/g, applicantName).replace(/\{\{email\}\}/g, applicantEmail);

      const subject = replaceName(template.subject);
      const body = replaceName(template.body);
      const bodyHtml = body.replace(/\n/g, '<br>');

      const result = await createHiringDraft({
        applicantId,
        to: applicantEmail,
        subject,
        bodyHtml,
      });

      if (result.success) {
        setSuccess({ draftUrl: result.draftUrl });
      } else {
        setError(result.error || 'Failed to create draft');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create draft');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSelectedTemplateId('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Email {applicantName}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 600, mb: 2 }}>
              Draft Created!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Draft created in mostafa@codecontent.net for {applicantEmail}
            </Typography>
            {success.draftUrl && (
              <Button
                variant="contained"
                startIcon={<OpenInNewIcon />}
                component={Link}
                href={success.draftUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 600,
                  textTransform: 'none',
                  textDecoration: 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    textDecoration: 'none',
                  },
                }}
              >
                Open Draft in Gmail
              </Button>
            )}
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              To: <strong>{applicantEmail}</strong>
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Select Template</InputLabel>
              <Select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                label="Select Template"
              >
                <MenuItem value="" disabled>
                  <em>None selected</em>
                </MenuItem>
                {templates.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedTemplateId && (() => {
              const t = templates.find((t) => t.id === selectedTemplateId);
              if (!t) return null;
              return (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Subject:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {t.subject.replace(/\{\{name\}\}/g, applicantName)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Body:
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#475569' }}>
                    {t.body.replace(/\{\{name\}\}/g, applicantName).replace(/\{\{email\}\}/g, applicantEmail)}
                  </Typography>
                </Box>
              );
            })()}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none' }}>
          {success ? 'Close' : 'Cancel'}
        </Button>
        {!success && (
          <Button
            variant="contained"
            onClick={handleCreateDraft}
            disabled={sending || !selectedTemplateId}
            startIcon={sending ? <CircularProgress size={20} /> : <EmailIcon />}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              },
            }}
          >
            {sending ? 'Creating...' : 'Create Draft'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
