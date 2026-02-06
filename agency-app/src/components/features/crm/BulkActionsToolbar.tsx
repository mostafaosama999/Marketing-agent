// src/components/features/crm/BulkActionsToolbar.tsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Menu,
  MenuItem,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as DownloadIcon,
  Close as CloseIcon,
  ChangeCircle as ChangeCircleIcon,
  Archive as ArchiveIcon,
  Email as EmailIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';
import { LeadStatus } from '../../../types/lead';
import { usePipelineConfigContext } from '../../../contexts/PipelineConfigContext';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onChangeStatus: (status: LeadStatus) => void;
  onEditFields: () => void;
  onExportCSV: () => void;
  onCreateDrafts: () => void;
  onCreateFollowUps: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClear: () => void;
  isDeleting?: boolean;
  isCreatingDrafts?: boolean;
  isCreatingFollowUps?: boolean;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  onChangeStatus,
  onEditFields,
  onExportCSV,
  onCreateDrafts,
  onCreateFollowUps,
  onArchive,
  onDelete,
  onClear,
  isDeleting = false,
  isCreatingDrafts = false,
  isCreatingFollowUps = false,
}) => {
  const { stages } = usePipelineConfigContext();
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);

  const handleStatusMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setStatusMenuAnchor(event.currentTarget);
  };

  const handleStatusMenuClose = () => {
    setStatusMenuAnchor(null);
  };

  const handleStatusSelect = (status: LeadStatus) => {
    onChangeStatus(status);
    handleStatusMenuClose();
  };

  if (selectedCount === 0) return null;

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: 'rgba(102, 126, 234, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '12px',
        p: 2,
        mb: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
      }}
    >
      {/* Selection Count */}
      <Typography
        variant="h6"
        sx={{
          color: 'white',
          fontWeight: 600,
          fontSize: '16px',
        }}
      >
        {selectedCount} lead{selectedCount > 1 ? 's' : ''} selected
      </Typography>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1.5, flex: 1 }}>
        {/* Change Status */}
        <Button
          variant="outlined"
          startIcon={<ChangeCircleIcon />}
          onClick={handleStatusMenuOpen}
          disabled={isDeleting}
          sx={{
            color: 'white',
            borderColor: 'white',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: 'white',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          Change Status
        </Button>

        {/* Edit Fields */}
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={onEditFields}
          disabled={isDeleting}
          sx={{
            color: 'white',
            borderColor: 'white',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: 'white',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          Edit Fields
        </Button>

        {/* Export CSV */}
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={onExportCSV}
          disabled={isDeleting}
          sx={{
            color: 'white',
            borderColor: 'white',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: 'white',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          Export CSV
        </Button>

        {/* Create Gmail Drafts */}
        <Button
          variant="outlined"
          startIcon={isCreatingDrafts ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <EmailIcon />}
          onClick={onCreateDrafts}
          disabled={isDeleting || isCreatingDrafts}
          sx={{
            color: 'white',
            borderColor: 'white',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: 'white',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          {isCreatingDrafts ? 'Creating Drafts...' : 'Create Gmail Drafts'}
        </Button>

        {/* Create Follow-Up Drafts */}
        <Button
          variant="outlined"
          startIcon={isCreatingFollowUps ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <ReplyIcon />}
          onClick={onCreateFollowUps}
          disabled={isDeleting || isCreatingFollowUps || isCreatingDrafts}
          sx={{
            color: 'white',
            borderColor: 'white',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: 'white',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          {isCreatingFollowUps ? 'Creating Follow-ups...' : 'Create Follow-up Drafts'}
        </Button>

        {/* Archive */}
        <Button
          variant="outlined"
          startIcon={<ArchiveIcon />}
          onClick={onArchive}
          disabled={isDeleting}
          sx={{
            color: 'white',
            borderColor: '#f59e0b',
            bgcolor: '#f59e0b',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: '#d97706',
              bgcolor: '#d97706',
            },
          }}
        >
          Archive
        </Button>

        {/* Delete */}
        <Button
          variant="outlined"
          startIcon={isDeleting ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <DeleteIcon />}
          onClick={onDelete}
          disabled={isDeleting}
          sx={{
            color: 'white',
            borderColor: '#ef4444',
            bgcolor: '#ef4444',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: '#dc2626',
              bgcolor: '#dc2626',
            },
            '&:disabled': {
              borderColor: '#ef4444',
              bgcolor: '#ef4444',
              opacity: 0.7,
            },
          }}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </Box>

      {/* Clear Selection */}
      <Button
        variant="text"
        endIcon={<CloseIcon />}
        onClick={onClear}
        disabled={isDeleting}
        sx={{
          color: 'white',
          textTransform: 'none',
          fontWeight: 600,
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        Clear
      </Button>

      {/* Status Change Menu */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={handleStatusMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        {stages.map((stage) => (
          <MenuItem key={stage.id} onClick={() => handleStatusSelect(stage.id)}>
            <Chip
              label={stage.label}
              size="small"
              sx={{
                bgcolor: `${stage.color}22`,
                color: stage.color,
                fontWeight: 500,
                mr: 1,
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};
