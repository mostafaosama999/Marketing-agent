/**
 * DropdownFieldManager Component
 *
 * A reusable component that renders dropdown menu items with three-dot menus
 * for managing dropdown values (rename, delete). This allows users to configure
 * dropdown options directly from the UI.
 */

import React, { useState } from 'react';
import {
  MenuItem,
  Chip,
  IconButton,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  renameDropdownValue,
  deleteDropdownValue,
  getDropdownValueUsageCount,
} from '../../../services/api/dropdownValueManager';
import { EntityType } from '../../../types/fieldDefinitions';
import { useAuth } from '../../../contexts/AuthContext';

interface DropdownFieldManagerProps {
  /** The dropdown option value */
  value: string;
  /** Display label for the option */
  label: string;
  /** Entity type (lead or company) */
  entityType: EntityType;
  /** Field name in customFields */
  fieldName: string;
  /** Whether this option is currently selected */
  isSelected: boolean;
  /** Callback when user clicks the option (not the three-dot menu) */
  onSelect: () => void;
  /** Chip styling */
  chipSx?: any;
  /** Callback after successful rename/delete */
  onUpdate?: () => void;
  /** Whether to show the management menu (three-dot icon) */
  showManagement?: boolean;
}

export const DropdownFieldManager: React.FC<DropdownFieldManagerProps> = ({
  value,
  label,
  entityType,
  fieldName,
  isSelected,
  onSelect,
  chipSx,
  onUpdate,
  showManagement = true,
}) => {
  const { user } = useAuth();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle three-dot menu open
  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  // Handle rename click
  const handleRenameClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewValue(value);
    setRenameDialogOpen(true);
    handleMenuClose();
  };

  // Handle delete click
  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
    handleMenuClose();

    // Fetch usage count
    setLoading(true);
    const count = await getDropdownValueUsageCount(entityType, fieldName, value);
    setUsageCount(count);
    setLoading(false);
  };

  // Handle rename submit
  const handleRenameSubmit = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const result = await renameDropdownValue(
      entityType,
      fieldName,
      value,
      newValue.trim(),
      user.uid
    );

    setLoading(false);

    if (result.success) {
      setRenameDialogOpen(false);
      setNewValue('');
      onUpdate?.();
    } else {
      setError(result.error || 'Failed to rename value');
    }
  };

  // Handle delete submit
  const handleDeleteSubmit = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const result = await deleteDropdownValue(
      entityType,
      fieldName,
      value,
      user.uid
    );

    setLoading(false);

    if (result.success) {
      setDeleteDialogOpen(false);
      setUsageCount(null);
      onUpdate?.();
    } else {
      setError(result.error || 'Failed to delete value');
    }
  };

  return (
    <>
      {/* Menu Item with Chip and Three-Dot Menu */}
      <MenuItem
        onClick={onSelect}
        selected={isSelected}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Chip
          label={label}
          size="small"
          sx={{
            flex: 1,
            ...chipSx,
          }}
        />

        {showManagement && (
          <IconButton
            size="small"
            onClick={handleMenuClick}
            sx={{
              padding: '4px',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            <MoreVertIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </MenuItem>

      {/* Three-Dot Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={handleRenameClick}>
          <EditIcon sx={{ mr: 1, fontSize: 18 }} />
          Rename
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Rename Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => {
          if (!loading) {
            setRenameDialogOpen(false);
            setError(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Rename Dropdown Value</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Renaming "{value}" will update all {entityType}s that use this value.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              autoFocus
              margin="dense"
              label="New Value"
              fullWidth
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()} // Prevent Menu from capturing keyboard events
              disabled={loading}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRenameDialogOpen(false);
              setError(null);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenameSubmit}
            variant="contained"
            disabled={loading || !newValue.trim() || newValue.trim() === value}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            {loading ? <CircularProgress size={20} /> : 'Rename'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!loading) {
            setDeleteDialogOpen(false);
            setUsageCount(null);
            setError(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Dropdown Value</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Are you sure you want to delete "{value}"?
            </Typography>

            {loading && usageCount === null ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Checking usage...
                </Typography>
              </Box>
            ) : (
              usageCount !== null && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  This value is currently used by <strong>{usageCount}</strong> {entityType}
                  {usageCount !== 1 ? 's' : ''}. Deleting it will clear this field for all
                  affected {entityType}s.
                </Alert>
              )
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setUsageCount(null);
              setError(null);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteSubmit}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DropdownFieldManager;
