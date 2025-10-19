import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Typography,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CustomField, CustomFieldType } from '../../../app/types/crm';
import { updateCustomFields, deleteCustomField, reorderCustomFields } from '../../../services/customFieldsService';
import { ConfirmDialog } from './ConfirmDialog';

interface CustomFieldsDialogProps {
  open: boolean;
  fields: CustomField[];
  onClose: () => void;
}

interface SortableFieldItemProps {
  field: CustomField;
  onEdit: (field: CustomField) => void;
  onDelete: (fieldId: string) => void;
}

const SortableFieldItem: React.FC<SortableFieldItemProps> = ({ field, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
      <Box {...attributes} {...listeners} sx={{ cursor: 'grab', mr: 1 }}>
        <DragIcon color="action" />
      </Box>
      <ListItemText
        primary={field.label}
        secondary={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
            <Chip label={field.type} size="small" />
            {field.required && <Chip label="Required" size="small" color="error" />}
            {field.showInTable && <Chip label="Table" size="small" variant="outlined" />}
            {field.showInCard && <Chip label="Card" size="small" variant="outlined" />}
          </Box>
        }
      />
      <IconButton size="small" onClick={() => onEdit(field)}>
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" color="error" onClick={() => onDelete(field.id)}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    </ListItem>
  );
};

export const CustomFieldsDialog: React.FC<CustomFieldsDialogProps> = ({ open, fields, onClose }) => {
  const [localFields, setLocalFields] = useState<CustomField[]>(fields);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [optionsText, setOptionsText] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; fieldId: string | null; fieldLabel: string | null }>({
    open: false,
    fieldId: null,
    fieldLabel: null,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    setLocalFields(fields);
  }, [fields]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localFields.findIndex((f) => f.id === active.id);
      const newIndex = localFields.findIndex((f) => f.id === over.id);

      const reordered = [...localFields];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      setLocalFields(reordered);

      try {
        await reorderCustomFields(reordered);
      } catch (error) {
        console.error('Error reordering fields:', error);
        setLocalFields(fields); // Revert on error
      }
    }
  };

  const handleAddNew = () => {
    setEditingField({
      id: `new-${Date.now()}`,
      name: '',
      label: '',
      type: 'text',
      required: false,
      visible: true,
      showInTable: true,
      showInCard: false,
      order: localFields.length,
    });
    setOptionsText('');
    setIsAddingNew(true);
  };

  const handleEdit = (field: CustomField) => {
    setEditingField(field);
    setOptionsText(field.options?.join(', ') || '');
    setIsAddingNew(false);
  };

  const handleSaveField = async () => {
    if (!editingField) return;

    setSaving(true);
    try {
      // Parse options from text if field type supports options
      const fieldToSave = { ...editingField };
      if (['select', 'radio', 'checkbox'].includes(editingField.type)) {
        fieldToSave.options = optionsText
          ? optionsText.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
      }

      let updatedFields: CustomField[];

      if (isAddingNew) {
        const newField: CustomField = {
          ...fieldToSave,
          id: `field-${Date.now()}`,
        };
        updatedFields = [...localFields, newField];
      } else {
        updatedFields = localFields.map((f) => (f.id === editingField.id ? fieldToSave : f));
      }

      await updateCustomFields(updatedFields);
      setLocalFields(updatedFields);
      setEditingField(null);
      setOptionsText('');
      setIsAddingNew(false);
    } catch (error) {
      console.error('Error saving field:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async () => {
    if (!confirmDelete.fieldId) return;

    try {
      await deleteCustomField(confirmDelete.fieldId);
      setLocalFields(localFields.filter((f) => f.id !== confirmDelete.fieldId));
      setConfirmDelete({ open: false, fieldId: null, fieldLabel: null });
    } catch (error) {
      console.error('Error deleting field:', error);
      setConfirmDelete({ open: false, fieldId: null, fieldLabel: null });
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setOptionsText('');
    setIsAddingNew(false);
  };

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Custom Fields</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create custom fields to track additional information about your leads. Drag to reorder.
        </Typography>

        {!editingField ? (
          <>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddNew} sx={{ mb: 2 }}>
              Add Custom Field
            </Button>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={localFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <List>
                  {localFields.map((field) => (
                    <SortableFieldItem
                      key={field.id}
                      field={field}
                      onEdit={handleEdit}
                      onDelete={(fieldId) => {
                        const fieldToDelete = localFields.find(f => f.id === fieldId);
                        setConfirmDelete({
                          open: true,
                          fieldId,
                          fieldLabel: fieldToDelete?.label || 'this field',
                        });
                      }}
                    />
                  ))}
                </List>
              </SortableContext>
            </DndContext>

            {localFields.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                No custom fields yet. Click "Add Custom Field" to create one.
              </Typography>
            )}
          </>
        ) : (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {isAddingNew ? 'Add Custom Field' : 'Edit Custom Field'}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Field Name"
                value={editingField.label}
                onChange={(e) => {
                  const label = e.target.value;
                  const name = label.toLowerCase().replace(/\s+/g, '_');
                  setEditingField({ ...editingField, label, name });
                }}
                fullWidth
                required
                helperText="Enter a name for this field (e.g., 'Deal Size' or 'Lead Source')"
              />

              <FormControl fullWidth required>
                <InputLabel>Field Type</InputLabel>
                <Select
                  value={editingField.type}
                  onChange={(e) => setEditingField({ ...editingField, type: e.target.value as CustomFieldType })}
                  label="Field Type"
                >
                  <MenuItem value="text">Text (single line)</MenuItem>
                  <MenuItem value="textarea">Text Area (multi-line)</MenuItem>
                  <MenuItem value="number">Number</MenuItem>
                  <MenuItem value="select">Dropdown</MenuItem>
                  <MenuItem value="radio">Radio Buttons</MenuItem>
                  <MenuItem value="checkbox">Checkboxes</MenuItem>
                  <MenuItem value="date">Date</MenuItem>
                  <MenuItem value="url">URL</MenuItem>
                </Select>
              </FormControl>

              {['select', 'radio', 'checkbox'].includes(editingField.type) && (
                <TextField
                  label="Options (comma-separated)"
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  helperText="Enter options separated by commas (e.g., Option 1, Option 2, Option 3)"
                />
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editingField.required}
                      onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                    />
                  }
                  label="Required field"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editingField.visible}
                      onChange={(e) => setEditingField({ ...editingField, visible: e.target.checked })}
                    />
                  }
                  label="Visible in forms"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editingField.showInTable}
                      onChange={(e) => setEditingField({ ...editingField, showInTable: e.target.checked })}
                    />
                  }
                  label="Show in table view"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editingField.showInCard}
                      onChange={(e) => setEditingField({ ...editingField, showInCard: e.target.checked })}
                    />
                  }
                  label="Show on kanban cards"
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
                <Button onClick={handleCancelEdit} startIcon={<CloseIcon />} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveField}
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={!editingField.label || saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </Box>
            </Box>
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>

    <ConfirmDialog
      open={confirmDelete.open}
      title="Delete Custom Field"
      message={`Are you sure you want to delete "${confirmDelete.fieldLabel}"? All data in this field will be permanently lost.`}
      confirmText="Delete"
      cancelText="Cancel"
      severity="error"
      onConfirm={handleDeleteField}
      onCancel={() => setConfirmDelete({ open: false, fieldId: null, fieldLabel: null })}
    />
  </>
  );
};
