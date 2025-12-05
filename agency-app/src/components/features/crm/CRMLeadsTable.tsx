// src/components/features/crm/CRMLeadsTable.tsx
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
  Paper,
  Chip,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Checkbox,
  Link,
  TablePagination,
  Popover,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  AutoAwesome as ApolloIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Lead, LeadStatus } from '../../../types/lead';
import { usePipelineConfigContext } from '../../../contexts/PipelineConfigContext';
import { TableColumnConfig } from '../../../types/table';
import { FieldDefinition } from '../../../types/fieldDefinitions';
import { getFieldDefinitions } from '../../../services/api/fieldDefinitionsService';
import { updateLeadCustomField, updateLeadField, updateLeadLinkedInStatus, updateLeadEmailStatus, updateLeadRating } from '../../../services/api/leads';
import { fetchEmail } from '../../../services/api/apolloService';
import { useAuth } from '../../../contexts/AuthContext';
import { copyHtmlToClipboard } from '../../../utils/htmlHelpers';
import { replaceTemplateVariables } from '../../../services/api/templateVariablesService';
import { getSettings } from '../../../services/api/settings';
import { getLeadNameForApollo, validateNameForApollo } from '../../../utils/nameUtils';
import { Company } from '../../../types/crm';
import { getCompany } from '../../../services/api/companies';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase/firestore';
import { DropdownFieldManager } from './DropdownFieldManager';
import { DropdownMenuWithAdd } from './DropdownMenuWithAdd';
import {
  initializeBuiltInDropdowns,
  getLinkedInStatusLabel,
  getEmailStatusLabel,
} from '../../../services/api/builtInDropdownsService';

interface CRMLeadsTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onUpdateLinkedInStatus: (leadId: string, status: string) => void;
  onUpdateEmailStatus: (leadId: string, status: string) => void;
  selectedLeadIds: string[];
  onSelectLead: (leadId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onClearSelection: () => void;
  visibleColumns: TableColumnConfig[];
}

type SortDirection = 'asc' | 'desc';

// Status color mapping
const getStatusColor = (status: LeadStatus): string => {
  const colors: Record<LeadStatus, string> = {
    new_lead: '#9e9e9e',
    qualified: '#ff9800',
    contacted: '#2196f3',
    follow_up: '#9c27b0',
    nurture: '#00bcd4',
    won: '#4caf50',
    lost: '#f44336',
    previous_client: '#607d8b',
    existing_client: '#009688',
  };
  return colors[status] || '#9e9e9e';
};

// Outreach status colors
const getOutreachStatusColor = (status: string): { bg: string; color: string } => {
  if (status === 'replied') {
    return { bg: '#dcfce7', color: '#16a34a' };
  }
  if (status === 'no_response' || status === 'bounced') {
    return { bg: '#fee2e2', color: '#dc2626' };
  }
  if (status === 'sent' || status === 'opened') {
    return { bg: '#dbeafe', color: '#0077b5' };
  }
  return { bg: '#f3f4f6', color: '#6b7280' };
};

// Helper to detect if a custom field is the Rating field
const isRatingField = (fieldName: string): boolean => {
  return fieldName.toLowerCase() === 'rating';
};

// Rating color helper (traffic-light system: red/amber/green)
const getRatingColors = (rating: number | null | undefined) => {
  if (rating === null || rating === undefined) {
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

export const CRMLeadsTable: React.FC<CRMLeadsTableProps> = ({
  leads,
  onLeadClick,
  onUpdateStatus,
  onUpdateLinkedInStatus,
  onUpdateEmailStatus,
  selectedLeadIds,
  onSelectLead,
  onSelectAll,
  onClearSelection,
  visibleColumns,
}) => {
  // Filter to only show visible columns
  const displayColumns = visibleColumns.filter(col => col.visible);
  const { stages, getLabel } = usePipelineConfigContext();

  const [orderBy, setOrderBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<SortDirection>('desc');
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedLeadForStatus, setSelectedLeadForStatus] = useState<Lead | null>(null);
  const [linkedInMenuAnchor, setLinkedInMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedLeadForLinkedIn, setSelectedLeadForLinkedIn] = useState<Lead | null>(null);
  const [emailMenuAnchor, setEmailMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<Lead | null>(null);
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set());

  // Dropdown field definitions
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([]);
  const [customFieldMenuAnchor, setCustomFieldMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedLeadForCustomField, setSelectedLeadForCustomField] = useState<Lead | null>(null);
  const [selectedCustomFieldName, setSelectedCustomFieldName] = useState<string | null>(null);

  // Built-in dropdown options (LinkedIn/Email status)
  const [linkedInStatusOptions, setLinkedInStatusOptions] = useState<string[]>([]);
  const [emailStatusOptions, setEmailStatusOptions] = useState<string[]>([]);

  // Date picker state
  const [datePickerAnchor, setDatePickerAnchor] = useState<null | HTMLElement>(null);
  const [selectedLeadForDate, setSelectedLeadForDate] = useState<Lead | null>(null);
  const [selectedDateFieldName, setSelectedDateFieldName] = useState<string | null>(null);

  // Rating field state (for company-style dropdown)
  const [ratingMenuAnchor, setRatingMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedLeadForRating, setSelectedLeadForRating] = useState<Lead | null>(null);
  const [selectedRatingFieldName, setSelectedRatingFieldName] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem('crm_table_page');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const saved = localStorage.getItem('crm_table_rows_per_page');
    return saved ? parseInt(saved, 10) : 25;
  });

  // Apollo enrichment state
  const { user } = useAuth();
  const [enrichingLeadIds, setEnrichingLeadIds] = useState<Set<string>>(new Set());
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  // Copy message state
  const [copiedLeadIds, setCopiedLeadIds] = useState<Set<string>>(new Set());
  const [offerHeadline, setOfferHeadline] = useState<string>('');
  const [offerTemplate, setOfferTemplate] = useState<string>('');
  const [companies, setCompanies] = useState<Map<string, Company>>(new Map());

  // Rating user display names (first letter only)
  const [ratingUserNames, setRatingUserNames] = useState<Map<string, string>>(new Map());

  // Fetch all field definitions (dropdowns, dates, etc.)
  const fetchFieldDefinitions = async () => {
    try {
      // Initialize built-in dropdowns (LinkedIn/Email status) if needed
      if (user) {
        await initializeBuiltInDropdowns(user.uid);
      }

      const definitions = await getFieldDefinitions('lead');

      // Enhance "Who Applied" field with users from Firestore
      const whoAppliedField = definitions.find(def => def.name === 'linkedin_who_applied');
      if (whoAppliedField) {
        try {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const userNames = usersSnapshot.docs
            .map(doc => doc.data().displayName || doc.data().email)
            .filter(name => name)
            .sort();

          // Only use real users from Firestore, ignore hardcoded options
          whoAppliedField.options = userNames;
        } catch (error) {
          console.error('❌ [CRMLeadsTable] Error loading users for who_applied:', error);
        }
      }

      // Extract LinkedIn and Email status options from field definitions
      const linkedInStatusDef = definitions.find(def => def.name === 'linkedin_status');
      const emailStatusDef = definitions.find(def => def.name === 'email_status');

      setLinkedInStatusOptions(linkedInStatusDef?.options || []);
      setEmailStatusOptions(emailStatusDef?.options || []);

      setFieldDefinitions(definitions);
    } catch (error) {
      console.error('❌ [CRMLeadsTable] Error fetching field definitions:', error);
    }
  };

  // Fetch field definitions on mount
  useEffect(() => {
    fetchFieldDefinitions();
  }, []);

  // Fetch settings on mount
  useEffect(() => {
    const fetchAppSettings = async () => {
      try {
        const settings = await getSettings();
        setOfferHeadline(settings.offerHeadline || '');
        setOfferTemplate(settings.offerTemplate || '');
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchAppSettings();
  }, []);

  // Fetch user display names for rating authors
  useEffect(() => {
    const fetchRatingUserNames = async () => {
      // Collect all unique user IDs from built-in rating field and custom fields
      const userIdSet = new Set<string>();
      leads.forEach(lead => {
        // Built-in rating field
        if (lead.ratingUpdatedBy) {
          userIdSet.add(lead.ratingUpdatedBy);
        }
        // Legacy: custom fields (for backward compatibility)
        if (lead.customFieldsUpdatedBy) {
          Object.entries(lead.customFieldsUpdatedBy).forEach(([fieldName, userId]) => {
            if (fieldName.toLowerCase().includes('rating') && userId) {
              userIdSet.add(userId);
            }
          });
        }
      });
      const uniqueUserIds = Array.from(userIdSet);

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
  }, [leads]);

  // Toggle company collapse/expand
  const toggleCompanyCollapse = (companyName: string) => {
    setCollapsedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyName)) {
        newSet.delete(companyName);
      } else {
        newSet.add(companyName);
      }
      return newSet;
    });
  };

  // Snackbar handlers
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Helper function to detect if a custom field is a contact date field (linkedin/email)
  const isContactDateField = (fieldName: string): 'linkedin' | 'email' | null => {
    const lowerName = fieldName.toLowerCase();

    // LinkedIn contact date fields (e.g., linkedin_sent_date, linkedin_sending_date, linkedin_contact_date)
    if (lowerName.startsWith('linkedin_') && lowerName.includes('date') &&
        (lowerName.includes('contact') || lowerName.includes('send'))) {
      return 'linkedin';
    }

    // Email contact date fields (e.g., email_sent_date, email_sending_date, email_contact_date)
    if (lowerName.startsWith('email_') && lowerName.includes('date') &&
        (lowerName.includes('contact') || lowerName.includes('send'))) {
      return 'email';
    }

    return null;
  };

  // Sorting handler
  const handleRequestSort = (fieldId: string) => {
    const isAsc = orderBy === fieldId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(fieldId);
  };

  // Status menu handlers
  const handleStatusClick = (event: React.MouseEvent<HTMLElement>, lead: Lead) => {
    event.stopPropagation();
    setStatusMenuAnchor(event.currentTarget);
    setSelectedLeadForStatus(lead);
  };

  const handleStatusMenuClose = () => {
    setStatusMenuAnchor(null);
    setSelectedLeadForStatus(null);
  };

  const handleStatusChange = (newStatus: LeadStatus) => {
    if (selectedLeadForStatus) {
      onUpdateStatus(selectedLeadForStatus.id, newStatus);
    }
    handleStatusMenuClose();
  };

  // LinkedIn menu handlers
  const handleLinkedInClick = (event: React.MouseEvent<HTMLElement>, lead: Lead) => {
    event.stopPropagation();
    setLinkedInMenuAnchor(event.currentTarget);
    setSelectedLeadForLinkedIn(lead);
  };

  const handleLinkedInMenuClose = () => {
    setLinkedInMenuAnchor(null);
    setSelectedLeadForLinkedIn(null);
  };

  const handleLinkedInStatusChange = (newStatus: string) => {
    if (selectedLeadForLinkedIn) {
      onUpdateLinkedInStatus(selectedLeadForLinkedIn.id, newStatus);
    }
    handleLinkedInMenuClose();
  };

  // Email menu handlers
  const handleEmailClick = (event: React.MouseEvent<HTMLElement>, lead: Lead) => {
    event.stopPropagation();
    setEmailMenuAnchor(event.currentTarget);
    setSelectedLeadForEmail(lead);
  };

  const handleEmailMenuClose = () => {
    setEmailMenuAnchor(null);
    setSelectedLeadForEmail(null);
  };

  const handleEmailStatusChange = (newStatus: string) => {
    if (selectedLeadForEmail) {
      onUpdateEmailStatus(selectedLeadForEmail.id, newStatus);
    }
    handleEmailMenuClose();
  };

  // Custom field dropdown menu handlers
  const handleCustomFieldClick = (
    event: React.MouseEvent<HTMLElement>,
    lead: Lead,
    fieldName: string
  ) => {
    event.stopPropagation();

    // Check if we have options for this field
    const options = getDropdownOptions(fieldName);
    if (options.length === 0) {
      console.warn(`No dropdown options found for field: ${fieldName}`);
      console.warn('Available field definitions:', fieldDefinitions);
    }

    setCustomFieldMenuAnchor(event.currentTarget);
    setSelectedLeadForCustomField(lead);
    setSelectedCustomFieldName(fieldName);
  };

  const handleCustomFieldMenuClose = () => {
    setCustomFieldMenuAnchor(null);
    setSelectedLeadForCustomField(null);
    setSelectedCustomFieldName(null);
  };

  const handleCustomFieldChange = async (newValue: string) => {
    if (selectedLeadForCustomField && selectedCustomFieldName) {
      try {
        await updateLeadCustomField(
          selectedLeadForCustomField.id,
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

  // Rating field handlers (company-style dropdown)
  const handleRatingClick = (
    event: React.MouseEvent<HTMLElement>,
    lead: Lead,
    fieldName: string
  ) => {
    event.stopPropagation();
    setRatingMenuAnchor(event.currentTarget);
    setSelectedLeadForRating(lead);
    setSelectedRatingFieldName(fieldName);
  };

  const handleRatingMenuClose = () => {
    setRatingMenuAnchor(null);
    setSelectedLeadForRating(null);
    setSelectedRatingFieldName(null);
  };

  const handleRatingChange = async (newRating: number | null) => {
    if (selectedLeadForRating && selectedRatingFieldName) {
      try {
        // Check if this is the built-in rating field or a custom field
        if (selectedRatingFieldName === 'rating') {
          // Use the built-in rating update function
          await updateLeadRating(
            selectedLeadForRating.id,
            newRating,
            user?.uid
          );
        } else {
          // Legacy: custom field rating
          await updateLeadCustomField(
            selectedLeadForRating.id,
            selectedRatingFieldName,
            newRating !== null ? String(newRating) : '',
            user?.uid
          );
        }
      } catch (error) {
        console.error('Error updating rating:', error);
      }
    }
    handleRatingMenuClose();
  };

  // Date picker handlers
  const handleDateFieldClick = (
    event: React.MouseEvent<HTMLElement>,
    lead: Lead,
    fieldName: string
  ) => {
    event.stopPropagation();
    setDatePickerAnchor(event.currentTarget);
    setSelectedLeadForDate(lead);
    setSelectedDateFieldName(fieldName);
  };

  const handleDatePickerClose = () => {
    setDatePickerAnchor(null);
    setSelectedLeadForDate(null);
    setSelectedDateFieldName(null);
  };

  const handleDateChange = async (newDate: Date | null) => {
    if (selectedLeadForDate && selectedDateFieldName && newDate) {
      try {
        // Convert to ISO string for storage
        const isoDate = newDate.toISOString();

        // Check if this is a built-in field or a custom field
        const builtInDateFields = ['createdAt', 'updatedAt', 'lastEnrichedAt', 'lastApiCostUpdate', 'archivedAt'];
        const isBuiltInField = builtInDateFields.includes(selectedDateFieldName);

        if (isBuiltInField) {
          // Update built-in field directly
          await updateLeadField(
            selectedLeadForDate.id,
            selectedDateFieldName,
            isoDate
          );
        } else {
          // Update custom field
          await updateLeadCustomField(
            selectedLeadForDate.id,
            selectedDateFieldName,
            isoDate
          );

          // Auto-set outreach status to 'sent' if this is a contact date field
          const contactType = isContactDateField(selectedDateFieldName);

          if (contactType === 'linkedin') {
            const currentStatus = selectedLeadForDate.outreach?.linkedIn?.status || 'not_sent';
            if (currentStatus === 'not_sent') {
              await updateLeadLinkedInStatus(selectedLeadForDate.id, 'sent');
              showSnackbar('LinkedIn status automatically set to "Sent"', 'success');
            }
          } else if (contactType === 'email') {
            const currentStatus = selectedLeadForDate.outreach?.email?.status || 'not_sent';
            if (currentStatus === 'not_sent') {
              await updateLeadEmailStatus(selectedLeadForDate.id, 'sent');
              showSnackbar('Email status automatically set to "Sent"', 'success');
            }
          }
        }
      } catch (error) {
        console.error('Error updating date field:', error);
        showSnackbar('Failed to update date field', 'error');
      }
    }
    handleDatePickerClose();
  };

  // Copy full message handler (headline + body)
  const handleCopyFullMessage = async (lead: Lead) => {
    try {
      // Fetch company data if lead has companyId
      let companyData: Company | null = null;
      if (lead.companyId) {
        companyData = await getCompany(lead.companyId);
      }

      // Build lead data object for template replacement
      const leadData = {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company || lead.companyName,
        companyName: lead.company || lead.companyName,
        status: lead.status,
        customFields: lead.customFields,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        outreach: lead.outreach,
      };

      // Replace template variables in headline and body with company data
      const headlineHtml = offerHeadline
        ? replaceTemplateVariables(offerHeadline, leadData, companyData)
        : '';
      const bodyHtml = offerTemplate
        ? replaceTemplateVariables(offerTemplate, leadData, companyData)
        : '';

      // Merge headline and body with blank line between them
      // Format: headline + <p></p> (blank line) + body
      const mergedHtml = headlineHtml && bodyHtml
        ? `${headlineHtml}<p></p>${bodyHtml}`
        : headlineHtml || bodyHtml;

      if (!mergedHtml) {
        showSnackbar('No offer template configured. Please go to Settings to create one.', 'warning');
        return;
      }

      // Copy HTML with formatting preserved
      await copyHtmlToClipboard(mergedHtml);

      // Show success feedback
      setCopiedLeadIds(prev => new Set(prev).add(lead.id));
      showSnackbar('Offer message copied to clipboard!', 'success');

      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedLeadIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(lead.id);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
      showSnackbar('Failed to copy message. Please try again.', 'error');
    }
  };

  // Apollo enrichment handler
  const handleApolloEnrichment = async (lead: Lead) => {
    if (!user) {
      showSnackbar('Please log in to use Apollo enrichment', 'error');
      return;
    }

    // Check if already enriching this lead
    if (enrichingLeadIds.has(lead.id)) {
      return;
    }

    // Mark lead as being enriched
    setEnrichingLeadIds(prev => new Set(prev).add(lead.id));

    try {
      // Validate and extract first/last name from lead
      const validationError = validateNameForApollo(lead);
      if (validationError) {
        showSnackbar(validationError, 'warning');
        return;
      }

      const { firstName, lastName } = getLeadNameForApollo(lead);

      // Call Apollo API
      const result = await fetchEmail({
        firstName,
        lastName,
        companyName: lead.company || lead.companyName || '',
        linkedinUrl: lead.customFields?.linkedinUrl || lead.outreach?.linkedIn?.profileUrl,
      }, user.uid);

      if (result.matched && result.email) {
        // Update lead with enriched email
        await updateLeadField(lead.id, 'email', result.email);
        showSnackbar(`Email found: ${result.email}`, 'success');
      } else {
        const errorMsg = result.error || 'No email found for this lead';
        showSnackbar(errorMsg, 'warning');
      }
    } catch (error) {
      console.error('❌ Error during Apollo enrichment:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to enrich lead';
      showSnackbar(errorMsg, 'error');
    } finally {
      // Remove lead from enriching set
      setEnrichingLeadIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(lead.id);
        return newSet;
      });
    }
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

  // Sort leads
  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Get values based on column id
      switch (orderBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'phone':
          aValue = a.phone;
          bValue = b.phone;
          break;
        case 'company':
          aValue = a.company || a.companyName;
          bValue = b.company || b.companyName;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'linkedin_profile_url':
          aValue = a.outreach?.linkedIn?.profileUrl || a.customFields?.linkedinUrl;
          bValue = b.outreach?.linkedIn?.profileUrl || b.customFields?.linkedinUrl;
          break;
        case 'linkedin_status':
          aValue = a.outreach?.linkedIn?.status;
          bValue = b.outreach?.linkedIn?.status;
          break;
        case 'email_outreach_status':
          aValue = a.outreach?.email?.status;
          bValue = b.outreach?.email?.status;
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
  }, [leads, orderBy, order, displayColumns]);

  // Paginate leads (not companies)
  const paginatedLeads = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedLeads.slice(start, end);
  }, [sortedLeads, page, rowsPerPage]);

  // Group only the paginated leads by company
  const paginatedGroupedLeads = useMemo(() => {
    const groups: { [company: string]: Lead[] } = {};
    paginatedLeads.forEach(lead => {
      const company = lead.company || lead.companyName || 'No Company';
      if (!groups[company]) {
        groups[company] = [];
      }
      groups[company].push(lead);
    });
    return groups;
  }, [paginatedLeads]);

  // Get companies for current page only, sorted by lead count then alphabetically
  const paginatedCompanies = useMemo(() => {
    return Object.keys(paginatedGroupedLeads).sort((a, b) => {
      const countDiff = paginatedGroupedLeads[b].length - paginatedGroupedLeads[a].length;
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });
  }, [paginatedGroupedLeads]);

  // Calculate current page lead IDs
  const currentPageLeadIds = useMemo(() => {
    return paginatedLeads.map(lead => lead.id);
  }, [paginatedLeads]);

  // Check if all leads on current page are selected
  const allSelected = currentPageLeadIds.length > 0 &&
                      currentPageLeadIds.every(id => selectedLeadIds.includes(id));
  const someSelected = selectedLeadIds.length > 0 && !allSelected;

  // Reset page when sorting changes
  useEffect(() => {
    setPage(0);
    localStorage.setItem('crm_table_page', '0');
  }, [orderBy, order]);

  // Save pagination preferences
  useEffect(() => {
    localStorage.setItem('crm_table_page', page.toString());
  }, [page]);

  useEffect(() => {
    localStorage.setItem('crm_table_rows_per_page', rowsPerPage.toString());
  }, [rowsPerPage]);

  // Render cell content based on column id
  const renderCell = (columnId: string, lead: Lead) => {
    switch (columnId) {
      case 'name':
        return (
          <TableCell key={columnId} onClick={() => onLeadClick(lead)} sx={{ cursor: 'pointer' }}>
            <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
              {lead.name || '-'}
            </Typography>
          </TableCell>
        );

      case 'email': {
        const hasEmail = lead.email && lead.email.trim() !== '' && lead.email.trim() !== '-';
        const isEnriching = enrichingLeadIds.has(lead.id);

        return (
          <TableCell
            key={columnId}
            onClick={(e) => e.stopPropagation()}
            sx={{ cursor: hasEmail ? 'text' : 'default' }}
          >
            {hasEmail ? (
              <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
                {lead.email}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => handleApolloEnrichment(lead)}
                  disabled={isEnriching}
                  sx={{
                    background: isEnriching
                      ? 'linear-gradient(135deg, #ccc 0%, #999 100%)'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    width: 24,
                    height: 24,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6b408e 100%)',
                    },
                    '&.Mui-disabled': {
                      background: 'linear-gradient(135deg, #ccc 0%, #999 100%)',
                      color: 'white',
                    },
                  }}
                  title="Enrich with Apollo.io"
                >
                  {isEnriching ? (
                    <Box
                      sx={{
                        width: 14,
                        height: 14,
                        border: '2px solid white',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        '@keyframes spin': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' },
                        },
                      }}
                    />
                  ) : (
                    <ApolloIcon sx={{ fontSize: '14px' }} />
                  )}
                </IconButton>
                {isEnriching && (
                  <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>
                    Enriching...
                  </Typography>
                )}
              </Box>
            )}
          </TableCell>
        );
      }

      case 'phone':
        return (
          <TableCell key={columnId}>
            <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
              {lead.phone || '-'}
            </Typography>
          </TableCell>
        );

      case 'company':
        return (
          <TableCell key={columnId}>
            <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
              {lead.company || lead.companyName || '-'}
            </Typography>
          </TableCell>
        );

      case 'status':
        return (
          <TableCell key={columnId}>
            <Chip
              label={getLabel(lead.status)}
              size="small"
              onClick={(e) => handleStatusClick(e, lead)}
              sx={{
                bgcolor: `${getStatusColor(lead.status)}22`,
                color: getStatusColor(lead.status),
                fontWeight: 500,
                fontSize: '10px',
                height: '20px',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: `${getStatusColor(lead.status)}33`,
                },
              }}
            />
          </TableCell>
        );

      case 'rating': {
        // Built-in rating field (like Company's ratingV2)
        const ratingValue = lead.rating;
        const hasLeadRating = ratingValue !== null && ratingValue !== undefined;
        const ratingColors = getRatingColors(ratingValue);

        // Get user initial (default to 'M' if no tracking)
        const leadRatingUserInitial = hasLeadRating
          ? (lead.ratingUpdatedBy && ratingUserNames.get(lead.ratingUpdatedBy)
              ? ratingUserNames.get(lead.ratingUpdatedBy)!.charAt(0).toUpperCase()
              : 'M') // Default to 'M' for ratings without tracking
          : '';

        return (
          <TableCell key={columnId}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0.5 }}>
              <Chip
                label={hasLeadRating ? ratingValue : '-'}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setRatingMenuAnchor(e.currentTarget);
                  setSelectedLeadForRating(lead);
                  setSelectedRatingFieldName('rating'); // Use special marker for built-in field
                }}
                sx={{
                  background: ratingColors.background,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: hasLeadRating ? '11px' : '10px',
                  height: hasLeadRating ? '24px' : '20px',
                  minWidth: '32px',
                  maxWidth: '32px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                  cursor: 'pointer',
                  '& .MuiChip-label': {
                    px: 1,
                  },
                  '&:hover': {
                    background: ratingColors.hoverBackground,
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.25)',
                    filter: 'brightness(1.1)',
                  },
                }}
              />
              {leadRatingUserInitial && (
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
                  {leadRatingUserInitial}
                </Box>
              )}
            </Box>
          </TableCell>
        );
      }

      case 'linkedin_profile_url': {
        const profileUrl = lead.outreach?.linkedIn?.profileUrl || lead.customFields?.linkedinUrl;
        // Check if empty, null, undefined, or "NA" (case-insensitive)
        const isInvalid = !profileUrl ||
                         profileUrl === '' ||
                         profileUrl.trim().toUpperCase() === 'NA' ||
                         profileUrl.trim().toUpperCase() === 'N/A';

        if (isInvalid) {
          return (
            <TableCell key={columnId}>
              <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2, color: 'text.secondary' }}>-</Typography>
            </TableCell>
          );
        }
        return (
          <TableCell key={columnId}>
            <Link
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              sx={{
                fontSize: '11px',
                lineHeight: 1.2,
                color: '#0077b5',
                textDecoration: 'none',
                fontWeight: 500,
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              View Profile
            </Link>
          </TableCell>
        );
      }

      case 'linkedin_status': {
        const status = lead.outreach?.linkedIn?.status;
        if (!status || status === 'not_sent') {
          return (
            <TableCell key={columnId}>
              <Chip
                label="Not Sent"
                size="small"
                onClick={(e) => handleLinkedInClick(e, lead)}
                sx={{
                  bgcolor: '#f3f4f6',
                  color: '#6b7280',
                  fontWeight: 500,
                  fontSize: '10px',
                  height: '20px',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: '#e5e7eb',
                  },
                }}
              />
            </TableCell>
          );
        }
        const colors = getOutreachStatusColor(status);
        const labels: Record<string, string> = {
          sent: 'Sent',
          opened: 'Opened',
          replied: 'Replied',
          refused: 'Refused',
          no_response: 'No Response',
        };
        return (
          <TableCell key={columnId}>
            <Chip
              label={labels[status] || status}
              size="small"
              onClick={(e) => handleLinkedInClick(e, lead)}
              sx={{
                bgcolor: colors.bg,
                color: colors.color,
                fontWeight: 500,
                fontSize: '10px',
                height: '20px',
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            />
          </TableCell>
        );
      }

      case 'email_outreach_status': {
        const status = lead.outreach?.email?.status;
        if (!status || status === 'not_sent') {
          return (
            <TableCell key={columnId}>
              <Chip
                label="Not Sent"
                size="small"
                onClick={(e) => handleEmailClick(e, lead)}
                sx={{
                  bgcolor: '#f3f4f6',
                  color: '#6b7280',
                  fontWeight: 500,
                  fontSize: '10px',
                  height: '20px',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: '#e5e7eb',
                  },
                }}
              />
            </TableCell>
          );
        }
        const colors = getOutreachStatusColor(status);
        const labels: Record<string, string> = {
          sent: 'Sent',
          opened: 'Opened',
          replied: 'Replied',
          bounced: 'Bounced',
          refused: 'Refused',
          no_response: 'No Response',
        };
        return (
          <TableCell key={columnId}>
            <Chip
              label={labels[status] || status}
              size="small"
              onClick={(e) => handleEmailClick(e, lead)}
              sx={{
                bgcolor: colors.bg,
                color: colors.color,
                fontWeight: 500,
                fontSize: '10px',
                height: '20px',
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            />
          </TableCell>
        );
      }

      case 'createdAt': {
        const date = lead.createdAt instanceof Date ? lead.createdAt : new Date(lead.createdAt);
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
              onClick={(e) => handleDateFieldClick(e, lead, 'createdAt')}
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

      case 'actions': {
        const isCopied = copiedLeadIds.has(lead.id);
        return (
          <TableCell key={columnId} onClick={(e) => e.stopPropagation()}>
            <IconButton
              size="small"
              onClick={() => handleCopyFullMessage(lead)}
              sx={{
                color: isCopied ? '#10b981' : '#667eea',
                '&:hover': {
                  color: isCopied ? '#10b981' : '#5568d3',
                  bgcolor: 'rgba(102, 126, 234, 0.1)',
                },
              }}
              title={isCopied ? 'Copied!' : 'Copy offer message'}
            >
              {isCopied ? <CheckIcon sx={{ fontSize: '16px' }} /> : <CopyIcon sx={{ fontSize: '16px' }} />}
            </IconButton>
          </TableCell>
        );
      }

      default:
        // Check if this is a custom field column
        const column = displayColumns.find(col => col.id === columnId);
        if (column && column.type === 'custom' && column.fieldName) {
          const value = lead.customFields?.[column.fieldName];

          // Check if this is a dropdown field (check column.fieldType first, then fallback to fieldDefinitions)
          const isDropdown = column.fieldType === 'dropdown' || isDropdownField(column.fieldName);

          // Special handling for Rating field - render with company-style colored badges
          if (isDropdown && isRatingField(column.fieldName)) {
            const numericValue = value ? parseInt(String(value), 10) : null;
            const validNumericValue = numericValue !== null && !isNaN(numericValue) ? numericValue : null;
            const colors = getRatingColors(validNumericValue);

            const hasRating = validNumericValue !== null;

            // Get the first letter of the user's name who set the rating (only if there's a rating)
            const ratingUserId = lead.customFieldsUpdatedBy?.[column.fieldName!];
            const ratingUserInitial = hasRating
              ? (ratingUserId && ratingUserNames.get(ratingUserId)
                  ? ratingUserNames.get(ratingUserId)!.charAt(0).toUpperCase()
                  : 'M') // Default to 'M' for ratings without tracking
              : ''; // No badge when no rating

            return (
              <TableCell key={columnId}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0.5 }}>
                  <Chip
                    label={hasRating ? validNumericValue : '-'}
                    size="small"
                    onClick={(e) => handleRatingClick(e, lead, column.fieldName!)}
                    sx={{
                      background: colors.background,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: hasRating ? '11px' : '10px',
                      height: hasRating ? '24px' : '20px',
                      minWidth: '32px',
                      maxWidth: '32px',
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
          }

          if (isDropdown) {
            // All other dropdown fields render as clickable chips, even when empty
            const displayValue = value || '-';

            return (
              <TableCell key={columnId}>
                <Chip
                  label={String(displayValue)}
                  size="small"
                  onClick={(e) => handleCustomFieldClick(e, lead, column.fieldName!)}
                  sx={{
                    fontSize: '10px',
                    height: '20px',
                    cursor: 'pointer',
                    background: (!value || value === '' || value === '-')
                      ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' // Gray for empty
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple for filled
                    color: 'white',
                    '&:hover': {
                      background: (!value || value === '' || value === '-')
                        ? 'linear-gradient(135deg, #64748b 0%, #475569 100%)' // Darker gray on hover
                        : 'linear-gradient(135deg, #5568d3 0%, #6b408e 100%)', // Darker purple on hover
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
                  onClick={(e) => handleDateFieldClick(e, lead, column.fieldName!)}
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
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden',
    }}>
      {/* Table */}
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
          <TableHead sx={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            bgcolor: '#fafafa',
          }}>
            <TableRow sx={{ bgcolor: '#fafafa', borderBottom: '2px solid #e0e0e0', height: '36px' }}>
              {/* Checkbox column */}
              <TableCell
                padding="checkbox"
                sx={{
                  width: 48,
                  py: 0,
                  px: 1,
                  pl: 2,
                  height: '36px',
                }}
              >
                <Checkbox
                  checked={allSelected}
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

              {/* Table columns */}
              {displayColumns.map((column, index) => {
                // Get section-based colors
                const getSectionColor = (section?: 'general' | 'linkedin' | 'email') => {
                  switch (section) {
                    case 'linkedin':
                      return '#0077b5'; // LinkedIn blue
                    case 'email':
                      return '#10b981'; // Green/teal
                    case 'general':
                    default:
                      return '#64748b'; // Gray (default)
                  }
                };

                const getSectionHoverColor = (section?: 'general' | 'linkedin' | 'email') => {
                  switch (section) {
                    case 'linkedin':
                      return '#005a8c'; // Darker LinkedIn blue
                    case 'email':
                      return '#059669'; // Darker green
                    case 'general':
                    default:
                      return '#475569'; // Darker gray
                  }
                };

                const sectionColor = getSectionColor(column.section);
                const hoverColor = getSectionHoverColor(column.section);

                return (
                  <TableCell
                    key={column.id}
                    sx={{
                      py: 0,
                      px: 1,
                      ...(index === 0 && column.id === 'name' ? { pl: 3 } : {}),
                      fontSize: '10px',
                      fontWeight: 600,
                      color: sectionColor,
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
                        color: sectionColor,
                        '&:hover': {
                          color: hoverColor,
                        },
                        '&.Mui-active': {
                          color: sectionColor,
                          fontWeight: 700,
                        },
                        '& .MuiTableSortLabel-icon': {
                          fontSize: '16px',
                          opacity: 1,
                          color: 'inherit',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {column.section === 'linkedin' && (
                          <LinkedInIcon sx={{ fontSize: '14px' }} />
                        )}
                        {column.section === 'email' && (
                          <EmailIcon sx={{ fontSize: '14px' }} />
                        )}
                        {column.label}
                      </Box>
                    </TableSortLabel>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={displayColumns.length + 1} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No leads found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCompanies.map((companyName) => {
                const companyLeads = paginatedGroupedLeads[companyName];
                const isCollapsed = collapsedCompanies.has(companyName);

                return (
                  <React.Fragment key={companyName}>
                    {/* Company Header Row */}
                    <TableRow
                      sx={{
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
                        height: '40px',
                        borderTop: '2px solid rgba(102, 126, 234, 0.5)',
                        borderBottom: '2px solid rgba(102, 126, 234, 0.5)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                        },
                        '& .MuiTableCell-root': {
                          borderBottom: 'none',
                          py: 0,
                          px: 1,
                          height: '40px',
                          fontWeight: 600,
                        },
                      }}
                    >
                      <TableCell colSpan={displayColumns.length + 1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => toggleCompanyCollapse(companyName)}
                            sx={{
                              p: 0.25,
                              color: '#667eea',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                bgcolor: 'rgba(102, 126, 234, 0.2)',
                                transform: 'scale(1.1)',
                              },
                            }}
                          >
                            <ExpandMoreIcon
                              sx={{
                                fontSize: '18px',
                                transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s ease',
                              }}
                            />
                          </IconButton>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '12px', lineHeight: 1.2, color: '#667eea' }}>
                            {companyName}
                          </Typography>
                          <Chip
                            label={`${companyLeads.length} lead${companyLeads.length > 1 ? 's' : ''}`}
                            size="small"
                            sx={{
                              height: '20px',
                              fontSize: '10px',
                              bgcolor: '#667eea',
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Company Leads - Direct rows without nested table */}
                    {!isCollapsed && companyLeads.map((lead) => {
                      const isSelected = selectedLeadIds.includes(lead.id);
                      return (
                        <TableRow
                          key={lead.id}
                          hover
                          selected={isSelected}
                          onClick={() => onLeadClick(lead)}
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
                          {/* Checkbox cell */}
                          <TableCell
                            padding="checkbox"
                            onClick={(e) => e.stopPropagation()}
                            sx={{ py: 0, px: 1, pl: 2 }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => onSelectLead(lead.id)}
                              size="small"
                              sx={{
                                color: '#667eea',
                                '&.Mui-checked': { color: '#667eea' },
                              }}
                            />
                          </TableCell>

                          {/* Table column cells with indentation on first column */}
                          {displayColumns.map((column, index) => {
                            if (index === 0 && column.id === 'name') {
                              // Add indentation to name column
                              return (
                                <TableCell key={column.id} onClick={() => onLeadClick(lead)} sx={{ cursor: 'pointer', pl: 3 }}>
                                  <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
                                    {lead.name || '-'}
                                  </Typography>
                                </TableCell>
                              );
                            }
                            return renderCell(column.id, lead);
                          })}
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component={Paper}
        count={sortedLeads.length}
        page={page}
        onPageChange={(_event, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100, 250, 500, 1000]}
        labelRowsPerPage="Leads per page:"
        sx={{
          borderTop: '1px solid #e2e8f0',
          bgcolor: '#fafafa',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          flexShrink: 0,
          '.MuiTablePagination-toolbar': {
            minHeight: '80px',
            px: 2,
            pr: 20, // Large right padding to avoid FAB (160px)
          },
          '.MuiTablePagination-actions': {
            mr: 4, // Extra margin on action buttons
          },
          '.MuiTablePagination-actions button': {
            padding: '12px',
          },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            fontSize: '14px',
            fontWeight: 500,
            color: '#64748b',
          },
          '.MuiTablePagination-select': {
            fontSize: '14px',
            fontWeight: 500,
          },
        }}
      />

      {/* Status Change Menu */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={handleStatusMenuClose}
      >
        {stages.map((stage) => (
          <MenuItem
            key={stage.id}
            onClick={() => handleStatusChange(stage.id)}
            selected={selectedLeadForStatus?.status === stage.id}
          >
            <Chip
              label={stage.label}
              size="small"
              sx={{
                bgcolor: `${getStatusColor(stage.id)}22`,
                color: getStatusColor(stage.id),
                fontWeight: 500,
              }}
            />
          </MenuItem>
        ))}
      </Menu>

      {/* LinkedIn Status Menu */}
      <Menu
        anchorEl={linkedInMenuAnchor}
        open={Boolean(linkedInMenuAnchor)}
        onClose={handleLinkedInMenuClose}
      >
        <DropdownMenuWithAdd
          options={linkedInStatusOptions.map(value => {
            const colors = getOutreachStatusColor(value);
            return {
              value,
              label: getLinkedInStatusLabel(value),
              chipSx: {
                bgcolor: colors.bg,
                color: colors.color,
                fontWeight: 500,
              },
            };
          })}
          selectedValue={selectedLeadForLinkedIn?.outreach?.linkedIn?.status}
          onSelect={(value) => handleLinkedInStatusChange(value)}
          entityType="lead"
          fieldName="linkedin_status"
          onUpdate={() => {
            fetchFieldDefinitions();
            handleLinkedInMenuClose();
          }}
        />
      </Menu>

      {/* Email Status Menu */}
      <Menu
        anchorEl={emailMenuAnchor}
        open={Boolean(emailMenuAnchor)}
        onClose={handleEmailMenuClose}
      >
        <DropdownMenuWithAdd
          options={emailStatusOptions.map(value => {
            const colors = getOutreachStatusColor(value);
            return {
              value,
              label: getEmailStatusLabel(value),
              chipSx: {
                bgcolor: colors.bg,
                color: colors.color,
                fontWeight: 500,
              },
            };
          })}
          selectedValue={selectedLeadForEmail?.outreach?.email?.status}
          onSelect={(value) => handleEmailStatusChange(value)}
          entityType="lead"
          fieldName="email_status"
          onUpdate={() => {
            fetchFieldDefinitions();
            handleEmailMenuClose();
          }}
        />
      </Menu>

      {/* Custom Field Dropdown Menu */}
      <Menu
        anchorEl={customFieldMenuAnchor}
        open={Boolean(customFieldMenuAnchor)}
        onClose={handleCustomFieldMenuClose}
      >
        {selectedCustomFieldName && (() => {
          const options = getDropdownOptions(selectedCustomFieldName);

          if (options.length === 0) {
            return (
              <MenuItem disabled>
                <Box sx={{ py: 1, px: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'error.main',
                      fontWeight: 600,
                      mb: 0.5,
                    }}
                  >
                    No options configured
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      display: 'block',
                    }}
                  >
                    Field: {selectedCustomFieldName}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontStyle: 'italic',
                      display: 'block',
                      mt: 0.5,
                    }}
                  >
                    Check console for details
                  </Typography>
                </Box>
              </MenuItem>
            );
          }

          return (
            <DropdownMenuWithAdd
              options={options.map(option => {
                const isSelected = selectedLeadForCustomField?.customFields?.[selectedCustomFieldName] === option;
                return {
                  value: option,
                  label: option,
                  chipSx: {
                    bgcolor: isSelected ? '#e0e7ff' : '#f3f4f6',
                    color: isSelected ? '#4f46e5' : '#6b7280',
                    fontWeight: 500,
                  },
                };
              })}
              selectedValue={selectedLeadForCustomField?.customFields?.[selectedCustomFieldName]}
              onSelect={(value) => handleCustomFieldChange(value)}
              entityType="lead"
              fieldName={selectedCustomFieldName}
              onUpdate={() => {
                fetchFieldDefinitions();
                handleCustomFieldMenuClose();
              }}
            />
          );
        })()}
      </Menu>

      {/* Rating Dropdown Menu (Company-style) */}
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
                fontWeight: selectedLeadForRating?.customFields?.[selectedRatingFieldName || ''] === String(rating) ? 700 : 400,
                background: selectedLeadForRating?.customFields?.[selectedRatingFieldName || ''] === String(rating)
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
                selectedLeadForDate && selectedDateFieldName
                  ? (() => {
                      // Check if built-in field or custom field
                      const builtInDateFields = ['createdAt', 'updatedAt', 'lastEnrichedAt', 'lastApiCostUpdate', 'archivedAt'];
                      const isBuiltIn = builtInDateFields.includes(selectedDateFieldName);
                      const fieldValue = isBuiltIn
                        ? (selectedLeadForDate as any)[selectedDateFieldName]
                        : selectedLeadForDate.customFields?.[selectedDateFieldName];
                      return parseDateValue(fieldValue);
                    })()
                  : null
              }
              onChange={handleDateChange}
              slotProps={{
                textField: {
                  size: 'small',
                  sx: { width: 250 },
                },
              }}
            />
          </LocalizationProvider>
        </Box>
      </Popover>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
