// src/components/features/companies/WritingProgramTable.tsx
import React, { useState, useMemo } from 'react';
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
  Typography,
  Chip,
  Link,
  Checkbox,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Science as AnalyzeIcon,
} from '@mui/icons-material';
import { Company } from '../../../types/crm';
import { TableColumnConfig } from '../../../types/table';

interface WritingProgramTableProps {
  companies: Array<Company & { leadCount?: number }>;
  onCompanyClick: (company: Company) => void;
  selectedCompanyIds?: string[];
  onSelectCompany?: (companyId: string) => void;
  onSelectAll?: (selected: boolean, pageCompanyIds: string[]) => void;
  onAnalyzeSingle?: (company: Company) => void;
  visibleColumns: TableColumnConfig[];
}

type SortDirection = 'asc' | 'desc';

export const WritingProgramTable: React.FC<WritingProgramTableProps> = ({
  companies,
  onCompanyClick,
  selectedCompanyIds = [],
  onSelectCompany,
  onSelectAll,
  onAnalyzeSingle,
  visibleColumns,
}) => {
  const [orderBy, setOrderBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filter to only visible columns (both default and custom)
  const displayColumns = useMemo(() => {
    return visibleColumns.filter(col => col.visible).sort((a, b) => a.order - b.order);
  }, [visibleColumns]);

  // Helper to check if a column is visible
  const isColumnVisible = (columnId: string) => {
    return displayColumns.some(col => col.id === columnId);
  };

  // Helper to render community program status with color coding
  const renderCommunityProgramStatus = (status: string | undefined) => {
    if (!status || status === '-') {
      return <Typography variant="body2" sx={{ fontSize: '11px' }}>-</Typography>;
    }

    // Color scheme based on importance
    const statusStyles: Record<string, { background?: string; bgcolor?: string; color: string }> = {
      'Inactive': { bgcolor: '#f1f5f9', color: '#94a3b8' },  // Muted gray - de-emphasized
      'Contacted': {  // Bold purple gradient - high priority
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      },
      'Not Yet contacted': { bgcolor: '#fef3c7', color: '#d97706' },  // Amber/Orange - attention needed
      'In Progress': { bgcolor: '#dbeafe', color: '#2563eb' },  // Blue
      'Pending Response': { bgcolor: '#ccfbf1', color: '#0d9488' },  // Teal
      'Follow-up Needed': { bgcolor: '#fef9c3', color: '#ca8a04' },  // Yellow
    };

    const style = statusStyles[status] || { bgcolor: '#e5e7eb', color: '#6b7280' };  // Default gray

    return (
      <Chip
        label={status}
        size="small"
        sx={{
          fontSize: '10px',
          height: '20px',
          fontWeight: status === 'Contacted' ? 600 : 500,
          ...style,
        }}
      />
    );
  };

  // Get visible custom field columns
  const visibleCustomFields = useMemo(() => {
    return displayColumns
      .filter(col => col.type === 'custom' && col.fieldName)
      .map(col => col.fieldName!);
  }, [displayColumns]);

  // Sorting handler
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Sort companies
  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (orderBy) {
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'website':
          aValue = a.website;
          bValue = b.website;
          break;
        case 'hasProgram':
          aValue = a.writingProgramAnalysis?.hasProgram;
          bValue = b.writingProgramAnalysis?.hasProgram;
          break;
        case 'isOpen':
          aValue = a.writingProgramAnalysis?.isOpen;
          bValue = b.writingProgramAnalysis?.isOpen;
          break;
        case 'paymentAmount':
          aValue = a.writingProgramAnalysis?.payment?.amount;
          bValue = b.writingProgramAnalysis?.payment?.amount;
          break;
        case 'publishedDate':
          aValue = a.writingProgramAnalysis?.publishedDate;
          bValue = b.writingProgramAnalysis?.publishedDate;
          break;
        default:
          // Custom field sorting
          aValue = a.customFields?.[orderBy];
          bValue = b.customFields?.[orderBy];
      }

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Date comparison
      if (orderBy === 'createdAt') {
        const aDate = aValue instanceof Date ? aValue.getTime() : (aValue?.seconds ? aValue.seconds * 1000 : new Date(String(aValue)).getTime());
        const bDate = bValue instanceof Date ? bValue.getTime() : (bValue?.seconds ? bValue.seconds * 1000 : new Date(String(bValue)).getTime());
        if (!isNaN(aDate) && !isNaN(bDate) && aDate !== bDate) {
          return order === 'asc' ? aDate - bDate : bDate - aDate;
        }
        // Tie-break by name
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      }

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return order === 'asc' ? comparison : -comparison;
      }

      // Boolean comparison
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return order === 'asc' ? (aValue ? -1 : 1) : (aValue ? 1 : -1);
      }

      return 0;
    });
  }, [companies, orderBy, order]);

  // Paginate companies
  const paginatedCompanies = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedCompanies.slice(start, start + rowsPerPage);
  }, [sortedCompanies, page, rowsPerPage]);

  // Check if all companies on current page are selected
  const allSelected = paginatedCompanies.length > 0 &&
                      paginatedCompanies.every(c => selectedCompanyIds.includes(c.id));
  const someSelected = selectedCompanyIds.length > 0 && !allSelected;

  // Handle select all for current page
  const handleSelectAllClick = () => {
    if (onSelectAll) {
      onSelectAll(!allSelected, paginatedCompanies.map(c => c.id));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TableContainer
        component={Paper}
        sx={{
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: '8px 8px 0 0',
          flex: 1,
          overflow: 'auto',
        }}
      >
        <Table size="small">
          <TableHead
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 100,
              bgcolor: '#fafafa',
            }}
          >
            <TableRow sx={{ bgcolor: '#fafafa', borderBottom: '2px solid #e0e0e0' }}>
              {/* Checkbox column */}
              {onSelectCompany && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={someSelected}
                    checked={allSelected}
                    onChange={handleSelectAllClick}
                    sx={{
                      color: '#667eea',
                      '&.Mui-checked': {
                        color: '#667eea',
                      },
                      '&.MuiCheckbox-indeterminate': {
                        color: '#667eea',
                      },
                    }}
                  />
                </TableCell>
              )}
              {isColumnVisible('createdAt') && (
                <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  <TableSortLabel
                    active={orderBy === 'createdAt'}
                    direction={orderBy === 'createdAt' ? order : 'asc'}
                    onClick={() => handleRequestSort('createdAt')}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
              )}
              {isColumnVisible('company') && (
                <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    Company
                  </TableSortLabel>
                </TableCell>
              )}
              {isColumnVisible('website') && (
                <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  <TableSortLabel
                    active={orderBy === 'website'}
                    direction={orderBy === 'website' ? order : 'asc'}
                    onClick={() => handleRequestSort('website')}
                  >
                    Website
                  </TableSortLabel>
                </TableCell>
              )}
              {isColumnVisible('programFound') && (
                <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  <TableSortLabel
                    active={orderBy === 'hasProgram'}
                    direction={orderBy === 'hasProgram' ? order : 'asc'}
                    onClick={() => handleRequestSort('hasProgram')}
                  >
                    Program Found
                  </TableSortLabel>
                </TableCell>
              )}
              {isColumnVisible('status') && (
                <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  <TableSortLabel
                    active={orderBy === 'isOpen'}
                    direction={orderBy === 'isOpen' ? order : 'asc'}
                    onClick={() => handleRequestSort('isOpen')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
              )}
              {isColumnVisible('payment') && (
                <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  <TableSortLabel
                    active={orderBy === 'paymentAmount'}
                    direction={orderBy === 'paymentAmount' ? order : 'asc'}
                    onClick={() => handleRequestSort('paymentAmount')}
                  >
                    Payment
                  </TableSortLabel>
                </TableCell>
              )}
              {isColumnVisible('paymentMethod') && (
                <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  Payment Method
                </TableCell>
              )}
              {isColumnVisible('programUrl') && (
                <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  Program URL
                </TableCell>
              )}
              {isColumnVisible('contactEmail') && (
                <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  Contact
                </TableCell>
              )}
              {isColumnVisible('publishedDate') && (
                <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  <TableSortLabel
                    active={orderBy === 'publishedDate'}
                    direction={orderBy === 'publishedDate' ? order : 'asc'}
                    onClick={() => handleRequestSort('publishedDate')}
                  >
                    Published
                  </TableSortLabel>
                </TableCell>
              )}
              {visibleCustomFields.map(fieldName => (
                <TableCell
                  key={fieldName}
                  sx={{ fontWeight: 600, fontSize: '12px', color: '#667eea', textTransform: 'uppercase' }}
                >
                  <TableSortLabel
                    active={orderBy === fieldName}
                    direction={orderBy === fieldName ? order : 'asc'}
                    onClick={() => handleRequestSort(fieldName)}
                  >
                    {fieldName.replace(/_/g, ' ')}
                  </TableSortLabel>
                </TableCell>
              ))}
              {onAnalyzeSingle && (
                <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedCompanies.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={displayColumns.length + (onSelectCompany ? 1 : 0) + (onAnalyzeSingle ? 1 : 0)}
                  align="center"
                  sx={{ py: 4 }}
                >
                  <Typography color="text.secondary">
                    No companies found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCompanies.map((company) => (
                <TableRow
                  key={company.id}
                  hover
                  onClick={() => onCompanyClick(company)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f5f5f5' },
                  }}
                >
                  {/* Checkbox */}
                  {onSelectCompany && (
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedCompanyIds.includes(company.id)}
                        onChange={() => onSelectCompany(company.id)}
                        sx={{
                          color: '#667eea',
                          '&.Mui-checked': {
                            color: '#667eea',
                          },
                        }}
                      />
                    </TableCell>
                  )}

                  {/* Created Date */}
                  {isColumnVisible('createdAt') && (
                    <TableCell>
                      <Chip
                        label={
                          company.createdAt
                            ? (company.createdAt instanceof Date
                                ? company.createdAt
                                : (company.createdAt as any)?.toDate
                                  ? (company.createdAt as any).toDate()
                                  : new Date(company.createdAt)
                              ).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '-'
                        }
                        size="small"
                        sx={{
                          fontSize: '10px',
                          height: '22px',
                          bgcolor: '#e8eaf6',
                          color: '#3949ab',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                  )}

                  {/* Company Name */}
                  {isColumnVisible('company') && (
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 600 }}>
                        {company.name}
                      </Typography>
                    </TableCell>
                  )}

                  {/* Website */}
                  {isColumnVisible('website') && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {company.website ? (
                        <Link
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ fontSize: '11px', color: '#667eea' }}
                        >
                          {company.website.replace(/^https?:\/\//, '')}
                        </Link>
                      ) : (
                        <Typography variant="body2" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                  )}

                  {/* Program Found */}
                  {isColumnVisible('programFound') && (
                    <TableCell>
                      {company.writingProgramAnalysis?.hasProgram === true ? (
                        <Chip
                          icon={<CheckIcon sx={{ fontSize: '14px' }} />}
                          label="Yes"
                          size="small"
                          sx={{
                            bgcolor: '#dcfce7',
                            color: '#16a34a',
                            fontSize: '10px',
                            height: '20px',
                          }}
                        />
                      ) : company.writingProgramAnalysis?.hasProgram === false && company.writingProgramAnalysis?.lastSearchedAt ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.3 }}>
                          <Chip
                            icon={<CancelIcon sx={{ fontSize: '14px' }} />}
                            label="Not Found"
                            size="small"
                            sx={{
                              bgcolor: '#fef3c7',
                              color: '#d97706',
                              fontSize: '10px',
                              height: '20px',
                            }}
                          />
                          <Typography variant="caption" sx={{ fontSize: '9px', color: '#94a3b8', ml: 0.5 }}>
                            {(() => {
                              const d = company.writingProgramAnalysis.lastSearchedAt;
                              const date = d instanceof Date ? d : (d as any)?.toDate ? (d as any).toDate() : new Date(d);
                              return `Searched ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                            })()}
                          </Typography>
                        </Box>
                      ) : company.writingProgramAnalysis?.hasProgram === false ? (
                        <Chip
                          icon={<CancelIcon sx={{ fontSize: '14px' }} />}
                          label="No"
                          size="small"
                          sx={{
                            bgcolor: '#fee2e2',
                            color: '#dc2626',
                            fontSize: '10px',
                            height: '20px',
                          }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                  )}

                  {/* Program Status (Open/Closed) */}
                  {isColumnVisible('status') && (
                    <TableCell>
                      {company.writingProgramAnalysis?.isOpen === true ? (
                        <Chip
                          label="Open"
                          size="small"
                          sx={{
                            bgcolor: '#dcfce7',
                            color: '#16a34a',
                            fontSize: '10px',
                            height: '20px',
                          }}
                        />
                      ) : company.writingProgramAnalysis?.isOpen === false ? (
                        <Chip
                          label="Closed"
                          size="small"
                          sx={{
                            bgcolor: '#fee2e2',
                            color: '#dc2626',
                            fontSize: '10px',
                            height: '20px',
                          }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                  )}

                  {/* Payment Amount */}
                  {isColumnVisible('payment') && (
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '11px' }}>
                        {company.writingProgramAnalysis?.payment?.amount || '-'}
                      </Typography>
                    </TableCell>
                  )}

                  {/* Payment Method */}
                  {isColumnVisible('paymentMethod') && (
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '11px' }}>
                        {company.writingProgramAnalysis?.payment?.method || '-'}
                      </Typography>
                    </TableCell>
                  )}

                  {/* Program URL */}
                  {isColumnVisible('programUrl') && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {company.writingProgramAnalysis?.programUrl ? (
                        <Link
                          href={company.writingProgramAnalysis.programUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ fontSize: '11px', color: '#667eea' }}
                        >
                          View
                        </Link>
                      ) : (
                        <Typography variant="body2" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                  )}

                  {/* Contact Email */}
                  {isColumnVisible('contactEmail') && (
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '11px' }}>
                        {company.writingProgramAnalysis?.contactEmail || '-'}
                      </Typography>
                    </TableCell>
                  )}

                  {isColumnVisible('publishedDate') && (
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '11px' }}>
                        {company.writingProgramAnalysis?.publishedDate || '-'}
                      </Typography>
                    </TableCell>
                  )}

                  {/* Dynamic Custom Fields */}
                  {visibleCustomFields.map(fieldName => (
                    <TableCell key={fieldName}>
                      {fieldName === 'community_program_status' ? (
                        renderCommunityProgramStatus(company.customFields?.[fieldName])
                      ) : (
                        <Typography variant="body2" sx={{ fontSize: '11px' }}>
                          {company.customFields?.[fieldName] || '-'}
                        </Typography>
                      )}
                    </TableCell>
                  ))}

                  {/* Actions Column */}
                  {onAnalyzeSingle && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {!company.writingProgramAnalysis?.hasProgram ? (
                        <Tooltip title="Analyze writing program">
                          <IconButton
                            size="small"
                            onClick={() => onAnalyzeSingle(company)}
                            sx={{
                              color: '#667eea',
                              '&:hover': {
                                bgcolor: 'rgba(102, 126, 234, 0.08)',
                              },
                            }}
                          >
                            <AnalyzeIcon sx={{ fontSize: '18px' }} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" sx={{ fontSize: '11px', color: 'text.secondary' }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component={Paper}
        count={sortedCompanies.length}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Companies per page:"
        sx={{
          borderTop: '1px solid #e2e8f0',
          bgcolor: '#fafafa',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          '.MuiTablePagination-toolbar': {
            pr: 20, // Prevent FAB from overlapping next-page button
          },
          '.MuiTablePagination-actions': {
            mr: 4,
          },
        }}
      />
    </Box>
  );
};
