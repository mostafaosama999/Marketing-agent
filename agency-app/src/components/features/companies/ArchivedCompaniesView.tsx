// src/components/features/companies/ArchivedCompaniesView.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Button,
  CircularProgress,
  Tooltip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  Menu,
  Checkbox,
  ListItemText,
} from '@mui/material';
import {
  Close as CloseIcon,
  Unarchive as UnarchiveIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ViewColumn as ViewColumnIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase/firestore';
import { Company, LeadStatus } from '../../../types/crm';
import { subscribeToArchivedCompanies } from '../../../services/api/companies';
import { FilterRule } from '../../../types/filter';
import { AdvancedFiltersModal } from '../crm/filters/AdvancedFiltersModal';
import { applyCompanyAdvancedFilters } from '../../../services/api/companyFilterService';

// Pipeline status labels for display
const STATUS_LABELS: Record<LeadStatus, string> = {
  new_lead: 'New Lead',
  qualified: 'Qualified',
  contacted: 'Contacted',
  follow_up: 'Follow Up',
  nurture: 'Nurture',
  won: 'Won',
  lost: 'Lost',
  previous_client: 'Previous Client',
  existing_client: 'Existing Client',
};

// Column definitions
interface ColumnDef {
  id: string;
  label: string;
  minWidth?: number;
}

const ALL_COLUMNS: ColumnDef[] = [
  { id: 'name', label: 'Name', minWidth: 150 },
  { id: 'website', label: 'Website', minWidth: 120 },
  { id: 'industry', label: 'Industry', minWidth: 120 },
  { id: 'status', label: 'Status', minWidth: 100 },
  { id: 'leadCount', label: 'Lead Count', minWidth: 80 },
  { id: 'archivedAt', label: 'Archived Date', minWidth: 110 },
  { id: 'archivedBy', label: 'Archived By', minWidth: 100 },
  { id: 'archiveReason', label: 'Reason', minWidth: 150 },
  { id: 'actions', label: 'Actions', minWidth: 80 },
];

const DEFAULT_VISIBLE_COLUMNS = ['name', 'website', 'industry', 'leadCount', 'archivedAt', 'archivedBy', 'archiveReason', 'actions'];
const STORAGE_KEY = 'archived_companies_columns';

interface ArchivedCompaniesViewProps {
  onClose: () => void;
  onCompanyClick: (company: Company) => void;
  onUnarchive: (companyId: string) => Promise<void>;
  leadCounts?: Map<string, number>;
}

export const ArchivedCompaniesView: React.FC<ArchivedCompaniesViewProps> = ({
  onClose,
  onCompanyClick,
  onUnarchive,
  leadCounts = new Map(),
}) => {
  // Core data state
  const [archivedCompanies, setArchivedCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDisplayNames, setUserDisplayNames] = useState<Map<string, string>>(new Map());

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [advancedFilterRules, setAdvancedFilterRules] = useState<FilterRule[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_VISIBLE_COLUMNS;
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });
  const [columnsMenuAnchor, setColumnsMenuAnchor] = useState<null | HTMLElement>(null);

  // Subscribe to archived companies
  useEffect(() => {
    const unsubscribe = subscribeToArchivedCompanies((companies) => {
      setArchivedCompanies(companies);
      setLoading(false);

      // Fetch user display names for all archivedBy users
      const fetchUserNames = async () => {
        const userIdSet = new Set(companies
          .map(c => c.archivedBy)
          .filter(Boolean));
        const uniqueUserIds = Array.from(userIdSet) as string[];

        const names = new Map<string, string>();
        await Promise.all(
          uniqueUserIds.map(async (userId) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                names.set(userId, userData.displayName || userData.email || 'Unknown User');
              } else {
                names.set(userId, 'Unknown User');
              }
            } catch (error) {
              console.error(`Error fetching user ${userId}:`, error);
              names.set(userId, 'Unknown User');
            }
          })
        );
        setUserDisplayNames(names);
      };

      if (companies.length > 0) {
        fetchUserNames();
      }
    });

    return () => unsubscribe();
  }, []);

  // Save column visibility to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
    } catch (error) {
      console.error('Error saving column visibility:', error);
    }
  }, [visibleColumns]);

  // Extract unique industries for filter dropdown
  const uniqueIndustries = useMemo(() => {
    return Array.from(new Set(archivedCompanies.map(c => c.industry).filter(Boolean) as string[])).sort();
  }, [archivedCompanies]);

  // Full-text search and filtering logic
  const filteredCompanies = useMemo(() => {
    let filtered = [...archivedCompanies];

    // Apply full-text search (all fields including custom fields & enrichment)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(company => {
        // Core fields
        if (company.name?.toLowerCase().includes(term)) return true;
        if (company.industry?.toLowerCase().includes(term)) return true;
        if (company.website?.toLowerCase().includes(term)) return true;
        if (company.description?.toLowerCase().includes(term)) return true;

        // Archive fields
        if (company.archiveReason?.toLowerCase().includes(term)) return true;
        if (company.archivedBy) {
          const userName = userDisplayNames.get(company.archivedBy);
          if (userName?.toLowerCase().includes(term)) return true;
        }

        // Custom fields
        if (company.customFields) {
          const customValues = Object.values(company.customFields)
            .filter(v => v !== null && v !== undefined)
            .map(v => String(v).toLowerCase())
            .join(' ');
          if (customValues.includes(term)) return true;
        }

        // Apollo enrichment fields
        if (company.apolloEnrichment) {
          const apollo = company.apolloEnrichment;
          if (apollo.technologies?.some(t => t.toLowerCase().includes(term))) return true;
          if (apollo.industries?.some(i => i.toLowerCase().includes(term))) return true;
          if (apollo.employeeRange?.toLowerCase().includes(term)) return true;
        }

        return false;
      });
    }

    // Apply industry filter
    if (industryFilter) {
      filtered = filtered.filter(c => c.industry === industryFilter);
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Apply advanced filters
    if (advancedFilterRules.length > 0) {
      filtered = applyCompanyAdvancedFilters(filtered, advancedFilterRules);
    }

    return filtered;
  }, [archivedCompanies, searchTerm, industryFilter, statusFilter, advancedFilterRules, userDisplayNames]);

  // Count of active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (industryFilter) count++;
    if (statusFilter) count++;
    count += advancedFilterRules.length;
    return count;
  }, [searchTerm, industryFilter, statusFilter, advancedFilterRules]);

  // Clear all filters
  const handleClearAllFilters = useCallback(() => {
    setSearchTerm('');
    setIndustryFilter('');
    setStatusFilter('');
    setAdvancedFilterRules([]);
  }, []);

  // Column visibility handlers
  const handleColumnsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setColumnsMenuAnchor(event.currentTarget);
  };

  const handleColumnsMenuClose = () => {
    setColumnsMenuAnchor(null);
  };

  const handleColumnToggle = (columnId: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnId)) {
        // Don't allow hiding all columns - keep at least name and actions
        if (prev.length <= 2 && (columnId === 'name' || columnId === 'actions')) {
          return prev;
        }
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleUnarchive = async (e: React.MouseEvent, companyId: string) => {
    e.stopPropagation();
    if (window.confirm('Restore this company to the active list?')) {
      try {
        await onUnarchive(companyId);
      } catch (error) {
        console.error('Error unarchiving company:', error);
        alert('Failed to unarchive company. Please try again.');
      }
    }
  };

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: 'calc(100vh - 48px)',
        display: 'flex',
        flexDirection: 'column',
        p: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                fontWeight: 700,
                mb: 1,
              }}
            >
              Archived Companies
            </Typography>
            <Typography variant="subtitle1" sx={{ color: '#64748b', fontWeight: 400 }}>
              {activeFilterCount > 0 ? (
                <>{filteredCompanies.length} of {archivedCompanies.length} archived companies</>
              ) : (
                <>{archivedCompanies.length} archived {archivedCompanies.length === 1 ? 'company' : 'companies'}</>
              )}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<CloseIcon />}
            onClick={onClose}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#667eea',
              color: '#667eea',
              '&:hover': {
                borderColor: '#5568d3',
                bgcolor: 'rgba(102, 126, 234, 0.08)',
              },
            }}
          >
            Back to Companies
          </Button>
        </Box>

        {/* Filter Toolbar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mt: 3,
            flexWrap: 'wrap',
          }}
        >
          {/* Search Input */}
          <TextField
            placeholder="Search archived companies..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              minWidth: 280,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white',
                borderRadius: '8px',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#667eea',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#667eea',
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94a3b8' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Industry Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel sx={{ bgcolor: 'white', px: 0.5 }}>Industry</InputLabel>
            <Select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              label="Industry"
              sx={{
                bgcolor: 'white',
                borderRadius: '8px',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#667eea',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#667eea',
                },
              }}
            >
              <MenuItem value="">All Industries</MenuItem>
              {uniqueIndustries.map((industry) => (
                <MenuItem key={industry} value={industry}>
                  {industry}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ bgcolor: 'white', px: 0.5 }}>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | '')}
              label="Status"
              sx={{
                bgcolor: 'white',
                borderRadius: '8px',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#667eea',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#667eea',
                },
              }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Advanced Filters Button */}
          <Badge
            badgeContent={advancedFilterRules.length}
            color="primary"
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: '#667eea',
              },
            }}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterListIcon />}
              onClick={() => setShowAdvancedFilters(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderColor: advancedFilterRules.length > 0 ? '#667eea' : '#e2e8f0',
                color: advancedFilterRules.length > 0 ? '#667eea' : '#64748b',
                bgcolor: 'white',
                borderRadius: '8px',
                '&:hover': {
                  borderColor: '#667eea',
                  bgcolor: 'rgba(102, 126, 234, 0.04)',
                },
              }}
            >
              Filters
            </Button>
          </Badge>

          {/* Columns Button */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<ViewColumnIcon />}
            onClick={handleColumnsMenuOpen}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#e2e8f0',
              color: '#64748b',
              bgcolor: 'white',
              borderRadius: '8px',
              '&:hover': {
                borderColor: '#667eea',
                bgcolor: 'rgba(102, 126, 234, 0.04)',
              },
            }}
          >
            Columns ({visibleColumns.length}/{ALL_COLUMNS.length})
          </Button>

          {/* Columns Menu */}
          <Menu
            anchorEl={columnsMenuAnchor}
            open={Boolean(columnsMenuAnchor)}
            onClose={handleColumnsMenuClose}
            PaperProps={{
              sx: {
                minWidth: 200,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
              },
            }}
          >
            {ALL_COLUMNS.map((column) => (
              <MenuItem
                key={column.id}
                onClick={() => handleColumnToggle(column.id)}
                dense
              >
                <Checkbox
                  checked={visibleColumns.includes(column.id)}
                  size="small"
                  sx={{
                    color: '#94a3b8',
                    '&.Mui-checked': {
                      color: '#667eea',
                    },
                  }}
                />
                <ListItemText primary={column.label} />
              </MenuItem>
            ))}
          </Menu>

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearAllFilters}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: '#ef4444',
                '&:hover': {
                  bgcolor: 'rgba(239, 68, 68, 0.08)',
                },
              }}
            >
              Clear ({activeFilterCount})
            </Button>
          )}
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#667eea' }} />
          </Box>
        ) : archivedCompanies.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Archived Companies
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Archived companies will appear here
            </Typography>
          </Box>
        ) : filteredCompanies.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Results Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No archived companies match your current filters
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearAllFilters}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderColor: '#667eea',
                color: '#667eea',
              }}
            >
              Clear Filters
            </Button>
          </Box>
        ) : (
          <TableContainer sx={{ flex: 1 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {ALL_COLUMNS.filter(col => visibleColumns.includes(col.id)).map((column) => (
                    <TableCell
                      key={column.id}
                      sx={{
                        fontWeight: 600,
                        bgcolor: '#f8fafc',
                        minWidth: column.minWidth,
                        textAlign: column.id === 'leadCount' || column.id === 'actions' ? 'center' : 'left',
                      }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow
                    key={company.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'rgba(102, 126, 234, 0.04)',
                      },
                    }}
                  >
                    {/* Name Column */}
                    {visibleColumns.includes('name') && (
                      <TableCell onClick={() => onCompanyClick(company)}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {company.name}
                        </Typography>
                      </TableCell>
                    )}

                    {/* Website Column */}
                    {visibleColumns.includes('website') && (
                      <TableCell onClick={() => onCompanyClick(company)}>
                        <Typography variant="body2" color="text.secondary">
                          {company.website || '-'}
                        </Typography>
                      </TableCell>
                    )}

                    {/* Industry Column */}
                    {visibleColumns.includes('industry') && (
                      <TableCell onClick={() => onCompanyClick(company)}>
                        <Typography variant="body2" color="text.secondary">
                          {company.industry || '-'}
                        </Typography>
                      </TableCell>
                    )}

                    {/* Status Column */}
                    {visibleColumns.includes('status') && (
                      <TableCell onClick={() => onCompanyClick(company)}>
                        {company.status ? (
                          <Chip
                            label={STATUS_LABELS[company.status] || company.status}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(102, 126, 234, 0.1)',
                              color: '#667eea',
                              fontWeight: 500,
                              fontSize: '11px',
                            }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                    )}

                    {/* Lead Count Column */}
                    {visibleColumns.includes('leadCount') && (
                      <TableCell onClick={() => onCompanyClick(company)} sx={{ textAlign: 'center' }}>
                        <Chip
                          label={leadCounts.get(company.id) || 0}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(102, 126, 234, 0.1)',
                            color: '#667eea',
                            fontWeight: 500,
                            minWidth: 40,
                          }}
                        />
                      </TableCell>
                    )}

                    {/* Archived Date Column */}
                    {visibleColumns.includes('archivedAt') && (
                      <TableCell onClick={() => onCompanyClick(company)}>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(company.archivedAt)}
                        </Typography>
                      </TableCell>
                    )}

                    {/* Archived By Column */}
                    {visibleColumns.includes('archivedBy') && (
                      <TableCell onClick={() => onCompanyClick(company)}>
                        <Typography variant="body2" color="text.secondary">
                          {company.archivedBy ? userDisplayNames.get(company.archivedBy) || 'Loading...' : '-'}
                        </Typography>
                      </TableCell>
                    )}

                    {/* Reason Column */}
                    {visibleColumns.includes('archiveReason') && (
                      <TableCell onClick={() => onCompanyClick(company)}>
                        {company.archiveReason ? (
                          <Tooltip title={company.archiveReason} arrow>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {company.archiveReason}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                    )}

                    {/* Actions Column */}
                    {visibleColumns.includes('actions') && (
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Tooltip title="Unarchive">
                          <IconButton
                            size="small"
                            onClick={(e) => handleUnarchive(e, company.id)}
                            sx={{
                              color: '#f59e0b',
                              '&:hover': {
                                bgcolor: 'rgba(245, 158, 11, 0.08)',
                              },
                            }}
                          >
                            <UnarchiveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => onCompanyClick(company)}
                            sx={{
                              color: '#667eea',
                              '&:hover': {
                                bgcolor: 'rgba(102, 126, 234, 0.08)',
                              },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Advanced Filters Modal */}
      <AdvancedFiltersModal
        open={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApplyFilters={setAdvancedFilterRules}
        onClearFilters={() => setAdvancedFilterRules([])}
        data={archivedCompanies}
        entityType="company"
        initialRules={advancedFilterRules}
      />
    </Box>
  );
};
