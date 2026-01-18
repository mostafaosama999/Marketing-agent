// src/components/features/analytics/OutreachActivityTable.tsx
// Expandable table showing monthly outreach stats with weekly breakdown

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Link,
} from '@mui/material';
import {
  KeyboardArrowUp,
  KeyboardArrowDown,
  TableChart as TableIcon,
  LinkedIn,
  Email,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Lead } from '../../../types/lead';

interface OutreachActivityTableProps {
  leads: Lead[];
}

interface WeeklyOutreach {
  week: string; // ISO week like "2025-W01"
  weekLabel: string; // e.g., "Jan 6 - Jan 12"
  linkedInSent: number;
  linkedInResponses: number;
  linkedInResponseRate: number;
  emailSent: number;
  emailResponses: number;
  emailResponseRate: number;
  linkedInRespondedLeads: Lead[];
  emailRespondedLeads: Lead[];
}

interface MonthlyOutreach {
  month: string; // "2025-01"
  monthLabel: string; // "Jan 2025"
  linkedInSent: number;
  linkedInResponses: number;
  linkedInResponseRate: number;
  emailSent: number;
  emailResponses: number;
  emailResponseRate: number;
  linkedInRespondedLeads: Lead[];
  emailRespondedLeads: Lead[];
  weeks: WeeklyOutreach[];
}

interface ModalState {
  open: boolean;
  type: 'linkedin' | 'email';
  period: string; // month or week label
  leads: Lead[];
}

// Helper: Get LinkedIn date from custom fields or outreach object
const getLinkedInDate = (lead: Lead): Date | null => {
  if (lead.customFields?.linkedin_date_of_linkedin_contact) {
    try {
      return new Date(lead.customFields.linkedin_date_of_linkedin_contact);
    } catch (e) {
      // Invalid date
    }
  }
  if (lead.outreach?.linkedIn?.sentAt) {
    return lead.outreach.linkedIn.sentAt instanceof Date
      ? lead.outreach.linkedIn.sentAt
      : new Date(lead.outreach.linkedIn.sentAt);
  }
  return null;
};

// Helper: Get email date from custom fields or outreach object
const getEmailDate = (lead: Lead): Date | null => {
  if (lead.customFields?.email_date_sending_email) {
    try {
      return new Date(lead.customFields.email_date_sending_email);
    } catch (e) {
      // Invalid date
    }
  }
  if (lead.outreach?.email?.sentAt) {
    return lead.outreach.email.sentAt instanceof Date
      ? lead.outreach.email.sentAt
      : new Date(lead.outreach.email.sentAt);
  }
  return null;
};

// Helper: Check if lead has LinkedIn response
const hasLinkedInResponse = (lead: Lead): boolean => {
  const response = lead.customFields?.linkedin_lead_response ||
                   lead.customFields?.lead_response ||
                   lead.customFields?.['LEAD RESPONSE'] ||
                   lead.customFields?.['Lead Response'] ||
                   lead.customFields?.['lead response'];

  if (response) {
    if (
      response === 'No Response' ||
      response === 'Not Interested' ||
      response === '-' ||
      !response ||
      response.trim() === ''
    ) {
      return false;
    }
    if (
      response === 'Interested' ||
      response === 'Meeting Scheduled' ||
      response === 'Referred Us'
    ) {
      return true;
    }
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
  const response = lead.customFields?.email_lead_response ||
                   lead.customFields?.email_email_lead_response ||
                   lead.customFields?.lead_response ||
                   lead.customFields?.['LEAD RESPONSE'] ||
                   lead.customFields?.['Lead Response'] ||
                   lead.customFields?.['lead response'];

  if (response) {
    if (
      response === 'No Response' ||
      response === 'Not Interested' ||
      response === '-' ||
      !response ||
      response.trim() === ''
    ) {
      return false;
    }
    if (
      response === 'Interested' ||
      response === 'Meeting Scheduled' ||
      response === 'Referred Us'
    ) {
      return true;
    }
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

// Helper: Get response type for display
const getResponseType = (lead: Lead, type: 'linkedin' | 'email'): string => {
  const response = type === 'linkedin'
    ? (lead.customFields?.linkedin_lead_response ||
       lead.customFields?.lead_response ||
       lead.customFields?.['LEAD RESPONSE'])
    : (lead.customFields?.email_lead_response ||
       lead.customFields?.email_email_lead_response ||
       lead.customFields?.lead_response ||
       lead.customFields?.['LEAD RESPONSE']);

  if (response && ['Interested', 'Meeting Scheduled', 'Referred Us'].includes(response)) {
    return response;
  }
  return 'Replied';
};

// Helper: Get month key from date (YYYY-MM)
const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// Helper: Get ISO week key (YYYY-Www)
const getISOWeekKey = (date: Date): string => {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursdayOfYear = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursdayOfYear - target.valueOf()) / 604800000);
  return `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`;
};

// Helper: Get readable month label
const getMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
};

// Helper: Get week date range label
const getWeekLabel = (weekKey: string): string => {
  const [year, weekPart] = weekKey.split('-W');
  const weekNum = parseInt(weekPart);
  const jan4 = new Date(parseInt(year), 0, 4);
  const monday = new Date(jan4);
  const dayOffset = (weekNum - 1) * 7;
  const weekDay = (jan4.getDay() + 6) % 7;
  monday.setDate(jan4.getDate() - weekDay + dayOffset);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonth = monthNames[monday.getMonth()];
  const endMonth = monthNames[sunday.getMonth()];

  if (startMonth === endMonth) {
    return `${startMonth} ${monday.getDate()} - ${sunday.getDate()}`;
  }
  return `${startMonth} ${monday.getDate()} - ${endMonth} ${sunday.getDate()}`;
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

// Clickable Response Cell Component
const ResponseCell: React.FC<{
  count: number;
  rate: number;
  type: 'linkedin' | 'email';
  onClick: () => void;
}> = ({ count, rate, onClick }) => {
  const isClickable = count > 0;

  return (
    <Typography
      onClick={isClickable ? onClick : undefined}
      sx={{
        fontWeight: 600,
        color: count > 0 ? '#10b981' : '#94a3b8',
        cursor: isClickable ? 'pointer' : 'default',
        '&:hover': isClickable ? {
          textDecoration: 'underline',
          color: '#059669',
        } : {},
      }}
    >
      {count}
      <Typography component="span" sx={{ color: '#64748b', fontWeight: 400, ml: 0.5, fontSize: '0.85em' }}>
        ({rate.toFixed(1)}%)
      </Typography>
    </Typography>
  );
};

// Weekly Response Cell Component
const WeeklyResponseCell: React.FC<{
  count: number;
  rate: number;
  onClick: () => void;
}> = ({ count, rate, onClick }) => {
  const isClickable = count > 0;

  return (
    <Typography
      onClick={isClickable ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      sx={{
        fontSize: '0.875rem',
        color: count > 0 ? '#10b981' : '#94a3b8',
        cursor: isClickable ? 'pointer' : 'default',
        '&:hover': isClickable ? {
          textDecoration: 'underline',
          color: '#059669',
        } : {},
      }}
    >
      {count}
      <Typography component="span" sx={{ color: '#94a3b8', ml: 0.5, fontSize: '0.8em' }}>
        ({rate.toFixed(1)}%)
      </Typography>
    </Typography>
  );
};

// Response Detail Modal Component
const ResponseDetailModal: React.FC<{
  open: boolean;
  onClose: () => void;
  type: 'linkedin' | 'email';
  period: string;
  leads: Lead[];
}> = ({ open, onClose, type, period, leads }) => {
  const navigate = useNavigate();

  const config = {
    linkedin: {
      icon: <LinkedIn sx={{ fontSize: 24 }} />,
      title: 'LinkedIn Responses',
      gradient: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
    },
    email: {
      icon: <Email sx={{ fontSize: 24 }} />,
      title: 'Email Responses',
      gradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
    },
  };

  const modalConfig = config[type];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: modalConfig.gradient,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {modalConfig.icon}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {modalConfig.title} - {period}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.25 }}>
              {leads.length} {leads.length === 1 ? 'lead' : 'leads'} responded
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>Lead Name</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>Company</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>Response Type</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#fafafa' }}>
                  {type === 'linkedin' ? 'LinkedIn' : 'Email'}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  hover
                  onClick={() => {
                    onClose();
                    navigate(`/leads/${lead.id}`);
                  }}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f8fafc' },
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          navigate(`/companies/${lead.companyId}`);
                        }}
                        sx={{ color: '#667eea', fontWeight: 500, textDecoration: 'none', cursor: 'pointer' }}
                      >
                        {lead.company}
                      </Link>
                    ) : (
                      <Typography variant="body2">{lead.company}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getResponseType(lead, type)}
                      size="small"
                      sx={{
                        ...getChipStyle(getResponseType(lead, type)),
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {type === 'linkedin' ? (
                      lead.outreach?.linkedIn?.profileUrl || lead.customFields?.linkedin_profile_url ? (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              lead.outreach?.linkedIn?.profileUrl || lead.customFields?.linkedin_profile_url,
                              '_blank'
                            );
                          }}
                        >
                          <LinkedIn sx={{ color: '#0077b5' }} />
                        </IconButton>
                      ) : (
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>-</Typography>
                      )
                    ) : (
                      lead.email ? (
                        <Link
                          href={`mailto:${lead.email}`}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ color: '#667eea', textDecoration: 'none', fontSize: '0.875rem' }}
                        >
                          {lead.email}
                        </Link>
                      ) : (
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>-</Typography>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// Monthly Row Component
const MonthRow: React.FC<{
  data: MonthlyOutreach;
  isExpanded: boolean;
  onToggle: () => void;
  onResponseClick: (type: 'linkedin' | 'email', period: string, leads: Lead[]) => void;
}> = ({ data, isExpanded, onToggle, onResponseClick }) => {
  return (
    <>
      <TableRow
        onClick={onToggle}
        sx={{
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.04)' },
          transition: 'background-color 0.2s',
        }}
      >
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton size="small" sx={{ mr: 1 }}>
              {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
            <Typography sx={{ fontWeight: 600 }}>{data.monthLabel}</Typography>
          </Box>
        </TableCell>
        <TableCell align="center">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <LinkedIn sx={{ fontSize: 18, color: '#0077b5' }} />
            <Typography sx={{ fontWeight: 600 }}>{data.linkedInSent}</Typography>
          </Box>
        </TableCell>
        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
          <ResponseCell
            count={data.linkedInResponses}
            rate={data.linkedInResponseRate}
            type="linkedin"
            onClick={() => onResponseClick('linkedin', data.monthLabel, data.linkedInRespondedLeads)}
          />
        </TableCell>
        <TableCell align="center">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Email sx={{ fontSize: 18, color: '#ea4335' }} />
            <Typography sx={{ fontWeight: 600 }}>{data.emailSent}</Typography>
          </Box>
        </TableCell>
        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
          <ResponseCell
            count={data.emailResponses}
            rate={data.emailResponseRate}
            type="email"
            onClick={() => onResponseClick('email', data.monthLabel, data.emailRespondedLeads)}
          />
        </TableCell>
      </TableRow>

      {/* Expanded Weekly Details */}
      <TableRow>
        <TableCell colSpan={5} sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, pl: 6, pr: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  mb: 2,
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                Weekly Breakdown
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(102, 126, 234, 0.05)' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>Week</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>LinkedIn Sent</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>LinkedIn Responses</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>Email Sent</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>Email Responses</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.weeks.map((week) => (
                    <TableRow
                      key={week.week}
                      sx={{
                        '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.02)' },
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={week.weekLabel}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            color: '#667eea',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontSize: '0.875rem' }}>{week.linkedInSent}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <WeeklyResponseCell
                          count={week.linkedInResponses}
                          rate={week.linkedInResponseRate}
                          onClick={() => onResponseClick('linkedin', week.weekLabel, week.linkedInRespondedLeads)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontSize: '0.875rem' }}>{week.emailSent}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <WeeklyResponseCell
                          count={week.emailResponses}
                          rate={week.emailResponseRate}
                          onClick={() => onResponseClick('email', week.weekLabel, week.emailRespondedLeads)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.weeks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: '#94a3b8', py: 2 }}>
                        No weekly data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export const OutreachActivityTable: React.FC<OutreachActivityTableProps> = ({ leads }) => {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    type: 'linkedin',
    period: '',
    leads: [],
  });

  // Aggregate data by month and week
  const monthlyData = useMemo(() => {
    // Group leads by month and week for LinkedIn
    const linkedInByMonth: { [month: string]: { sent: Set<string>; respondedLeads: Lead[] } } = {};
    const linkedInByWeek: { [week: string]: { sent: Set<string>; respondedLeads: Lead[]; month: string } } = {};

    // Group leads by month and week for Email
    const emailByMonth: { [month: string]: { sent: Set<string>; respondedLeads: Lead[] } } = {};
    const emailByWeek: { [week: string]: { sent: Set<string>; respondedLeads: Lead[]; month: string } } = {};

    // Process LinkedIn outreach
    leads.forEach((lead) => {
      const linkedInDate = getLinkedInDate(lead);
      if (linkedInDate) {
        const monthKey = getMonthKey(linkedInDate);
        const weekKey = getISOWeekKey(linkedInDate);

        // Initialize month if needed
        if (!linkedInByMonth[monthKey]) {
          linkedInByMonth[monthKey] = { sent: new Set(), respondedLeads: [] };
        }
        linkedInByMonth[monthKey].sent.add(lead.id);

        if (hasLinkedInResponse(lead)) {
          linkedInByMonth[monthKey].respondedLeads.push(lead);
        }

        // Initialize week if needed
        if (!linkedInByWeek[weekKey]) {
          linkedInByWeek[weekKey] = { sent: new Set(), respondedLeads: [], month: monthKey };
        }
        linkedInByWeek[weekKey].sent.add(lead.id);

        if (hasLinkedInResponse(lead)) {
          linkedInByWeek[weekKey].respondedLeads.push(lead);
        }
      }
    });

    // Process Email outreach
    leads.forEach((lead) => {
      const emailDate = getEmailDate(lead);
      if (emailDate) {
        const monthKey = getMonthKey(emailDate);
        const weekKey = getISOWeekKey(emailDate);

        // Initialize month if needed
        if (!emailByMonth[monthKey]) {
          emailByMonth[monthKey] = { sent: new Set(), respondedLeads: [] };
        }
        emailByMonth[monthKey].sent.add(lead.id);

        if (hasEmailResponse(lead)) {
          emailByMonth[monthKey].respondedLeads.push(lead);
        }

        // Initialize week if needed
        if (!emailByWeek[weekKey]) {
          emailByWeek[weekKey] = { sent: new Set(), respondedLeads: [], month: monthKey };
        }
        emailByWeek[weekKey].sent.add(lead.id);

        if (hasEmailResponse(lead)) {
          emailByWeek[weekKey].respondedLeads.push(lead);
        }
      }
    });

    // Get all unique months
    const allMonths = new Set([
      ...Object.keys(linkedInByMonth),
      ...Object.keys(emailByMonth),
    ]);

    // Build monthly data with weekly breakdown
    const result: MonthlyOutreach[] = Array.from(allMonths)
      .sort((a, b) => b.localeCompare(a)) // Sort descending (most recent first)
      .map((monthKey) => {
        const linkedIn = linkedInByMonth[monthKey] || { sent: new Set(), respondedLeads: [] };
        const email = emailByMonth[monthKey] || { sent: new Set(), respondedLeads: [] };

        const linkedInSent = linkedIn.sent.size;
        const linkedInResponses = linkedIn.respondedLeads.length;
        const emailSent = email.sent.size;
        const emailResponses = email.respondedLeads.length;

        // Get weeks for this month
        const monthWeeks = new Set<string>();
        Object.entries(linkedInByWeek).forEach(([week, data]) => {
          if (data.month === monthKey) monthWeeks.add(week);
        });
        Object.entries(emailByWeek).forEach(([week, data]) => {
          if (data.month === monthKey) monthWeeks.add(week);
        });

        const weeks: WeeklyOutreach[] = Array.from(monthWeeks)
          .sort((a, b) => b.localeCompare(a)) // Sort descending
          .map((weekKey) => {
            const weekLinkedIn = linkedInByWeek[weekKey] || { sent: new Set(), respondedLeads: [] };
            const weekEmail = emailByWeek[weekKey] || { sent: new Set(), respondedLeads: [] };

            const wLinkedInSent = weekLinkedIn.sent.size;
            const wLinkedInResponses = weekLinkedIn.respondedLeads.length;
            const wEmailSent = weekEmail.sent.size;
            const wEmailResponses = weekEmail.respondedLeads.length;

            return {
              week: weekKey,
              weekLabel: getWeekLabel(weekKey),
              linkedInSent: wLinkedInSent,
              linkedInResponses: wLinkedInResponses,
              linkedInResponseRate: wLinkedInSent > 0 ? (wLinkedInResponses / wLinkedInSent) * 100 : 0,
              emailSent: wEmailSent,
              emailResponses: wEmailResponses,
              emailResponseRate: wEmailSent > 0 ? (wEmailResponses / wEmailSent) * 100 : 0,
              linkedInRespondedLeads: weekLinkedIn.respondedLeads,
              emailRespondedLeads: weekEmail.respondedLeads,
            };
          });

        return {
          month: monthKey,
          monthLabel: getMonthLabel(monthKey),
          linkedInSent,
          linkedInResponses,
          linkedInResponseRate: linkedInSent > 0 ? (linkedInResponses / linkedInSent) * 100 : 0,
          emailSent,
          emailResponses,
          emailResponseRate: emailSent > 0 ? (emailResponses / emailSent) * 100 : 0,
          linkedInRespondedLeads: linkedIn.respondedLeads,
          emailRespondedLeads: email.respondedLeads,
          weeks,
        };
      });

    return result;
  }, [leads]);

  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
  };

  const handleResponseClick = (type: 'linkedin' | 'email', period: string, respondedLeads: Lead[]) => {
    if (respondedLeads.length > 0) {
      setModalState({
        open: true,
        type,
        period,
        leads: respondedLeads,
      });
    }
  };

  const handleCloseModal = () => {
    setModalState((prev) => ({ ...prev, open: false }));
  };

  if (monthlyData.length === 0) {
    return null;
  }

  return (
    <>
      <Card
        sx={{
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 3,
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(226, 232, 240, 0.5)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          mb: 4,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TableIcon sx={{ fontSize: 24, color: '#667eea' }} />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Monthly Outreach Summary
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
            Click on a month to expand weekly breakdown. Click on response numbers to see who responded.
          </Typography>

          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(102, 126, 234, 0.08)' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Month</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>LinkedIn Sent</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>LinkedIn Responses</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>Email Sent</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>Email Responses</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthlyData.map((data) => (
                  <MonthRow
                    key={data.month}
                    data={data}
                    isExpanded={expandedMonths.has(data.month)}
                    onToggle={() => toggleMonth(data.month)}
                    onResponseClick={handleResponseClick}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Response Detail Modal */}
      <ResponseDetailModal
        open={modalState.open}
        onClose={handleCloseModal}
        type={modalState.type}
        period={modalState.period}
        leads={modalState.leads}
      />
    </>
  );
};

export default OutreachActivityTable;
