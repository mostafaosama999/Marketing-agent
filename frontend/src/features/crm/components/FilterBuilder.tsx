import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Collapse,
  Badge,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  FilterCondition,
  FilterableField,
  FilterOperator,
  FilterConnector,
  getOperatorsForFieldType,
  getOperatorLabel,
  operatorNeedsValue,
} from '../../../app/types/filters';

interface FilterBuilderProps {
  conditions: FilterCondition[];
  fields: FilterableField[];
  onAddFilter: (field: string, operator: FilterOperator, value: any, connector?: FilterConnector) => void;
  onUpdateFilter: (id: string, updates: Partial<FilterCondition>) => void;
  onRemoveFilter: (id: string) => void;
  onClearFilters: () => void;
}

export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  conditions,
  fields,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onClearFilters,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [newFilterField, setNewFilterField] = useState<string>('');

  const handleAddFilter = () => {
    if (!newFilterField) return;

    const field = fields.find(f => f.id === newFilterField);
    if (!field) return;

    const defaultOperator = getOperatorsForFieldType(field.type)[0];
    const defaultValue = field.type === 'select' && field.options ? field.options[0] : '';

    onAddFilter(newFilterField, defaultOperator, defaultValue, 'AND');
    setNewFilterField('');
  };

  const handleFieldChange = (conditionId: string, newFieldId: string) => {
    const field = fields.find(f => f.id === newFieldId);
    if (!field) return;

    const defaultOperator = getOperatorsForFieldType(field.type)[0];
    const defaultValue = field.type === 'select' && field.options ? field.options[0] : '';

    onUpdateFilter(conditionId, {
      field: newFieldId,
      operator: defaultOperator,
      value: defaultValue,
    });
  };

  const handleOperatorChange = (conditionId: string, newOperator: FilterOperator) => {
    const updates: Partial<FilterCondition> = { operator: newOperator };

    // If switching to is_empty or is_not_empty, clear the value
    if (!operatorNeedsValue(newOperator)) {
      updates.value = '';
    }

    onUpdateFilter(conditionId, updates);
  };

  const renderValueInput = (condition: FilterCondition) => {
    const field = fields.find(f => f.id === condition.field);
    if (!field) return null;

    // No input needed for is_empty/is_not_empty
    if (!operatorNeedsValue(condition.operator)) {
      return null;
    }

    const handleValueChange = (newValue: any) => {
      onUpdateFilter(condition.id, { value: newValue });
    };

    switch (field.type) {
      case 'select':
        return (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={condition.value || ''}
              onChange={(e) => handleValueChange(e.target.value)}
            >
              {field.options?.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              value={condition.value ? new Date(condition.value) : null}
              onChange={(date) => handleValueChange(date)}
              slotProps={{
                textField: {
                  size: 'small',
                  sx: { minWidth: 150 },
                },
              }}
            />
          </LocalizationProvider>
        );

      case 'number':
        return (
          <TextField
            size="small"
            type="number"
            value={condition.value || ''}
            onChange={(e) => handleValueChange(Number(e.target.value))}
            sx={{ minWidth: 150 }}
          />
        );

      case 'text':
      default:
        return (
          <TextField
            size="small"
            value={condition.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Enter value"
            sx={{ minWidth: 200 }}
          />
        );
    }
  };

  const getFieldLabel = (fieldId: string): string => {
    return fields.find(f => f.id === fieldId)?.label || fieldId;
  };

  const getConditionSummary = (condition: FilterCondition): string => {
    const fieldLabel = getFieldLabel(condition.field);
    const operatorLabel = getOperatorLabel(condition.operator);
    const valueLabel = operatorNeedsValue(condition.operator) ? condition.value : '';
    return `${fieldLabel} ${operatorLabel}${valueLabel ? ` "${valueLabel}"` : ''}`;
  };

  return (
    <Box>
      {/* Filter Toggle Button */}
      <IconButton
        onClick={() => setExpanded(!expanded)}
        size="small"
        sx={{ mr: 1 }}
      >
        <Badge badgeContent={conditions.length} color="primary">
          <FilterListIcon />
        </Badge>
      </IconButton>

      {/* Expanded Filter Panel */}
      <Collapse in={expanded}>
        <Paper sx={{ p: 2, mb: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterListIcon color="action" />
              <Typography variant="h6">Filters</Typography>
              {conditions.length > 0 && (
                <Chip label={`${conditions.length} active`} size="small" color="primary" />
              )}
            </Box>
            <IconButton onClick={() => setExpanded(false)} size="small">
              <ExpandLessIcon />
            </IconButton>
          </Box>

          {/* Active Filters */}
          {conditions.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {conditions.map((condition, index) => {
                const field = fields.find(f => f.id === condition.field);
                if (!field) return null;

                const availableOperators = getOperatorsForFieldType(field.type);

                return (
                  <Box key={condition.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {/* Field Selector */}
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Field</InputLabel>
                        <Select
                          value={condition.field}
                          label="Field"
                          onChange={(e) => handleFieldChange(condition.id, e.target.value)}
                        >
                          {fields.map(f => (
                            <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Operator Selector */}
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Operator</InputLabel>
                        <Select
                          value={condition.operator}
                          label="Operator"
                          onChange={(e) => handleOperatorChange(condition.id, e.target.value as FilterOperator)}
                        >
                          {availableOperators.map(op => (
                            <MenuItem key={op} value={op}>{getOperatorLabel(op)}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Value Input */}
                      {renderValueInput(condition)}

                      {/* Connector (AND/OR) - show for all except last */}
                      {index < conditions.length - 1 && (
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                          <Select
                            value={condition.connector}
                            onChange={(e) => onUpdateFilter(condition.id, { connector: e.target.value as FilterConnector })}
                          >
                            <MenuItem value="AND">AND</MenuItem>
                            <MenuItem value="OR">OR</MenuItem>
                          </Select>
                        </FormControl>
                      )}

                      {/* Delete Button */}
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onRemoveFilter(condition.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Visual connector line */}
                    {index < conditions.length - 1 && (
                      <Box sx={{ ml: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Divider orientation="vertical" flexItem sx={{ height: 20 }} />
                        <Chip
                          label={condition.connector}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Add New Filter */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Add filter</InputLabel>
              <Select
                value={newFilterField}
                label="Add filter"
                onChange={(e) => setNewFilterField(e.target.value)}
              >
                {fields.map(field => (
                  <MenuItem key={field.id} value={field.id}>{field.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddFilter}
              disabled={!newFilterField}
            >
              Add Filter
            </Button>
            {conditions.length > 0 && (
              <Button
                variant="text"
                color="error"
                onClick={onClearFilters}
              >
                Clear All
              </Button>
            )}
          </Box>

          {/* Summary */}
          {conditions.length > 0 && (
            <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Filter Summary:
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {conditions.map((condition, index) => (
                  <span key={condition.id}>
                    {getConditionSummary(condition)}
                    {index < conditions.length - 1 && (
                      <strong> {condition.connector} </strong>
                    )}
                  </span>
                ))}
              </Typography>
            </Box>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
};
