// src/pages/companies/CompanyDetailPage.tsx
import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { Company, CompanyFormData } from '../../types/crm';
import {
  getCompany,
  updateCompany,
  deleteCompany,
  getCompanies,
  countLeadsForCompany,
} from '../../services/api/companies';
import { subscribeToCompanyLeads, subscribeToCompanyLeadsByName } from '../../services/api/leads';
import { Lead } from '../../types/lead';
import {
  analyzeWritingProgram,
  analyzeBlog,
  extractPaymentInfo,
  extractProgramStatus,
} from '../../services/firebase/cloudFunctions';
import { WritingProgramSection } from '../../components/features/companies/WritingProgramSection';
import { BlogAnalysisSection } from '../../components/features/companies/BlogAnalysisSection';
import { WebsiteFieldMappingDialog } from '../../components/features/companies/WebsiteFieldMappingDialog';
import {
  getCompanyWebsite,
  getWebsiteFieldMapping,
} from '../../services/api/websiteFieldMappingService';

export const CompanyDetailPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');

  // Form data
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    website: '',
    industry: '',
    description: '',
    customFields: {},
  });

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Leads state
  const [companyLeads, setCompanyLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leadCount, setLeadCount] = useState(0);

  // Analysis state
  const [writingProgramLoading, setWritingProgramLoading] = useState(false);
  const [writingProgramError, setWritingProgramError] = useState<string | null>(null);
  const [blogAnalysisLoading, setBlogAnalysisLoading] = useState(false);
  const [blogAnalysisError, setBlogAnalysisError] = useState<string | null>(null);

  // Website mapping dialog state
  const [websiteMappingDialogOpen, setWebsiteMappingDialogOpen] = useState(false);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [pendingAnalysisType, setPendingAnalysisType] = useState<'writing' | 'blog' | null>(null);

  // Load company data
  useEffect(() => {
    const loadCompany = async () => {
      if (!companyId) {
        navigate('/companies');
        return;
      }

      try {
        setLoading(true);
        const companyData = await getCompany(companyId);

        if (!companyData) {
          setError('Company not found');
          setTimeout(() => navigate('/companies'), 2000);
          return;
        }

        setCompany(companyData);
        setFormData({
          name: companyData.name || '',
          website: companyData.website || '',
          industry: companyData.industry || '',
          description: companyData.description || '',
          customFields: companyData.customFields || {},
        });

        // Get lead count
        const count = await countLeadsForCompany(companyId);
        setLeadCount(count);
      } catch (err) {
        console.error('Error loading company:', err);
        setError('Failed to load company');
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, [companyId, navigate]);

  // Load all companies for website mapping dialog
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const companies = await getCompanies();
        setAllCompanies(companies);
      } catch (error) {
        console.error('Error loading companies:', error);
      }
    };

    loadCompanies();
  }, []);

  // Subscribe to company leads
  useEffect(() => {
    if (!company) return;

    setLeadsLoading(true);

    // First, try querying by companyId
    const unsubscribeById = subscribeToCompanyLeads(company.id, (leadsById) => {
      if (leadsById.length > 0) {
        // Found leads with companyId
        setCompanyLeads(leadsById);
        setLeadsLoading(false);
      } else {
        // No leads found by ID, try fallback query by company name
        // (for legacy leads that don't have companyId)
        const unsubscribeByName = subscribeToCompanyLeadsByName(company.name, (leadsByName) => {
          setCompanyLeads(leadsByName);
          setLeadsLoading(false);
        });

        // Return cleanup for both subscriptions
        return () => {
          unsubscribeById();
          unsubscribeByName();
        };
      }
    });

    return () => {
      unsubscribeById();
    };
  }, [company]);

  const handleChange = (field: keyof CompanyFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
    setDuplicateWarning('');
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Company name is required');
      return false;
    }

    // Validate website URL if provided
    if (formData.website && formData.website.trim()) {
      try {
        // Check if it's a valid URL format
        const url = formData.website.startsWith('http')
          ? formData.website
          : `https://${formData.website}`;
        new URL(url);
      } catch {
        setError('Please enter a valid website URL (e.g., example.com or https://example.com)');
        return false;
      }
    }

    return true;
  };

  const checkDuplicateName = async (): Promise<boolean> => {
    try {
      const allCompanies = await getCompanies();
      const normalizedName = formData.name.trim().toLowerCase();

      const duplicate = allCompanies.find(c =>
        c.name.toLowerCase() === normalizedName &&
        c.id !== company?.id
      );

      if (duplicate) {
        setDuplicateWarning(
          `A company named "${duplicate.name}" already exists. Do you want to continue anyway?`
        );
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error checking for duplicate:', err);
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm() || !company) {
      return;
    }

    // Check for duplicates (only show warning, don't block)
    if (!duplicateWarning) {
      const hasDuplicate = await checkDuplicateName();
      if (hasDuplicate) {
        return; // Show warning first, user needs to submit again to confirm
      }
    }

    setSaving(true);
    setError('');

    try {
      // Normalize website URL
      let normalizedWebsite = formData.website?.trim();
      if (normalizedWebsite && !normalizedWebsite.startsWith('http')) {
        normalizedWebsite = `https://${normalizedWebsite}`;
      }

      const companyData: any = {
        name: formData.name.trim(),
        customFields: formData.customFields || {},
      };

      // Only add fields if they have values (Firestore doesn't allow undefined)
      if (normalizedWebsite) {
        companyData.website = normalizedWebsite;
      }
      if (formData.industry?.trim()) {
        companyData.industry = formData.industry.trim();
      }
      if (formData.description?.trim()) {
        companyData.description = formData.description.trim();
      }

      await updateCompany(company.id, companyData);

      // Update local state
      setCompany({ ...company, ...companyData });
      setEditMode(false);
      setDuplicateWarning('');
    } catch (err: any) {
      console.error('Error saving company:', err);
      setError(err.message || 'Failed to save company. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (company) {
      setFormData({
        name: company.name || '',
        website: company.website || '',
        industry: company.industry || '',
        description: company.description || '',
        customFields: company.customFields || {},
      });
    }
    setEditMode(false);
    setError('');
    setDuplicateWarning('');
  };

  // Handle website mapping dialog save
  const handleWebsiteMappingSave = () => {
    // Mapping saved, now retry the pending analysis
    if (pendingAnalysisType === 'writing') {
      handleAnalyzeWritingProgram();
    } else if (pendingAnalysisType === 'blog') {
      handleAnalyzeBlog();
    }
    setPendingAnalysisType(null);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!company) return;

    setDeleting(true);
    try {
      await deleteCompany(company.id);
      navigate('/companies');
    } catch (error) {
      console.error('Error deleting company:', error);
      setError('Failed to delete company. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle writing program analysis
  const handleAnalyzeWritingProgram = async () => {
    if (!company) return;

    // Get website using mapping
    const website = getCompanyWebsite(company);

    if (!website) {
      // No website found, check if mapping is set
      const mapping = getWebsiteFieldMapping();
      if (!mapping) {
        // No mapping set, show dialog to configure
        setPendingAnalysisType('writing');
        setWebsiteMappingDialogOpen(true);
        return;
      }

      // Mapping is set but this company doesn't have that field
      setWritingProgramError('This company does not have a website field set');
      return;
    }

    setWritingProgramLoading(true);
    setWritingProgramError(null);

    try {
      const result = await analyzeWritingProgram(website);

      // Extract information
      const hasProgram = result.validUrls.length > 0;
      const programUrl = result.validUrls[0]?.url || null;
      const { isOpen, openDates } = extractProgramStatus(result.aiSuggestions);
      const { amount, historical } = extractPaymentInfo(result.aiSuggestions);

      const analysisData: any = {
        hasProgram,
        programUrl,
        isOpen,
        openDates,
        paymentAmount: amount,
        historicalPayment: historical,
        lastAnalyzedAt: new Date(),
        aiReasoning: result.aiReasoning,
      };

      // Only add costInfo if it exists
      if (result.costInfo) {
        analysisData.costInfo = {
          totalCost: result.costInfo.totalCost,
          totalTokens: result.costInfo.totalTokens,
        };
      }

      // Update Firestore
      await updateCompany(company.id, {
        writingProgramAnalysis: analysisData,
      });

      // Update local state
      setCompany({
        ...company,
        writingProgramAnalysis: analysisData,
      });
    } catch (err: any) {
      console.error('Error analyzing writing program:', err);
      setWritingProgramError(err.message || 'Failed to analyze writing program');
    } finally {
      setWritingProgramLoading(false);
    }
  };

  // Handle blog analysis
  const handleAnalyzeBlog = async () => {
    if (!company) return;

    // Get website using mapping
    const website = getCompanyWebsite(company);

    if (!website) {
      // No website found, check if mapping is set
      const mapping = getWebsiteFieldMapping();
      if (!mapping) {
        // No mapping set, show dialog to configure
        setPendingAnalysisType('blog');
        setWebsiteMappingDialogOpen(true);
        return;
      }

      // Mapping is set but this company doesn't have that field
      setBlogAnalysisError('This company does not have a website field set');
      return;
    }

    setBlogAnalysisLoading(true);
    setBlogAnalysisError(null);

    try {
      const result = await analyzeBlog(company.name, website);

      // Parse writer information
      const authorNames = result.authorNames ? result.authorNames.split(', ') : [];
      const areEmployees = result.authorsAreEmployees === 'employees' || result.authorsAreEmployees === 'mixed';
      const areFreelancers = result.authorsAreEmployees === 'freelancers' || result.authorsAreEmployees === 'mixed';

      // Determine content quality rating based on multiple factors
      let rating: 'low' | 'medium' | 'high' = 'low';
      if (result.isDeveloperB2BSaas && result.coversAiTopics) {
        rating = 'high';
      } else if (result.isDeveloperB2BSaas || result.coversAiTopics) {
        rating = 'medium';
      }

      const analysisData: any = {
        lastActivePost: result.lastBlogCreatedAt || null,
        monthlyFrequency: result.blogPostCount,
        writers: {
          count: result.authorCount,
          areEmployees,
          areFreelancers,
          list: authorNames,
        },
        blogNature: {
          isAIWritten: !result.isDeveloperB2BSaas && !result.coversAiTopics, // Assume AI if not technical
          isTechnical: result.isDeveloperB2BSaas,
          rating,
          hasCodeExamples: result.isDeveloperB2BSaas, // Assume code examples if dev-focused
          hasDiagrams: result.isDeveloperB2BSaas, // Assume diagrams if dev-focused
        },
        isDeveloperB2BSaas: result.isDeveloperB2BSaas,
        contentSummary: result.contentSummary,
        blogUrl: result.blogLinkUsed || null,
        lastAnalyzedAt: new Date(),
      };

      // Only add costInfo if it exists
      if (result.costInfo) {
        analysisData.costInfo = {
          totalCost: result.costInfo.totalCost,
          totalTokens: result.costInfo.totalTokens,
        };
      }

      // Update Firestore
      await updateCompany(company.id, {
        blogAnalysis: analysisData,
      });

      // Update local state
      setCompany({
        ...company,
        blogAnalysis: analysisData,
      });
    } catch (err: any) {
      console.error('Error analyzing blog:', err);
      setBlogAnalysisError(err.message || 'Failed to analyze blog');
    } finally {
      setBlogAnalysisLoading(false);
    }
  };

  // Render outreach status badge
  const renderOutreachStatus = (
    status: string | undefined,
    type: 'linkedin' | 'email'
  ) => {
    if (!status || status === 'not_sent') {
      return (
        <Chip
          size="small"
          label="Not Sent"
          sx={{
            bgcolor: '#e5e7eb',
            color: '#6b7280',
            fontSize: '12px',
            height: '24px',
          }}
        />
      );
    }

    const statusConfig: Record<string, { label: string; color: string }> = {
      sent: { label: 'Sent', color: '#3b82f6' },
      opened: { label: 'Opened', color: '#9333ea' },
      replied: { label: 'Replied', color: '#10b981' },
      refused: { label: 'Refused', color: '#ef4444' },
      bounced: { label: 'Bounced', color: '#ef4444' },
      no_response: { label: 'No Response', color: '#f59e0b' },
    };

    const config = statusConfig[status] || { label: status, color: '#6b7280' };

    return (
      <Chip
        size="small"
        label={config.label}
        icon={
          type === 'linkedin' ? (
            <LinkedInIcon sx={{ fontSize: 14, color: 'white' }} />
          ) : (
            <EmailIcon sx={{ fontSize: 14, color: 'white' }} />
          )
        }
        sx={{
          bgcolor: config.color,
          color: 'white',
          fontSize: '12px',
          height: '24px',
          '& .MuiChip-icon': {
            color: 'white',
            marginLeft: '4px',
          },
        }}
      />
    );
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  if (!company) {
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
          Company not found
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/companies')}
          sx={{
            background: 'white',
            color: '#667eea',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.9)',
            },
          }}
        >
          Back to Companies
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
            onClick={() => navigate('/companies')}
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
            Back to Companies
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
                {company.name}
              </Typography>
              {company.industry && (
                <Typography variant="body2" color="text.secondary">
                  {company.industry}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {editMode ? (
                <>
                  <Button
                    startIcon={<CancelIcon />}
                    onClick={handleCancelEdit}
                    disabled={saving}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </Button>
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
                    {saving ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <>
                  <IconButton
                    onClick={() => setEditMode(true)}
                    sx={{
                      color: '#667eea',
                      '&:hover': {
                        bgcolor: 'rgba(102, 126, 234, 0.08)',
                      },
                    }}
                  >
                    <EditIcon />
                  </IconButton>
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
                </>
              )}
            </Box>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 4 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Details" />
            <Tab label={`Leads (${companyLeads.length})`} />
            <Tab label="Writing Program" />
            {/* <Tab label="Blog" /> */}
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {duplicateWarning && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              {duplicateWarning}
            </Alert>
          )}

          {/* Details Tab */}
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  required
                  label="Company Name"
                  value={formData.name}
                  onChange={handleChange('name')}
                  disabled={!editMode || saving}
                  placeholder="e.g., Acme Corporation"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Website"
                  value={formData.website}
                  onChange={handleChange('website')}
                  disabled={!editMode || saving}
                  placeholder="e.g., acme.com or https://acme.com"
                  helperText="Optional - Enter domain name or full URL"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Industry"
                  value={formData.industry}
                  onChange={handleChange('industry')}
                  disabled={!editMode || saving}
                  placeholder="e.g., Technology, Healthcare, Finance"
                  helperText="Optional - Business sector or category"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  value={formData.description}
                  onChange={handleChange('description')}
                  disabled={!editMode || saving}
                  placeholder="Optional notes about this company..."
                  helperText="Optional - Any additional information"
                />
              </Grid>
            </Grid>
          )}

          {/* Leads Tab */}
          {tabValue === 1 && (
            <Box>
              {leadsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : companyLeads.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    No leads found for this company
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>LinkedIn Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Email Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {companyLeads.map((lead) => (
                        <TableRow key={lead.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {lead.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {lead.email || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {renderOutreachStatus(
                              lead.outreach?.linkedIn?.status,
                              'linkedin'
                            )}
                          </TableCell>
                          <TableCell>
                            {renderOutreachStatus(
                              lead.outreach?.email?.status,
                              'email'
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(lead.createdAt)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Writing Program Tab */}
          {tabValue === 2 && (
            <WritingProgramSection
              company={company}
              onAnalyze={handleAnalyzeWritingProgram}
              loading={writingProgramLoading}
              error={writingProgramError}
            />
          )}

          {/* Blog Tab */}
          {/* {tabValue === 3 && (
            <BlogAnalysisSection
              company={company}
              onAnalyze={handleAnalyzeBlog}
              loading={blogAnalysisLoading}
              error={blogAnalysisError}
            />
          )} */}
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {leadCount === 0 ? 'Delete Company?' : 'Cannot Delete Company'}
        </DialogTitle>
        <DialogContent>
          {leadCount === 0 ? (
            <DialogContentText>
              Are you sure you want to delete <strong>{company.name}</strong>?
              This action cannot be undone.
            </DialogContentText>
          ) : (
            <DialogContentText>
              Cannot delete <strong>{company.name}</strong> because it has{' '}
              <strong>{leadCount} associated lead{leadCount !== 1 ? 's' : ''}</strong>.
              <br /><br />
              Please delete or reassign all leads first, then try again.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {leadCount === 0 ? 'Cancel' : 'Close'}
          </Button>
          {leadCount === 0 && (
            <Button
              onClick={confirmDelete}
              disabled={deleting}
              variant="contained"
              color="error"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {deleting ? <CircularProgress size={24} /> : 'Delete'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Website Field Mapping Dialog */}
      <WebsiteFieldMappingDialog
        open={websiteMappingDialogOpen}
        onClose={() => {
          setWebsiteMappingDialogOpen(false);
          setPendingAnalysisType(null);
        }}
        companies={allCompanies}
        onSave={handleWebsiteMappingSave}
      />
    </Box>
  );
};

export default CompanyDetailPage;
