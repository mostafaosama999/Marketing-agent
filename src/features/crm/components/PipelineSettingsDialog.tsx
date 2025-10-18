import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  IconButton,
  List,
  ListItem,
  Typography,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  ColorLens as ColorIcon,
} from '@mui/icons-material';
import { PipelineStage } from '../../../app/types/crm';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PipelineSettingsDialogProps {
  open: boolean;
  stages: PipelineStage[];
  onClose: () => void;
  onSave: (stages: PipelineStage[]) => Promise<void>;
}

interface SortableStageItemProps {
  stage: PipelineStage;
  onUpdate: (id: string, updates: Partial<PipelineStage>) => void;
  onDelete: (id: string) => void;
}

const SortableStageItem: React.FC<SortableStageItemProps> = ({ stage, onUpdate, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
        backgroundColor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
        <Box {...attributes} {...listeners} sx={{ cursor: 'grab', display: 'flex' }}>
          <DragIcon sx={{ color: 'text.secondary' }} />
        </Box>

        <TextField
          value={stage.label}
          onChange={(e) => onUpdate(stage.id, { label: e.target.value })}
          size="small"
          sx={{ flexGrow: 1 }}
        />

        <input
          type="color"
          value={stage.color}
          onChange={(e) => onUpdate(stage.id, { color: e.target.value })}
          style={{
            width: 40,
            height: 40,
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={stage.visible}
              onChange={(e) => onUpdate(stage.id, { visible: e.target.checked })}
              size="small"
            />
          }
          label="Visible"
          sx={{ mr: 1 }}
        />

        <IconButton size="small" color="error" onClick={() => onDelete(stage.id)}>
          <DeleteIcon />
        </IconButton>
      </Box>
    </ListItem>
  );
};

export const PipelineSettingsDialog: React.FC<PipelineSettingsDialogProps> = ({
  open,
  stages: initialStages,
  onClose,
  onSave,
}) => {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStages([...initialStages]);
    }
  }, [open, initialStages]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setStages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        // Update order property
        return reordered.map((item, index) => ({ ...item, order: index }));
      });
    }
  };

  const handleUpdateStage = (id: string, updates: Partial<PipelineStage>) => {
    setStages((prev) => prev.map((stage) => (stage.id === id ? { ...stage, ...updates } : stage)));
  };

  const handleDeleteStage = (id: string) => {
    setStages((prev) => prev.filter((stage) => stage.id !== id));
  };

  const handleAddStage = () => {
    const newStage: PipelineStage = {
      id: `stage-${Date.now()}`,
      label: 'New Stage',
      color: '#9e9e9e',
      order: stages.length,
      visible: true,
    };
    setStages((prev) => [...prev, newStage]);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(stages);
      onClose();
    } catch (error) {
      console.error('Error saving pipeline settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Pipeline Settings</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Customize your sales pipeline stages. Drag to reorder, toggle visibility, or delete stages.
        </Typography>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <List sx={{ width: '100%' }}>
              {stages.map((stage) => (
                <SortableStageItem
                  key={stage.id}
                  stage={stage}
                  onUpdate={handleUpdateStage}
                  onDelete={handleDeleteStage}
                />
              ))}
            </List>
          </SortableContext>
        </DndContext>

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddStage}
          sx={{ mt: 2 }}
          fullWidth
        >
          Add Stage
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
