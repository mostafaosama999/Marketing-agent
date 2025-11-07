// src/components/features/companies/CompanyTable.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Paper,
  IconButton,
  Typography,
  Chip,
  Link,
  Checkbox,
  Menu,
  MenuItem,
  Popover,
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Company } from '../../../types/crm';
import { TableColumnConfig } from '../../../types/table';
import { FieldDefinition } from '../../../types/fieldDefinitions';
import { getFieldDefinitions } from '../../../services/api/fieldDefinitionsService';
import { updateCompanyCustomField, updateCompanyField } from '../../../services/api/companies';

interface CompanyTableProps {
  companies: Array<Company & { leadCount: number }>;
  onView: (company: Company) => void;
  visibleColumns: TableColumnConfig[];
  selectedCompanyIds?: string[];
  onSelectCompany?: (companyId: string) => void;
  onSelectAll?: (selected: boolean) => void;
}

type SortDirection = 'asc' | 'desc';

export const CompanyTable: React.FC<CompanyTableProps> = ({
  companies,
  onView,
  visibleColumns,
  selectedCompanyIds = [],
  onSelectCompany,
  onSelectAll,
}) => {
  // Filter to only show visible columns
  const displayColumns = visibleColumns.filter(col => col.visible);

  const [orderBy, setOrderBy] = useState<string>('name');
  const [order, setOrder] = useState<SortDirection>('asc');

  // Dropdown field definitions
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([]);
  const [customFieldMenuAnchor, setCustomFieldMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedCompanyForCustomField, setSelectedCompanyForCustomField] = useState<Company | null>(null);
  const [selectedCustomFieldName, setSelectedCustomFieldName] = useState<string | null>(null);

  // Date picker state
  const [datePickerAnchor, setDatePickerAnchor] = useState<null | HTMLElement>(null);
  const [selectedCompanyForDate, setSelectedCompanyForDate] = useState<Company | null>(null);
  const [selectedDateFieldName, setSelectedDateFieldName] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem('companies_table_page');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const saved = localStorage.getItem('companies_table_rows_per_page');
    return saved ? parseInt(saved, 10) : 25;
  });

  // Fetch all field definitions on mount (dropdowns, dates, etc.)
  useEffect(() => {
    const fetchFieldDefinitions = async () => {
      try {
        const definitions = await getFieldDefinitions('company');
        setFieldDefinitions(definitions);
      } catch (error) {
        console.error('Error fetching field definitions:', error);
      }
    };

    fetchFieldDefinitions();
  }, []);

  // Sorting handler
  const handleRequestSort = (fieldId: string) => {
    const isAsc = orderBy === fieldId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(fieldId);
  };

  // Custom field dropdown menu handlers
  const handleCustomFieldClick = (
    event: React.MouseEvent<HTMLElement>,
    company: Company,
    fieldName: string
  ) => {
    event.stopPropagation();
    setCustomFieldMenuAnchor(event.currentTarget);
    setSelectedCompanyForCustomField(company);
    setSelectedCustomFieldName(fieldName);
  };

  const handleCustomFieldMenuClose = () => {
    setCustomFieldMenuAnchor(null);
    setSelectedCompanyForCustomField(null);
    setSelectedCustomFieldName(null);
  };

  const handleCustomFieldChange = async (newValue: string) => {
    if (selectedCompanyForCustomField && selectedCustomFieldName) {
      try {
        await updateCompanyCustomField(
          selectedCompanyForCustomField.id,
          selectedCustomFieldName,
          newValue
        );
      } catch (error) {
        console.error('Error updating custom field:', error);
      }
    }
    handleCustomFieldMenuClose();
  };

  // Helper function to get dropdown options for a field
  const getDropdownOptions = (fieldName: string): string[] => {
    const fieldDef = fieldDefinitions.find(def => def.name === fieldName);
    return fieldDef?.options || [];
  };

  // Helper function to check if a custom field is a dropdown
  const isDropdownField = (fieldName: string): boolean => {
    return fieldDefinitions.some(def => def.name === fieldName && def.fieldType === 'dropdown');
  };

  // Date picker handlers
  const handleDateFieldClick = (
    event: React.MouseEvent<HTMLElement>,
    company: Company,
    fieldName: string
  ) => {
    event.stopPropagation();
    setDatePickerAnchor(event.currentTarget);
    setSelectedCompanyForDate(company);
    setSelectedDateFieldName(fieldName);
  };

  const handleDatePickerClose = () => {
    setDatePickerAnchor(null);
    setSelectedCompanyForDate(null);
    setSelectedDateFieldName(null);
  };

  const handleDateChange = async (newDate: Date | null) => {
    if (selectedCompanyForDate && selectedDateFieldName && newDate) {
      try {
        // Convert to ISO string for storage
        const isoDate = newDate.toISOString();

        // Check if this is a built-in field or a custom field
        const builtInDateFields = ['createdAt', 'updatedAt', 'lastApiCostUpdate', 'archivedAt'];
        const isBuiltInField = builtInDateFields.includes(selectedDateFieldName);

        if (isBuiltInField) {
          // Update built-in field directly
          await updateCompanyField(
            selectedCompanyForDate.id,
            selectedDateFieldName,
            isoDate
          );
        } else {
          // Update custom field
          await updateCompanyCustomField(
            selectedCompanyForDate.id,
            selectedDateFieldName,
            isoDate
          );
        }
      } catch (error) {
        console.error('Error updating date field:', error);
      }
    }
    handleDatePickerClose();
  };

  // Helper function to check if a custom field is a date
  const isDateField = (fieldName: string, columnLabel?: string): boolean => {
    // First check field definitions
    const hasDateFieldDef = fieldDefinitions.some(def => def.name === fieldName && def.fieldType === 'date');
    if (hasDateFieldDef) return true;

    // Fallback: check if field name or label contains "date" (case-insensitive)
    const nameHasDate = /date/i.test(fieldName || '');
    const labelHasDate = /date/i.test(columnLabel || '');

    return nameHasDate || labelHasDate;
  };

  // Helper function to parse date string to Date object
  const parseDateValue = (value: any): Date | null => {
    if (!value) return null;
    try {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  // Sort companies
  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Get values based on column id
      switch (orderBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'website':
          aValue = a.website;
          bValue = b.website;
          break;
        case 'industry':
          aValue = a.industry;
          bValue = b.industry;
          break;
        case 'description':
          aValue = a.description;
          bValue = b.description;
          break;
        case 'leadCount':
          aValue = a.leadCount;
          bValue = b.leadCount;
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        default:
          // Check if this is a custom field
          const column = displayColumns.find(col => col.id === orderBy);
          if (column && column.type === 'custom' && column.fieldName) {
            aValue = a.customFields?.[column.fieldName];
            bValue = b.customFields?.[column.fieldName];
          } else {
            return 0;
          }
      }

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle date comparison
      if (orderBy === 'createdAt' || aValue instanceof Date) {
        const aTime = aValue instanceof Date ? aValue.getTime() : new Date(aValue).getTime();
        const bTime = bValue instanceof Date ? bValue.getTime() : new Date(bValue).getTime();
        return order === 'asc' ? aTime - bTime : bTime - aTime;
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return order === 'asc' ? comparison : -comparison;
      }

      // Handle numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [companies, orderBy, order, displayColumns]);

  // Paginate companies
  const paginatedCompanies = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedCompanies.slice(start, end);
  }, [sortedCompanies, page, rowsPerPage]);

  // Calculate current page company IDs
  const currentPageCompanyIds = useMemo(() => {
    return paginatedCompanies.map(company => company.id);
  }, [paginatedCompanies]);

  // Check if all companies on current page are selected
  const allSelected = onSelectAll && currentPageCompanyIds.length > 0 &&
                      currentPageCompanyIds.every(id => selectedCompanyIds.includes(id));
  const someSelected = selectedCompanyIds.length > 0 && !allSelected;

  // Reset page when sorting changes
  useEffect(() => {
    setPage(0);
    localStorage.setItem('companies_table_page', '0');
  }, [orderBy, order]);

  // Save pagination preferences
  useEffect(() => {
    localStorage.setItem('companies_table_page', page.toString());
  }, [page]);

  useEffect(() => {
    localStorage.setItem('companies_table_rows_per_page', rowsPerPage.toString());
  }, [rowsPerPage]);

  const getIndustryColor = (industry?: string): string => {
    if (!industry) return '#94a3b8';

    const colors: Record<string, string> = {
      technology: '#3b82f6',
      healthcare: '#10b981',
      finance: '#f59e0b',
      education: '#8b5cf6',
      retail: '#ec4899',
      manufacturing: '#64748b',
      saas: '#667eea',
      software: '#667eea',
      default: '#94a3b8',
    };

    const key = industry.toLowerCase();
    for (const [k, v] of Object.entries(colors)) {
      if (key.includes(k)) return v;
    }

    return colors.default;
  };

  // Render cell content based on column id
  const renderCell = (columnId: string, company: Company & { leadCount: number }) => {
    switch (columnId) {
      case 'name':
        return (
          <TableCell key={columnId} onClick={() => onView(company)} sx={{ cursor: 'pointer' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {company.name.charAt(0).toUpperCase()}
              </Box>
              <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2, fontWeight: 600 }}>
                {company.name}
              </Typography>
            </Box>
          </TableCell>
        );

      case 'website':
        return (
          <TableCell key={columnId}>
            {company.website ? (
              <Link
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                sx={{
                  fontSize: '11px',
                  lineHeight: 1.2,
                  color: '#667eea',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {company.website.replace(/^https?:\/\/(www\.)?/, '')}
              </Link>
            ) : (
              <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2, color: 'text.secondary' }}>
                -
              </Typography>
            )}
          </TableCell>
        );

      case 'industry':
        return (
          <TableCell key={columnId}>
            {company.industry ? (
              <Chip
                label={company.industry}
                size="small"
                sx={{
                  bgcolor: `${getIndustryColor(company.industry)}22`,
                  color: getIndustryColor(company.industry),
                  fontWeight: 500,
                  fontSize: '10px',
                  height: '20px',
                }}
              />
            ) : (
              <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2, color: 'text.secondary' }}>
                -
              </Typography>
            )}
          </TableCell>
        );

      case 'description':
        return (
          <TableCell key={columnId}>
            {company.description ? (
              <Typography
                variant="body2"
                sx={{
                  fontSize: '11px',
                  lineHeight: 1.2,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  maxWidth: 300,
                }}
              >
                {company.description}
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2, color: 'text.secondary' }}>
                -
              </Typography>
            )}
          </TableCell>
        );

      case 'leadCount':
        return (
          <TableCell key={columnId} align="center">
            <Chip
              label={company.leadCount}
              size="small"
              sx={{
                bgcolor: company.leadCount > 0 ? '#dcfce722' : '#f1f5f9',
                color: company.leadCount > 0 ? '#10b981' : '#64748b',
                fontWeight: 600,
                fontSize: '10px',
                height: '20px',
                minWidth: 32,
              }}
            />
          </TableCell>
        );

      case 'createdAt': {
        const date = company.createdAt instanceof Date ? company.createdAt : new Date(company.createdAt);
        const displayDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return (
          <TableCell key={columnId}>
            <Chip
              label={displayDate}
              size="small"
              onClick={(e) => handleDateFieldClick(e, company, 'createdAt')}
              sx={{
                fontSize: '10px',
                height: '20px',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6b408e 100%)',
                },
              }}
            />
          </TableCell>
        );
      }

      default:
        // Check if this is a custom field column
        const column = displayColumns.find(col => col.id === columnId);
        if (column && column.type === 'custom' && column.fieldName) {
          const value = company.customFields?.[column.fieldName];

          // Check if this is a dropdown field (check column.fieldType first, then fallback to fieldDefinitions)
          const isDropdown = column.fieldType === 'dropdown' || isDropdownField(column.fieldName);

          if (isDropdown) {
            // Empty dropdown - show placeholder
            if (!value || value === '') {
              return (
                <TableCell key={columnId}>
                  <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2, color: 'text.secondary' }}>-</Typography>
                </TableCell>
              );
            }

            return (
              <TableCell key={columnId}>
                <Chip
                  label={String(value)}
                  size="small"
                  onClick={(e) => handleCustomFieldClick(e, company, column.fieldName!)}
                  sx={{
                    fontSize: '10px',
                    height: '20px',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6b408e 100%)',
                    },
                  }}
                />
              </TableCell>
            );
          }

          // Check if this is a date field (check column.fieldType first, then fallback to fieldDefinitions and column name/label)
          const isDate = column.fieldType === 'date' || isDateField(column.fieldName, column.label);

          if (isDate) {
            const dateValue = parseDateValue(value);
            const displayDate = dateValue
              ? dateValue.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Set Date'; // Show "Set Date" when empty

            return (
              <TableCell key={columnId}>
                <Chip
                  label={displayDate}
                  size="small"
                  onClick={(e) => handleDateFieldClick(e, company, column.fieldName!)}
                  sx={{
                    fontSize: '10px',
                    height: '20px',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6b408e 100%)',
                    },
                  }}
                />
              </TableCell>
            );
          }

          // For all other field types, check if empty
          if (!value || value === '') {
            return (
              <TableCell key={columnId}>
                <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2, color: 'text.secondary' }}>-</Typography>
              </TableCell>
            );
          }

          // Check if value is a URL
          const isUrl = typeof value === 'string' &&
                        (value.startsWith('http://') || value.startsWith('https://'));

          if (isUrl) {
            return (
              <TableCell key={columnId}>
                <Link
                  href={value as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    fontSize: '11px',
                    lineHeight: 1.2,
                    color: '#667eea',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {String(value)}
                </Link>
              </TableCell>
            );
          }

          return (
            <TableCell key={columnId}>
              <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
                {String(value)}
              </Typography>
            </TableCell>
          );
        }

        return <TableCell key={columnId}>-</TableCell>;
    }
  };

  return (
    <Box>
      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: '8px',
          maxHeight: 'calc(100vh - 400px)',
          overflow: 'auto',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#fafafa', borderBottom: '2px solid #e0e0e0', height: '36px' }}>
              {/* Checkbox column (optional) */}
              {onSelectCompany && onSelectAll && (
                <TableCell
                  padding="checkbox"
                  sx={{
                    width: 48,
                    py: 0,
                    px: 1,
                    height: '36px',
                  }}
                >
                  <Checkbox
                    checked={!!allSelected}
                    indeterminate={someSelected}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    size="small"
                    sx={{
                      color: '#667eea',
                      '&.Mui-checked': { color: '#667eea' },
                      '&.MuiCheckbox-indeterminate': { color: '#667eea' },
                    }}
                  />
                </TableCell>
              )}

              {/* Table columns */}
              {displayColumns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.id === 'leadCount' ? 'center' : 'left'}
                  sx={{
                    py: 0,
                    px: 1,
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    height: '36px',
                  }}
                >
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={() => handleRequestSort(column.id)}
                    disabled={!column.sortable}
                    sx={{
                      fontSize: '12px',
                      color: '#64748b',
                      '&:hover': {
                        color: '#475569',
                      },
                      '&.Mui-active': {
                        color: '#667eea',
                      },
                      '& .MuiTableSortLabel-icon': {
                        fontSize: '16px',
                        opacity: 1,
                        color: 'inherit',
                      },
                    }}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}

              {/* Actions column */}
              <TableCell
                align="right"
                sx={{
                  py: 0,
                  px: 1,
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  height: '36px',
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={displayColumns.length + 2} align="center" sx={{ py: 8 }}>
                  <BusinessIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No companies yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add your first company to get started
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCompanies.map((company) => {
                const isSelected = selectedCompanyIds.includes(company.id);
                return (
                  <TableRow
                    key={company.id}
                    hover
                    selected={isSelected}
                    onClick={() => onView(company)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: '#fafbfc',
                      height: '32px',
                      '&:hover': {
                        bgcolor: '#f5f5f5',
                      },
                      '& .MuiTableCell-root': {
                        borderBottom: '1px solid #e0e0e0',
                        py: 0,
                        px: 1,
                        height: '32px',
                      },
                    }}
                  >
                    {/* Checkbox cell (optional) */}
                    {onSelectCompany && (
                      <TableCell
                        padding="checkbox"
                        onClick={(e) => e.stopPropagation()}
                        sx={{ py: 0, px: 1 }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => onSelectCompany(company.id)}
                          size="small"
                          sx={{
                            color: '#667eea',
                            '&.Mui-checked': { color: '#667eea' },
                          }}
                        />
                      </TableCell>
                    )}

                    {/* Table column cells */}
                    {displayColumns.map((column) => renderCell(column.id, company))}

                    {/* Actions cell */}
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(company);
                        }}
                        sx={{
                          color: '#667eea',
                          '&:hover': {
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                          },
                        }}
                      >
                        <OpenInNewIcon sx={{ fontSize: '16px' }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={sortedCompanies.length}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100, 250, 500, 1000]}
        labelRowsPerPage="Companies per page:"
        sx={{
          borderTop: '1px solid #e2e8f0',
          bgcolor: '#fafafa',
          flexShrink: 0,
          '.MuiTablePagination-toolbar': {
            px: 2,
            pr: 20, // Large right padding to avoid FAB (160px)
          },
          '.MuiTablePagination-actions': {
            mr: 4, // Extra margin on action buttons
          },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            fontSize: '13px',
            color: '#64748b',
          },
        }}
      />

      {/* Custom field dropdown menu */}
      <Menu
        anchorEl={customFieldMenuAnchor}
        open={Boolean(customFieldMenuAnchor)}
        onClose={handleCustomFieldMenuClose}
        PaperProps={{
          sx: {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            minWidth: 160,
          }
        }}
      >
        {selectedCustomFieldName && getDropdownOptions(selectedCustomFieldName).map((option) => (
          <MenuItem
            key={option}
            onClick={() => handleCustomFieldChange(option)}
            sx={{
              fontSize: '13px',
              py: 1,
              '&:hover': {
                bgcolor: 'rgba(102, 126, 234, 0.1)',
              },
            }}
          >
            {option}
          </MenuItem>
        ))}
      </Menu>

      {/* Date Picker Popover */}
      <Popover
        open={Boolean(datePickerAnchor)}
        anchorEl={datePickerAnchor}
        onClose={handleDatePickerClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Select Date"
              value={
                selectedCompanyForDate && selectedDateFieldName
                  ? (() => {
                      // Check if built-in field or custom field
                      const builtInDateFields = ['createdAt', 'updatedAt', 'lastApiCostUpdate', 'archivedAt'];
                      const isBuiltIn = builtInDateFields.includes(selectedDateFieldName);
                      const fieldValue = isBuiltIn
                        ? (selectedCompanyForDate as any)[selectedDateFieldName]
                        : selectedCompanyForDate.customFields?.[selectedDateFieldName];
                      return parseDateValue(fieldValue);
                    })()
                  : null
              }
              onChange={handleDateChange}
              slotProps={{
                textField: {
                  size: 'small',
                  sx: { width: 250 }
                }
              }}
            />
          </LocalizationProvider>
        </Box>
      </Popover>
    </Box>
  );
};
