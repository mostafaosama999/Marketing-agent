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
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  Business as BusinessIcon,
  AutoAwesome as AutoAwesomeIcon,
  CompareArrows as CompareArrowsIcon,
  Lightbulb as OfferIcon,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Company } from '../../../types/crm';
import { TableColumnConfig } from '../../../types/table';
import { FieldDefinition } from '../../../types/fieldDefinitions';
import { getFieldDefinitions, ensureCompanyLabelsFieldDefinition } from '../../../services/api/fieldDefinitionsService';
import { DropdownMenuWithAdd } from '../crm/DropdownMenuWithAdd';
import { updateCompanyCustomField, updateCompanyField, updateCompany, setCompanyStatusManually, unlockCompanyStatus, updateCompanyLabels } from '../../../services/api/companies';
import { bulkFindWritingPrograms, bulkAnalyzeWritingPrograms } from '../../../services/api/bulkWritingProgramService';
import { analyzeCompanyWebsite, generateOfferIdeas } from '../../../services/firebase/cloudFunctions';
import { useAuth } from '../../../contexts/AuthContext';
import { CompanyStatusBadge } from './CompanyStatusBadge';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase/firestore';
import { LeadStatus } from '../../../types/lead';

interface CompanyTableProps {
  companies: Array<Company & { leadCount: number }>;
  onView: (company: Company) => void;
  visibleColumns: TableColumnConfig[];
  selectedCompanyIds?: string[];
  onSelectCompany?: (companyId: string) => void;
  onSelectAll?: (selected: boolean) => void;
  onFindCompetitors?: (company: Company) => void;
}

type SortDirection = 'asc' | 'desc';

export const CompanyTable: React.FC<CompanyTableProps> = ({
  companies,
  onView,
  visibleColumns,
  selectedCompanyIds = [],
  onSelectCompany,
  onSelectAll,
  onFindCompetitors,
}) => {
  // Get current user for tracking updates
  const { userProfile } = useAuth();

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

  // Rating V2 inline edit state
  const [ratingMenuAnchor, setRatingMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedCompanyForRating, setSelectedCompanyForRating] = useState<Company | null>(null);

  // Status inline edit state
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedCompanyForStatus, setSelectedCompanyForStatus] = useState<Company | null>(null);

  // Labels inline edit state
  const [labelsMenuAnchor, setLabelsMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedCompanyForLabels, setSelectedCompanyForLabels] = useState<Company | null>(null);

  // Pagination state
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem('companies_table_page');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const saved = localStorage.getItem('companies_table_rows_per_page');
    return saved ? parseInt(saved, 10) : 25;
  });

  // Writing program analysis state
  const [analyzingCompanies, setAnalyzingCompanies] = useState<Set<string>>(new Set());
  // Offer generation state (async)
  const [generatingOffers, setGeneratingOffers] = useState<Set<string>>(new Set());
  const [urlSelectionDialog, setUrlSelectionDialog] = useState<{
    open: boolean;
    companyId: string;
    companyName: string;
    urls: string[];
  } | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  // Rating user display names (first letter only)
  const [ratingUserNames, setRatingUserNames] = useState<Map<string, string>>(new Map());

  // Fetch all field definitions (dropdowns, dates, etc.)
  const fetchFieldDefinitions = async () => {
    try {
      // Ensure the labels field definition exists
      await ensureCompanyLabelsFieldDefinition();
      const definitions = await getFieldDefinitions('company');
      setFieldDefinitions(definitions);
    } catch (error) {
      console.error('Error fetching field definitions:', error);
    }
  };

  // Fetch field definitions on mount
  useEffect(() => {
    fetchFieldDefinitions();
  }, []);

  // Fetch user display names for rating authors
  useEffect(() => {
    const fetchRatingUserNames = async () => {
      const userIdSet = new Set(
        companies
          .map(c => c.ratingV2UpdatedBy)
          .filter(Boolean)
      );
      const uniqueUserIds = Array.from(userIdSet) as string[];

      if (uniqueUserIds.length === 0) return;

      const names = new Map<string, string>();
      await Promise.all(
        uniqueUserIds.map(async (userId) => {
          // Skip if we already have this user's name
          if (ratingUserNames.has(userId)) {
            names.set(userId, ratingUserNames.get(userId)!);
            return;
          }
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const displayName = userData.displayName || userData.email || '';
              names.set(userId, displayName);
            } else {
              names.set(userId, '');
            }
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            names.set(userId, '');
          }
        })
      );
      setRatingUserNames(prev => {
        const merged = new Map(prev);
        names.forEach((value, key) => merged.set(key, value));
        return merged;
      });
    };

    fetchRatingUserNames();
  }, [companies]);

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

  // Rating V2 inline edit handlers
  const handleRatingClick = (
    event: React.MouseEvent<HTMLElement>,
    company: Company
  ) => {
    event.stopPropagation();
    setRatingMenuAnchor(event.currentTarget);
    setSelectedCompanyForRating(company);
  };

  const handleRatingMenuClose = () => {
    setRatingMenuAnchor(null);
    setSelectedCompanyForRating(null);
  };

  const handleRatingChange = async (newRating: number | null) => {
    if (selectedCompanyForRating) {
      try {
        await updateCompanyField(
          selectedCompanyForRating.id,
          'ratingV2',
          newRating,
          userProfile?.uid // Pass the current user's ID to track who made the update
        );
      } catch (error) {
        console.error('Error updating rating:', error);
        setSnackbar({
          open: true,
          message: 'Failed to update rating',
          severity: 'error',
        });
      }
    }
    handleRatingMenuClose();
  };

  // Status inline edit handlers
  const handleStatusClick = (
    event: React.MouseEvent<HTMLElement>,
    company: Company
  ) => {
    event.stopPropagation();
    setStatusMenuAnchor(event.currentTarget);
    setSelectedCompanyForStatus(company);
  };

  const handleStatusMenuClose = () => {
    setStatusMenuAnchor(null);
    setSelectedCompanyForStatus(null);
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (selectedCompanyForStatus && userProfile?.uid) {
      try {
        // Manually set status and lock it
        await setCompanyStatusManually(
          selectedCompanyForStatus.id,
          newStatus,
          userProfile.uid
        );
        setSnackbar({
          open: true,
          message: 'Company status updated and locked',
          severity: 'success',
        });
      } catch (error) {
        console.error('Error updating status:', error);
        setSnackbar({
          open: true,
          message: 'Failed to update status',
          severity: 'error',
        });
      }
    }
    handleStatusMenuClose();
  };

  const handleStatusUnlock = async () => {
    if (selectedCompanyForStatus && userProfile?.uid) {
      try {
        // Unlock status and recalculate from leads
        await unlockCompanyStatus(
          selectedCompanyForStatus.id,
          userProfile.uid
        );
        setSnackbar({
          open: true,
          message: 'Status unlocked and synced with leads',
          severity: 'success',
        });
      } catch (error) {
        console.error('Error unlocking status:', error);
        setSnackbar({
          open: true,
          message: 'Failed to unlock status',
          severity: 'error',
        });
      }
    }
    handleStatusMenuClose();
  };

  // Labels inline edit handlers
  const handleLabelsClick = (
    event: React.MouseEvent<HTMLElement>,
    company: Company
  ) => {
    event.stopPropagation();
    setLabelsMenuAnchor(event.currentTarget);
    setSelectedCompanyForLabels(company);
  };

  const handleLabelsMenuClose = () => {
    setLabelsMenuAnchor(null);
    setSelectedCompanyForLabels(null);
  };

  // Handler for multi-select labels (receives full array of selected values)
  const handleLabelsMultiSelect = async (newLabels: string[]) => {
    if (selectedCompanyForLabels && userProfile?.uid) {
      try {
        await updateCompanyLabels(
          selectedCompanyForLabels.id,
          newLabels,
          userProfile.uid
        );
        // Don't close menu - allow user to continue selecting
        // Don't show snackbar for each toggle to avoid spam
      } catch (error) {
        console.error('Error updating labels:', error);
        setSnackbar({
          open: true,
          message: 'Failed to update labels',
          severity: 'error',
        });
      }
    }
  };

  // Legacy single-select handler (kept for compatibility but now converts to array)
  const handleLabelsChange = async (newLabels: string) => {
    if (selectedCompanyForLabels && userProfile?.uid) {
      try {
        await updateCompanyLabels(
          selectedCompanyForLabels.id,
          newLabels ? [newLabels] : [],
          userProfile.uid
        );
        setSnackbar({
          open: true,
          message: newLabels ? `Label updated to "${newLabels}"` : 'Labels cleared',
          severity: 'success',
        });
      } catch (error) {
        console.error('Error updating labels:', error);
        setSnackbar({
          open: true,
          message: 'Failed to update labels',
          severity: 'error',
        });
      }
    }
    handleLabelsMenuClose();
  };

  // Helper function to get labels dropdown options from field definitions
  const getLabelsOptions = (): string[] => {
    const labelsDef = fieldDefinitions.find(def => def.name === 'labels');
    return labelsDef?.options || [];
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

  // Writing program analysis handler
  const handleAnalyzeWritingProgram = async (company: Company) => {
    // Check if company has a website
    if (!company.website) {
      setSnackbar({
        open: true,
        message: `${company.name} doesn't have a website URL`,
        severity: 'error',
      });
      return;
    }

    // Add to analyzing set
    setAnalyzingCompanies(prev => new Set(prev).add(company.id));

    try {
      // Step 1: Find writing program URLs
      const findResults = await bulkFindWritingPrograms(
        [company],
        (companyId, phase, status, message) => {
          console.log(`[${companyId}] ${phase}: ${status} - ${message}`);
        }
      );

      const result = findResults.get(company.id);

      if (!result) {
        throw new Error('No result returned from find operation');
      }

      if (result.error) {
        throw new Error(result.error);
      }

      // Check if any URLs found
      const urlsFromResults = (result.urls || []).filter(u => u.exists).map(u => u.url);
      const urlsFromAI = (result.aiSuggestions || []).map(u => u.url);
      const allUrls = [...urlsFromResults, ...urlsFromAI];

      if (allUrls.length === 0) {
        setSnackbar({
          open: true,
          message: `No writing program found for ${company.name}`,
          severity: 'info',
        });
        setAnalyzingCompanies(prev => {
          const next = new Set(prev);
          next.delete(company.id);
          return next;
        });
        return;
      }

      // If single URL, analyze automatically
      if (allUrls.length === 1) {
        await analyzeProgram(company, allUrls[0]);
        return;
      }

      // Multiple URLs found - show selection dialog
      setUrlSelectionDialog({
        open: true,
        companyId: company.id,
        companyName: company.name,
        urls: allUrls,
      });
      setSelectedUrl(allUrls[0]); // Pre-select first URL

      // Keep company in analyzing set until user selects URL

    } catch (error) {
      console.error('Error analyzing writing program:', error);
      setSnackbar({
        open: true,
        message: `Failed to analyze ${company.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
      setAnalyzingCompanies(prev => {
        const next = new Set(prev);
        next.delete(company.id);
        return next;
      });
    }
  };

  // Analyze specific program URL
  const analyzeProgram = async (company: Company, programUrl: string) => {
    try {
      // Step 2: Analyze the selected URL
      const analyzeResults = await bulkAnalyzeWritingPrograms(
        new Map([[company.id, {
          companyId: company.id,
          companyName: company.name,
          programUrl,
        }]]),
        (companyId, phase, status, message) => {
          console.log(`[${companyId}] ${phase}: ${status} - ${message}`);
        }
      );

      const analyzeResult = analyzeResults.get(company.id);

      if (analyzeResult?.error) {
        throw new Error(analyzeResult.error);
      }

      setSnackbar({
        open: true,
        message: `Writing program analyzed successfully for ${company.name}!`,
        severity: 'success',
      });

      // Remove from analyzing set
      setAnalyzingCompanies(prev => {
        const next = new Set(prev);
        next.delete(company.id);
        return next;
      });

    } catch (error) {
      console.error('Error in program analysis:', error);
      setSnackbar({
        open: true,
        message: `Failed to analyze program: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
      setAnalyzingCompanies(prev => {
        const next = new Set(prev);
        next.delete(company.id);
        return next;
      });
    }
  };

  // Generate offers handler (async - runs in background)
  const handleGenerateOffers = async (company: Company) => {
    const websiteUrl =
      company.website ||
      (company.customFields?.website_blog_link as string) ||
      company.blogAnalysis?.blogUrl;

    if (!websiteUrl) {
      setSnackbar({
        open: true,
        message: `${company.name} doesn't have a website URL`,
        severity: 'error',
      });
      return;
    }

    // Add to generating set
    setGeneratingOffers(prev => new Set(prev).add(company.id));

    setSnackbar({
      open: true,
      message: `Starting offer analysis for ${company.name}...`,
      severity: 'info',
    });

    // Run async - don't await
    (async () => {
      try {
        // Stage 1: Analyze website
        const stage1Result = await analyzeCompanyWebsite(
          company.id,
          company.name,
          websiteUrl,
          company.blogAnalysis?.blogUrl || undefined
        );

        // Stage 2: Generate ideas
        const stage2Result = await generateOfferIdeas(
          company.id,
          company.name,
          websiteUrl,
          stage1Result.companyAnalysis,
          company.blogAnalysis?.blogUrl || undefined
        );

        const totalCost = stage1Result.costInfo.totalCost + stage2Result.costInfo.totalCost;

        setSnackbar({
          open: true,
          message: `${company.name}: ${stage2Result.ideas.length} ideas generated ($${totalCost.toFixed(4)})`,
          severity: 'success',
        });
      } catch (error: any) {
        setSnackbar({
          open: true,
          message: `${company.name}: ${error.message || 'Analysis failed'}`,
          severity: 'error',
        });
      } finally {
        setGeneratingOffers(prev => {
          const next = new Set(prev);
          next.delete(company.id);
          return next;
        });
      }
    })();
  };

  // Handle URL selection from dialog
  const handleUrlSelectionConfirm = async () => {
    if (!urlSelectionDialog || !selectedUrl) return;

    const company = companies.find(c => c.id === urlSelectionDialog.companyId);
    if (!company) return;

    setUrlSelectionDialog(null);
    await analyzeProgram(company, selectedUrl);
  };

  // Handle URL selection dialog close
  const handleUrlSelectionCancel = () => {
    if (urlSelectionDialog) {
      setAnalyzingCompanies(prev => {
        const next = new Set(prev);
        next.delete(urlSelectionDialog.companyId);
        return next;
      });
    }
    setUrlSelectionDialog(null);
    setSelectedUrl('');
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
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'ratingV2':
          aValue = a.ratingV2;
          bValue = b.ratingV2;
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
          <TableCell
            key={columnId}
            sx={{
              maxWidth: '180px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
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
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
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

      case 'ratingV2':
        // Helper function to get traffic light colors based on rating
        const getRatingColors = (rating: number | null | undefined) => {
          if (rating === null || rating === undefined) {
            // Soft purple/lavender that blends with the column background
            return {
              background: 'rgba(102, 126, 234, 0.25)',
              hoverBackground: 'rgba(102, 126, 234, 0.4)',
            };
          }
          // Low ratings (1-3): Red
          if (rating <= 3) {
            return {
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              hoverBackground: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
            };
          }
          // Medium ratings (4-7): Amber/Yellow
          if (rating <= 7) {
            return {
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              hoverBackground: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
            };
          }
          // High ratings (8-10): Green
          return {
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            hoverBackground: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          };
        };

        const colors = getRatingColors(company.ratingV2);

        // Get the first letter of the user's name who set the rating (default to 'M' if no tracking)
        const hasRating = company.ratingV2 !== null && company.ratingV2 !== undefined;
        const ratingUserInitial = hasRating
          ? (company.ratingV2UpdatedBy && ratingUserNames.get(company.ratingV2UpdatedBy)
              ? ratingUserNames.get(company.ratingV2UpdatedBy)!.charAt(0).toUpperCase()
              : 'M') // Default to 'M' for ratings without tracking
          : '';

        return (
          <TableCell
            key={columnId}
            sx={{
              bgcolor: 'rgba(102, 126, 234, 0.08)',
              borderLeft: '1px solid rgba(102, 126, 234, 0.15)',
              borderRight: '1px solid rgba(102, 126, 234, 0.15)',
              textAlign: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <Chip
                label={hasRating ? company.ratingV2 : '-'}
                size="small"
                onClick={(e) => handleRatingClick(e, company)}
                sx={{
                  background: colors.background,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: hasRating ? '11px' : '10px',
                  height: hasRating ? '24px' : '20px',
                  minWidth: hasRating ? '32px' : '32px',
                  maxWidth: hasRating ? '32px' : '32px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                  cursor: 'pointer',
                  '& .MuiChip-label': {
                    px: 1,
                  },
                  '&:hover': {
                    background: colors.hoverBackground,
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.25)',
                    filter: 'brightness(1.1)',
                  },
                }}
              />
              {ratingUserInitial && (
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    bgcolor: '#667eea', // Fixed purple - brand color
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {ratingUserInitial}
                </Box>
              )}
            </Box>
          </TableCell>
        );

      case 'status':
        return (
          <TableCell key={columnId} sx={{ textAlign: 'center' }}>
            <CompanyStatusBadge
              status={company.status}
              locked={company.statusLockedManually}
              size="small"
              onClick={(e) => handleStatusClick(e, company)}
            />
          </TableCell>
        );

      case 'labels':
        const labelsArray = company.labels || [];
        const maxVisibleLabels = 3;
        const visibleLabels = labelsArray.slice(0, maxVisibleLabels);
        const hiddenCount = labelsArray.length - maxVisibleLabels;

        return (
          <TableCell key={columnId}>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={(e) => handleLabelsClick(e, company)}
            >
              {labelsArray.length === 0 ? (
                <Chip
                  label="-"
                  size="small"
                  sx={{
                    fontSize: '10px',
                    height: '20px',
                    background: 'rgba(102, 126, 234, 0.15)',
                    color: '#667eea',
                    fontWeight: 400,
                    '&:hover': {
                      background: 'rgba(102, 126, 234, 0.25)',
                    },
                  }}
                />
              ) : (
                <>
                  {visibleLabels.map((label, index) => (
                    <Chip
                      key={index}
                      label={label}
                      size="small"
                      sx={{
                        fontSize: '10px',
                        height: '20px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        fontWeight: 500,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5568d3 0%, #6b408e 100%)',
                        },
                      }}
                    />
                  ))}
                  {hiddenCount > 0 && (
                    <Chip
                      label={`+${hiddenCount}`}
                      size="small"
                      sx={{
                        fontSize: '10px',
                        height: '20px',
                        background: 'rgba(102, 126, 234, 0.2)',
                        color: '#667eea',
                        fontWeight: 600,
                        '&:hover': {
                          background: 'rgba(102, 126, 234, 0.3)',
                        },
                      }}
                    />
                  )}
                </>
              )}
            </Box>
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
            // Render clickable chip for both empty and non-empty values
            return (
              <TableCell key={columnId}>
                <Chip
                  label={value ? String(value) : '-'}
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
              <TableCell
                key={columnId}
                sx={{
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
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
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
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
          <TableHead sx={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            bgcolor: '#fafafa',
          }}>
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
                    px: 0.75,
                    fontSize: '10px',
                    fontWeight: column.id === 'ratingV2' ? 700 : 600,
                    color: column.id === 'ratingV2' ? '#667eea' : '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    height: '36px',
                    bgcolor: column.id === 'ratingV2' ? 'rgba(102, 126, 234, 0.08)' : 'transparent',
                    position: 'relative',
                    '&::after': column.id === 'ratingV2' ? {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    } : {},
                  }}
                >
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={() => handleRequestSort(column.id)}
                    disabled={!column.sortable}
                    sx={{
                      fontSize: column.id === 'ratingV2' ? '13px' : '12px',
                      color: column.id === 'ratingV2' ? '#667eea' : '#64748b',
                      fontWeight: column.id === 'ratingV2' ? 700 : 'inherit',
                      '&:hover': {
                        color: column.id === 'ratingV2' ? '#5568d3' : '#475569',
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
                  minWidth: 120,
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
                        px: 0.75,
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
                    <TableCell align="right" sx={{ px: 1, minWidth: 120 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {/* Generate Offers Button */}
                        {(company.website || company.customFields?.website_blog_link || company.blogAnalysis?.blogUrl) && (
                          <Tooltip title={company.offerAnalysis ? "Regenerate offers" : "Generate offers"}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateOffers(company);
                              }}
                              disabled={generatingOffers.has(company.id)}
                              sx={{
                                color: company.offerAnalysis ? '#10b981' : '#f59e0b',
                                '&:hover': {
                                  backgroundColor: company.offerAnalysis
                                    ? 'rgba(16, 185, 129, 0.1)'
                                    : 'rgba(245, 158, 11, 0.1)',
                                },
                                '&.Mui-disabled': {
                                  color: '#f59e0b',
                                  opacity: 0.6,
                                },
                              }}
                            >
                              {generatingOffers.has(company.id) ? (
                                <CircularProgress size={16} sx={{ color: '#f59e0b' }} />
                              ) : (
                                <OfferIcon sx={{ fontSize: '16px' }} />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Writing Program Analysis Button */}
                        {company.website && !company.writingProgramAnalysis && (
                          <Tooltip title="Analyze writing program">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyzeWritingProgram(company);
                              }}
                              disabled={analyzingCompanies.has(company.id)}
                              sx={{
                                color: '#667eea',
                                '&:hover': {
                                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                },
                                '&.Mui-disabled': {
                                  color: '#667eea',
                                  opacity: 0.6,
                                },
                              }}
                            >
                              {analyzingCompanies.has(company.id) ? (
                                <CircularProgress size={16} sx={{ color: '#667eea' }} />
                              ) : (
                                <AutoAwesomeIcon sx={{ fontSize: '16px' }} />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Find Competitors Button */}
                        {onFindCompetitors && (
                          <Tooltip title="Find competitors">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onFindCompetitors(company);
                              }}
                              sx={{
                                color: '#667eea',
                                '&:hover': {
                                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                },
                              }}
                            >
                              <CompareArrowsIcon sx={{ fontSize: '16px' }} />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Open Button */}
                        <Tooltip title="View details">
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
                        </Tooltip>
                      </Box>
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
            minWidth: 200,
          }
        }}
      >
        {selectedCustomFieldName && (
          <DropdownMenuWithAdd
            options={getDropdownOptions(selectedCustomFieldName).map(option => ({
              value: option,
              label: option,
              chipSx: {
                bgcolor: selectedCompanyForCustomField?.customFields?.[selectedCustomFieldName] === option
                  ? '#e0e7ff'
                  : '#f3f4f6',
                color: selectedCompanyForCustomField?.customFields?.[selectedCustomFieldName] === option
                  ? '#4f46e5'
                  : '#6b7280',
                fontWeight: 500,
              },
            }))}
            selectedValue={selectedCompanyForCustomField?.customFields?.[selectedCustomFieldName]}
            onSelect={(value) => handleCustomFieldChange(value)}
            entityType="company"
            fieldName={selectedCustomFieldName}
            onUpdate={() => {
              fetchFieldDefinitions();
              handleCustomFieldMenuClose();
            }}
          />
        )}
      </Menu>

      {/* Rating V2 dropdown menu */}
      <Menu
        anchorEl={ratingMenuAnchor}
        open={Boolean(ratingMenuAnchor)}
        onClose={handleRatingMenuClose}
        PaperProps={{
          sx: {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            minWidth: 120,
          }
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => {
          // Traffic light colors
          const getRatingBgColor = (r: number) => {
            if (r <= 3) return '#EF4444'; // Red
            if (r <= 7) return '#F59E0B'; // Amber
            return '#10B981'; // Green
          };

          return (
            <MenuItem
              key={rating}
              onClick={() => handleRatingChange(rating)}
              sx={{
                fontSize: '13px',
                py: 0.75,
                justifyContent: 'center',
                fontWeight: selectedCompanyForRating?.ratingV2 === rating ? 700 : 400,
                background: selectedCompanyForRating?.ratingV2 === rating
                  ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                  : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(102, 126, 234, 0.1)',
                },
              }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  bgcolor: getRatingBgColor(rating),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                }}
              >
                {rating}
              </Box>
            </MenuItem>
          );
        })}
        <MenuItem
          onClick={() => handleRatingChange(null)}
          sx={{
            fontSize: '13px',
            py: 1,
            justifyContent: 'center',
            color: 'text.secondary',
            borderTop: '1px solid',
            borderColor: 'divider',
            '&:hover': {
              bgcolor: 'rgba(102, 126, 234, 0.1)',
            },
          }}
        >
          Clear
        </MenuItem>
      </Menu>

      {/* Status dropdown menu */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={handleStatusMenuClose}
        PaperProps={{
          sx: {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            minWidth: 180,
          }
        }}
      >
        {(['new_lead', 'qualified', 'contacted', 'follow_up', 'nurture', 'won', 'lost', 'previous_client', 'existing_client'] as LeadStatus[]).map((status) => (
          <MenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            selected={selectedCompanyForStatus?.status === status}
            sx={{
              fontSize: '13px',
              py: 1,
              fontWeight: selectedCompanyForStatus?.status === status ? 600 : 400,
              '&:hover': {
                bgcolor: 'rgba(102, 126, 234, 0.1)',
              },
            }}
          >
            <CompanyStatusBadge status={status} size="small" />
          </MenuItem>
        ))}
        {selectedCompanyForStatus?.statusLockedManually && (
          <>
            <MenuItem
              sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                fontSize: '12px',
                py: 1,
                color: '#667eea',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: 'rgba(102, 126, 234, 0.1)',
                },
              }}
              onClick={handleStatusUnlock}
            >
              🔓 Unlock & Auto-Sync
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Labels dropdown menu - Multi-select mode */}
      <Menu
        anchorEl={labelsMenuAnchor}
        open={Boolean(labelsMenuAnchor)}
        onClose={handleLabelsMenuClose}
        PaperProps={{
          sx: {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            minWidth: 220,
            maxHeight: 400,
          }
        }}
      >
        <DropdownMenuWithAdd
          options={getLabelsOptions().map(option => ({
            value: option,
            label: option,
          }))}
          multiSelect={true}
          selectedValues={selectedCompanyForLabels?.labels || []}
          onSelect={(value) => handleLabelsChange(value)}
          onMultiSelect={handleLabelsMultiSelect}
          entityType="company"
          fieldName="labels"
          onUpdate={() => {
            fetchFieldDefinitions();
          }}
          showManagement={false}
          allowAdd={true}
        />
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

      {/* URL Selection Dialog */}
      <Dialog
        open={urlSelectionDialog?.open || false}
        onClose={handleUrlSelectionCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Select Writing Program URL
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            Multiple writing program URLs found for {urlSelectionDialog?.companyName}. Please select one to analyze:
          </Typography>
        </DialogTitle>
        <DialogContent>
          <RadioGroup
            value={selectedUrl}
            onChange={(e) => setSelectedUrl(e.target.value)}
          >
            {urlSelectionDialog?.urls.map((url, index) => (
              <FormControlLabel
                key={index}
                value={url}
                control={<Radio sx={{ color: '#667eea', '&.Mui-checked': { color: '#667eea' } }} />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Option {index + 1}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', wordBreak: 'break-all' }}>
                      {url}
                    </Typography>
                  </Box>
                }
                sx={{ my: 1, alignItems: 'flex-start' }}
              />
            ))}
          </RadioGroup>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleUrlSelectionCancel} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleUrlSelectionConfirm}
            disabled={!selectedUrl}
            variant="contained"
            sx={{
              textTransform: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              },
            }}
          >
            Analyze Selected URL
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
