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
  type: 'salary' | 'commission';
  baseSalary?: number;
  commissionRate?: number;
  bonusStructure?: number;
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
    role: 'Sales Representative',
    department: 'Sales Team',
    phoneNumber: '',
    specialties: [],
    joinDate: new Date().toISOString().split('T')[0],
    compensation: {
      type: 'salary',
      baseSalary: 0,
      commissionRate: 0
    }
  });
  
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const availableSpecialties = [
    'Lead Generation',
    'Cold Outreach',
    'Inbound Sales',
    'Account Management',
    'Social Selling',
    'Email Campaigns',
    'LinkedIn Outreach',
    'Closing Deals',
    'Follow-up Management',
    'Pipeline Management'
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
    const newType = event.target.value as 'salary' | 'commission';
    setFormData(prev => ({
      ...prev,
      compensation: {
        type: newType,
        ...(newType === 'salary' ? { baseSalary: 0, bonusStructure: 0 } : { commissionRate: 0 })
      }
    }));
  };

  const handleCompensationAmountChange = (field: 'baseSalary' | 'commissionRate' | 'bonusStructure') => (
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
    // Only validate compensation for sales reps and managers when user is CEO
    if ((formData.role !== 'Sales Representative' && formData.role !== 'Sales Manager') || userProfile?.role !== 'CEO') return true;

    if (formData.compensation.type === 'salary') {
      return formData.compensation.baseSalary && formData.compensation.baseSalary > 0;
    } else {
      return formData.compensation.commissionRate && formData.compensation.commissionRate > 0;
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

    if ((formData.role === 'Sales Representative' || formData.role === 'Sales Manager') && userProfile?.role === 'CEO' && !validateCompensation()) {
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
          leadsConverted: 0,
          conversionRate: 0,
          pipelineValue: 0,
        }
      };

      // Only include compensation for sales reps and managers
      if (formData.role !== 'Sales Representative' && formData.role !== 'Sales Manager') {
        const { compensation, ...userDataWithoutCompensation } = userData;
        await addDoc(collection(db, 'users'), userDataWithoutCompensation);
      } else {
        await addDoc(collection(db, 'users'), userData);
      }

      handleClose();
    } catch (error) {
      console.error('Error adding team member:', error);
      setError('Failed to add team member. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setFormData({
        email: '',
        displayName: '',
        role: 'Sales Representative',
        department: 'Sales Team',
        phoneNumber: '',
        specialties: [],
        joinDate: new Date().toISOString().split('T')[0],
        compensation: {
          type: 'salary',
          baseSalary: 0,
          commissionRate: 0
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
                    <MenuItem value="Sales Representative">Sales Representative</MenuItem>
                    <MenuItem value="Sales Manager">Sales Manager</MenuItem>
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

              {/* Compensation Section - Only for Sales Reps and Managers, and only visible to CEOs */}
              {(formData.role === 'Sales Representative' || formData.role === 'Sales Manager') && userProfile?.role === 'CEO' && (
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
                          value="salary"
                          control={<Radio disabled={submitting} />}
                          label="Base Salary + Bonus"
                        />
                        <FormControlLabel
                          value="commission"
                          control={<Radio disabled={submitting} />}
                          label="Commission-Based"
                        />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  {formData.compensation.type === 'salary' ? (
                    <>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Base Salary (Annual) *"
                          type="number"
                          value={formData.compensation.baseSalary || ''}
                          onChange={handleCompensationAmountChange('baseSalary')}
                          disabled={submitting}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          inputProps={{
                            min: 0,
                            step: 1000
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Bonus Structure (Annual)"
                          type="number"
                          value={formData.compensation.bonusStructure || ''}
                          onChange={handleCompensationAmountChange('bonusStructure')}
                          disabled={submitting}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          inputProps={{
                            min: 0,
                            step: 1000
                          }}
                        />
                      </Grid>
                    </>
                  ) : (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Commission Rate *"
                        type="number"
                        value={formData.compensation.commissionRate || ''}
                        onChange={handleCompensationAmountChange('commissionRate')}
                        disabled={submitting}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        }}
                        inputProps={{
                          min: 0,
                          max: 100,
                          step: 0.5
                        }}
                      />
                    </Grid>
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