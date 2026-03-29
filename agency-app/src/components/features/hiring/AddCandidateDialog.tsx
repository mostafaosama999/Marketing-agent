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
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as AutoAwesomeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { ApplicantFormData, ApplicantStatus } from '../../../types/applicant';
import { createApplicant, markApplicantViewed } from '../../../services/api/applicants';
import { parseApplicantProfile } from '../../../services/firebase/cloudFunctions';
import { useAuth } from '../../../contexts/AuthContext';

interface AddCandidateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_FORM: ApplicantFormData = {
  name: '',
  email: '',
  phone: '',
  linkedInUrl: '',
  bio: '',
  status: 'applied',
  formAnswers: {},
  source: 'manual',
};

type FormState = ApplicantFormData & { education: string; sex: string; age: string; availability: string };

const INITIAL_FORM_STATE: FormState = {
  ...INITIAL_FORM,
  education: '',
  sex: '',
  age: '',
  availability: '',
};

export const AddCandidateDialog: React.FC<AddCandidateDialogProps> = ({ open, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM_STATE });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // AI paste extraction state
  const [rawText, setRawText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [pasteExpanded, setPasteExpanded] = useState(true);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleExtract = async () => {
    if (!rawText.trim()) return;

    setExtracting(true);
    setError('');
    try {
      const { parsed } = await parseApplicantProfile(rawText);
      setForm({
        name: parsed.name || '',
        email: parsed.email || '',
        phone: parsed.phone || '',
        linkedInUrl: parsed.linkedInUrl || '',
        bio: parsed.bio || '',
        education: parsed.education || '',
        age: parsed.age || '',
        sex: parsed.sex || '',
        availability: parsed.availability || '',
        status: 'applied',
        formAnswers: parsed.formAnswers || {},
        source: 'manual',
      });
      setExtracted(true);
      setPasteExpanded(false);
    } catch (err: any) {
      console.error('Error extracting profile:', err);
      setError(err.message || 'Failed to extract info. Try pasting more text or fill manually.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    try {
      const newId = await createApplicant({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        linkedInUrl: form.linkedInUrl.trim(),
        bio: form.bio.trim(),
        status: form.status,
        formAnswers: form.formAnswers || {},
        source: 'manual',
        submittedAt: new Date(),
        ...(form.education && { education: form.education.trim() }),
        ...(form.sex && { sex: form.sex }),
        ...(form.age && { age: form.age.trim() }),
        ...(form.availability && { availability: form.availability.trim() }),
      } as any);
      // Auto-mark as viewed so it doesn't show NEW badge
      if (user?.uid && newId) {
        markApplicantViewed(user.uid, newId);
      }
      onSuccess();
      handleReset();
    } catch (err) {
      console.error('Error creating applicant:', err);
      setError('Failed to add candidate. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm({ ...INITIAL_FORM_STATE });
    setRawText('');
    setExtracted(false);
    setPasteExpanded(true);
    setError('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Add Candidate
        </Typography>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>

          {/* AI Paste Extraction Section */}
          <Box
            sx={{
              border: '1px solid',
              borderColor: extracted ? '#10b981' : '#e2e8f0',
              borderRadius: 2,
              overflow: 'hidden',
              background: extracted ? '#f0fdf4' : '#fafbff',
            }}
          >
            <Box
              onClick={() => setPasteExpanded(!pasteExpanded)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1.5,
                cursor: 'pointer',
                '&:hover': { background: 'rgba(102, 126, 234, 0.04)' },
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 18, color: extracted ? '#10b981' : '#667eea' }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: extracted ? '#059669' : '#667eea', flex: 1 }}>
                {extracted ? 'Info extracted — review below' : 'Paste Wuzzuf / LinkedIn profile to auto-fill'}
              </Typography>
              {pasteExpanded ? <ExpandLessIcon sx={{ fontSize: 18, color: '#94a3b8' }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: '#94a3b8' }} />}
            </Box>

            <Collapse in={pasteExpanded}>
              <Box sx={{ px: 2, pb: 2 }}>
                <TextField
                  value={rawText}
                  onChange={(e) => { setRawText(e.target.value); setError(''); }}
                  placeholder="Paste the candidate's profile text here (from Wuzzuf, LinkedIn, or any source)..."
                  fullWidth
                  multiline
                  rows={5}
                  size="small"
                  disabled={extracting}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '13px',
                      background: 'white',
                    },
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Button
                    onClick={handleExtract}
                    disabled={extracting || !rawText.trim()}
                    variant="contained"
                    size="small"
                    startIcon={extracting ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 1.5,
                      fontSize: '13px',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
                      },
                    }}
                  >
                    {extracting ? 'Extracting...' : 'Extract Info'}
                  </Button>
                </Box>
              </Box>
            </Collapse>
          </Box>

          {error && (
            <Alert severity="error" sx={{ py: 0.5, fontSize: '13px' }}>
              {error}
            </Alert>
          )}

          {/* Form Fields */}
          <TextField
            label="Full Name"
            value={form.name}
            onChange={handleChange('name')}
            required
            fullWidth
            size="small"
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              fullWidth
              size="small"
            />
            <TextField
              label="Phone"
              value={form.phone}
              onChange={handleChange('phone')}
              fullWidth
              size="small"
            />
          </Box>

          <TextField
            label="LinkedIn URL"
            value={form.linkedInUrl}
            onChange={handleChange('linkedInUrl')}
            fullWidth
            size="small"
            placeholder="https://linkedin.com/in/..."
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="University / Education"
              value={form.education}
              onChange={handleChange('education')}
              fullWidth
              size="small"
            />
            <TextField
              label="Age"
              value={form.age}
              onChange={handleChange('age')}
              size="small"
              sx={{ width: 100 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Gender</InputLabel>
              <Select
                value={form.sex}
                label="Gender"
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, sex: e.target.value }));
                }}
              >
                <MenuItem value="">-</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Availability"
              value={form.availability}
              onChange={handleChange('availability')}
              fullWidth
              size="small"
              placeholder="e.g., Full-time, Part-time"
            />
          </Box>

          <FormControl size="small">
            <InputLabel>Initial Stage</InputLabel>
            <Select
              value={form.status}
              label="Initial Stage"
              onChange={(e) => {
                setForm((prev) => ({ ...prev, status: e.target.value as ApplicantStatus }));
              }}
            >
              <MenuItem value="applied">Applied</MenuItem>
              <MenuItem value="shortlisted">Shortlisted</MenuItem>
              <MenuItem value="test_task">Writing Test</MenuItem>
              <MenuItem value="responded">Responded</MenuItem>
              <MenuItem value="feedback">Feedback</MenuItem>
              <MenuItem value="offer">Interview</MenuItem>
              <MenuItem value="hired">Hired</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Bio / Notes"
            value={form.bio}
            onChange={handleChange('bio')}
            fullWidth
            size="small"
            multiline
            rows={3}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={handleClose} sx={{ color: '#64748b', textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            px: 3,
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
            },
          }}
        >
          {saving ? 'Adding...' : 'Add Candidate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
