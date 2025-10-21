// src/components/features/crm/filters/CompanyFilter.tsx
import React, { useMemo } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  SelectChangeEvent
} from '@mui/material';
import { Lead } from '../../../../types/lead';

interface CompanyFilterProps {
  selectedCompany: string;
  onCompanyChange: (company: string) => void;
  leads: Lead[];
}

export const CompanyFilter: React.FC<CompanyFilterProps> = ({
  selectedCompany,
  onCompanyChange,
  leads,
}) => {
  // Extract unique companies from leads
  const companies = useMemo(() => {
    const companySet = new Set<string>();
    leads.forEach(lead => {
      if (lead.company) {
        companySet.add(lead.company);
      }
    });
    return Array.from(companySet).sort();
  }, [leads]);

  const handleChange = (event: SelectChangeEvent<string>) => {
    onCompanyChange(event.target.value);
  };

  return (
    <Box sx={{ minWidth: 200 }}>
      <FormControl fullWidth size="small">
        <InputLabel>Filter by Company</InputLabel>
        <Select
          value={selectedCompany}
          label="Filter by Company"
          onChange={handleChange}
          renderValue={(value) => {
            if (!value) return 'All Companies';
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}
                >
                  {value.charAt(0).toUpperCase()}
                </Box>
                <Typography variant="body2">{value}</Typography>
              </Box>
            );
          }}
          sx={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
            },
          }}
        >
          <MenuItem value="">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="All"
                size="small"
                variant="outlined"
                sx={{
                  color: '#667eea',
                  borderColor: '#667eea',
                }}
              />
              <Typography>All Companies</Typography>
            </Box>
          </MenuItem>
          {companies.map((company) => (
            <MenuItem key={company} value={company}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {company.charAt(0).toUpperCase()}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {company}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Company
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
