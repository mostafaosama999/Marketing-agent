// src/components/features/analytics/OutreachResponseModal.tsx
// Modal component for displaying detailed LinkedIn/Email response data

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Chip,
  IconButton,
  Link,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Lead } from '../../../types/lead';

interface OutreachResponseModalProps {
  open: boolean;
  onClose: () => void;
  leads: Lead[];
  modalType: 'linkedin' | 'email';
  outreachDayRange: 7 | 14 | 30 | 'all';
}

interface ResponseLeadRow {
  id: string;
  name: string;
  company: string;
  companyId?: string;
  responseType: string;
  dateContacted: Date | null;
  contactInfo: string;
}

type SortField = 'name' | 'company' | 'responseType' | 'dateContacted';
type SortDirection = 'asc' | 'desc';

export const OutreachResponseModal: React.FC<OutreachResponseModalProps> = ({
  open,
  onClose,
  leads,
  modalType,
  outreachDayRange,
}) => {
  const navigate = useNavigate();

  // State
  const [sortBy, setSortBy] = useState<SortField>('dateContacted');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Helper: Get LinkedIn date from custom fields or outreach object
  const getLinkedInDate = (lead: Lead): Date | null => {
    // Check custom fields first (linkedin_date_of_linkedin_contact)
    if (lead.customFields?.linkedin_date_of_linkedin_contact) {
      try {
        return new Date(lead.customFields.linkedin_date_of_linkedin_contact);
      } catch (e) {
        // Invalid date format, skip
      }
    }

    // Fall back to outreach.linkedIn.sentAt
    if (lead.outreach?.linkedIn?.sentAt) {
      return lead.outreach.linkedIn.sentAt instanceof Date
        ? lead.outreach.linkedIn.sentAt
        : new Date(lead.outreach.linkedIn.sentAt);
    }

    return null;
  };

  // Helper: Get email date from custom fields or outreach object
  const getEmailDate = (lead: Lead): Date | null => {
    // Check custom fields for email date fields
    if (lead.customFields?.email_date_sending_email) {
      try {
        return new Date(lead.customFields.email_date_sending_email);
      } catch (e) {
        // Invalid date format, skip
      }
    }

    // Fall back to outreach.email.sentAt
    if (lead.outreach?.email?.sentAt) {
      return lead.outreach.email.sentAt instanceof Date
        ? lead.outreach.email.sentAt
        : new Date(lead.outreach.email.sentAt);
    }

    return null;
  };

  // Helper: Check if lead has LinkedIn response
  const hasLinkedInResponse = (lead: Lead): boolean => {
    // Check LinkedIn-specific field first, then general field as fallback
    // Try multiple possible field name variations
    const response = lead.customFields?.linkedin_lead_response ||
                     lead.customFields?.lead_response ||
                     lead.customFields?.['LEAD RESPONSE'] ||
                     lead.customFields?.['Lead Response'] ||
                     lead.customFields?.['lead response'];

    if (response) {
      // Explicitly exclude "No Response" and "Not Interested"
      if (
        response === 'No Response' ||
        response === 'Not Interested' ||
        response === '-' ||
        !response ||
        response.trim() === ''
      ) {
        return false;
      }

      // New dropdown values (exact match) - positive responses only
      if (
        response === 'Interested' ||
        response === 'Meeting Scheduled' ||
        response === 'Referred Us'
      ) {
        return true;
      }

      // Legacy text values
      const lowerResponse = response.toLowerCase();
      if (lowerResponse.includes('not interested') || lowerResponse.includes('no response')) {
        return false;
      }
      return lowerResponse.includes('replied') ||
             lowerResponse.includes('responded') ||
             lowerResponse.includes('accepted') ||
             lowerResponse.includes('agreed');
    }

    return lead.outreach?.linkedIn?.status === 'replied';
  };

  // Helper: Check if lead has email response
  const hasEmailResponse = (lead: Lead): boolean => {
    // Check custom fields for email response (email-specific fields first, then general field as fallback)
    // Try multiple possible field name variations
    const response = lead.customFields?.email_lead_response ||
                     lead.customFields?.email_email_lead_response ||
                     lead.customFields?.lead_response ||
                     lead.customFields?.['LEAD RESPONSE'] ||
                     lead.customFields?.['Lead Response'] ||
                     lead.customFields?.['lead response'];

    if (response) {
      // Explicitly exclude "No Response" and "Not Interested"
      if (
        response === 'No Response' ||
        response === 'Not Interested' ||
        response === '-' ||
        !response ||
        response.trim() === ''
      ) {
        return false;
      }

      // New dropdown values (exact match) - positive responses only
      if (
        response === 'Interested' ||
        response === 'Meeting Scheduled' ||
        response === 'Referred Us'
      ) {
        return true;
      }

      // Legacy text values
      const lowerResponse = response.toLowerCase();
      if (lowerResponse.includes('not interested') || lowerResponse.includes('no response')) {
        return false;
      }
      return lowerResponse.includes('replied') ||
             lowerResponse.includes('responded') ||
             lowerResponse.includes('accepted') ||
             lowerResponse.includes('agreed');
    }

    return lead.outreach?.email?.status === 'replied';
  };

  // Helper: Extract response type from custom fields
  const extractResponseType = (lead: Lead, type: 'linkedin' | 'email'): string => {
    // Try multiple possible field name variations
    const response = type === 'linkedin'
      ? (lead.customFields?.linkedin_lead_response ||
         lead.customFields?.lead_response ||
         lead.customFields?.['LEAD RESPONSE'] ||
         lead.customFields?.['Lead Response'] ||
         lead.customFields?.['lead response'])
      : (lead.customFields?.email_lead_response ||
         lead.customFields?.email_email_lead_response ||
         lead.customFields?.lead_response ||
         lead.customFields?.['LEAD RESPONSE'] ||
         lead.customFields?.['Lead Response'] ||
         lead.customFields?.['lead response']);

    // Return the response value, or fallback to "Replied"
    if (response && ['Interested', 'Meeting Scheduled', 'Referred Us'].includes(response)) {
      return response;
    }
    return 'Replied';
  };

  // Filter and process leads
  const filteredLeads = useMemo(() => {
    // Calculate cutoff date based on outreachDayRange
    const cutoffDate = outreachDayRange === 'all'
      ? new Date('2000-01-01')
      : (() => {
          const date = new Date();
          date.setDate(date.getDate() - outreachDayRange);
          return date;
        })();

    // Filter leads based on modalType
    return leads
      .filter(lead => {
        // Filter by date range and positive responses
        if (modalType === 'linkedin') {
          const linkedInDate = getLinkedInDate(lead);
          const hasResponse = hasLinkedInResponse(lead);

          // Must have positive response
          if (!hasResponse) return false;

          // If viewing "All Time", include all leads with positive responses
          if (outreachDayRange === 'all') return true;

          // For specific date ranges, check if date is within range
          if (linkedInDate !== null) {
            return linkedInDate >= cutoffDate;
          }

          // Fallback: Include if LinkedIn status shows contact was made (even without date)
          const linkedInStatus = lead.outreach?.linkedIn?.status;
          return linkedInStatus && ['sent', 'opened', 'replied'].includes(linkedInStatus);
        } else {
          const emailDate = getEmailDate(lead);
          const hasResponse = hasEmailResponse(lead);

          // Must have positive response
          if (!hasResponse) return false;

          // If viewing "All Time", include all leads with positive responses
          if (outreachDayRange === 'all') return true;

          // For specific date ranges, check if date is within range
          if (emailDate !== null) {
            return emailDate >= cutoffDate;
          }

          // Fallback: Include if email status shows contact was made (even without date)
          const emailStatus = lead.outreach?.email?.status;
          return emailStatus && ['sent', 'opened', 'replied'].includes(emailStatus);
        }
      })
      .map(lead => ({
        id: lead.id,
        name: lead.name,
        company: lead.company,
        companyId: lead.companyId,
        responseType: extractResponseType(lead, modalType),
        dateContacted: modalType === 'linkedin'
          ? getLinkedInDate(lead)
          : getEmailDate(lead),
        contactInfo: modalType === 'linkedin'
          ? (lead.outreach?.linkedIn?.profileUrl ||
             lead.customFields?.linkedin_profile_url || '-')
          : (lead.email || '-'),
      }));
  }, [leads, modalType, outreachDayRange]);

  // Apply sorting
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      // Handle null/undefined - sort to end
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Handle dates
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === 'asc'
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      // Handle strings
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredLeads, sortBy, sortDirection]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return 'No date';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  // Get chip color based on response type
  const getChipStyle = (responseType: string) => {
    if (responseType === 'Interested') {
      return { bgcolor: '#dcfce7', color: '#16a34a' };
    } else if (responseType === 'Meeting Scheduled') {
      return { bgcolor: '#dbeafe', color: '#0077b5' };
    } else if (responseType === 'Referred Us') {
      return { bgcolor: '#fef3c7', color: '#d97706' };
    }
    return { bgcolor: '#e2e8f0', color: '#64748b' };
  };

  // Modal config based on type
  const modalConfig = {
    linkedin: {
      icon: <LinkedInIcon sx={{ fontSize: 28 }} />,
      title: 'LinkedIn Positive Responses',
      gradient: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
      color: '#4caf50',
    },
    email: {
      icon: <EmailIcon sx={{ fontSize: 28 }} />,
      title: 'Email Positive Responses',
      gradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
      color: '#ff9800',
    },
  };

  const config = modalConfig[modalType];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '85vh',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
          background: config.gradient,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {config.icon}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {config.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.5 }}>
              {sortedLeads.length} {sortedLeads.length === 1 ? 'lead' : 'leads'} with positive responses
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent dividers sx={{ p: 0 }}>
        {sortedLeads.length === 0 ? (
          // Empty state
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CheckCircleIcon
              sx={{
                fontSize: 64,
                color: '#cbd5e1',
                mb: 2
              }}
            />
            <Typography variant="h6" sx={{ color: '#64748b', mb: 1, fontWeight: 600 }}>
              No Positive Responses Yet
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              {modalType === 'linkedin'
                ? 'LinkedIn responses will appear here once leads respond positively'
                : 'Email responses will appear here once leads respond positively'}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>
                      <TableSortLabel
                        active={sortBy === 'name'}
                        direction={sortBy === 'name' ? sortDirection : 'asc'}
                        onClick={() => handleSort('name')}
                      >
                        Lead Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>
                      <TableSortLabel
                        active={sortBy === 'company'}
                        direction={sortBy === 'company' ? sortDirection : 'asc'}
                        onClick={() => handleSort('company')}
                      >
                        Company
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>
                      <TableSortLabel
                        active={sortBy === 'responseType'}
                        direction={sortBy === 'responseType' ? sortDirection : 'asc'}
                        onClick={() => handleSort('responseType')}
                      >
                        Response Type
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>
                      <TableSortLabel
                        active={sortBy === 'dateContacted'}
                        direction={sortBy === 'dateContacted' ? sortDirection : 'asc'}
                        onClick={() => handleSort('dateContacted')}
                      >
                        Date Contacted
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>
                      {modalType === 'linkedin' ? 'LinkedIn Profile' : 'Email'}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedLeads
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((lead) => (
                      <TableRow
                        key={lead.id}
                        hover
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        sx={{
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                          '&:hover': {
                            bgcolor: '#f8fafc',
                          },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {lead.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {lead.companyId ? (
                            <Link
                              href={`/companies/${lead.companyId}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/companies/${lead.companyId}`);
                              }}
                              sx={{ color: '#667eea', fontWeight: 500, textDecoration: 'none' }}
                            >
                              {lead.company}
                            </Link>
                          ) : (
                            <Typography variant="body2">{lead.company}</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={lead.responseType}
                            size="small"
                            sx={{
                              ...getChipStyle(lead.responseType),
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {formatDate(lead.dateContacted)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {modalType === 'linkedin' ? (
                            lead.contactInfo === '-' ? (
                              <Tooltip title="No profile URL">
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <LinkedInIcon sx={{ color: '#cbd5e1' }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            ) : (
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(lead.contactInfo, '_blank');
                                }}
                              >
                                <LinkedInIcon sx={{ color: '#0077b5' }} />
                              </IconButton>
                            )
                          ) : (
                            lead.contactInfo === '-' ? (
                              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                                No email
                              </Typography>
                            ) : (
                              <Link
                                href={`mailto:${lead.contactInfo}`}
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                  color: '#667eea',
                                  fontWeight: 500,
                                  textDecoration: 'none',
                                  '&:hover': {
                                    textDecoration: 'underline',
                                  },
                                }}
                              >
                                {lead.contactInfo}
                              </Link>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              component="div"
              count={sortedLeads.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
