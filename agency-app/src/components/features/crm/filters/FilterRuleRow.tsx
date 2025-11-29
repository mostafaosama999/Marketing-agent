// src/components/features/crm/filters/FilterRuleRow.tsx
import React, { useState, useEffect } from 'react';
import { Box, IconButton, Select, MenuItem, Typography } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import {
  FilterRule,
  FilterableField,
  FilterOperator,
  EntitySource,
  LeadAggregationType,
  CountOperator,
} from '../../../../types/filter';
import { FieldSelector } from './FieldSelector';
import { OperatorSelector } from './OperatorSelector';
import { ValueInput } from './ValueInput';
import { AggregationSelector } from './AggregationSelector';
import { CountValueInput } from './CountValueInput';
import { getOperatorsForFieldType } from '../../../../services/api/advancedFilterService';

interface FilterRuleRowProps {
  rule: FilterRule;
  fields: FilterableField[];
  onUpdate: (rule: FilterRule) => void;
  onDelete: () => void;
  showLogicGate: boolean;
  isFirst?: boolean;
}

export const FilterRuleRow: React.FC<FilterRuleRowProps> = ({
  rule,
  fields,
  onUpdate,
  onDelete,
  showLogicGate,
  isFirst = false,
}) => {
  // Local state for field type and options
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'date' | 'select' | 'boolean'>('text');
  const [fieldOptions, setFieldOptions] = useState<string[]>([]);

  // Initialize field type based on selected field
  useEffect(() => {
    const field = fields.find(f => f.name === rule.field);
    if (field) {
      setFieldType(field.type);
      setFieldOptions(field.options || []);
    }
  }, [rule.field, fields]);

  const handleFieldChange = (
    fieldName: string,
    fieldLabel: string,
    type: 'text' | 'number' | 'date' | 'select' | 'boolean',
    options?: string[],
    entitySource?: EntitySource
  ) => {
    setFieldType(type);
    setFieldOptions(options || []);

    // Get default operator for new field type
    const operators = getOperatorsForFieldType(type);
    const defaultOperator = operators[0]?.value || 'equals';

    onUpdate({
      ...rule,
      field: fieldName,
      fieldLabel: fieldLabel,
      operator: defaultOperator,
      value: null, // Reset value when field changes
      entitySource: entitySource || 'self',
      // Set default aggregation for leads-sourced rules
      aggregationType: entitySource === 'leads' ? 'any' : undefined,
      countOperator: undefined,
      countValue: undefined,
    });
  };

  const handleOperatorChange = (operator: FilterOperator) => {
    onUpdate({
      ...rule,
      operator,
      value: null, // Reset value when operator changes
    });
  };

  const handleValueChange = (value: any) => {
    onUpdate({
      ...rule,
      value,
    });
  };

  const handleLogicGateChange = (logicGate: 'AND' | 'OR') => {
    onUpdate({
      ...rule,
      logicGate,
    });
  };

  const handleAggregationChange = (aggregationType: LeadAggregationType) => {
    onUpdate({
      ...rule,
      aggregationType,
      countOperator: aggregationType === 'count' ? 'equals' : undefined,
      countValue: aggregationType === 'count' ? 1 : undefined,
    });
  };

  const handleCountOperatorChange = (countOperator: CountOperator) => {
    onUpdate({
      ...rule,
      countOperator,
      countValue: countOperator === 'between' ? [1, 5] : 1,
    });
  };

  const handleCountValueChange = (countValue: number | [number, number]) => {
    onUpdate({
      ...rule,
      countValue,
    });
  };

  // Check if this is a leads cross-entity rule
  const isLeadsRule = rule.entitySource === 'leads';
  const showAggregation = isLeadsRule;
  const showCountInput = isLeadsRule && rule.aggregationType === 'count';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mb: 2,
        p: 2,
        bgcolor: 'white',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        // Highlight cross-entity rules
        ...(rule.entitySource === 'company' && {
          borderLeft: '3px solid #0077b5',
        }),
        ...(rule.entitySource === 'leads' && {
          borderLeft: '3px solid #10b981',
        }),
        '&:hover': {
          borderColor: '#667eea',
          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.1)',
        },
        transition: 'all 0.2s',
        flexWrap: 'wrap',
      }}
    >
      {/* Logic Gate Indicator (for non-first rows) */}
      {!isFirst && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
            minWidth: '60px',
          }}
        >
          <Select
            value={rule.logicGate}
            onChange={(e) => handleLogicGateChange(e.target.value as 'AND' | 'OR')}
            size="small"
            sx={{
              bgcolor: rule.logicGate === 'AND' ? '#667eea' : '#f59e0b',
              color: 'white',
              fontWeight: 600,
              fontSize: '12px',
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '&:hover': {
                bgcolor: rule.logicGate === 'AND' ? '#5568d3' : '#d97706',
              },
              '& .MuiSelect-select': {
                py: 0.5,
                px: 1,
              },
            }}
          >
            <MenuItem value="AND">
              <Typography variant="caption" fontWeight={600}>AND</Typography>
            </MenuItem>
            <MenuItem value="OR">
              <Typography variant="caption" fontWeight={600}>OR</Typography>
            </MenuItem>
          </Select>
        </Box>
      )}

      {/* Field Selector */}
      <Box sx={{ flex: 1, minWidth: '180px' }}>
        <FieldSelector
          value={rule.field}
          fields={fields}
          onChange={handleFieldChange}
        />
      </Box>

      {/* Aggregation Selector - only for leads cross-entity rules */}
      {showAggregation && (
        <Box sx={{ flex: 0.8, minWidth: '140px' }}>
          <AggregationSelector
            value={(rule.aggregationType as LeadAggregationType) || 'any'}
            onChange={handleAggregationChange}
            disabled={!rule.field}
          />
        </Box>
      )}

      {/* Count Value Input - only for count aggregation */}
      {showCountInput && (
        <Box sx={{ flex: 1.2, minWidth: '220px' }}>
          <CountValueInput
            operator={(rule.countOperator as CountOperator) || 'equals'}
            value={rule.countValue}
            onOperatorChange={handleCountOperatorChange}
            onValueChange={handleCountValueChange}
            disabled={!rule.field}
          />
        </Box>
      )}

      {/* Operator Selector - hide for count aggregation */}
      {!showCountInput && (
        <Box sx={{ flex: 1, minWidth: '180px' }}>
          <OperatorSelector
            value={rule.operator}
            fieldType={fieldType}
            onChange={handleOperatorChange}
            disabled={!rule.field}
          />
        </Box>
      )}

      {/* Value Input - hide for count aggregation */}
      {!showCountInput && (
        <Box sx={{ flex: 1.5, minWidth: '200px' }}>
          <ValueInput
            fieldType={fieldType}
            operator={rule.operator}
            value={rule.value}
            onChange={handleValueChange}
            options={fieldOptions}
            disabled={!rule.field || !rule.operator}
          />
        </Box>
      )}

      {/* Delete Button */}
      <IconButton
        onClick={onDelete}
        size="small"
        sx={{
          color: '#ef4444',
          '&:hover': {
            bgcolor: 'rgba(239, 68, 68, 0.1)',
          },
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};
