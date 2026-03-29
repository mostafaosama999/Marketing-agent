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
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { ApplicantFormData, ApplicantStatus } from '../../../types/applicant';
import { createApplicant } from '../../../services/api/applicants';

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

export const AddCandidateDialog: React.FC<AddCandidateDialogProps> = ({ open, onClose, onSuccess }) => {
  const [form, setForm] = useState<ApplicantFormData & { education: string; sex: string; age: string; availability: string }>({
    ...INITIAL_FORM,
    education: '',
    sex: '',
    age: '',
    availability: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    try {
      await createApplicant({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        linkedInUrl: form.linkedInUrl.trim(),
        bio: form.bio.trim(),
        status: form.status,
        formAnswers: {},
        source: 'manual',
        submittedAt: new Date(),
        // Pass extra fields as part of the data
        ...(form.education && { education: form.education.trim() }),
        ...(form.sex && { sex: form.sex }),
        ...(form.age && { age: form.age.trim() }),
        ...(form.availability && { availability: form.availability.trim() }),
      } as any);
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
    setForm({ ...INITIAL_FORM, education: '', sex: '', age: '', availability: '' });
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
          <TextField
            label="Full Name"
            value={form.name}
            onChange={handleChange('name')}
            required
            fullWidth
            size="small"
            error={error === 'Name is required'}
            helperText={error === 'Name is required' ? error : ''}
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

          {error && error !== 'Name is required' && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
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
