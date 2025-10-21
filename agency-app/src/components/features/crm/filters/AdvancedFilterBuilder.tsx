// src/components/features/crm/filters/AdvancedFilterBuilder.tsx
import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Collapse, Chip } from '@mui/material';
import { Add as AddIcon, FilterList as FilterListIcon } from '@mui/icons-material';
import { FilterRule, FilterableField } from '../../../../types/filter';
import { FilterRuleRow } from './FilterRuleRow';
import { getFilterRuleSummary } from '../../../../services/api/advancedFilterService';
import { getCustomFieldsConfig } from '../../../../services/api/customFieldsService';
import { getFilterableFields } from '../../../../services/api/advancedFilterService';

interface AdvancedFilterBuilderProps {
  isExpanded: boolean;
  onApplyFilters: (rules: FilterRule[]) => void;
  onClearFilters: () => void;
}

export const AdvancedFilterBuilder: React.FC<AdvancedFilterBuilderProps> = ({
  isExpanded,
  onApplyFilters,
  onClearFilters,
}) => {
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [fields, setFields] = useState<FilterableField[]>([]);
  const [loading, setLoading] = useState(false);
  const [fieldsLoaded, setFieldsLoaded] = useState(false);

  // Load filterable fields on mount
  useEffect(() => {
    async function loadFields() {
      setLoading(true);
      try {
        const config = await getCustomFieldsConfig();
        const filterableFields = getFilterableFields(config.fields);
        setFields(filterableFields);
        setFieldsLoaded(true);
      } catch (error) {
        console.error('Error loading filterable fields:', error);
      } finally {
        setLoading(false);
      }
    }

    // Load fields if panel is expanded
    if (isExpanded && !fieldsLoaded) {
      loadFields();
    }
  }, [isExpanded, fieldsLoaded]);

  // Add default rule AFTER fields are loaded (only if no rules)
  useEffect(() => {
    if (fieldsLoaded && fields.length > 0 && rules.length === 0) {
      const defaultRule: FilterRule = {
        id: `rule_${Date.now()}`,
        field: '',
        fieldLabel: '',
        operator: 'equals',
        value: null,
        logicGate: 'AND',
      };
      setRules([defaultRule]);
    }
  }, [fieldsLoaded, fields.length, rules.length]);

  const handleAddRule = () => {
    const newRule: FilterRule = {
      id: `rule_${Date.now()}`,
      field: '',
      fieldLabel: '',
      operator: 'equals',
      value: null,
      logicGate: 'AND',
    };

    setRules([...rules, newRule]);
  };

  const handleUpdateRule = (index: number, updatedRule: FilterRule) => {
    const newRules = [...rules];
    newRules[index] = updatedRule;
    setRules(newRules);
  };

  const handleDeleteRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);

    // If all rules are deleted, clear filters
    if (newRules.length === 0) {
      onClearFilters();
    }
  };

  const handleApplyFilters = () => {
    // Filter out incomplete rules (missing field or operator)
    const validRules = rules.filter(rule => rule.field && rule.operator);

    if (validRules.length === 0) {
      onClearFilters();
      return;
    }

    onApplyFilters(validRules);
  };

  const handleClearAll = () => {
    setRules([]);
    onClearFilters();
  };

  return (
    <Collapse in={isExpanded} timeout={200}>
      <Paper
        elevation={3}
        sx={{
          mt: 1,
          p: 2.5,
          borderRadius: '8px',
          border: '1px solid rgba(103, 126, 234, 0.2)',
          bgcolor: 'white',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon sx={{ color: '#667eea' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Advanced Filters
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddRule}
            disabled={loading}
            sx={{
              textTransform: 'none',
              borderColor: '#667eea',
              color: '#667eea',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#5568d3',
                bgcolor: 'rgba(102, 126, 234, 0.08)',
              },
            }}
          >
            Add Rule
          </Button>
        </Box>

        {/* Filter Rules */}
        {rules.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              color: '#64748b',
            }}
          >
            <Typography variant="body2">
              No filters applied. Click "Add Rule" to create your first filter.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mb: 2 }}>
            {rules.map((rule, index) => (
              <FilterRuleRow
                key={rule.id}
                rule={rule}
                fields={fields}
                onUpdate={(updatedRule) => handleUpdateRule(index, updatedRule)}
                onDelete={() => handleDeleteRule(index)}
                showLogicGate={index > 0}
                isFirst={index === 0}
              />
            ))}
          </Box>
        )}

        {/* Active Filter Summary */}
        {rules.length > 0 && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              bgcolor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 1, display: 'block' }}>
              FILTER SUMMARY
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {rules.map((rule, index) => {
                if (!rule.field) return null;

                return (
                  <React.Fragment key={rule.id}>
                    {index > 0 && (
                      <Chip
                        label={rules[index - 1].logicGate}
                        size="small"
                        sx={{
                          bgcolor: rules[index - 1].logicGate === 'AND' ? '#667eea' : '#f59e0b',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '11px',
                        }}
                      />
                    )}
                    <Chip
                      label={getFilterRuleSummary(rule, fields)}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: '#667eea',
                        color: '#667eea',
                        fontWeight: 500,
                      }}
                    />
                  </React.Fragment>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
          <Button
            onClick={handleClearAll}
            size="small"
            disabled={rules.length === 0}
            sx={{
              textTransform: 'none',
              color: '#ef4444',
              fontWeight: 600,
              '&:hover': {
                bgcolor: 'rgba(239, 68, 68, 0.08)',
              },
            }}
          >
            Clear All
          </Button>
          <Button
            variant="contained"
            onClick={handleApplyFilters}
            disabled={rules.length === 0}
            sx={{
              textTransform: 'none',
              bgcolor: '#667eea',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                bgcolor: '#5568d3',
              },
            }}
          >
            Apply Filters
          </Button>
        </Box>
      </Paper>
    </Collapse>
  );
};
