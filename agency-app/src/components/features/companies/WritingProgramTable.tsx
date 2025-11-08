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

interface WritingProgramTableProps {
  companies: Array<Company & { leadCount?: number }>;
  onCompanyClick: (company: Company) => void;
  selectedCompanyIds?: string[];
  onSelectCompany?: (companyId: string) => void;
  onSelectAll?: (selected: boolean) => void;
  onAnalyzeSingle?: (company: Company) => void;
}

type SortDirection = 'asc' | 'desc';

export const WritingProgramTable: React.FC<WritingProgramTableProps> = ({
  companies,
  onCompanyClick,
  selectedCompanyIds = [],
  onSelectCompany,
  onSelectAll,
  onAnalyzeSingle,
}) => {
  const [orderBy, setOrderBy] = useState<string>('name');
  const [order, setOrder] = useState<SortDirection>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filter companies that have writing program analysis or relevant custom fields
  const companiesWithProgramData = useMemo(() => {
    return companies.filter(company => {
      // Has writing program analysis
      if (company.writingProgramAnalysis) {
        return true;
      }

      // Has custom fields with relevant keywords
      if (company.customFields) {
        const hasRelevantFields = Object.keys(company.customFields).some(fieldName =>
          /community|writing|program/i.test(fieldName)
        );
        if (hasRelevantFields) {
          return true;
        }
      }

      return false;
    });
  }, [companies]);

  // Get all custom field names that match the keywords
  const programRelatedCustomFields = useMemo(() => {
    const fields = new Set<string>();
    companiesWithProgramData.forEach(company => {
      if (company.customFields) {
        Object.keys(company.customFields).forEach(fieldName => {
          if (/community|writing|program/i.test(fieldName)) {
            fields.add(fieldName);
          }
        });
      }
    });
    return Array.from(fields).sort();
  }, [companiesWithProgramData]);

  // Sorting handler
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Sort companies
  const sortedCompanies = useMemo(() => {
    return [...companiesWithProgramData].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (orderBy) {
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
        default:
          // Custom field sorting
          aValue = a.customFields?.[orderBy];
          bValue = b.customFields?.[orderBy];
      }

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

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
  }, [companiesWithProgramData, orderBy, order]);

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
      onSelectAll(!allSelected);
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
              <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                >
                  Company
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                <TableSortLabel
                  active={orderBy === 'website'}
                  direction={orderBy === 'website' ? order : 'asc'}
                  onClick={() => handleRequestSort('website')}
                >
                  Website
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                <TableSortLabel
                  active={orderBy === 'hasProgram'}
                  direction={orderBy === 'hasProgram' ? order : 'asc'}
                  onClick={() => handleRequestSort('hasProgram')}
                >
                  Program Found
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                <TableSortLabel
                  active={orderBy === 'isOpen'}
                  direction={orderBy === 'isOpen' ? order : 'asc'}
                  onClick={() => handleRequestSort('isOpen')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                <TableSortLabel
                  active={orderBy === 'paymentAmount'}
                  direction={orderBy === 'paymentAmount' ? order : 'asc'}
                  onClick={() => handleRequestSort('paymentAmount')}
                >
                  Payment
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                Payment Method
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                Program URL
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                Contact
              </TableCell>
              {programRelatedCustomFields.map(fieldName => (
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
                  colSpan={8 + programRelatedCustomFields.length + (onSelectCompany ? 1 : 0) + (onAnalyzeSingle ? 1 : 0)}
                  align="center"
                  sx={{ py: 4 }}
                >
                  <Typography color="text.secondary">
                    No companies with writing program data found
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

                  {/* Company Name */}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 600 }}>
                      {company.name}
                    </Typography>
                  </TableCell>

                  {/* Website */}
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

                  {/* Program Found */}
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

                  {/* Program Status (Open/Closed) */}
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

                  {/* Payment Amount */}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '11px' }}>
                      {company.writingProgramAnalysis?.payment?.amount || '-'}
                    </Typography>
                  </TableCell>

                  {/* Payment Method */}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '11px' }}>
                      {company.writingProgramAnalysis?.payment?.method || '-'}
                    </Typography>
                  </TableCell>

                  {/* Program URL */}
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

                  {/* Contact Email */}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '11px' }}>
                      {company.writingProgramAnalysis?.contactEmail || '-'}
                    </Typography>
                  </TableCell>

                  {/* Dynamic Custom Fields */}
                  {programRelatedCustomFields.map(fieldName => (
                    <TableCell key={fieldName}>
                      <Typography variant="body2" sx={{ fontSize: '11px' }}>
                        {company.customFields?.[fieldName] || '-'}
                      </Typography>
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
        }}
      />
    </Box>
  );
};
