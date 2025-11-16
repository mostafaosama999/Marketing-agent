// src/components/features/crm/filters/AdvancedFiltersModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Modal,
  Paper,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { FilterRule, FilterableField } from '../../../../types/filter';
import { Lead, LeadStatus } from '../../../../types/lead';
import { Company } from '../../../../types/crm';
import { FilterRuleRow } from './FilterRuleRow';
import { getFilterRuleSummary, getFilterableFields } from '../../../../services/api/advancedFilterService';
import { getCompanyFilterableFields } from '../../../../services/api/companyFilterService';

interface AdvancedFiltersModalProps<T = Lead> {
  open: boolean;
  onClose: () => void;
  onApplyFilters: (rules: FilterRule[]) => void;
  onClearFilters: () => void;
  data: T[];
  entityType?: 'lead' | 'company';
  pipelineStages?: LeadStatus[]; // Optional pipeline stages for lead status field
}

export const AdvancedFiltersModal = <T extends Lead | Company = Lead>({
  open,
  onClose,
  onApplyFilters,
  onClearFilters,
  data,
  entityType = 'lead',
  pipelineStages,
}: AdvancedFiltersModalProps<T>) => {
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [fields, setFields] = useState<FilterableField[]>([]);
  const [fieldsLoaded, setFieldsLoaded] = useState(false);

  // Load filterable fields from actual data (leads or companies)
  useEffect(() => {
    if (open && data.length > 0) {
      try {
        const filterableFields = entityType === 'company'
          ? getCompanyFilterableFields(data as Company[])
          : getFilterableFields(data as Lead[], pipelineStages);
        setFields(filterableFields);
        setFieldsLoaded(true);
      } catch (error) {
        console.error('Error loading filterable fields:', error);
      }
    }
  }, [open, data, entityType, pipelineStages]);

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
      onClose();
      return;
    }

    onApplyFilters(validRules);
    onClose();
  };

  const handleClearAll = () => {
    setRules([]);
    onClearFilters();
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="advanced-filters-modal"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Paper
        elevation={24}
        sx={{
          width: {
            xs: '90%',
            sm: '700px',
            md: '800px',
          },
          maxHeight: '90vh',
          overflow: 'auto',
          p: 3,
          borderRadius: '12px',
          border: '1px solid rgba(103, 126, 234, 0.2)',
          bgcolor: '#ffffff',
          position: 'relative',
          outline: 'none',
        }}
      >
        {/* Header with Close Button */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon sx={{ color: '#667eea', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '20px' }}>
              Advanced Filters
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddRule}
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
            <IconButton
              onClick={handleClose}
              sx={{
                color: '#64748b',
                '&:hover': {
                  bgcolor: 'rgba(100, 116, 139, 0.08)',
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Filter Rules */}
        {rules.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 6,
              color: '#64748b',
            }}
          >
            <Typography variant="body2">
              No filters applied. Click "Add Rule" to create your first filter.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mb: 3 }}>
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
              mb: 3,
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
            size="medium"
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
              px: 4,
              '&:hover': {
                bgcolor: '#5568d3',
              },
            }}
          >
            Apply Filters
          </Button>
        </Box>
      </Paper>
    </Modal>
  );
};
