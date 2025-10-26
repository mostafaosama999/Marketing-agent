// src/components/features/companies/CompanyBulkActionsToolbar.tsx
import React from 'react';
import {
  Box,
  Button,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as DownloadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface CompanyBulkActionsToolbarProps {
  selectedCount: number;
  onEditFields: () => void;
  onExportCSV: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export const CompanyBulkActionsToolbar: React.FC<CompanyBulkActionsToolbarProps> = ({
  selectedCount,
  onEditFields,
  onExportCSV,
  onDelete,
  onClear,
}) => {
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
        {selectedCount} compan{selectedCount > 1 ? 'ies' : 'y'} selected
      </Typography>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1.5, flex: 1 }}>
        {/* Edit Fields */}
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={onEditFields}
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

        {/* Delete */}
        <Button
          variant="outlined"
          startIcon={<DeleteIcon />}
          onClick={onDelete}
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
          }}
        >
          Delete
        </Button>
      </Box>

      {/* Clear Selection */}
      <Button
        variant="text"
        endIcon={<CloseIcon />}
        onClick={onClear}
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
    </Box>
  );
};
