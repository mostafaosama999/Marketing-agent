import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Checkbox,
  Chip,
  Box,
  Typography,
  Button,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { Company } from '../../../app/types/crm';
import { ColumnVisibilityMenu } from './ColumnVisibilityMenu';
import { FilterBuilder } from './FilterBuilder';
import { FilterPresetManager } from './FilterPresetManager';
import { useColumnVisibility } from '../hooks/useColumnVisibility';
import { useFilters } from '../hooks/useFilters';
import { FilterableField } from '../../../app/types/filters';

interface CompanyTableViewProps {
  companies: Company[];
  onEditCompany: (company: Company) => void;
  onDeleteCompany: (companyId: string) => void;
  onBulkDelete?: (companyIds: string[]) => void;
  onClick?: (company: Company) => void;
}

export const CompanyTableView: React.FC<CompanyTableViewProps> = ({
  companies,
  onEditCompany,
  onDeleteCompany,
  onBulkDelete,
  onClick,
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Column visibility management
  const { columns, setColumns, isColumnVisible } = useColumnVisibility({
    storageKey: 'crm_companies_table_columns',
    defaultColumns: [
      { id: 'name', label: 'Company Name', visible: true, required: true },
      { id: 'website', label: 'Website', visible: true },
      { id: 'industry', label: 'Industry', visible: true },
      { id: 'status', label: 'Status', visible: true },
    ],
  });

  // Define filterable fields
  const filterableFields: FilterableField[] = useMemo(() => [
    { id: 'name', label: 'Company Name', type: 'text' },
    { id: 'website', label: 'Website', type: 'text' },
    { id: 'industry', label: 'Industry', type: 'text' },
    { id: 'description', label: 'Description', type: 'text' },
    { id: 'createdAt', label: 'Created Date', type: 'date' },
    { id: 'blogQualified', label: 'Blog Qualified', type: 'select', options: ['true', 'false'] },
    { id: 'hasGeneratedIdeas', label: 'Has Ideas', type: 'select', options: ['true', 'false'] },
  ], []);

  // Filter management
  const {
    conditions,
    filteredData: filteredCompanies,
    addFilter,
    updateFilter,
    removeFilter,
    clearFilters,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    hasActiveFilters,
  } = useFilters(companies, {
    storageKey: 'crm_companies_filters',
    presetsStorageKey: 'crm_companies_filter_presets',
  });

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(new Set(filteredCompanies.map((c) => c.id)));
    } else {
      setSelected(new Set());
    }
  };

  const handleSelect = (companyId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(companyId)) {
      newSelected.delete(companyId);
    } else {
      newSelected.add(companyId);
    }
    setSelected(newSelected);
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selected.size > 0) {
      onBulkDelete(Array.from(selected));
      setSelected(new Set());
    }
  };

  const handleRowClick = (company: Company, event: React.MouseEvent) => {
    // Don't trigger if clicking on checkbox or action buttons
    if ((event.target as HTMLElement).closest('.MuiCheckbox-root, .MuiIconButton-root, .MuiButton-root')) {
      return;
    }
    if (onClick) {
      onClick(company);
    }
  };

  return (
    <Box>
      {/* Table Controls Toolbar */}
      {selected.size === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          {/* Left side - Filters */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FilterBuilder
              conditions={conditions}
              fields={filterableFields}
              onAddFilter={addFilter}
              onUpdateFilter={updateFilter}
              onRemoveFilter={removeFilter}
              onClearFilters={clearFilters}
            />
            <FilterPresetManager
              presets={presets}
              onLoadPreset={loadPreset}
              onSavePreset={savePreset}
              onDeletePreset={deletePreset}
              hasActiveFilters={hasActiveFilters}
            />
          </Box>

          {/* Right side - Column Visibility */}
          <ColumnVisibilityMenu columns={columns} onColumnsChange={setColumns} />
        </Box>
      )}

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">
            {selected.size} selected
          </Typography>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={handleBulkDelete}
          >
            Delete Selected
          </Button>
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={filteredCompanies.length > 0 && selected.size === filteredCompanies.length}
                  indeterminate={selected.size > 0 && selected.size < filteredCompanies.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              {isColumnVisible('name') && <TableCell>Company Name</TableCell>}
              {isColumnVisible('website') && <TableCell>Website</TableCell>}
              {isColumnVisible('industry') && <TableCell>Industry</TableCell>}
              {isColumnVisible('status') && <TableCell>Status</TableCell>}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={1 + columns.filter(c => c.visible).length + 1} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    {companies.length === 0
                      ? 'No companies found. Click "Add Company" to create your first company.'
                      : 'No companies match the current filters.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredCompanies.map((company) => (
                <TableRow
                  key={company.id}
                  hover
                  onClick={(e) => handleRowClick(company, e)}
                  sx={{ cursor: onClick ? 'pointer' : 'default' }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.has(company.id)}
                      onChange={() => handleSelect(company.id)}
                    />
                  </TableCell>
                  {isColumnVisible('name') && (
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {company.name}
                      </Typography>
                    </TableCell>
                  )}
                  {isColumnVisible('website') && (
                    <TableCell>
                      {company.website ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LanguageIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography
                            variant="body2"
                            component="a"
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {company.website}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible('industry') && (
                    <TableCell>
                      {company.industry ? (
                        <Chip label={company.industry} size="small" />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible('status') && (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {company.blogQualified && (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Qualified"
                            size="small"
                            color={company.blogQualificationData?.qualified ? 'success' : 'default'}
                          />
                        )}
                        {company.hasGeneratedIdeas && (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Ideas"
                            size="small"
                            color="secondary"
                          />
                        )}
                      </Box>
                    </TableCell>
                  )}
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCompany(company);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCompany(company.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
