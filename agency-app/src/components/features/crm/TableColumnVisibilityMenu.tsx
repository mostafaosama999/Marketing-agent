// src/components/features/crm/TableColumnVisibilityMenu.tsx

import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  Checkbox,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  ViewColumn as ViewColumnIcon,
  DragIndicator as DragIndicatorIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { TableColumnConfig } from '../../../types/table';

interface TableColumnVisibilityMenuProps {
  columns: TableColumnConfig[];
  onToggleVisibility: (columnId: string, visible: boolean) => void;
  onReorderColumns: (reorderedColumns: TableColumnConfig[]) => void;
  onDeleteColumn?: (columnId: string, fieldName: string) => Promise<void>;
  onResetToDefault?: () => void;
}

export function TableColumnVisibilityMenu({
  columns,
  onToggleVisibility,
  onReorderColumns,
  onDeleteColumn,
  onResetToDefault,
}: TableColumnVisibilityMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<TableColumnConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleToggle = (columnId: string, currentVisible: boolean) => {
    onToggleVisibility(columnId, !currentVisible);
  };

  const visibleCount = columns.filter(c => c.visible).length;
  const isLastVisible = (column: TableColumnConfig) => column.visible && visibleCount === 1;

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Create a new array with reordered columns
    const reordered = [...columns];
    const [draggedColumn] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, draggedColumn);

    // Update order property for each column
    const reorderedWithOrder = reordered.map((col, idx) => ({
      ...col,
      order: idx,
    }));

    onReorderColumns(reorderedWithOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, column: TableColumnConfig) => {
    e.stopPropagation();
    setColumnToDelete(column);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!columnToDelete || !onDeleteColumn || !columnToDelete.fieldName) return;

    setIsDeleting(true);
    try {
      await onDeleteColumn(columnToDelete.id, columnToDelete.fieldName);
      setDeleteDialogOpen(false);
      setColumnToDelete(null);
    } catch (error) {
      console.error('Error deleting column:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setColumnToDelete(null);
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<ViewColumnIcon />}
        onClick={handleClick}
        sx={{
          textTransform: 'none',
          borderColor: '#667eea',
          color: '#667eea',
          fontWeight: 500,
          fontSize: '14px',
          px: 2,
          py: 0.75,
          '&:hover': {
            borderColor: '#5a67d8',
            bgcolor: 'rgba(102, 126, 234, 0.04)',
          },
        }}
      >
        Columns ({visibleCount}/{columns.length})
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 220,
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: '#1e293b',
                fontSize: '13px',
              }}
            >
              Show/Hide Columns
            </Typography>
            {onResetToDefault && (
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onResetToDefault();
                  handleClose();
                }}
                sx={{
                  textTransform: 'none',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#667eea',
                  minWidth: 'auto',
                  px: 1,
                  py: 0.5,
                  '&:hover': {
                    bgcolor: 'rgba(102, 126, 234, 0.1)',
                  },
                }}
              >
                Reset Order
              </Button>
            )}
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: '#64748b',
              fontSize: '11px',
            }}
          >
            {visibleCount} of {columns.length} visible
          </Typography>
        </Box>

        <Divider sx={{ my: 0.5 }} />

        {columns.map((column, index) => {
          const disabled = isLastVisible(column);
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <MenuItem
              key={column.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={(e) => {
                // Only toggle if not clicking on the drag handle
                const target = e.target as HTMLElement;
                if (!target.closest('[data-drag-handle]')) {
                  handleToggle(column.id, column.visible);
                }
              }}
              disabled={disabled}
              sx={{
                py: 1,
                px: 2,
                cursor: isDragging ? 'grabbing' : 'grab',
                opacity: isDragging ? 0.5 : 1,
                backgroundColor: isDragOver && !isDragging ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
                transition: 'opacity 0.2s, background-color 0.2s',
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                },
              }}
            >
              {/* Drag Handle */}
              <Box
                data-drag-handle
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mr: 1,
                  cursor: 'grab',
                  color: '#94a3b8',
                  '&:hover': {
                    color: '#667eea',
                  },
                  '&:active': {
                    cursor: 'grabbing',
                  },
                }}
              >
                <DragIndicatorIcon sx={{ fontSize: '18px' }} />
              </Box>

              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox
                  checked={column.visible}
                  disabled={disabled}
                  size="small"
                  sx={{
                    color: '#cbd5e1',
                    '&.Mui-checked': {
                      color: '#667eea',
                    },
                    '&.Mui-disabled': {
                      color: '#e2e8f0',
                    },
                  }}
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: column.visible ? '#1e293b' : '#94a3b8',
                    }}
                  >
                    {column.label}
                  </Typography>
                }
              />

              {/* Delete Button - only for custom columns with fieldName */}
              {column.type === 'custom' && column.fieldName && onDeleteColumn && (
                <IconButton
                  size="small"
                  onClick={(e) => handleDeleteClick(e, column)}
                  sx={{
                    ml: 'auto',
                    color: '#94a3b8',
                    '&:hover': {
                      color: '#ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    },
                  }}
                >
                  <DeleteIcon sx={{ fontSize: '18px' }} />
                </IconButton>
              )}
            </MenuItem>
          );
        })}

        {visibleCount === 1 && (
          <>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography
                variant="caption"
                sx={{
                  color: '#f59e0b',
                  fontSize: '11px',
                  fontStyle: 'italic',
                }}
              >
                At least one column must remain visible
              </Typography>
            </Box>
          </>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            minWidth: '400px',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            fontSize: '18px',
            color: '#1e293b',
          }}
        >
          Delete Column?
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            sx={{
              color: '#64748b',
              fontSize: '14px',
              mb: 2,
            }}
          >
            Are you sure you want to delete the column "<strong>{columnToDelete?.label}</strong>"?
          </DialogContentText>
          <DialogContentText
            sx={{
              color: '#ef4444',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            ⚠️ This will permanently remove this custom field from ALL leads. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleDeleteCancel}
            disabled={isDeleting}
            sx={{
              textTransform: 'none',
              color: '#64748b',
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            variant="contained"
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              background: '#ef4444',
              '&:hover': {
                background: '#dc2626',
              },
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
