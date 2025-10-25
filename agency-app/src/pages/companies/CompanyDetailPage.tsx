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
  Search as SearchIcon,
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
  analyzeWritingProgramDetails,
  analyzeBlog,
  WritingProgramResult,
} from '../../services/firebase/cloudFunctions';
import { enrichOrganization } from '../../services/api/apolloService';
import { WritingProgramSection } from '../../components/features/companies/WritingProgramSection';
import { BlogAnalysisSection } from '../../components/features/companies/BlogAnalysisSection';
import { WebsiteFieldMappingDialog } from '../../components/features/companies/WebsiteFieldMappingDialog';
import { WritingProgramUrlSelectionDialog } from '../../components/features/companies/WritingProgramUrlSelectionDialog';
import { LeadDiscoveryDialog } from '../../components/features/companies/LeadDiscoveryDialog';
import {
  getCompanyWebsite,
  getWebsiteFieldMapping,
} from '../../services/api/websiteFieldMappingService';

export const CompanyDetailPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false); // Start in view mode, enter edit after analysis
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
  const [apolloEnrichmentLoading, setApolloEnrichmentLoading] = useState(false);
  const [apolloEnrichmentError, setApolloEnrichmentError] = useState<string | null>(null);

  // Website mapping dialog state
  const [websiteMappingDialogOpen, setWebsiteMappingDialogOpen] = useState(false);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [pendingAnalysisType, setPendingAnalysisType] = useState<'writing' | 'blog' | null>(null);

  // URL selection dialog state
  const [urlSelectionDialogOpen, setUrlSelectionDialogOpen] = useState(false);
  const [foundUrls, setFoundUrls] = useState<Array<{
    url: string;
    source: 'pattern' | 'ai';
    confidence?: 'high' | 'medium' | 'low';
    verified?: boolean;
  }>>([]);
  const [detailsAnalysisLoading, setDetailsAnalysisLoading] = useState(false);

  // Lead discovery dialog state
  const [leadDiscoveryDialogOpen, setLeadDiscoveryDialogOpen] = useState(false);

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

  // Handle writing program analysis (Phase 1: Find URLs)
  const handleAnalyzeWritingProgram = async () => {
    if (!company) return;

    // Get website using mapping - check formData first (in case user hasn't saved yet)
    let website = formData.website || getCompanyWebsite(company);

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
      // Phase 1: Find URLs
      const result = await analyzeWritingProgram(website);

      if (result.validUrls.length === 0 && (!result.aiSuggestions || result.aiSuggestions.length === 0)) {
        // No URLs found at all
        setWritingProgramError('No writing program URLs found for this website');
        setWritingProgramLoading(false);
        return;
      }

      // Prepare URLs for selection
      const urlOptions: Array<{
        url: string;
        source: 'pattern' | 'ai';
        confidence?: 'high' | 'medium' | 'low';
        verified?: boolean;
      }> = [];

      // Add pattern-matched URLs (from validUrls)
      result.validUrls.forEach((urlResult) => {
        urlOptions.push({
          url: urlResult.url,
          source: 'pattern',
          verified: true,
        });
      });

      // Add AI suggestions
      if (result.aiSuggestions) {
        result.aiSuggestions.forEach((suggestion) => {
          // Don't duplicate if already in validUrls
          if (!urlOptions.some(u => u.url === suggestion.url)) {
            urlOptions.push({
              url: suggestion.url,
              source: 'ai',
              confidence: suggestion.confidence,
              verified: suggestion.verified,
            });
          }
        });
      }

      // Show URL selection dialog
      setFoundUrls(urlOptions);
      setUrlSelectionDialogOpen(true);
      setWritingProgramLoading(false);
    } catch (err: any) {
      console.error('Error finding writing program URLs:', err);
      setWritingProgramError(err.message || 'Failed to find writing program URLs');
      setWritingProgramLoading(false);
    }
  };

  // Handle URL selection and detailed analysis (Phase 2: Analyze selected URL)
  const handleUrlSelected = async (selectedUrl: string) => {
    if (!company) return;

    setDetailsAnalysisLoading(true);
    setWritingProgramError(null);

    try {
      // Phase 2: Analyze the selected URL in detail
      const detailsResult = await analyzeWritingProgramDetails(
        selectedUrl,
        company.id
      );

      const analysisData: any = {
        hasProgram: detailsResult.hasProgram,
        programUrl: detailsResult.programUrl,
        isOpen: detailsResult.isOpen,
        openDates: detailsResult.openDates,
        payment: detailsResult.payment,
        requirements: detailsResult.requirements,
        requirementTypes: detailsResult.requirementTypes,
        submissionGuidelines: detailsResult.submissionGuidelines,
        contactEmail: detailsResult.contactEmail,
        responseTime: detailsResult.responseTime,
        programDetails: detailsResult.programDetails,
        lastAnalyzedAt: new Date(),
        aiReasoning: detailsResult.aiReasoning,
      };

      // Only add costInfo if it exists
      if (detailsResult.costInfo) {
        analysisData.costInfo = {
          totalCost: detailsResult.costInfo.totalCost,
          totalTokens: detailsResult.costInfo.totalTokens,
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

      // Close dialog
      setUrlSelectionDialogOpen(false);
      setFoundUrls([]);

      // Enter edit mode after successful analysis
      setEditMode(true);
    } catch (err: any) {
      console.error('Error analyzing writing program details:', err);
      setWritingProgramError(err.message || 'Failed to analyze writing program details');
    } finally {
      setDetailsAnalysisLoading(false);
    }
  };

  // Handle blog analysis
  const handleAnalyzeBlog = async (blogUrl?: string) => {
    if (!company) return;

    // Use provided URL or fall back to website
    let urlToAnalyze = blogUrl;

    if (!urlToAnalyze) {
      // Get website using mapping - check formData first (in case user hasn't saved yet)
      urlToAnalyze = formData.website || getCompanyWebsite(company);

      if (!urlToAnalyze) {
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
    }

    setBlogAnalysisLoading(true);
    setBlogAnalysisError(null);

    try {
      const result = await analyzeBlog(company.name, urlToAnalyze);

      // Parse writer information
      const authorNames = result.authorNames ? result.authorNames.split(', ') : [];
      const areEmployees = result.authorsAreEmployees === 'employees' || result.authorsAreEmployees === 'mixed';
      const areFreelancers = result.authorsAreEmployees === 'freelancers' || result.authorsAreEmployees === 'mixed';

      // Use backend's content quality rating if available, otherwise fallback to old logic
      let rating: 'low' | 'medium' | 'high' = result.contentQualityRating || 'low';
      if (!result.contentQualityRating) {
        // Fallback logic for backward compatibility
        if (result.isDeveloperB2BSaas && result.coversAiTopics) {
          rating = 'high';
        } else if (result.isDeveloperB2BSaas || result.coversAiTopics) {
          rating = 'medium';
        }
      }

      // Build blogNature object conditionally to avoid undefined values
      const blogNature: any = {
        isAIWritten: result.isAIWritten || false,
        isTechnical: result.technicalDepth === 'advanced' || result.technicalDepth === 'intermediate',
        rating,
        hasCodeExamples: result.hasCodeExamples || false,
        codeExamplesCount: result.codeExamplesCount || 0,
        codeLanguages: result.codeLanguages || [],
        hasDiagrams: result.hasDiagrams || false,
        diagramsCount: result.diagramsCount || 0,
        exampleQuotes: result.exampleQuotes || [],
      };

      // Only add optional fields if they have values (Firestore doesn't allow undefined)
      if (result.aiWrittenConfidence) {
        blogNature.aiWrittenConfidence = result.aiWrittenConfidence;
      }
      if (result.aiWrittenEvidence) {
        blogNature.aiWrittenEvidence = result.aiWrittenEvidence;
      }
      if (result.technicalDepth) {
        blogNature.technicalDepth = result.technicalDepth;
      }
      if (result.funnelStage) {
        blogNature.funnelStage = result.funnelStage;
      }
      if (result.contentQualityReasoning) {
        blogNature.reasoning = result.contentQualityReasoning;
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
        blogNature,
        isDeveloperB2BSaas: result.isDeveloperB2BSaas,
        contentSummary: result.contentSummary,
        blogUrl: result.blogLinkUsed || null,
        lastPostUrl: result.lastPostUrl || null,
        rssFeedUrl: result.rssFeedUrl || null,
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

      // Enter edit mode after successful analysis
      setEditMode(true);
    } catch (err: any) {
      console.error('Error analyzing blog:', err);
      setBlogAnalysisError(err.message || 'Failed to analyze blog');
    } finally {
      setBlogAnalysisLoading(false);
    }
  };

  // Handle Apollo enrichment
  const handleApolloEnrichment = async () => {
    if (!company) return;

    // Get website using mapping - check formData first (in case user hasn't saved yet)
    let website = formData.website || getCompanyWebsite(company);

    if (!website) {
      // No website found, check if mapping is set
      const mapping = getWebsiteFieldMapping();
      if (!mapping) {
        // No mapping set, show dialog to configure
        setPendingAnalysisType('blog'); // Reuse blog type for simplicity
        setWebsiteMappingDialogOpen(true);
        return;
      }

      // Mapping is set but this company doesn't have that field
      setApolloEnrichmentError('This company does not have a website field set');
      return;
    }

    setApolloEnrichmentLoading(true);
    setApolloEnrichmentError(null);

    try {
      const result = await enrichOrganization({
        domain: website,
        companyId: company.id,
      });

      if (!result.enriched || !result.organization) {
        throw new Error(result.error || 'Failed to enrich organization');
      }

      // Organization data is already saved to Firestore by the cloud function
      // Just update local state
      const updatedCompany = await getCompany(company.id);
      if (updatedCompany) {
        setCompany(updatedCompany);
      }
    } catch (err: any) {
      console.error('Error enriching organization:', err);
      setApolloEnrichmentError(err.message || 'Failed to enrich organization with Apollo');
    } finally {
      setApolloEnrichmentLoading(false);
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
              {editMode && !blogAnalysisLoading && !writingProgramLoading ? (
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
              ) : !blogAnalysisLoading && !writingProgramLoading ? (
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
              ) : null}
            </Box>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 4 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Details" />
            <Tab label={`Leads (${companyLeads.length})`} />
            <Tab label="Writing Program" />
            <Tab label="Blog" />
            <Tab label="Apollo Enrichment" />
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

              {/* Custom Fields Section */}
              {formData.customFields && Object.keys(formData.customFields).length > 0 && (
                <>
                  <Grid size={{ xs: 12 }}>
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
                  </Grid>

                  {Object.keys(formData.customFields).sort().map((fieldName) => {
                    const fieldLabel = fieldName
                      .split('_')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');

                    const fieldValue = formData.customFields?.[fieldName] ?? '';

                    // Determine field type based on field name
                    const isNumberField = fieldName.toLowerCase().includes('rating') ||
                                         fieldName.toLowerCase().includes('count') ||
                                         fieldName.toLowerCase().includes('score');

                    const isUrlField = fieldName.toLowerCase().includes('link') ||
                                      fieldName.toLowerCase().includes('url') ||
                                      fieldName.toLowerCase().includes('website');

                    return (
                      <Grid size={{ xs: 12, md: isUrlField ? 12 : 6 }} key={fieldName}>
                        <TextField
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
                          disabled={!editMode || saving}
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
                        />
                      </Grid>
                    );
                  })}
                </>
              )}
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
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    No leads found for this company
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<SearchIcon />}
                    onClick={() => setLeadDiscoveryDialogOpen(true)}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 3,
                      py: 1.5,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                      },
                    }}
                  >
                    Discover Leads with Apollo
                  </Button>
                </Box>
              ) : (
                <Box>
                  {/* Discover More Leads Button */}
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      startIcon={<SearchIcon />}
                      onClick={() => setLeadDiscoveryDialogOpen(true)}
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
                      Discover More Leads
                    </Button>
                  </Box>

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
                </Box>
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
          {tabValue === 3 && (
            <BlogAnalysisSection
              company={company}
              onAnalyze={handleAnalyzeBlog}
              loading={blogAnalysisLoading}
              error={blogAnalysisError}
            />
          )}

          {/* Apollo Enrichment Tab */}
          {tabValue === 4 && (
            <Box>
              {apolloEnrichmentError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {apolloEnrichmentError}
                </Alert>
              )}

              {!company?.apolloEnrichment && (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#64748b' }}>
                    No enrichment data available
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, color: '#94a3b8' }}>
                    Enrich this company with Apollo.io to get employee count, funding details, technologies, and more.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleApolloEnrichment}
                    disabled={apolloEnrichmentLoading}
                    startIcon={apolloEnrichmentLoading ? <CircularProgress size={20} /> : <SearchIcon />}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      textTransform: 'none',
                      px: 4,
                    }}
                  >
                    {apolloEnrichmentLoading ? 'Enriching...' : 'Enrich with Apollo'}
                  </Button>
                </Box>
              )}

              {company?.apolloEnrichment && (
                <Box>
                  {/* Header with Re-enrich button */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Company Data from Apollo.io
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleApolloEnrichment}
                      disabled={apolloEnrichmentLoading}
                      startIcon={apolloEnrichmentLoading ? <CircularProgress size={16} /> : <SearchIcon />}
                      sx={{ textTransform: 'none' }}
                    >
                      {apolloEnrichmentLoading ? 'Enriching...' : 'Re-enrich'}
                    </Button>
                  </Box>

                  <Grid container spacing={3}>
                    {/* Company Overview */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#64748b' }}>
                          Overview
                        </Typography>

                        {company.apolloEnrichment.employeeCount && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Employee Count</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {company.apolloEnrichment.employeeCount.toLocaleString()}
                              {company.apolloEnrichment.employeeRange && ` (${company.apolloEnrichment.employeeRange})`}
                            </Typography>
                          </Box>
                        )}

                        {company.apolloEnrichment.foundedYear && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Founded Year</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {company.apolloEnrichment.foundedYear}
                            </Typography>
                          </Box>
                        )}

                        {company.apolloEnrichment.industry && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Industry</Typography>
                            <Typography variant="body1">{company.apolloEnrichment.industry}</Typography>
                          </Box>
                        )}

                        {company.apolloEnrichment.description && (
                          <Box>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Description</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {company.apolloEnrichment.description}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    </Grid>

                    {/* Funding Information */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#64748b' }}>
                          Funding
                        </Typography>

                        {company.apolloEnrichment.totalFundingFormatted ? (
                          <>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>Total Funding</Typography>
                              <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                                {company.apolloEnrichment.totalFundingFormatted}
                              </Typography>
                            </Box>

                            {company.apolloEnrichment.latestFundingStage && (
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Latest Funding Stage</Typography>
                                <Chip
                                  label={company.apolloEnrichment.latestFundingStage}
                                  size="small"
                                  sx={{ mt: 0.5, bgcolor: '#e0e7ff', color: '#4f46e5', fontWeight: 600 }}
                                />
                              </Box>
                            )}

                            {company.apolloEnrichment.latestFundingDate && (
                              <Box>
                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Latest Funding Date</Typography>
                                <Typography variant="body2">
                                  {new Date(company.apolloEnrichment.latestFundingDate).toLocaleDateString()}
                                </Typography>
                              </Box>
                            )}
                          </>
                        ) : (
                          <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                            No funding information available
                          </Typography>
                        )}

                        {company.apolloEnrichment.publiclyTraded && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: '#f3f4f6', borderRadius: 1 }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                              Publicly Traded
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {company.apolloEnrichment.publiclyTraded.symbol}
                              {company.apolloEnrichment.publiclyTraded.exchange && ` (${company.apolloEnrichment.publiclyTraded.exchange})`}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    </Grid>

                    {/* Technologies */}
                    {company.apolloEnrichment.technologies && company.apolloEnrichment.technologies.length > 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Paper sx={{ p: 3 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#64748b' }}>
                            Technologies ({company.apolloEnrichment.technologies.length})
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {company.apolloEnrichment.technologies.map((tech, index) => (
                              <Chip
                                key={index}
                                label={tech}
                                size="small"
                                sx={{
                                  bgcolor: '#f1f5f9',
                                  color: '#475569',
                                  fontWeight: 500,
                                  fontSize: '12px',
                                }}
                              />
                            ))}
                          </Box>
                        </Paper>
                      </Grid>
                    )}

                    {/* Social Links */}
                    <Grid size={{ xs: 12 }}>
                      <Paper sx={{ p: 3 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#64748b' }}>
                          Social & Contact
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          {company.apolloEnrichment.linkedinUrl && (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<LinkedInIcon />}
                              href={company.apolloEnrichment.linkedinUrl}
                              target="_blank"
                              sx={{ textTransform: 'none' }}
                            >
                              LinkedIn
                            </Button>
                          )}
                          {company.apolloEnrichment.twitterUrl && (
                            <Button
                              variant="outlined"
                              size="small"
                              href={company.apolloEnrichment.twitterUrl}
                              target="_blank"
                              sx={{ textTransform: 'none' }}
                            >
                              Twitter
                            </Button>
                          )}
                          {company.apolloEnrichment.facebookUrl && (
                            <Button
                              variant="outlined"
                              size="small"
                              href={company.apolloEnrichment.facebookUrl}
                              target="_blank"
                              sx={{ textTransform: 'none' }}
                            >
                              Facebook
                            </Button>
                          )}
                          {company.apolloEnrichment.crunchbaseUrl && (
                            <Button
                              variant="outlined"
                              size="small"
                              href={company.apolloEnrichment.crunchbaseUrl}
                              target="_blank"
                              sx={{ textTransform: 'none' }}
                            >
                              Crunchbase
                            </Button>
                          )}
                          {company.apolloEnrichment.phone && (
                            <Chip
                              icon={<EmailIcon />}
                              label={company.apolloEnrichment.phone}
                              size="small"
                              sx={{ bgcolor: '#f1f5f9' }}
                            />
                          )}
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Keywords & Industries */}
                    {((company.apolloEnrichment.keywords && company.apolloEnrichment.keywords.length > 0) ||
                      (company.apolloEnrichment.industries && company.apolloEnrichment.industries.length > 0)) && (
                      <Grid size={{ xs: 12 }}>
                        <Paper sx={{ p: 3 }}>
                          {company.apolloEnrichment.keywords && company.apolloEnrichment.keywords.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#64748b' }}>
                                Keywords
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {company.apolloEnrichment.keywords.map((keyword, index) => (
                                  <Chip
                                    key={index}
                                    label={keyword}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '12px' }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}

                          {company.apolloEnrichment.industries && company.apolloEnrichment.industries.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#64748b' }}>
                                Industries
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {company.apolloEnrichment.industries.map((industry, index) => (
                                  <Chip
                                    key={index}
                                    label={industry}
                                    size="small"
                                    sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 500 }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Paper>
                      </Grid>
                    )}

                    {/* Cost Info */}
                    {company.apolloEnrichment.costInfo && (
                      <Grid size={{ xs: 12 }}>
                        <Alert severity="info" sx={{ fontSize: '12px' }}>
                          <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                            Apollo Credits Used: {company.apolloEnrichment.costInfo.credits}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Last enriched: {company.apolloEnrichment.lastEnrichedAt ?
                              new Date(company.apolloEnrichment.lastEnrichedAt).toLocaleString() : 'Unknown'}
                          </Typography>
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </Box>
          )}
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

      {/* URL Selection Dialog */}
      <WritingProgramUrlSelectionDialog
        open={urlSelectionDialogOpen}
        onClose={() => {
          setUrlSelectionDialogOpen(false);
          setFoundUrls([]);
        }}
        onSelect={handleUrlSelected}
        urls={foundUrls}
        loading={detailsAnalysisLoading}
      />

      {/* Lead Discovery Dialog */}
      {company && (
        <LeadDiscoveryDialog
          open={leadDiscoveryDialogOpen}
          onClose={() => setLeadDiscoveryDialogOpen(false)}
          company={company}
          onImportComplete={(count) => {
            console.log(`Successfully imported ${count} leads`);
            // Leads will update automatically via real-time subscription
          }}
        />
      )}
    </Box>
  );
};

export default CompanyDetailPage;
