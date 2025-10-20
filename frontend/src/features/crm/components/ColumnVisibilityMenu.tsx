import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Typography,
  Divider,
  Box,
  Button,
} from '@mui/material';
import {
  ViewColumn as ViewColumnIcon,
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean; // Cannot be hidden
}

interface ColumnVisibilityMenuProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

interface SortableColumnItemProps {
  column: ColumnConfig;
  onToggle: (columnId: string) => void;
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = ({ column, onToggle }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <MenuItem
      ref={setNodeRef}
      style={style}
      disabled={column.required}
      sx={{ py: 0.5 }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
          mr: 1,
          '&:active': {
            cursor: 'grabbing',
          },
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <DragIndicatorIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </Box>
      <FormControlLabel
        control={
          <Checkbox
            checked={column.visible}
            size="small"
            disabled={column.required}
            onChange={() => !column.required && onToggle(column.id)}
          />
        }
        label={
          <Box>
            <Typography variant="body2">{column.label}</Typography>
            {column.required && (
              <Typography variant="caption" color="text.secondary">
                Required
              </Typography>
            )}
          </Box>
        }
        sx={{ width: '100%', m: 0, pointerEvents: 'auto' }}
        onClick={() => !column.required && onToggle(column.id)}
      />
    </MenuItem>
  );
};

export const ColumnVisibilityMenu: React.FC<ColumnVisibilityMenuProps> = ({
  columns,
  onColumnsChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleToggle = (columnId: string) => {
    const updatedColumns = columns.map((col) =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(updatedColumns);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = columns.findIndex((col) => col.id === active.id);
    const newIndex = columns.findIndex((col) => col.id === over.id);

    const reorderedColumns = [...columns];
    const [movedColumn] = reorderedColumns.splice(oldIndex, 1);
    reorderedColumns.splice(newIndex, 0, movedColumn);

    onColumnsChange(reorderedColumns);
  };

  const handleShowAll = () => {
    const updatedColumns = columns.map((col) => ({ ...col, visible: true }));
    onColumnsChange(updatedColumns);
  };

  const handleHideAll = () => {
    const updatedColumns = columns.map((col) =>
      col.required ? col : { ...col, visible: false }
    );
    onColumnsChange(updatedColumns);
  };

  const visibleCount = columns.filter((col) => col.visible).length;

  return (
    <>
      <Button
        onClick={handleClick}
        startIcon={<ViewColumnIcon />}
        variant="outlined"
        size="small"
        sx={{
          textTransform: 'none',
          fontWeight: 500,
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
            width: 280,
            maxHeight: 500,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Show Columns ({visibleCount}/{columns.length})
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ px: 1, py: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Button size="small" onClick={handleShowAll} fullWidth variant="outlined">
              Show All
            </Button>
            <Button size="small" onClick={handleHideAll} fullWidth variant="outlined">
              Hide All
            </Button>
          </Box>
        </Box>
        <Divider />
        <Box sx={{ px: 1, py: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Drag to reorder columns
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {columns.map((column) => (
                <SortableColumnItem
                  key={column.id}
                  column={column}
                  onToggle={handleToggle}
                />
              ))}
            </SortableContext>
          </DndContext>
        </Box>
      </Menu>
    </>
  );
};
