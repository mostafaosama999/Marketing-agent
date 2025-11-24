/**
 * FieldDefinitionCard Component
 *
 * Displays a single field definition with editable label and dropdown options.
 * Used in the Field Definitions settings tab.
 * Supports edit (rename) and delete operations for both default and custom fields.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Collapse,
  IconButton,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { FieldDefinition, FieldType, FieldSection, EntityType } from '../../types/fieldDefinitions';
import { DropdownOptionsEditor } from '../features/crm/DropdownOptionsEditor';
import { TableColumnConfig } from '../../types/table';
import { getFieldValueCount } from '../../services/api/fieldDefinitionsService';

interface FieldDefinitionCardProps {
  field?: FieldDefinition;
  // For default fields that don't have a FieldDefinition
  defaultField?: TableColumnConfig;
  entityType?: EntityType;
  onSave?: (fieldId: string, updates: { label?: string; options?: string[] }) => Promise<void>;
  onRename?: (fieldId: string, fieldName: string, fieldLabel: string, isDefaultField: boolean) => void;
  onDelete?: (fieldId: string, fieldName: string, fieldLabel: string, isDefaultField: boolean) => void;
  isProtected?: boolean;
}

const getFieldTypeColor = (fieldType: FieldType): string => {
  switch (fieldType) {
    case 'dropdown':
      return '#667eea';
    case 'text':
      return '#10b981';
    case 'number':
      return '#f59e0b';
    case 'date':
      return '#ef4444';
    default:
      return '#64748b';
  }
};

const getSectionLabel = (section: FieldSection): string => {
  switch (section) {
    case 'linkedin':
      return 'LinkedIn';
    case 'email':
      return 'Email';
    case 'general':
    default:
      return 'General';
  }
};

const getSectionColor = (section: FieldSection): string => {
  switch (section) {
    case 'linkedin':
      return '#0077b5';
    case 'email':
      return '#ea4335';
    case 'general':
    default:
      return '#64748b';
  }
};

export const FieldDefinitionCard: React.FC<FieldDefinitionCardProps> = ({
  field,
  defaultField,
  entityType,
  onSave,
  onRename,
  onDelete,
  isProtected = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Value count state - loads on hover
  const [valueCount, setValueCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [countLoaded, setCountLoaded] = useState(false);

  // Determine if this is a default field or custom field
  const isDefaultField = !!defaultField;

  // Get field properties from either source
  const fieldId = field?.id || defaultField?.id || '';
  const fieldName = field?.name || defaultField?.id || '';
  const fieldLabel = field?.label || defaultField?.label || '';
  const fieldType = field?.fieldType || defaultField?.fieldType || 'text';
  const fieldSection = field?.section || (defaultField?.section as FieldSection) || 'general';
  const fieldOptions = field?.options || [];

  const [label, setLabel] = useState(fieldLabel);
  const [options, setOptions] = useState<string[]>(fieldOptions);

  const isDropdown = fieldType === 'dropdown';

  // Load value count on hover
  const handleMouseEnter = useCallback(async () => {
    if (countLoaded || loadingCount || !entityType) return;

    setLoadingCount(true);
    try {
      const count = await getFieldValueCount(entityType, fieldName, isDefaultField);
      setValueCount(count);
      setCountLoaded(true);
    } catch (err) {
      console.error('Error loading field value count:', err);
      setValueCount(0);
      setCountLoaded(true);
    } finally {
      setLoadingCount(false);
    }
  }, [countLoaded, loadingCount, entityType, fieldName, isDefaultField]);

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    setHasChanges(newLabel !== fieldLabel || JSON.stringify(options) !== JSON.stringify(fieldOptions));
  };

  const handleOptionsChange = (newOptions: string[]) => {
    setOptions(newOptions);
    setHasChanges(label !== fieldLabel || JSON.stringify(newOptions) !== JSON.stringify(fieldOptions));
  };

  const handleSave = async () => {
    if (!onSave || !field) return;
    setSaving(true);
    try {
      const updates: { label?: string; options?: string[] } = {};

      if (label !== fieldLabel) {
        updates.label = label;
      }

      if (isDropdown && JSON.stringify(options) !== JSON.stringify(fieldOptions)) {
        updates.options = options;
      }

      if (Object.keys(updates).length > 0) {
        await onSave(field.id, updates);
        setHasChanges(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = () => {
    // Allow expanding for custom fields that have onSave (for editing label/options)
    if (field && onSave) {
      setExpanded(!expanded);
    }
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRename?.(fieldId, fieldName, fieldLabel, isDefaultField);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(fieldId, fieldName, fieldLabel, isDefaultField);
  };

  const canExpand = field && onSave;
  const entityLabel = entityType === 'lead' ? 'leads' : 'companies';

  return (
    <Paper
      variant="outlined"
      onMouseEnter={handleMouseEnter}
      sx={{
        mb: 2,
        overflow: 'hidden',
        borderColor: hasChanges ? '#667eea' : 'rgba(0, 0, 0, 0.12)',
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* Header Row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          gap: 2,
          cursor: canExpand ? 'pointer' : 'default',
          '&:hover': {
            bgcolor: canExpand ? 'rgba(103, 126, 234, 0.02)' : 'transparent',
          },
        }}
        onClick={handleToggle}
      >
        {/* Field Label */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: '#1e293b',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {fieldLabel}
            </Typography>
            {isProtected && (
              <Tooltip title="This field is protected and cannot be deleted">
                <LockIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
              </Tooltip>
            )}
          </Box>
          <Typography
            variant="caption"
            sx={{ color: '#64748b' }}
          >
            {fieldName}
          </Typography>
        </Box>

        {/* Badges */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Default Field Badge */}
          {isDefaultField && (
            <Chip
              label="default"
              size="small"
              sx={{
                bgcolor: 'rgba(100, 116, 139, 0.1)',
                color: '#64748b',
                fontWeight: 600,
                fontSize: '10px',
                height: 20,
              }}
            />
          )}

          {/* Field Type Badge - only for custom fields with types */}
          {!isDefaultField && fieldType && (
            <Chip
              label={fieldType}
              size="small"
              sx={{
                bgcolor: `${getFieldTypeColor(fieldType as FieldType)}15`,
                color: getFieldTypeColor(fieldType as FieldType),
                fontWeight: 600,
                fontSize: '11px',
                textTransform: 'capitalize',
              }}
            />
          )}

          {/* Section Badge */}
          {fieldSection && (
            <Chip
              label={getSectionLabel(fieldSection)}
              size="small"
              sx={{
                bgcolor: `${getSectionColor(fieldSection)}15`,
                color: getSectionColor(fieldSection),
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          )}

          {/* Options count for dropdowns */}
          {isDropdown && fieldOptions.length > 0 && (
            <Chip
              label={`${fieldOptions.length} options`}
              size="small"
              sx={{
                bgcolor: 'rgba(103, 126, 234, 0.1)',
                color: '#667eea',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          )}

          {/* Value count - shows how many records have this field populated */}
          {entityType && (
            <Tooltip title={`Number of ${entityLabel} with values in this field`}>
              <Chip
                icon={loadingCount ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : <StorageIcon sx={{ fontSize: 14 }} />}
                label={
                  loadingCount
                    ? '...'
                    : countLoaded
                    ? `${valueCount?.toLocaleString() || 0} ${entityLabel}`
                    : 'Hover to load'
                }
                size="small"
                sx={{
                  bgcolor: countLoaded && valueCount && valueCount > 0
                    ? 'rgba(16, 185, 129, 0.1)'
                    : 'rgba(100, 116, 139, 0.1)',
                  color: countLoaded && valueCount && valueCount > 0
                    ? '#10b981'
                    : '#64748b',
                  fontWeight: 600,
                  fontSize: '11px',
                  '& .MuiChip-icon': {
                    color: 'inherit',
                  },
                }}
              />
            </Tooltip>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* Rename Button */}
            {onRename && (
              <Tooltip title="Rename field">
                <IconButton
                  size="small"
                  onClick={handleRename}
                  sx={{
                    color: '#667eea',
                    '&:hover': {
                      bgcolor: 'rgba(102, 126, 234, 0.1)',
                    },
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Delete Button */}
            {onDelete && (
              <Tooltip title={isProtected ? 'Protected field cannot be deleted' : 'Delete field'}>
                <span>
                  <IconButton
                    size="small"
                    onClick={handleDelete}
                    disabled={isProtected}
                    sx={{
                      color: isProtected ? '#cbd5e1' : '#ef4444',
                      '&:hover': {
                        bgcolor: isProtected ? 'transparent' : 'rgba(239, 68, 68, 0.1)',
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {/* Expand Icon - only for custom fields with onSave */}
            {canExpand && (
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleToggle(); }}>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>

      {/* Expanded Content */}
      <Collapse in={expanded}>
        <Box
          sx={{
            p: 2,
            pt: 0,
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Label Editor */}
          <Box sx={{ mb: 3, mt: 2 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 1 }}
            >
              Display Label
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Enter display label"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: 'rgba(103, 126, 234, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                  },
                },
              }}
            />
          </Box>

          {/* Dropdown Options Editor */}
          {isDropdown && (
            <Box sx={{ mb: 3 }}>
              <DropdownOptionsEditor
                options={options}
                onChange={handleOptionsChange}
                label="Dropdown Options"
              />
            </Box>
          )}

          {/* Save Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a408e 100%)',
                },
                '&:disabled': {
                  background: '#e2e8f0',
                  color: '#94a3b8',
                },
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default FieldDefinitionCard;
