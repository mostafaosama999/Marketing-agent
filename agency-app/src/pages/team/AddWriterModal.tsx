// src/components/AddWriterModal.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Alert,
  CircularProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputAdornment,
  Divider,
} from '@mui/material';
import { db } from '../../services/firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

import { collection, addDoc } from 'firebase/firestore';

interface AddWriterModalProps {
  open: boolean;
  onClose: () => void;
}

interface CompensationStructure {
  type: 'hourly' | 'fixed';
  hourlyRate?: number;
  blogRate?: number;
  tutorialRate?: number;
}

interface WriterFormData {
  email: string;
  displayName: string;
  role: string;
  department: string;
  phoneNumber: string;
  specialties: string[];
  joinDate: string;
  compensation: CompensationStructure;
}

const AddWriterModal: React.FC<AddWriterModalProps> = ({ open, onClose }) => {
  const { userProfile } = useAuth();
  const [formData, setFormData] = useState<WriterFormData>({
    email: '',
    displayName: '',
    role: 'Writer',
    department: 'Content Team',
    phoneNumber: '',
    specialties: [],
    joinDate: new Date().toISOString().split('T')[0],
    compensation: {
      type: 'fixed',
      blogRate: 0,
      tutorialRate: 0
    }
  });
  
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const availableSpecialties = [
    'Technical Writing',
    'Blog Writing',
    'Social Media',
    'SEO Content',
    'Email Marketing',
    'Press Releases',
    'Product Descriptions',
    'White Papers',
    'Case Studies',
    'Landing Pages'
  ];

  const handleChange = (field: keyof WriterFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError(''); // Clear error on input
  };

  const handleCompensationTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newType = event.target.value as 'hourly' | 'fixed';
    setFormData(prev => ({
      ...prev,
      compensation: {
        type: newType,
        ...(newType === 'hourly' ? { hourlyRate: 0 } : { blogRate: 0, tutorialRate: 0 })
      }
    }));
  };

  const handleCompensationAmountChange = (field: 'hourlyRate' | 'blogRate' | 'tutorialRate') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(event.target.value) || 0;
    setFormData(prev => ({
      ...prev,
      compensation: {
        ...prev.compensation,
        [field]: value
      }
    }));
  };

  const addSpecialty = (specialty: string) => {
    if (specialty && !formData.specialties.includes(specialty)) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty]
      }));
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (specialtyToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialtyToRemove)
    }));
  };

  const validateCompensation = () => {
    // Only validate compensation for writers and managers when user is CEO
    if ((formData.role !== 'Writer' && formData.role !== 'Manager') || userProfile?.role !== 'CEO') return true;
    
    if (formData.compensation.type === 'hourly') {
      return formData.compensation.hourlyRate && formData.compensation.hourlyRate > 0;
    } else {
      return (formData.compensation.blogRate && formData.compensation.blogRate > 0) ||
             (formData.compensation.tutorialRate && formData.compensation.tutorialRate > 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.displayName.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if ((formData.role === 'Writer' || formData.role === 'Manager') && userProfile?.role === 'CEO' && !validateCompensation()) {
      setError('Please set at least one compensation rate');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const userData: any = {
        ...formData,
        createdAt: new Date().toISOString(),
        performance: {
          tasksCompleted: 0,
          averageScore: 0,
          onTimeDelivery: 100,
        }
      };

      // Only include compensation for writers and managers
      if (formData.role !== 'Writer' && formData.role !== 'Manager') {
        const { compensation, ...userDataWithoutCompensation } = userData;
        await addDoc(collection(db, 'users'), userDataWithoutCompensation);
      } else {
        await addDoc(collection(db, 'users'), userData);
      }
      
      handleClose();
    } catch (error) {
      console.error('Error adding writer:', error);
      setError('Failed to add writer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setFormData({
        email: '',
        displayName: '',
        role: 'Writer',
        department: 'Content Team',
        phoneNumber: '',
        specialties: [],
        joinDate: new Date().toISOString().split('T')[0],
        compensation: {
          type: 'fixed',
          blogRate: 0,
          tutorialRate: 0
        }
      });
      setSpecialtyInput('');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Add New Team Member</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Email Address *"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  required
                  disabled={submitting}
                />
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Display Name *"
                  value={formData.displayName}
                  onChange={handleChange('displayName')}
                  required
                  disabled={submitting}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Role *</InputLabel>
                  <Select
                    value={formData.role}
                    label="Role *"
                    onChange={handleChange('role')}
                    disabled={submitting}
                  >
                    <MenuItem value="Writer">Writer</MenuItem>
                    <MenuItem value="Manager">Manager</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Department"
                  value={formData.department}
                  onChange={handleChange('department')}
                  disabled={submitting}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={formData.phoneNumber}
                  onChange={handleChange('phoneNumber')}
                  disabled={submitting}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Join Date"
                  type="date"
                  value={formData.joinDate}
                  onChange={handleChange('joinDate')}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  disabled={submitting}
                />
              </Grid>

              {/* Compensation Section - Only for Writers and Managers, and only visible to CEOs */}
              {(formData.role === 'Writer' || formData.role === 'Manager') && userProfile?.role === 'CEO' && (
                <>
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Compensation Structure
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControl component="fieldset">
                      <Typography variant="subtitle2" gutterBottom>
                        Compensation Type *
                      </Typography>
                      <RadioGroup
                        row
                        value={formData.compensation.type}
                        onChange={handleCompensationTypeChange}
                      >
                        <FormControlLabel 
                          value="hourly" 
                          control={<Radio disabled={submitting} />} 
                          label="Hourly Rate" 
                        />
                        <FormControlLabel 
                          value="fixed" 
                          control={<Radio disabled={submitting} />} 
                          label="Fixed Rate per Content Type" 
                        />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  {formData.compensation.type === 'hourly' ? (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Hourly Rate *"
                        type="number"
                        value={formData.compensation.hourlyRate || ''}
                        onChange={handleCompensationAmountChange('hourlyRate')}
                        disabled={submitting}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        inputProps={{
                          min: 0,
                          step: 0.01
                        }}
                      />
                    </Grid>
                  ) : (
                    <>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Rate per Blog Post"
                          type="number"
                          value={formData.compensation.blogRate || ''}
                          onChange={handleCompensationAmountChange('blogRate')}
                          disabled={submitting}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          inputProps={{
                            min: 0,
                            step: 0.01
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Rate per Tutorial"
                          type="number"
                          value={formData.compensation.tutorialRate || ''}
                          onChange={handleCompensationAmountChange('tutorialRate')}
                          disabled={submitting}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          inputProps={{
                            min: 0,
                            step: 0.01
                          }}
                        />
                      </Grid>
                    </>
                  )}
                </>
              )}

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Specialties
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {formData.specialties.map((specialty, idx) => (
                    <Chip
                      key={idx}
                      label={specialty}
                      onDelete={() => removeSpecialty(specialty)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="Add a specialty..."
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSpecialty(specialtyInput);
                      }
                    }}
                    size="small"
                    disabled={submitting}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => addSpecialty(specialtyInput)}
                    disabled={!specialtyInput.trim() || submitting}
                  >
                    Add
                  </Button>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                    Quick Add:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {availableSpecialties
                      .filter(spec => !formData.specialties.includes(spec))
                      .map((specialty) => (
                        <Chip
                          key={specialty}
                          label={specialty}
                          size="small"
                          onClick={() => addSpecialty(specialty)}
                          sx={{ cursor: 'pointer' }}
                          disabled={submitting}
                        />
                      ))
                    }
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={submitting || !formData.email.trim() || !formData.displayName.trim()}
          >
            {submitting ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Adding...
              </>
            ) : (
              'Add Team Member'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddWriterModal;