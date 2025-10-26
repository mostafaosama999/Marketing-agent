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
} from '@mui/material';
import { ViewColumn as ViewColumnIcon, DragIndicator as DragIndicatorIcon } from '@mui/icons-material';
import { TableColumnConfig } from '../../../types/table';

interface TableColumnVisibilityMenuProps {
  columns: TableColumnConfig[];
  onToggleVisibility: (columnId: string, visible: boolean) => void;
  onReorderColumns: (reorderedColumns: TableColumnConfig[]) => void;
}

export function TableColumnVisibilityMenu({
  columns,
  onToggleVisibility,
  onReorderColumns,
}: TableColumnVisibilityMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
    </>
  );
}
