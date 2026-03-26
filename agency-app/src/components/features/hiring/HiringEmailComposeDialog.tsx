import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Link,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { createHiringDraft } from '../../../services/api/gmailService';

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
  const [subject, setSubject] = useState(`Re: Your Application to CodeContent`);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ draftUrl?: string } | null>(null);

  const handleCreateDraft = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Please fill in both subject and body');
      return;
    }

    try {
      setSending(true);
      setError(null);

      // Convert plain text body to HTML
      const bodyHtml = body
        .split('\n')
        .map((line) => (line.trim() ? `<p>${line}</p>` : '<br>'))
        .join('');

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
    setSubject('Re: Your Application to CodeContent');
    setBody('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
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
            Compose Email to {applicantName}
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
              Draft Created Successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              A draft has been created in your mostafa@codecontent.net Gmail account.
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
            <TextField
              label="To"
              value={applicantEmail}
              fullWidth
              disabled
              sx={{ mb: 2 }}
              InputProps={{
                sx: { bgcolor: '#f8fafc' },
              }}
            />
            <TextField
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Email Body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              fullWidth
              multiline
              rows={10}
              placeholder={`Hi ${applicantName},\n\nThank you for your application to CodeContent...\n\nBest regards,\nMostafa`}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              This will create a draft in mostafa@codecontent.net — you can review and send it from Gmail.
            </Typography>
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
            disabled={sending || !subject.trim() || !body.trim()}
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
            {sending ? 'Creating Draft...' : 'Create Draft'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
