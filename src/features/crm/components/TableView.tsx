import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  TableSortLabel,
  Box,
  Checkbox,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, DragIndicator as DragIcon, EditOutlined as EditOutlinedIcon } from '@mui/icons-material';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lead, PipelineStage, CustomField } from '../../../app/types/crm';
import { ConfirmDialog } from './ConfirmDialog';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { updateCustomField } from '../../../services/customFieldsService';

interface TableViewProps {
  leads: Lead[];
  stages: PipelineStage[];
  customFields: CustomField[];
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onBulkDelete: (leadIds: string[]) => void;
  onBulkStatusChange: (leadIds: string[], newStatus: string) => void;
  onBulkEdit: (leadIds: string[], updates: Record<string, any>) => void;
}

type SortField = 'name' | 'email' | 'company' | 'phone' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface EditableHeaderProps {
  field: CustomField;
  onSave: (fieldId: string, newLabel: string) => void;
}

const EditableHeader: React.FC<EditableHeaderProps> = ({ field, onSave }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState(field.label);

  const handleOpen = () => {
    setLabel(field.label);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setLabel(field.label);
    setDialogOpen(false);
  };

  const handleSave = () => {
    if (label.trim() && label !== field.label) {
      onSave(field.id, label.trim());
    }
    setDialogOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          '&:hover': {
            color: 'primary.main',
            '& .edit-icon': {
              opacity: 1,
            },
          },
        }}
        onClick={handleOpen}
      >
        <span>{field.label}</span>
        <EditOutlinedIcon
          className="edit-icon"
          sx={{
            fontSize: '0.875rem',
            opacity: 0,
            transition: 'opacity 0.2s',
          }}
        />
      </Box>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Column Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Column Name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            margin="dense"
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!label.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

interface SortableRowProps {
  lead: Lead;
  isSelected: boolean;
  onSelect: (leadId: string, checked: boolean) => void;
  dragDisabled: boolean;
  children: React.ReactNode;
}

const SortableRow: React.FC<SortableRowProps> = ({ lead, isSelected, onSelect, dragDisabled, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isSelected ? 'action.selected' : (isDragging ? 'action.hover' : 'inherit'),
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      sx={{
        cursor: isDragging ? 'grabbing' : 'default',
        '&:hover': { backgroundColor: isSelected ? 'action.selected' : 'action.hover' },
      }}
    >
      <TableCell padding="checkbox">
        <Checkbox
          checked={isSelected}
          onChange={(e) => onSelect(lead.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>
      <TableCell sx={{ width: 40, padding: '8px' }}>
        <Box
          {...attributes}
          {...listeners}
          sx={{
            cursor: dragDisabled ? 'default' : 'grab',
            display: 'flex',
            alignItems: 'center',
            opacity: dragDisabled ? 0.3 : 1,
          }}
        >
          <DragIcon color="action" fontSize="small" />
        </Box>
      </TableCell>
      {children}
    </TableRow>
  );
};

export const TableView: React.FC<TableViewProps> = ({
  leads,
  stages,
  customFields,
  onEditLead,
  onDeleteLead,
  onStatusChange,
  onBulkDelete,
  onBulkStatusChange,
  onBulkEdit,
}) => {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; lead: Lead | null }>({
    open: false,
    lead: null,
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [orderedLeads, setOrderedLeads] = useState<Lead[]>(leads);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Sync orderedLeads with leads prop changes
  useEffect(() => {
    setOrderedLeads(leads);
  }, [leads]);

  // Clear selection when leads change (e.g., after deletion)
  useEffect(() => {
    setSelectedIds(prev => {
      const validIds = new Set(leads.map(l => l.id));
      const newSelection = new Set<string>();
      prev.forEach(id => {
        if (validIds.has(id)) {
          newSelection.add(id);
        }
      });
      return newSelection;
    });
  }, [leads]);

  // Selection handlers
  const handleSelectOne = (leadId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(leadId);
      } else {
        newSet.delete(leadId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedLeads.map(l => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleUpdateFieldLabel = async (fieldId: string, newLabel: string) => {
    try {
      await updateCustomField(fieldId, { label: newLabel });
    } catch (error) {
      console.error('Failed to update field label:', error);
    }
  };

  // Handle drag end for reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedLeads.findIndex((lead) => lead.id === active.id);
      const newIndex = orderedLeads.findIndex((lead) => lead.id === over.id);

      const reordered = [...orderedLeads];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      setOrderedLeads(reordered);
    }
  };

  // Filter custom fields that should be shown in table
  const tableCustomFields = customFields.filter(f => f.showInTable && f.visible).sort((a, b) => a.order - b.order);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStageConfig = (status: string) => {
    return stages.find((s) => s.label === status);
  };

  const sortedLeads = [...orderedLeads].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'createdAt') {
      aValue = a.createdAt.getTime();
      bValue = b.createdAt.getTime();
    } else {
      aValue = (aValue || '').toString().toLowerCase();
      bValue = (bValue || '').toString().toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCustomFieldValue = (field: CustomField, value: any) => {
    if (!value) return '-';

    switch (field.type) {
      case 'date':
        return formatDate(new Date(value));
      case 'checkbox':
        return Array.isArray(value) ? value.join(', ') : '-';
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'url':
        return (
          <a href={value} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            Link
          </a>
        );
      default:
        return value;
    }
  };

  const selectedLeads = sortedLeads.filter(l => selectedIds.has(l.id));
  const isAllSelected = sortedLeads.length > 0 && selectedIds.size === sortedLeads.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < sortedLeads.length;

  return (
    <>
    {/* Bulk Actions Toolbar */}
    <BulkActionsToolbar
      selectedLeads={selectedLeads}
      stages={stages}
      customFields={customFields}
      onClearSelection={handleClearSelection}
      onDelete={onBulkDelete}
      onStatusChange={onBulkStatusChange}
      onBulkEdit={onBulkEdit}
    />

    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={isIndeterminate}
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            </TableCell>
            <TableCell sx={{ width: 40, padding: '8px' }} />
            <TableCell>
              <TableSortLabel
                active={sortField === 'name'}
                direction={sortField === 'name' ? sortDirection : 'asc'}
                onClick={() => handleSort('name')}
              >
                Name
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'email'}
                direction={sortField === 'email' ? sortDirection : 'asc'}
                onClick={() => handleSort('email')}
              >
                Email
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'company'}
                direction={sortField === 'company' ? sortDirection : 'asc'}
                onClick={() => handleSort('company')}
              >
                Company
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'phone'}
                direction={sortField === 'phone' ? sortDirection : 'asc'}
                onClick={() => handleSort('phone')}
              >
                Phone
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'status'}
                direction={sortField === 'status' ? sortDirection : 'asc'}
                onClick={() => handleSort('status')}
              >
                Status
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === 'createdAt'}
                direction={sortField === 'createdAt' ? sortDirection : 'asc'}
                onClick={() => handleSort('createdAt')}
              >
                Created
              </TableSortLabel>
            </TableCell>
            {tableCustomFields.map((field) => (
              <TableCell key={field.id}>
                <EditableHeader field={field} onSave={handleUpdateFieldLabel} />
              </TableCell>
            ))}
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <SortableContext items={sortedLeads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {sortedLeads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9 + tableCustomFields.length} align="center" sx={{ py: 4 }}>
                No leads found
              </TableCell>
            </TableRow>
          ) : (
            sortedLeads.map((lead) => {
              const statusConfig = getStageConfig(lead.status);
              const isSelected = selectedIds.has(lead.id);
              return (
                <SortableRow
                  key={lead.id}
                  lead={lead}
                  isSelected={isSelected}
                  onSelect={handleSelectOne}
                  dragDisabled={selectedIds.size > 0}
                >
                  <TableCell onClick={() => onEditLead(lead)} sx={{ cursor: 'pointer' }}>{lead.name}</TableCell>
                  <TableCell onClick={() => onEditLead(lead)} sx={{ cursor: 'pointer' }}>{lead.email}</TableCell>
                  <TableCell onClick={() => onEditLead(lead)} sx={{ cursor: 'pointer' }}>{lead.company}</TableCell>
                  <TableCell onClick={() => onEditLead(lead)} sx={{ cursor: 'pointer' }}>{lead.phone || '-'}</TableCell>
                  <TableCell onClick={() => onEditLead(lead)} sx={{ cursor: 'pointer' }}>
                    <Chip
                      label={statusConfig?.label || lead.status}
                      size="small"
                      sx={{
                        backgroundColor: statusConfig?.color || '#9e9e9e',
                        color: 'white',
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell onClick={() => onEditLead(lead)} sx={{ cursor: 'pointer' }}>{formatDate(lead.createdAt)}</TableCell>
                  {tableCustomFields.map((field) => (
                    <TableCell key={field.id} onClick={() => onEditLead(lead)} sx={{ cursor: 'pointer' }}>
                      {formatCustomFieldValue(field, lead.customFields?.[field.name])}
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditLead(lead);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete({ open: true, lead });
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </SortableRow>
              );
            })
          )}
          </SortableContext>
        </TableBody>
      </Table>
    </TableContainer>
    </DndContext>

    <ConfirmDialog
      open={confirmDelete.open}
      title="Delete Lead"
      message={`Are you sure you want to delete ${confirmDelete.lead?.name}? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      severity="error"
      onConfirm={() => {
        if (confirmDelete.lead) {
          onDeleteLead(confirmDelete.lead.id);
        }
        setConfirmDelete({ open: false, lead: null });
      }}
      onCancel={() => setConfirmDelete({ open: false, lead: null })}
    />
  </>
  );
};
