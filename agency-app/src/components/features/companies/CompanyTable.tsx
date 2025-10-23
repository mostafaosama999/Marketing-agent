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
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  Business as BusinessIcon,
  ArrowBack as ArrowLeftIcon,
  ArrowForward as ArrowRightIcon,
} from '@mui/icons-material';
import { Company } from '../../../types/crm';
import { TableColumnConfig } from '../../../types/table';

interface CompanyTableProps {
  companies: Array<Company & { leadCount: number }>;
  onView: (company: Company) => void;
  visibleColumns: TableColumnConfig[];
  onMoveColumnLeft: (columnId: string) => void;
  onMoveColumnRight: (columnId: string) => void;
  selectedCompanyIds?: string[];
  onSelectCompany?: (companyId: string) => void;
  onSelectAll?: (selected: boolean) => void;
}

type SortDirection = 'asc' | 'desc';

export const CompanyTable: React.FC<CompanyTableProps> = ({
  companies,
  onView,
  visibleColumns,
  onMoveColumnLeft,
  onMoveColumnRight,
  selectedCompanyIds = [],
  onSelectCompany,
  onSelectAll,
}) => {
  // Filter to only show visible columns
  const displayColumns = visibleColumns.filter(col => col.visible);

  const [orderBy, setOrderBy] = useState<string>('name');
  const [order, setOrder] = useState<SortDirection>('asc');

  // Pagination state
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem('companies_table_page');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const saved = localStorage.getItem('companies_table_rows_per_page');
    return saved ? parseInt(saved, 10) : 25;
  });

  // Sorting handler
  const handleRequestSort = (fieldId: string) => {
    const isAsc = orderBy === fieldId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(fieldId);
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
        return (
          <TableCell key={columnId}>
            <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
              {date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Typography>
          </TableCell>
        );
      }

      default:
        // Check if this is a custom field column
        const column = displayColumns.find(col => col.id === columnId);
        if (column && column.type === 'custom' && column.fieldName) {
          const value = company.customFields?.[column.fieldName];

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
          maxHeight: 'calc(100vh - 320px)',
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
              {displayColumns.map((column, index) => (
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: column.id === 'leadCount' ? 'center' : 'flex-start' }}>
                    {/* Left arrow button */}
                    <IconButton
                      size="small"
                      onClick={() => onMoveColumnLeft(column.id)}
                      disabled={index === 0}
                      sx={{
                        p: 0.25,
                        color: '#667eea',
                        '&:hover': {
                          bgcolor: 'rgba(102, 126, 234, 0.1)',
                        },
                        '&.Mui-disabled': {
                          color: '#cbd5e1',
                        },
                      }}
                    >
                      <ArrowLeftIcon fontSize="small" sx={{ fontSize: '14px' }} />
                    </IconButton>

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

                    {/* Right arrow button */}
                    <IconButton
                      size="small"
                      onClick={() => onMoveColumnRight(column.id)}
                      disabled={index === displayColumns.length - 1}
                      sx={{
                        p: 0.25,
                        color: '#667eea',
                        '&:hover': {
                          bgcolor: 'rgba(102, 126, 234, 0.1)',
                        },
                        '&.Mui-disabled': {
                          color: '#cbd5e1',
                        },
                      }}
                    >
                      <ArrowRightIcon fontSize="small" sx={{ fontSize: '14px' }} />
                    </IconButton>
                  </Box>
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
          '.MuiTablePagination-toolbar': {
            px: 2,
          },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            fontSize: '13px',
            color: '#64748b',
          },
        }}
      />
    </Box>
  );
};
