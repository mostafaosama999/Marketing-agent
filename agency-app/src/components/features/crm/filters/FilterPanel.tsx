// src/components/features/crm/filters/FilterPanel.tsx
import React from 'react';
import { Box, Typography, Button, Collapse, Paper } from '@mui/material';
import { LeadStatus } from '../../../../types/lead';
import { Lead } from '../../../../types/lead';
import { StatusFilter } from './StatusFilter';
import { LeadOwnerFilter } from './LeadOwnerFilter';
import { CompanyFilter } from './CompanyFilter';
import { MonthFilter } from './MonthFilter';

interface FilterPanelProps {
  isExpanded: boolean;
  selectedStatuses: LeadStatus[];
  selectedOwner: string;
  selectedCompany: string;
  selectedMonth: string;
  onStatusesChange: (statuses: LeadStatus[]) => void;
  onOwnerChange: (owner: string) => void;
  onCompanyChange: (company: string) => void;
  onMonthChange: (month: string) => void;
  onClearAll: () => void;
  leads: Lead[];
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isExpanded,
  selectedStatuses,
  selectedOwner,
  selectedCompany,
  selectedMonth,
  onStatusesChange,
  onOwnerChange,
  onCompanyChange,
  onMonthChange,
  onClearAll,
  leads,
}) => {
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
            <Typography
              variant="caption"
              sx={{
                color: '#64748b',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block',
                mb: 1,
              }}
            >
              Status
            </Typography>
            <StatusFilter
              selectedStatuses={selectedStatuses}
              onStatusesChange={onStatusesChange}
            />
          </Box>

          {/* Owner Filter */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: '#64748b',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block',
                mb: 1,
              }}
            >
              Owner
            </Typography>
            <LeadOwnerFilter
              selectedOwner={selectedOwner}
              onOwnerChange={onOwnerChange}
              leads={leads}
            />
          </Box>

          {/* Company Filter */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: '#64748b',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block',
                mb: 1,
              }}
            >
              Company
            </Typography>
            <CompanyFilter
              selectedCompany={selectedCompany}
              onCompanyChange={onCompanyChange}
              leads={leads}
            />
          </Box>

          {/* Month Filter */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: '#64748b',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block',
                mb: 1,
              }}
            >
              Month
            </Typography>
            <MonthFilter
              selectedMonth={selectedMonth}
              onMonthChange={onMonthChange}
              leads={leads}
            />
          </Box>
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
