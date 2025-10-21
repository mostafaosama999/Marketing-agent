// src/components/features/crm/filters/FilterPresetsMenu.tsx
import React, { useState, useEffect } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  BookmarkBorder as BookmarkBorderIcon,
  Add as AddIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { PresetListItem } from '../../../../types/filter';
import {
  subscribeToUserPresets,
  deleteFilterPreset,
  setDefaultPreset,
} from '../../../../services/api/filterPresetsService';

interface FilterPresetsMenuProps {
  userId: string;
  onLoadPreset: (presetId: string) => void;
  onSaveNew: () => void;
}

export const FilterPresetsMenu: React.FC<FilterPresetsMenuProps> = ({
  userId,
  onLoadPreset,
  onSaveNew,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [presets, setPresets] = useState<PresetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const open = Boolean(anchorEl);
  const actionMenuOpen = Boolean(actionMenuAnchor);

  // Subscribe to presets
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToUserPresets(userId, (presetList) => {
      setPresets(presetList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLoadPreset = (presetId: string) => {
    onLoadPreset(presetId);
    handleClose();
  };

  const handleSaveNew = () => {
    onSaveNew();
    handleClose();
  };

  const handleOpenActionMenu = (event: React.MouseEvent<HTMLElement>, presetId: string) => {
    event.stopPropagation();
    setActionMenuAnchor(event.currentTarget);
    setSelectedPresetId(presetId);
  };

  const handleCloseActionMenu = () => {
    setActionMenuAnchor(null);
    setSelectedPresetId(null);
  };

  const handleSetDefault = async () => {
    if (!selectedPresetId) return;
    try {
      await setDefaultPreset(userId, selectedPresetId);
      handleCloseActionMenu();
    } catch (error) {
      console.error('Error setting default preset:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedPresetId) return;
    try {
      await deleteFilterPreset(userId, selectedPresetId);
      handleCloseActionMenu();
    } catch (error) {
      console.error('Error deleting preset:', error);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<BookmarkBorderIcon />}
        onClick={handleOpen}
        sx={{
          textTransform: 'none',
          borderColor: '#667eea',
          color: '#667eea',
          fontWeight: 600,
          '&:hover': {
            borderColor: '#5568d3',
            bgcolor: 'rgba(102, 126, 234, 0.08)',
          },
        }}
      >
        Presets
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 280,
            maxWidth: 400,
            mt: 1,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        {/* Save New Button */}
        <MenuItem
          onClick={handleSaveNew}
          sx={{
            py: 1.5,
            borderBottom: '1px solid #e2e8f0',
            '&:hover': {
              bgcolor: 'rgba(102, 126, 234, 0.08)',
            },
          }}
        >
          <ListItemIcon>
            <AddIcon sx={{ color: '#667eea' }} />
          </ListItemIcon>
          <ListItemText
            primary="Save Current Filters"
            primaryTypographyProps={{
              fontWeight: 600,
              color: '#667eea',
            }}
          />
        </MenuItem>

        {/* Presets List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : presets.length === 0 ? (
          <Box sx={{ py: 3, px: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No saved presets
            </Typography>
          </Box>
        ) : [
          <Divider key="divider" sx={{ my: 0.5 }} />,
          ...presets.map((preset) => (
            <MenuItem
              key={preset.id}
              onClick={() => handleLoadPreset(preset.id)}
              sx={{
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&:hover': {
                  bgcolor: 'rgba(102, 126, 234, 0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {preset.isDefault ? (
                  <StarIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                ) : (
                  <StarBorderIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={preset.name}
                secondary={preset.description}
                primaryTypographyProps={{
                  fontWeight: preset.isDefault ? 600 : 500,
                  fontSize: '0.95rem',
                }}
                secondaryTypographyProps={{
                  fontSize: '0.8rem',
                  noWrap: true,
                }}
                sx={{ flex: 1 }}
              />
              <IconButton
                size="small"
                onClick={(e) => handleOpenActionMenu(e, preset.id)}
                sx={{
                  opacity: 0.6,
                  '&:hover': {
                    opacity: 1,
                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </MenuItem>
          ))
        ]}
      </Menu>

      {/* Action Menu (for default/delete) */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={actionMenuOpen}
        onClose={handleCloseActionMenu}
        PaperProps={{
          sx: {
            minWidth: 180,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        <MenuItem onClick={handleSetDefault}>
          <ListItemIcon>
            <StarIcon fontSize="small" sx={{ color: '#f59e0b' }} />
          </ListItemIcon>
          <ListItemText primary="Set as Default" />
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: '#ef4444' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} />
          </ListItemIcon>
          <ListItemText primary="Delete" />
        </MenuItem>
      </Menu>
    </>
  );
};
