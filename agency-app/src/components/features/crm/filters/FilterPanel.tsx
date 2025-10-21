// src/components/features/crm/filters/FilterPanel.tsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Collapse, Paper } from '@mui/material';
import { LeadStatus } from '../../../../types/lead';
import { Lead } from '../../../../types/lead';
import { FilterState } from '../../../../types/filter';
import { StatusFilter } from './StatusFilter';
import { LeadOwnerFilter } from './LeadOwnerFilter';
import { CompanyFilter } from './CompanyFilter';
import { MonthFilter } from './MonthFilter';
import { DynamicFieldFilter } from './DynamicFieldFilter';
import { getCustomFieldsConfig } from '../../../../services/api/customFieldsService';
import { getFilterableFields, FilterConfig } from '../../../../services/api/dynamicFilterService';
import { CustomField } from '../../../../types/crm';

interface FilterPanelProps {
  isExpanded: boolean;
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  onClearAll: () => void;
  leads: Lead[];
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isExpanded,
  filters,
  onFiltersChange,
  onClearAll,
  leads,
}) => {
  const [customFieldConfigs, setCustomFieldConfigs] = useState<FilterConfig[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch custom fields configuration on mount
  useEffect(() => {
    async function loadCustomFields() {
      if (!isExpanded || leads.length === 0) return;

      setLoading(true);
      try {
        const config = await getCustomFieldsConfig();
        const filterableFields = getFilterableFields(config.fields, leads);
        setCustomFieldConfigs(filterableFields);
      } catch (error) {
        console.error('Error loading custom fields:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCustomFields();
  }, [isExpanded, leads.length]);

  const labelStyle = {
    color: '#64748b',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    display: 'block',
    mb: 1,
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
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr',
              md: '1fr 1fr',
            },
            gap: 2.5,
          }}
        >
          {/* Status Filter */}
          <Box>
            <Typography variant="caption" sx={labelStyle}>
              Status
            </Typography>
            <StatusFilter
              selectedStatuses={filters.statuses}
              onStatusesChange={(statuses) => onFiltersChange({ statuses })}
            />
          </Box>

          {/* Company Filter */}
          <Box>
            <Typography variant="caption" sx={labelStyle}>
              Company
            </Typography>
            <CompanyFilter
              selectedCompany={filters.company}
              onCompanyChange={(company) => onFiltersChange({ company })}
              leads={leads}
            />
          </Box>

          {/* Month Filter */}
          <Box>
            <Typography variant="caption" sx={labelStyle}>
              Month
            </Typography>
            <MonthFilter
              selectedMonth={filters.month}
              onMonthChange={(month) => onFiltersChange({ month })}
              leads={leads}
            />
          </Box>

          {/* Dynamic Custom Field Filters */}
          {customFieldConfigs.map((config) => (
            <Box key={config.fieldName}>
              <Typography variant="caption" sx={labelStyle}>
                {config.label}
              </Typography>
              <DynamicFieldFilter
                config={config}
                value={filters[config.fieldName]}
                onChange={(value) =>
                  onFiltersChange({ [config.fieldName]: value })
                }
              />
            </Box>
          ))}
        </Box>

        {/* Clear All Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2.5 }}>
          <Button
            onClick={onClearAll}
            size="small"
            sx={{
              textTransform: 'none',
              color: '#f44336',
              fontWeight: 600,
              '&:hover': {
                bgcolor: 'rgba(244, 67, 54, 0.08)',
              },
            }}
          >
            Clear All Filters
          </Button>
        </Box>
      </Paper>
    </Collapse>
  );
};
