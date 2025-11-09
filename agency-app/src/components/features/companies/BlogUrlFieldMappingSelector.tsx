// src/components/features/companies/BlogUrlFieldMappingSelector.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  RssFeed as BlogIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { Company } from '../../../types/crm';
import {
  getBlogUrlFieldMapping,
  saveBlogUrlFieldMapping,
  clearBlogUrlFieldMapping,
  getPotentialBlogUrlFields,
} from '../../../services/api/blogUrlFieldMappingService';

interface BlogUrlFieldMappingSelectorProps {
  companies: Company[];
}

export const BlogUrlFieldMappingSelector: React.FC<BlogUrlFieldMappingSelectorProps> = ({
  companies,
}) => {
  const [selectedField, setSelectedField] = useState<string>('');
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  // Load saved mapping and available fields on mount
  useEffect(() => {
    const savedMapping = getBlogUrlFieldMapping();
    if (savedMapping) {
      setSelectedField(savedMapping);
    }

    const fields = getPotentialBlogUrlFields(companies);
    setAvailableFields(fields);
  }, [companies]);

  const handleFieldChange = (fieldName: string) => {
    if (fieldName === '') {
      // Clear mapping
      clearBlogUrlFieldMapping();
      setSelectedField('');
    } else {
      // Save new mapping
      saveBlogUrlFieldMapping(fieldName);
      setSelectedField(fieldName);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearBlogUrlFieldMapping();
    setSelectedField('');
  };

  // Count how many companies have this field populated
  const getFieldPopulationCount = (fieldName: string): number => {
    return companies.filter(c =>
      c.customFields?.[fieldName] &&
      typeof c.customFields[fieldName] === 'string' &&
      c.customFields[fieldName].trim().length > 0
    ).length;
  };

  if (availableFields.length === 0) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip title="Map a custom field to automatically analyze blogs when you open the Blog tab">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <BlogIcon sx={{ fontSize: 18, color: '#667eea' }} />
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Blog URL Field:
          </Typography>
          <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
            <InfoIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
          </IconButton>
        </Box>
      </Tooltip>

      <FormControl size="small" sx={{ minWidth: 200 }}>
        <Select
          value={selectedField}
          onChange={(e) => handleFieldChange(e.target.value)}
          displayEmpty
          sx={{
            fontSize: '13px',
            bgcolor: 'white',
            borderRadius: 2,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: selectedField ? '#667eea' : '#e2e8f0',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
            },
          }}
          renderValue={(value) => {
            if (!value) {
              return (
                <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '13px' }}>
                  No field mapped
                </Typography>
              );
            }
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={value}
                  size="small"
                  onDelete={handleClear}
                  deleteIcon={<ClearIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontSize: '11px',
                    height: '22px',
                    '& .MuiChip-deleteIcon': {
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: 14,
                      '&:hover': {
                        color: 'white',
                      },
                    },
                  }}
                />
              </Box>
            );
          }}
        >
          <MenuItem value="">
            <em>None (manual selection)</em>
          </MenuItem>
          {availableFields.map((fieldName) => {
            const count = getFieldPopulationCount(fieldName);
            return (
              <MenuItem key={fieldName} value={fieldName}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontSize: '13px' }}>
                    {fieldName}
                  </Typography>
                  <Chip
                    label={`${count} ${count === 1 ? 'company' : 'companies'}`}
                    size="small"
                    sx={{
                      bgcolor: '#f1f5f9',
                      color: '#64748b',
                      fontSize: '10px',
                      height: '18px',
                      ml: 2,
                    }}
                  />
                </Box>
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    </Box>
  );
};
