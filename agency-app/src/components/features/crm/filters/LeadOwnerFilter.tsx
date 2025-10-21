// src/components/features/crm/filters/LeadOwnerFilter.tsx
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

interface LeadOwnerFilterProps {
  selectedOwner: string;
  onOwnerChange: (owner: string) => void;
  leads: Lead[];
}

export const LeadOwnerFilter: React.FC<LeadOwnerFilterProps> = ({
  selectedOwner,
  onOwnerChange,
  leads,
}) => {
  // Extract unique owners from leads' custom fields
  const owners = useMemo(() => {
    const ownerSet = new Set<string>();
    leads.forEach(lead => {
      if (lead.customFields?.lead_owner) {
        ownerSet.add(lead.customFields.lead_owner);
      }
    });
    return Array.from(ownerSet).sort();
  }, [leads]);

  const handleChange = (event: SelectChangeEvent<string>) => {
    onOwnerChange(event.target.value);
  };

  return (
    <Box sx={{ minWidth: 200 }}>
      <FormControl fullWidth size="small">
        <InputLabel>Filter by Owner</InputLabel>
        <Select
          value={selectedOwner}
          label="Filter by Owner"
          onChange={handleChange}
          renderValue={(value) => {
            if (!value) return 'All Owners';
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
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
              <Typography>All Owners</Typography>
            </Box>
          </MenuItem>
          {owners.map((owner) => (
            <MenuItem key={owner} value={owner}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {owner.charAt(0).toUpperCase()}
                </Box>
                <Typography variant="body2" fontWeight={500}>
                  {owner}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
