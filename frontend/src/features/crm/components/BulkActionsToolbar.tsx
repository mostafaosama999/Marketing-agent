import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Collapse,
  Paper,
  Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  ChangeCircle as ChangeCircleIcon,
} from '@mui/icons-material';
import { PipelineStage, CustomField, Lead } from '../../../app/types/crm';
import { BulkEditDialog } from './BulkEditDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { exportLeadsToCSV } from '../../../services/exportService';

interface BulkActionsToolbarProps {
  selectedLeads: Lead[];
  stages: PipelineStage[];
  customFields: CustomField[];
  onClearSelection: () => void;
  onDelete: (leadIds: string[]) => void;
  onStatusChange: (leadIds: string[], newStatus: string) => void;
  onBulkEdit: (leadIds: string[], updates: Record<string, any>) => void;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedLeads,
  stages,
  customFields,
  onClearSelection,
  onDelete,
  onStatusChange,
  onBulkEdit,
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  const selectedCount = selectedLeads.length;
  const selectedIds = selectedLeads.map(l => l.id);

  const handleDelete = () => {
    onDelete(selectedIds);
    setDeleteConfirmOpen(false);
    onClearSelection();
  };

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    onStatusChange(selectedIds, newStatus);
    onClearSelection();
  };

  const handleBulkEdit = (updates: Record<string, any>) => {
    onBulkEdit(selectedIds, updates);
    onClearSelection();
  };

  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `leads-export-${timestamp}.csv`;
    exportLeadsToCSV(selectedLeads, customFields, filename);
  };

  const visibleStages = stages.filter(s => s.visible).sort((a, b) => a.order - b.order);

  return (
    <>
      <Collapse in={selectedCount > 0}>
        <Paper
          sx={{
            p: 2,
            mb: 2,
            backgroundColor: 'primary.50',
            border: 1,
            borderColor: 'primary.200',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {/* Selection Count */}
            <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
              {selectedCount} lead{selectedCount !== 1 ? 's' : ''} selected
            </Typography>

            <Divider orientation="vertical" flexItem />

            {/* Change Status */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Change Status</InputLabel>
              <Select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                label="Change Status"
              >
                {visibleStages.map((stage) => (
                  <MenuItem key={stage.id} value={stage.label}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: stage.color,
                        }}
                      />
                      {stage.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Edit Fields */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => setEditDialogOpen(true)}
            >
              Edit Fields
            </Button>

            {/* Export */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              Export CSV
            </Button>

            {/* Delete */}
            <Button
              variant="outlined"
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete
            </Button>

            {/* Spacer */}
            <Box sx={{ flexGrow: 1 }} />

            {/* Clear Selection */}
            <Button
              variant="text"
              size="small"
              startIcon={<CloseIcon />}
              onClick={onClearSelection}
            >
              Clear
            </Button>
          </Box>
        </Paper>
      </Collapse>

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        open={editDialogOpen}
        customFields={customFields}
        selectedCount={selectedCount}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleBulkEdit}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Selected Leads"
        message={`Are you sure you want to delete ${selectedCount} lead${selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        severity="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </>
  );
};
