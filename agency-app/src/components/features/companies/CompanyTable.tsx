// src/components/features/companies/CompanyTable.tsx
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
  Paper,
  IconButton,
  Typography,
  Chip,
  Link,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { Company } from '../../../types/crm';

interface CompanyTableProps {
  companies: Array<Company & { leadCount: number }>;
  onEdit: (company: Company) => void;
  onDelete: (company: Company & { leadCount: number }) => void;
}

type SortDirection = 'asc' | 'desc';
type SortableField = 'name' | 'website' | 'industry' | 'leadCount';

export const CompanyTable: React.FC<CompanyTableProps> = ({
  companies,
  onEdit,
  onDelete,
}) => {
  const [orderBy, setOrderBy] = useState<SortableField>('name');
  const [order, setOrder] = useState<SortDirection>('asc');

  const handleRequestSort = (property: SortableField) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      let aValue: any = a[orderBy];
      let bValue: any = b[orderBy];

      // Handle null/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // Handle string comparison
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (aValue < bValue) {
        return order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [companies, orderBy, order]);

  const getIndustryColor = (industry?: string): string => {
    if (!industry) return '#94a3b8';

    const colors: Record<string, string> = {
      technology: '#3b82f6',
      healthcare: '#10b981',
      finance: '#f59e0b',
      education: '#8b5cf6',
      retail: '#ec4899',
      manufacturing: '#64748b',
      default: '#94a3b8',
    };

    const key = industry.toLowerCase();
    for (const [k, v] of Object.entries(colors)) {
      if (key.includes(k)) return v;
    }

    return colors.default;
  };

  return (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'name'}
                direction={orderBy === 'name' ? order : 'asc'}
                onClick={() => handleRequestSort('name')}
              >
                <Typography variant="body2" fontWeight={700}>
                  Company Name
                </Typography>
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'website'}
                direction={orderBy === 'website' ? order : 'asc'}
                onClick={() => handleRequestSort('website')}
              >
                <Typography variant="body2" fontWeight={700}>
                  Website
                </Typography>
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={orderBy === 'industry'}
                direction={orderBy === 'industry' ? order : 'asc'}
                onClick={() => handleRequestSort('industry')}
              >
                <Typography variant="body2" fontWeight={700}>
                  Industry
                </Typography>
              </TableSortLabel>
            </TableCell>
            <TableCell align="center">
              <TableSortLabel
                active={orderBy === 'leadCount'}
                direction={orderBy === 'leadCount' ? order : 'asc'}
                onClick={() => handleRequestSort('leadCount')}
              >
                <Typography variant="body2" fontWeight={700}>
                  Leads
                </Typography>
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2" fontWeight={700}>
                Actions
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedCompanies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
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
            sortedCompanies.map((company) => (
              <TableRow
                key={company.id}
                hover
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(102, 126, 234, 0.04)',
                  },
                }}
                onClick={() => onEdit(company)}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 600,
                      }}
                    >
                      {company.name.charAt(0).toUpperCase()}
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {company.name}
                      </Typography>
                      {company.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {company.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  {company.website ? (
                    <Link
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        textDecoration: 'none',
                        color: '#667eea',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      <Typography variant="body2">
                        {company.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </Typography>
                      <OpenInNewIcon sx={{ fontSize: 14 }} />
                    </Link>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {company.industry ? (
                    <Chip
                      label={company.industry}
                      size="small"
                      sx={{
                        bgcolor: `${getIndustryColor(company.industry)}22`,
                        color: getIndustryColor(company.industry),
                        fontWeight: 500,
                        borderRadius: 2,
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={company.leadCount}
                    size="small"
                    sx={{
                      bgcolor: company.leadCount > 0 ? '#dcfce722' : '#f1f5f9',
                      color: company.leadCount > 0 ? '#10b981' : '#64748b',
                      fontWeight: 600,
                      minWidth: 40,
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(company);
                    }}
                    sx={{
                      color: '#667eea',
                      '&:hover': {
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                      },
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(company);
                    }}
                    sx={{
                      color: '#ef4444',
                      '&:hover': {
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      },
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
  );
};
