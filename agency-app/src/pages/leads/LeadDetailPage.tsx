// src/pages/leads/LeadDetailPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  Typography,
  Tabs,
  Tab,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Email as EmailIcon,
  LinkedIn as LinkedInIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  ContentCopy as ContentCopyIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Article as ArticleIcon,
  Create as CreateIcon,
  CalendarToday as CalendarIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { Lead, LeadFormData, LeadStatusChange } from '../../types/lead';
import { getLead, updateLead, deleteLead, archiveLead, unarchiveLead } from '../../services/api/leads';
import { leadTimelineService } from '../../services/api/leadSubcollections';
import { useAuth } from '../../contexts/AuthContext';
import { usePipelineConfigContext } from '../../contexts/PipelineConfigContext';
import { fetchEmail } from '../../services/api/apolloService';
import { getCompany } from '../../services/api/companies';
import { Company } from '../../types/crm';
import { getSettings } from '../../services/api/settings';
import { replaceTemplateVariables } from '../../services/api/templateVariablesService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`lead-tabpanel-${index}`}
      aria-labelledby={`lead-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export const LeadDetailPage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stages, getLabel } = usePipelineConfigContext();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Activity state
  const [activityLoading, setActivityLoading] = useState(false);
  const [statusChanges, setStatusChanges] = useState<LeadStatusChange[]>([]);

  // Apollo email enrichment state
  const [apolloLoading, setApolloLoading] = useState(false);
  const [apolloError, setApolloError] = useState<string | null>(null);
  const [apolloSuccess, setApolloSuccess] = useState<string | null>(null);

  // Company state (for fetching offer)
  const [company, setCompany] = useState<Company | null>(null);

  // Form state
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    email: '',
    company: '',
    phone: '',
    status: 'new_lead',
    customFields: {},
  });

  // Outreach tracking state
  const [linkedInStatus, setLinkedInStatus] = useState<'not_sent' | 'sent' | 'opened' | 'replied' | 'refused' | 'no_response'>('not_sent');
  const [linkedInProfileUrl, setLinkedInProfileUrl] = useState('');
  const [emailStatus, setEmailStatus] = useState<'not_sent' | 'sent' | 'opened' | 'replied' | 'bounced' | 'refused' | 'no_response'>('not_sent');

  // Offer template state (fetched from global settings)
  const [offerTemplate, setOfferTemplate] = useState<string>('');
  const [templateLoading, setTemplateLoading] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load lead data
  useEffect(() => {
    const loadLead = async () => {
      if (!leadId) {
        navigate('/leads');
        return;
      }

      try {
        setLoading(true);
        const leadData = await getLead(leadId);

        if (!leadData) {
          setError('Lead not found');
          setTimeout(() => navigate('/leads'), 2000);
          return;
        }

        setLead(leadData);
        setFormData({
          name: leadData.name,
          email: leadData.email,
          company: leadData.company,
          phone: leadData.phone,
          status: leadData.status,
          customFields: leadData.customFields || {},
        });

        // Populate outreach fields
        if (leadData.outreach?.linkedIn) {
          setLinkedInStatus(leadData.outreach.linkedIn.status);
          setLinkedInProfileUrl(leadData.outreach.linkedIn.profileUrl || '');
        } else {
          setLinkedInStatus('not_sent');
          setLinkedInProfileUrl('');
        }

        if (leadData.outreach?.email) {
          setEmailStatus(leadData.outreach.email.status);
        } else {
          setEmailStatus('not_sent');
        }

        // Fetch company data if companyId exists
        if (leadData.companyId) {
          try {
            const companyData = await getCompany(leadData.companyId);
            if (companyData) {
              setCompany(companyData);
            }
          } catch (error) {
            console.error('Error fetching company:', error);
            // Don't fail the whole page if company fetch fails
          }
        }
      } catch (err) {
        console.error('Error loading lead:', err);
        setError('Failed to load lead');
      } finally {
        setLoading(false);
      }
    };

    loadLead();
  }, [leadId, navigate]);

  // Fetch activity/timeline
  useEffect(() => {
    const fetchActivity = async () => {
      if (lead && leadId) {
        setActivityLoading(true);
        try {
          const changes = await leadTimelineService.getStatusChanges(leadId);
          setStatusChanges(changes);
        } catch (error) {
          console.error('Error fetching activity:', error);
        } finally {
          setActivityLoading(false);
        }
      }
    };

    fetchActivity();
  }, [lead, leadId]);

  // Load global offer template from settings
  useEffect(() => {
    const loadTemplate = async () => {
      setTemplateLoading(true);
      try {
        const settings = await getSettings();
        setOfferTemplate(settings.offerTemplate);
      } catch (error) {
        console.error('Error loading offer template:', error);
      } finally {
        setTemplateLoading(false);
      }
    };

    loadTemplate();
  }, []);

  const handleChange = (field: keyof LeadFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError('');
  };

  const handleSave = async () => {
    if (!lead) return;

    setSaving(true);
    setError('');

    try {
      // Build outreach data
      const outreachData: any = {};

      // Add LinkedIn data if status is not 'not_sent' or if profileUrl is filled
      if (linkedInStatus !== 'not_sent' || linkedInProfileUrl) {
        outreachData.linkedIn = {
          status: linkedInStatus,
        };

        // Auto-set sentAt if status changed from 'not_sent' to something else
        const previousLinkedInStatus = lead?.outreach?.linkedIn?.status || 'not_sent';
        const previousSentAt = lead?.outreach?.linkedIn?.sentAt;

        if (linkedInStatus !== 'not_sent') {
          // If there's already a sentAt, preserve it; otherwise set current date
          if (previousSentAt) {
            outreachData.linkedIn.sentAt = previousSentAt;
          } else if (previousLinkedInStatus === 'not_sent') {
            // Status just changed from 'not_sent', set current date
            outreachData.linkedIn.sentAt = new Date();
          }
        }

        if (linkedInProfileUrl?.trim()) {
          outreachData.linkedIn.profileUrl = linkedInProfileUrl.trim();
        }
      }

      // Add email data if status is not 'not_sent'
      if (emailStatus !== 'not_sent') {
        outreachData.email = {
          status: emailStatus,
        };

        // Auto-set sentAt if status changed from 'not_sent' to something else
        const previousEmailStatus = lead?.outreach?.email?.status || 'not_sent';
        const previousSentAt = lead?.outreach?.email?.sentAt;

        // If there's already a sentAt, preserve it; otherwise set current date
        if (previousSentAt) {
          outreachData.email.sentAt = previousSentAt;
        } else if (previousEmailStatus === 'not_sent') {
          // Status just changed from 'not_sent', set current date
          outreachData.email.sentAt = new Date();
        }
      }

      // Include outreach in form data (only if there's actual data)
      const dataToSave = {
        ...formData,
      };

      if (Object.keys(outreachData).length > 0) {
        dataToSave.outreach = outreachData;
      }

      await updateLead(lead.id, dataToSave);

      // Update local state
      setLead({ ...lead, ...dataToSave });

      // Show success message
      setError('');
      setSnackbar({
        open: true,
        message: 'Lead saved successfully!',
        severity: 'success',
      });
    } catch (err: any) {
      console.error('Error saving lead:', err);
      setError(err.message || 'Failed to save lead. Please try again.');
      setSnackbar({
        open: true,
        message: err.message || 'Failed to save lead. Please try again.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Apollo email enrichment
  const handleFetchEmail = async () => {
    // Clear previous messages
    setApolloError(null);
    setApolloSuccess(null);

    // Validate required fields
    if (!formData.name || !formData.company) {
      setApolloError('Name and Company are required to fetch email from Apollo.io');
      return;
    }

    // Parse name into first and last name
    const nameParts = formData.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0]; // Fallback to first name if no last name

    if (!firstName) {
      setApolloError('Please provide a valid name');
      return;
    }

    setApolloLoading(true);

    try {
      // Call Cloud Function (no API key needed - it's stored securely on the server)
      const result = await fetchEmail({
        firstName,
        lastName,
        companyName: formData.company,
      });

      if (result.matched && result.email) {
        // Update email field with fetched email
        setFormData((prev) => ({
          ...prev,
          email: result.email || '',
          phone: result.phone || prev.phone, // Also update phone if available
        }));
        setApolloSuccess(`Email found: ${result.email} (1 credit used)`);
      } else {
        setApolloError(result.error || 'No email found for this person');
      }
    } catch (error) {
      console.error('Error fetching email from Apollo:', error);
      setApolloError('Failed to fetch email. Please try again.');
    } finally {
      setApolloLoading(false);
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!lead) return;

    setDeleting(true);
    try {
      await deleteLead(lead.id);
      navigate('/leads');
    } catch (error) {
      console.error('Error deleting lead:', error);
      setError('Failed to delete lead. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!lead) return;

    const isArchived = lead.archived;
    const action = isArchived ? 'unarchive' : 'archive';
    const confirmMessage = isArchived
      ? `Unarchive "${lead.name}"? This lead will be restored to the active pipeline.`
      : `Archive "${lead.name}"? This lead will be removed from the active pipeline.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      if (isArchived) {
        await unarchiveLead(lead.id);
      } else {
        if (!user) {
          alert('User not authenticated');
          return;
        }
        await archiveLead(lead.id, user.uid);
      }

      // Reload lead data
      const updatedLead = await getLead(lead.id);
      if (updatedLead) {
        setLead(updatedLead);
      }
    } catch (error) {
      console.error(`Error ${action}ing lead:`, error);
      alert(`Failed to ${action} lead. Please try again.`);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Helper function to get section styling (icon and color)
  const getSectionStyle = (section: string): { icon: React.ReactNode; color: string; bgColor: string; category: 'lead' | 'company' } => {
    switch (section) {
      case 'BASIC INFO':
        return {
          icon: <PersonIcon sx={{ fontSize: 14 }} />,
          color: '#667eea',
          bgColor: 'rgba(102, 126, 234, 0.08)',
          category: 'lead'
        };
      case 'OUTREACH':
        return {
          icon: <EmailIcon sx={{ fontSize: 14 }} />,
          color: '#667eea',
          bgColor: 'rgba(102, 126, 234, 0.08)',
          category: 'lead'
        };
      case 'DATES':
        return {
          icon: <CalendarIcon sx={{ fontSize: 14 }} />,
          color: '#667eea',
          bgColor: 'rgba(102, 126, 234, 0.08)',
          category: 'lead'
        };
      case 'CUSTOM FIELDS':
        return {
          icon: <TuneIcon sx={{ fontSize: 14 }} />,
          color: '#667eea',
          bgColor: 'rgba(102, 126, 234, 0.08)',
          category: 'lead'
        };
      case 'COMPANY INFO':
        return {
          icon: <BusinessIcon sx={{ fontSize: 14 }} />,
          color: '#059669',
          bgColor: 'rgba(5, 150, 105, 0.08)',
          category: 'company'
        };
      case 'BLOG ANALYSIS':
        return {
          icon: <ArticleIcon sx={{ fontSize: 14 }} />,
          color: '#059669',
          bgColor: 'rgba(5, 150, 105, 0.08)',
          category: 'company'
        };
      case 'WRITING PROGRAM':
        return {
          icon: <CreateIcon sx={{ fontSize: 14 }} />,
          color: '#059669',
          bgColor: 'rgba(5, 150, 105, 0.08)',
          category: 'company'
        };
      default:
        return {
          icon: <TuneIcon sx={{ fontSize: 14 }} />,
          color: '#64748b',
          bgColor: 'rgba(100, 116, 139, 0.08)',
          category: 'lead'
        };
    }
  };

  // Generate available variables dynamically from lead fields
  // Must be called before early returns to follow React hooks rules
  const availableVariables = useMemo(() => {
    const variables: Array<{ variable: string; label: string; value: string; section: string }> = [];

    // BASIC INFO - Lead standard fields
    variables.push(
      { variable: '{{name}}', label: 'Lead name', value: formData.name || '[Name]', section: 'BASIC INFO' },
      { variable: '{{email}}', label: 'Lead email', value: formData.email || '[Email]', section: 'BASIC INFO' },
      { variable: '{{phone}}', label: 'Phone number', value: formData.phone || '[Phone]', section: 'BASIC INFO' },
      { variable: '{{company}}', label: 'Company name', value: formData.company || '[Company]', section: 'BASIC INFO' },
      { variable: '{{status}}', label: 'Lead status', value: getLabel(formData.status), section: 'BASIC INFO' }
    );

    // OUTREACH - Lead outreach status fields
    if (formData.customFields?.linkedin_status) {
      variables.push({
        variable: '{{linkedin_status}}',
        label: 'LinkedIn outreach status',
        value: String(formData.customFields.linkedin_status),
        section: 'OUTREACH'
      });
    }
    if (formData.customFields?.email_status) {
      variables.push({
        variable: '{{email_status}}',
        label: 'Email outreach status',
        value: String(formData.customFields.email_status),
        section: 'OUTREACH'
      });
    }
    if (formData.customFields?.linkedin_url) {
      variables.push({
        variable: '{{linkedin_url}}',
        label: 'LinkedIn profile URL',
        value: String(formData.customFields.linkedin_url),
        section: 'OUTREACH'
      });
    }

    // DATES - Lead dates
    if (lead?.createdAt) {
      variables.push({
        variable: '{{created_date}}',
        label: 'Lead created date',
        value: new Date(lead.createdAt).toLocaleDateString(),
        section: 'DATES'
      });
    }
    if (lead?.updatedAt) {
      variables.push({
        variable: '{{updated_date}}',
        label: 'Lead updated date',
        value: new Date(lead.updatedAt).toLocaleDateString(),
        section: 'DATES'
      });
    }

    // COMPANY INFO - Company basic fields
    if (company) {
      if (company.website) {
        variables.push({
          variable: '{{company_website}}',
          label: 'Company website',
          value: company.website,
          section: 'COMPANY INFO'
        });
      }
      if (company.industry) {
        variables.push({
          variable: '{{company_industry}}',
          label: 'Company industry',
          value: company.industry,
          section: 'COMPANY INFO'
        });
      }
      if (company.description) {
        variables.push({
          variable: '{{company_description}}',
          label: 'Company description',
          value: company.description,
          section: 'COMPANY INFO'
        });
      }

      // Apollo enrichment data
      if (company.apolloEnrichment) {
        const apollo = company.apolloEnrichment;
        if (apollo.employeeCount) {
          variables.push({
            variable: '{{company_employees}}',
            label: 'Employee count',
            value: apollo.employeeCount.toLocaleString(),
            section: 'COMPANY INFO'
          });
        }
        if (apollo.employeeRange) {
          variables.push({
            variable: '{{company_employee_range}}',
            label: 'Employee range',
            value: apollo.employeeRange,
            section: 'COMPANY INFO'
          });
        }
        if (apollo.foundedYear) {
          variables.push({
            variable: '{{company_founded}}',
            label: 'Founded year',
            value: String(apollo.foundedYear),
            section: 'COMPANY INFO'
          });
        }
        if (apollo.totalFundingFormatted) {
          variables.push({
            variable: '{{company_funding}}',
            label: 'Total funding',
            value: apollo.totalFundingFormatted,
            section: 'COMPANY INFO'
          });
        }
        if (apollo.technologies && apollo.technologies.length > 0) {
          variables.push({
            variable: '{{company_technologies}}',
            label: 'Technologies',
            value: apollo.technologies.join(', '),
            section: 'COMPANY INFO'
          });
        }
      }

      // BLOG ANALYSIS - Company blog data
      if (company.blogAnalysis) {
        const blog = company.blogAnalysis;
        if (blog.lastActivePost) {
          variables.push({
            variable: '{{company_last_post}}',
            label: 'Last active post date',
            value: blog.lastActivePost,
            section: 'BLOG ANALYSIS'
          });
        }
        if (blog.monthlyFrequency !== undefined) {
          variables.push({
            variable: '{{company_blog_frequency}}',
            label: 'Monthly blog frequency',
            value: `${blog.monthlyFrequency} posts/month`,
            section: 'BLOG ANALYSIS'
          });
        }
        if (blog.writers?.count !== undefined) {
          variables.push({
            variable: '{{company_writers_count}}',
            label: 'Number of writers',
            value: String(blog.writers.count),
            section: 'BLOG ANALYSIS'
          });
        }
        if (blog.writers?.areFreelancers !== undefined) {
          variables.push({
            variable: '{{company_uses_freelancers}}',
            label: 'Uses freelance writers',
            value: blog.writers.areFreelancers ? 'Yes' : 'No',
            section: 'BLOG ANALYSIS'
          });
        }
        if (blog.blogNature?.rating) {
          variables.push({
            variable: '{{company_blog_rating}}',
            label: 'Blog quality rating',
            value: blog.blogNature.rating,
            section: 'BLOG ANALYSIS'
          });
        }
        if (blog.blogUrl) {
          variables.push({
            variable: '{{company_blog_url}}',
            label: 'Blog URL',
            value: blog.blogUrl,
            section: 'BLOG ANALYSIS'
          });
        }
      }

      // WRITING PROGRAM - Company writing program data
      if (company.writingProgramAnalysis) {
        const program = company.writingProgramAnalysis;
        variables.push({
          variable: '{{company_has_program}}',
          label: 'Has writing program',
          value: program.hasProgram ? 'Yes' : 'No',
          section: 'WRITING PROGRAM'
        });
        if (program.programUrl) {
          variables.push({
            variable: '{{company_program_url}}',
            label: 'Program URL',
            value: program.programUrl,
            section: 'WRITING PROGRAM'
          });
        }
        if (program.isOpen !== null) {
          variables.push({
            variable: '{{company_program_open}}',
            label: 'Program currently open',
            value: program.isOpen ? 'Yes' : 'No',
            section: 'WRITING PROGRAM'
          });
        }
        if (program.payment?.amount) {
          variables.push({
            variable: '{{company_payment_amount}}',
            label: 'Payment amount',
            value: program.payment.amount,
            section: 'WRITING PROGRAM'
          });
        }
        if (program.payment?.method) {
          variables.push({
            variable: '{{company_payment_method}}',
            label: 'Payment method',
            value: program.payment.method,
            section: 'WRITING PROGRAM'
          });
        }
        if (program.contactEmail) {
          variables.push({
            variable: '{{company_program_contact}}',
            label: 'Program contact email',
            value: program.contactEmail,
            section: 'WRITING PROGRAM'
          });
        }
      }

      // Company custom fields
      if (company.customFields) {
        Object.entries(company.customFields)
          .filter(([key]) => key !== 'offer_template')
          .forEach(([key, value]) => {
            const label = key
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            const displayValue = value ? String(value) : `[${label}]`;
            variables.push({
              variable: `{{company_${key}}}`,
              label: `Company: ${label}`,
              value: displayValue,
              section: 'CUSTOM FIELDS'
            });
          });
      }
    }

    // Lead custom fields (excluding internal fields)
    if (formData.customFields) {
      Object.entries(formData.customFields)
        .filter(([key]) =>
          !key.startsWith('linkedin_') &&
          !key.startsWith('email_') &&
          key !== 'offer_template'
        )
        .forEach(([key, value]) => {
          const label = key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          const displayValue = value ? String(value) : `[${label}]`;

          variables.push({
            variable: `{{${key}}}`,
            label: `Lead: ${label}`,
            value: displayValue,
            section: 'CUSTOM FIELDS'
          });
        });
    }

    return variables;
  }, [formData, company, lead, getLabel]);

  // Render offer preview with variables replaced
  const renderPreview = () => {
    if (!offerTemplate) {
      return <em style={{ color: '#94a3b8' }}>No template yet. Start typing above to see a preview.</em>;
    }

    // Use centralized template replacement service
    const preview = replaceTemplateVariables(
      offerTemplate,
      {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        companyName: formData.company,
        status: formData.status,
        customFields: formData.customFields,
        createdAt: lead?.createdAt,
        updatedAt: lead?.updatedAt,
        outreach: lead?.outreach,
      },
      company
    );

    return preview;
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress size={48} sx={{ color: 'white' }} />
      </Box>
    );
  }

  if (!lead) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography variant="h6" sx={{ color: 'white' }}>
          Lead not found
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/leads')}
          sx={{
            background: 'white',
            color: '#667eea',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.9)',
            },
          }}
        >
          Back to Leads
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 4,
      }}
    >
      {/* Main Content Card */}
      <Box
        sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 4, pb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/leads')}
            sx={{
              mb: 3,
              textTransform: 'none',
              color: '#667eea',
              fontWeight: 600,
              '&:hover': {
                bgcolor: 'rgba(102, 126, 234, 0.08)',
              },
            }}
          >
            Back to Leads
          </Button>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  mb: 1,
                }}
              >
                {lead.name}
              </Typography>
              {lead.company && (
                <Typography variant="body2" color="text.secondary">
                  {lead.company}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<SaveIcon />}
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  },
                }}
              >
                {saving ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Save'}
              </Button>
              <IconButton
                onClick={handleDelete}
                sx={{
                  color: '#ef4444',
                  '&:hover': {
                    bgcolor: 'rgba(239, 68, 68, 0.08)',
                  },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 4 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Details" />
            <Tab label="Outreach" />
            <Tab label="Offer" />
            <Tab label="Activity" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Details Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Name */}
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                fullWidth
                disabled={saving}
              />

              {/* Email */}
              <Box>
                <TextField
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  fullWidth
                  disabled={saving}
                  InputProps={{
                    endAdornment: formData.email ? (
                      <InputAdornment position="end">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ) : undefined,
                  }}
                />

                {/* Apollo Email Fetch Button - Only show when email is empty */}
                {!formData.email && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleFetchEmail}
                    disabled={apolloLoading || !formData.name || !formData.company}
                    startIcon={apolloLoading ? <CircularProgress size={16} /> : <EmailIcon />}
                    sx={{
                      mt: 1,
                      textTransform: 'none',
                      borderColor: '#2196f3',
                      color: '#2196f3',
                      '&:hover': {
                        borderColor: '#1976d2',
                        bgcolor: 'rgba(33, 150, 243, 0.04)',
                      },
                    }}
                  >
                    {apolloLoading ? 'Fetching...' : 'Get email from Apollo.io (costs 1 credit)'}
                  </Button>
                )}

                {/* Success/Error Messages */}
                {apolloSuccess && (
                  <Alert severity="success" sx={{ mt: 1 }} onClose={() => setApolloSuccess(null)}>
                    {apolloSuccess}
                  </Alert>
                )}
                {apolloError && (
                  <Alert severity="error" sx={{ mt: 1 }} onClose={() => setApolloError(null)}>
                    {apolloError}
                  </Alert>
                )}
              </Box>

              {/* Phone */}
              <TextField
                label="Phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                fullWidth
                disabled={saving}
              />

              {/* Company */}
              <TextField
                label="Company"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                required
                fullWidth
                disabled={saving}
                helperText="Will be auto-created if it doesn't exist"
              />

              {/* Status */}
              <TextField
                select
                label="Status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as any)}
                required
                fullWidth
                disabled={saving}
              >
                {stages.map((stage) => (
                  <MenuItem key={stage.id} value={stage.id}>
                    {stage.label}
                  </MenuItem>
                ))}
              </TextField>

              {/* Custom Fields Section - Exclude LinkedIn/Email fields (they appear in Outreach tab) */}
              {formData.customFields && Object.keys(formData.customFields).filter(key => !key.startsWith('linkedin_') && !key.startsWith('email_')).length > 0 && (
                <>
                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2, mt: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: '#667eea',
                        mb: 2,
                      }}
                    >
                      Custom Fields
                    </Typography>
                  </Box>

                  {Object.keys(formData.customFields)
                    .filter((key) => !key.startsWith('linkedin_') && !key.startsWith('email_'))
                    .sort()
                    .map((fieldName) => {
                    const fieldLabel = fieldName
                      .split('_')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');

                    const fieldValue = formData.customFields?.[fieldName] ?? '';

                    // Determine field type based on field name
                    const isNumberField = fieldName.toLowerCase().includes('rating') ||
                                         fieldName.toLowerCase().includes('count') ||
                                         fieldName.toLowerCase().includes('score') ||
                                         fieldName.toLowerCase().includes('value');

                    const isUrlField = fieldName.toLowerCase().includes('link') ||
                                      fieldName.toLowerCase().includes('url') ||
                                      fieldName.toLowerCase().includes('website');

                    return (
                      <TextField
                        key={fieldName}
                        fullWidth
                        label={fieldLabel}
                        value={fieldValue}
                        onChange={(e) => {
                          const value = isNumberField ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
                          setFormData({
                            ...formData,
                            customFields: {
                              ...formData.customFields,
                              [fieldName]: value,
                            },
                          });
                        }}
                        disabled={saving}
                        type={isNumberField ? 'number' : 'text'}
                        placeholder={
                          isNumberField
                            ? 'Enter a number'
                            : isUrlField
                            ? 'https://example.com'
                            : `Enter ${fieldLabel.toLowerCase()}`
                        }
                        helperText={
                          isUrlField
                            ? 'URL to the resource'
                            : isNumberField
                            ? 'Numeric value'
                            : undefined
                        }
                        sx={{ mb: 2 }}
                      />
                    );
                  })}
                </>
              )}

              {/* Time in Current State */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Time in Current State
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {lead.stateHistory && lead.stateHistory[lead.status]
                    ? (() => {
                        const entryDate = new Date(lead.stateHistory[lead.status]!);
                        const now = new Date();
                        const diffTime = Math.abs(now.getTime() - entryDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays === 0
                          ? 'Just entered'
                          : diffDays === 1
                          ? '1 day'
                          : `${diffDays} days`;
                      })()
                    : 'No data'}
                </Typography>
              </Box>

              {/* Cumulative State Durations */}
              {lead.stateDurations && (
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Cumulative Time by Stage
                  </Typography>
                  {Object.entries(lead.stateDurations).map(([status, days]) => (
                    <Box
                      key={status}
                      sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {getLabel(status as any)}:
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {days} {days === 1 ? 'day' : 'days'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* Outreach Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Info Note for CSV Imported Fields */}
              {((formData.customFields && Object.keys(formData.customFields).some(key => key.startsWith('linkedin_') || key.startsWith('email_'))) && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  The fields shown below are based on the columns from your CSV import. You can edit these values or add new fields as needed.
                </Alert>
              ))}

              {/* Company Offer Section */}
              {company?.offer?.blogIdea && (
                <Paper
                  sx={{
                    p: 3,
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    borderRadius: '12px',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: '#667eea',
                      mb: 1,
                      textTransform: 'uppercase',
                      fontSize: '12px',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Company Offer
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: '#1e293b',
                      mb: 0.5,
                    }}
                  >
                    Blog Idea
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#64748b',
                      lineHeight: 1.6,
                    }}
                  >
                    {company.offer.blogIdea}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 2,
                      color: '#94a3b8',
                    }}
                  >
                    Last updated: {new Date(company.offer.updatedAt).toLocaleString()}
                  </Typography>
                </Paper>
              )}

              {/* LinkedIn Outreach Section */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LinkedInIcon sx={{ color: '#0077b5' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px' }}>
                    LinkedIn Outreach
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={linkedInStatus}
                        onChange={(e) => setLinkedInStatus(e.target.value as any)}
                        label="Status"
                        disabled={saving}
                      >
                        <MenuItem value="not_sent">Not Sent</MenuItem>
                        <MenuItem value="sent">Sent</MenuItem>
                        <MenuItem value="opened">Opened</MenuItem>
                        <MenuItem value="replied">Replied</MenuItem>
                        <MenuItem value="refused">Refused</MenuItem>
                        <MenuItem value="no_response">No Response</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="LinkedIn Profile URL"
                      value={linkedInProfileUrl}
                      onChange={(e) => setLinkedInProfileUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      disabled={saving}
                    />
                  </Grid>

                  {/* LinkedIn Custom Fields from CSV Import */}
                  {formData.customFields && Object.entries(formData.customFields)
                    .filter(([key]) => key.startsWith('linkedin_'))
                    .map(([key, value]) => {
                      const fieldLabel = key
                        .replace('linkedin_', '')
                        .split('_')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');

                      return (
                        <Grid size={{ xs: 12 }} key={key}>
                          <TextField
                            fullWidth
                            label={fieldLabel}
                            value={value || ''}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                customFields: {
                                  ...formData.customFields,
                                  [key]: e.target.value,
                                },
                              });
                            }}
                            disabled={saving}
                          />
                        </Grid>
                      );
                    })}
                </Grid>
              </Box>

              <Divider />

              {/* Email Outreach Section */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <EmailIcon sx={{ color: '#ea4335' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px' }}>
                    Email Outreach
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={emailStatus}
                        onChange={(e) => setEmailStatus(e.target.value as any)}
                        label="Status"
                        disabled={saving}
                      >
                        <MenuItem value="not_sent">Not Sent</MenuItem>
                        <MenuItem value="sent">Sent</MenuItem>
                        <MenuItem value="opened">Opened</MenuItem>
                        <MenuItem value="replied">Replied</MenuItem>
                        <MenuItem value="bounced">Bounced</MenuItem>
                        <MenuItem value="refused">Refused</MenuItem>
                        <MenuItem value="no_response">No Response</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Email Custom Fields from CSV Import */}
                  {formData.customFields && Object.entries(formData.customFields)
                    .filter(([key]) => key.startsWith('email_'))
                    .map(([key, value]) => {
                      const fieldLabel = key
                        .replace('email_', '')
                        .split('_')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');

                      return (
                        <Grid size={{ xs: 12 }} key={key}>
                          <TextField
                            fullWidth
                            label={fieldLabel}
                            value={value || ''}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                customFields: {
                                  ...formData.customFields,
                                  [key]: e.target.value,
                                },
                              });
                            }}
                            disabled={saving}
                          />
                        </Grid>
                      );
                    })}
                </Grid>
              </Box>
            </Box>
          </TabPanel>

          {/* Offer Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Info Alert */}
              <Alert
                severity="info"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => navigate('/settings')}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Go to Settings
                  </Button>
                }
              >
                The offer template is configured globally in Settings. You can preview how it will look for this lead below.
              </Alert>

              {/* Available Variables Section */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2, color: '#1e293b', fontWeight: 600 }}>
                  Available Variables ({availableVariables.length})
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
                  Click a variable to insert it, or click the copy icon to copy it to clipboard
                </Typography>

                {/* Group variables by section */}
                {Object.entries(
                  availableVariables.reduce((acc, variable) => {
                    if (!acc[variable.section]) {
                      acc[variable.section] = [];
                    }
                    acc[variable.section].push(variable);
                    return acc;
                  }, {} as Record<string, typeof availableVariables>)
                ).map(([section, vars]) => {
                  const sectionStyle = getSectionStyle(section);
                  return (
                    <Box key={section} sx={{ mb: 3 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 1.5,
                          p: 1,
                          borderRadius: 1,
                          bgcolor: sectionStyle.bgColor,
                          border: `1px solid ${sectionStyle.color}30`,
                        }}
                      >
                        <Box sx={{ color: sectionStyle.color, display: 'flex', alignItems: 'center' }}>
                          {sectionStyle.icon}
                        </Box>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            color: sectionStyle.color,
                            fontWeight: 700,
                            fontSize: '13px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {section}
                        </Typography>
                        <Chip
                          label={sectionStyle.category === 'lead' ? 'LEAD' : 'COMPANY'}
                          size="small"
                          sx={{
                            height: '18px',
                            fontSize: '10px',
                            fontWeight: 700,
                            ml: 'auto',
                            bgcolor: sectionStyle.color,
                            color: 'white',
                            '& .MuiChip-label': {
                              px: 1,
                            },
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {vars.map((variable) => (
                          <Chip
                            key={variable.variable}
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography
                                  variant="caption"
                                  sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12px' }}
                                >
                                  {variable.variable}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '11px' }}>
                                  - {variable.label}
                                </Typography>
                              </Box>
                            }
                            deleteIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
                            onDelete={() => {
                              navigator.clipboard.writeText(variable.variable);
                              setSnackbar({
                                open: true,
                                message: `Copied ${variable.variable} to clipboard`,
                                severity: 'success',
                              });
                            }}
                            sx={{
                              bgcolor: '#f8fafc',
                              border: `1px solid ${sectionStyle.color}20`,
                              '&:hover': {
                                bgcolor: sectionStyle.bgColor,
                                borderColor: sectionStyle.color,
                              },
                              '& .MuiChip-deleteIcon': {
                                color: sectionStyle.color,
                                '&:hover': {
                                  color: sectionStyle.color,
                                  opacity: 0.8,
                                },
                              },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              {/* Template Preview (Read-only) */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2, color: '#1e293b', fontWeight: 600 }}>
                  Template
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
                  This is the global template from Settings. Variables will be replaced with lead data.
                </Typography>

                {templateLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      p: 3,
                      bgcolor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      color: '#64748b',
                      whiteSpace: 'pre-wrap',
                      minHeight: '150px',
                    }}
                  >
                    {offerTemplate || 'No template configured yet. Go to Settings to create one.'}
                  </Box>
                )}
              </Box>

              {/* Preview Section */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2, color: '#1e293b', fontWeight: 600 }}>
                  Preview (with current lead data)
                </Typography>
                <Box
                  sx={{
                    p: 3,
                    bgcolor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontFamily: 'system-ui',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: '#1e293b',
                    whiteSpace: 'pre-wrap',
                    minHeight: '100px',
                  }}
                >
                  {renderPreview()}
                </Box>
              </Box>
            </Box>
          </TabPanel>

          {/* Activity Tab */}
          <TabPanel value={tabValue} index={3}>
            {activityLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : statusChanges.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No activity yet
              </Typography>
            ) : (
              <List>
                {statusChanges.map((change) => (
                  <ListItem
                    key={change.id}
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      borderLeft: '2px solid',
                      borderColor: 'primary.main',
                      pl: 2,
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      {change.fromStatus ? (
                        <>
                          <Chip
                            label={getLabel(change.fromStatus as any)}
                            size="small"
                            variant="outlined"
                          />
                          <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                            →
                          </Typography>
                        </>
                      ) : (
                        <Chip label="Created" size="small" color="success" />
                      )}
                      <Chip
                        label={getLabel(change.toStatus as any)}
                        size="small"
                        color="primary"
                      />
                    </Box>

                    <ListItemText
                      primary={
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(change.changedAt)}
                          {change.changedBy && ` • Changed by user ${change.changedBy}`}
                        </Typography>
                      }
                      secondary={change.notes}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>

          {/* Archive/Delete Actions Row */}
          <Box sx={{ display: 'flex', gap: 1, mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              onClick={handleArchiveToggle}
              startIcon={lead.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
              color="warning"
              disabled={saving}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {lead.archived ? 'Unarchive' : 'Archive'}
            </Button>
            <Button
              onClick={handleDelete}
              startIcon={<DeleteIcon />}
              color="error"
              disabled={saving}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Lead?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{lead.name}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            disabled={deleting}
            variant="contained"
            color="error"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {deleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for success/error notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LeadDetailPage;
