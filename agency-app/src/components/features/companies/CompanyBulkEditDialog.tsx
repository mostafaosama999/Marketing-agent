// src/components/features/companies/CompanyBulkEditDialog.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
} from '@mui/material';
import { Company } from '../../../types/crm';

interface CompanyBulkEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Company>) => Promise<void>;
  selectedCount: number;
}

export const CompanyBulkEditDialog: React.FC<CompanyBulkEditDialogProps> = ({
  open,
  onClose,
  onSave,
  selectedCount,
}) => {
  const [loading, setLoading] = useState(false);
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Build updates object with only filled fields
      const updates: Partial<Company> = {};

      if (website.trim()) {
        updates.website = website.trim();
      }

      if (industry.trim()) {
        updates.industry = industry.trim();
      }

      if (description.trim()) {
        updates.description = description.trim();
      }

      await onSave(updates);

      // Reset form
      setWebsite('');
      setIndustry('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Error in bulk edit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setWebsite('');
    setIndustry('');
    setDescription('');
    onClose();
  };

  const hasChanges = website.trim() || industry.trim() || description.trim();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Bulk Edit Companies
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <Alert severity="info">
            Editing {selectedCount} compan{selectedCount > 1 ? 'ies' : 'y'}. Only filled fields will be updated.
          </Alert>

          {/* Website */}
          <TextField
            label="Website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            fullWidth
            placeholder="Leave empty to skip"
            helperText="Update website URL for selected companies"
          />

          {/* Industry */}
          <TextField
            label="Industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            fullWidth
            placeholder="Leave empty to skip"
            helperText="Update industry classification"
          />

          {/* Description */}
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder="Leave empty to skip"
            helperText="Update company description"
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !hasChanges}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
            },
          }}
        >
          {loading ? 'Saving...' : `Update ${selectedCount} Compan${selectedCount > 1 ? 'ies' : 'y'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
