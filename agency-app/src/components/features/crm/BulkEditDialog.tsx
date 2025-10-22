// src/components/features/crm/BulkEditDialog.tsx
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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
} from '@mui/material';
import { Lead } from '../../../types/lead';

interface BulkEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Lead['customFields']>) => Promise<void>;
  selectedCount: number;
}

export const BulkEditDialog: React.FC<BulkEditDialogProps> = ({
  open,
  onClose,
  onSave,
  selectedCount,
}) => {
  const [loading, setLoading] = useState(false);
  const [leadOwner, setLeadOwner] = useState('');
  const [priority, setPriority] = useState('');
  const [dealValue, setDealValue] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Build updates object with only filled fields
      const updates: any = {};

      if (leadOwner.trim()) {
        updates.lead_owner = leadOwner.trim();
      }

      if (priority) {
        updates.priority = priority;
      }

      if (dealValue.trim()) {
        const numValue = parseFloat(dealValue);
        if (!isNaN(numValue)) {
          updates.deal_value = numValue;
        }
      }

      await onSave(updates);

      // Reset form
      setLeadOwner('');
      setPriority('');
      setDealValue('');
      onClose();
    } catch (error) {
      console.error('Error in bulk edit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLeadOwner('');
    setPriority('');
    setDealValue('');
    onClose();
  };

  const hasChanges = leadOwner.trim() || priority || dealValue.trim();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Bulk Edit Fields
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <Alert severity="info">
            Editing {selectedCount} lead{selectedCount > 1 ? 's' : ''}. Only filled fields will be updated.
          </Alert>

          {/* Lead Owner */}
          <TextField
            label="Lead Owner"
            value={leadOwner}
            onChange={(e) => setLeadOwner(e.target.value)}
            fullWidth
            placeholder="Leave empty to skip"
            helperText="Assign all selected leads to a team member"
          />

          {/* Priority */}
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              label="Priority"
            >
              <MenuItem value="">
                <em>Leave unchanged</em>
              </MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>

          {/* Deal Value */}
          <TextField
            label="Deal Value"
            type="number"
            value={dealValue}
            onChange={(e) => setDealValue(e.target.value)}
            fullWidth
            placeholder="Leave empty to skip"
            helperText="Estimated value in USD"
            InputProps={{
              startAdornment: dealValue ? <Typography sx={{ mr: 0.5 }}>$</Typography> : undefined,
            }}
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
          {loading ? 'Saving...' : `Update ${selectedCount} Lead${selectedCount > 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
