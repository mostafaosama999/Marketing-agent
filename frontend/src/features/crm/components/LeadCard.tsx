import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, IconButton, Chip, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Link } from '@mui/material';
import { Edit as EditIcon, Email as EmailIcon, Phone as PhoneIcon, Business as BusinessIcon, CheckCircle as CheckCircleIcon, Article as ArticleIcon, Check as CheckIcon, Close as CloseIcon, Search as SearchIcon } from '@mui/icons-material';
import { Lead, CustomField, LeadFormData } from '../../../app/types/crm';
import { qualifyCompanyBlog, QualifyBlogResponse, findWritingProgram, FindWritingProgramResponse } from '../../../services/researchApi';
import { updateLead, createLead, getLeads } from '../../../services/crmService';
import { searchPeople, ApolloSearchPerson } from '../../../services/apolloService';
import { TitleSelectionDialog } from './TitleSelectionDialog';
import { LeadSearchResultsDialog } from './LeadSearchResultsDialog';
import { findDuplicates, getDeduplicationConfig } from '../../../services/deduplicationService';

interface LeadCardProps {
  lead: Lead;
  customFields: CustomField[];
  onEdit: (lead: Lead) => void;
  isDragging?: boolean;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, customFields, onEdit, isDragging = false }) => {
  // State for blog qualification
  const [qualifyDialogOpen, setQualifyDialogOpen] = useState(false);
  const [website, setWebsite] = useState('');
  const [isQualifying, setIsQualifying] = useState(false);
  const [qualificationResult, setQualificationResult] = useState<QualifyBlogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State for writing program finder
  const [writingProgramDialogOpen, setWritingProgramDialogOpen] = useState(false);
  const [writingProgramWebsite, setWritingProgramWebsite] = useState('');
  const [isFindingWritingProgram, setIsFindingWritingProgram] = useState(false);
  const [writingProgramResult, setWritingProgramResult] = useState<FindWritingProgramResponse | null>(null);
  const [writingProgramError, setWritingProgramError] = useState<string | null>(null);
  const [approvedUrls, setApprovedUrls] = useState<Set<string>>(new Set());
  const [declinedUrls, setDeclinedUrls] = useState<Set<string>>(new Set());

  // State for Apollo lead search
  const [titleSelectionOpen, setTitleSelectionOpen] = useState(false);
  const [leadSearchResultsOpen, setLeadSearchResultsOpen] = useState(false);
  const [apolloSearchResults, setApolloSearchResults] = useState<ApolloSearchPerson[]>([]);
  const [apolloSearchLoading, setApolloSearchLoading] = useState(false);
  const [apolloDuplicateIds, setApolloDuplicateIds] = useState<Set<string>>(new Set());

  // Filter custom fields that should be shown on cards
  const cardCustomFields = customFields
    .filter(f => f.showInCard && f.visible)
    .sort((a, b) => a.order - b.order)
    .slice(0, 3); // Limit to 3 fields to avoid clutter

  const formatCustomFieldValue = (field: CustomField, value: any) => {
    if (!value) return null;

    switch (field.type) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'checkbox':
        return Array.isArray(value) ? value.join(', ') : null;
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'select':
      case 'radio':
        return value;
      default:
        return String(value).length > 30 ? String(value).substring(0, 30) + '...' : value;
    }
  };

  const getWebsiteFromLead = (): string | null => {
    // Try to get website from various possible fields
    const websiteFromCustomFields = lead.customFields?.website || lead.customFields?.url || lead.customFields?.Website || lead.customFields?.URL;
    if (websiteFromCustomFields) {
      return String(websiteFromCustomFields);
    }
    return null;
  };

  const handleQualifyClick = async () => {
    // Check if already qualified
    if (lead.blogQualified && lead.blogQualificationData) {
      setQualificationResult(lead.blogQualificationData as unknown as QualifyBlogResponse);
      setQualifyDialogOpen(true);
      setWebsite(lead.blogQualificationData.website);
      return;
    }

    const leadWebsite = getWebsiteFromLead();

    // If no website found, open dialog to ask for it
    if (!leadWebsite) {
      setQualifyDialogOpen(true);
      setError(null);
      setQualificationResult(null);
      setWebsite('');
      return;
    }

    // If website found, start qualification immediately
    setQualifyDialogOpen(true);
    setIsQualifying(true);
    setError(null);
    setQualificationResult(null);
    setWebsite(leadWebsite);

    try {
      const result = await qualifyCompanyBlog({
        companyName: lead.company,
        website: leadWebsite.trim(),
        leadId: lead.id,
      });

      setQualificationResult(result.data as QualifyBlogResponse);
    } catch (err: any) {
      console.error('Error qualifying blog:', err);
      setError(err.message || 'Failed to qualify blog. Please try again.');
    } finally {
      setIsQualifying(false);
    }
  };

  const handleManualQualify = async () => {
    if (!website.trim()) {
      setError('Please enter a website URL');
      return;
    }

    setIsQualifying(true);
    setError(null);

    try {
      const result = await qualifyCompanyBlog({
        companyName: lead.company,
        website: website.trim(),
        leadId: lead.id,
      });

      setQualificationResult(result.data as QualifyBlogResponse);
    } catch (err: any) {
      console.error('Error qualifying blog:', err);
      setError(err.message || 'Failed to qualify blog. Please try again.');
    } finally {
      setIsQualifying(false);
    }
  };

  const handleCloseDialog = () => {
    setQualifyDialogOpen(false);
    setWebsite('');
    setError(null);
    setQualificationResult(null);
  };

  // Writing Program Finder Handlers
  const handleFindWritingProgramClick = async () => {
    const leadWebsite = getWebsiteFromLead();

    // Open dialog
    setWritingProgramDialogOpen(true);
    setWritingProgramError(null);
    setWritingProgramResult(null);
    setWritingProgramWebsite(leadWebsite || '');

    // If no website found, let user enter it manually
    if (!leadWebsite) {
      return;
    }

    // If website found, start searching immediately
    setIsFindingWritingProgram(true);

    try {
      const result = await findWritingProgram({
        website: leadWebsite.trim(),
        useAiFallback: true,
        leadId: lead.id,
      });

      setWritingProgramResult(result.data as FindWritingProgramResponse);
    } catch (err: any) {
      console.error('Error finding writing program:', err);
      setWritingProgramError(err.message || 'Failed to find writing programs. Please try again.');
    } finally {
      setIsFindingWritingProgram(false);
    }
  };

  const handleManualFindWritingProgram = async () => {
    if (!writingProgramWebsite.trim()) {
      setWritingProgramError('Please enter a website URL');
      return;
    }

    setIsFindingWritingProgram(true);
    setWritingProgramError(null);

    try {
      const result = await findWritingProgram({
        website: writingProgramWebsite.trim(),
        useAiFallback: true,
        leadId: lead.id,
      });

      setWritingProgramResult(result.data as FindWritingProgramResponse);
    } catch (err: any) {
      console.error('Error finding writing program:', err);
      setWritingProgramError(err.message || 'Failed to find writing programs. Please try again.');
    } finally {
      setIsFindingWritingProgram(false);
    }
  };

  const handleCloseWritingProgramDialog = () => {
    setWritingProgramDialogOpen(false);
    setWritingProgramWebsite('');
    setWritingProgramError(null);
    setWritingProgramResult(null);
    setApprovedUrls(new Set());
    setDeclinedUrls(new Set());
  };

  const handleApproveUrl = async (url: string) => {
    setApprovedUrls(prev => new Set(prev).add(url));
    setDeclinedUrls(prev => {
      const newSet = new Set(prev);
      newSet.delete(url);
      return newSet;
    });

    // Save to lead's custom fields
    try {
      const existingUrls = lead.customFields?.writing_program_urls || [];
      const updatedUrls = Array.isArray(existingUrls) ? [...existingUrls, url] : [url];

      await updateLead(lead.id, {
        customFields: {
          ...lead.customFields,
          writing_program_urls: [...new Set(updatedUrls)], // Remove duplicates
        },
      });
    } catch (error) {
      console.error('Failed to save writing program URL:', error);
    }
  };

  const handleDeclineUrl = (url: string) => {
    setDeclinedUrls(prev => new Set(prev).add(url));
    setApprovedUrls(prev => {
      const newSet = new Set(prev);
      newSet.delete(url);
      return newSet;
    });
  };

  // Apollo Lead Search Handlers
  const handleFindLeadsByTitle = () => {
    setTitleSelectionOpen(true);
  };

  const handleTitleSearch = async (selectedTitles: string[]) => {
    setTitleSelectionOpen(false);
    setLeadSearchResultsOpen(true);
    setApolloSearchLoading(true);
    setApolloSearchResults([]);
    setApolloDuplicateIds(new Set());

    try {
      // Fetch Apollo search results and existing leads in parallel
      const [apolloResults, existingLeads] = await Promise.all([
        searchPeople({
          company: lead.company,
          titles: selectedTitles,
          limit: 50,
        }),
        getLeads(),
      ]);

      setApolloSearchResults(apolloResults);

      // Check for duplicates
      const config = getDeduplicationConfig();
      const duplicateIds = new Set<string>();

      apolloResults.forEach(person => {
        // Create a temporary lead data object to check for duplicates
        const tempLead: Partial<LeadFormData> = {
          name: person.name,
          email: person.email || '',
          company: lead.company,
        };

        // Check if this person already exists as a lead
        const duplicates = findDuplicates(tempLead, existingLeads, config);
        if (duplicates.length > 0) {
          duplicateIds.add(person.id);
        }
      });

      setApolloDuplicateIds(duplicateIds);
    } catch (error: any) {
      console.error('Error searching Apollo:', error);
      setApolloSearchResults([]);
    } finally {
      setApolloSearchLoading(false);
    }
  };

  const handleImportLeads = async (selectedPeople: ApolloSearchPerson[]) => {
    try {
      // Import each selected person as a new lead
      for (const person of selectedPeople) {
        const leadData: LeadFormData = {
          name: person.name,
          email: person.email || `${person.first_name.toLowerCase()}.${person.last_name.toLowerCase()}@${lead.company.toLowerCase().replace(/\s+/g, '')}.example`,
          company: lead.company,
          phone: '',
          status: 'New Lead',
          customFields: {
            title: person.title || '',
            linkedin: person.linkedin_url || '',
          },
        };

        await createLead(leadData);
      }

      // Close dialog and reset state
      setLeadSearchResultsOpen(false);
      setApolloSearchResults([]);
      setApolloDuplicateIds(new Set());

      // TODO: Show success message via parent component snackbar
    } catch (error) {
      console.error('Error importing leads:', error);
      // TODO: Show error message
    }
  };

  const handleCloseLeadSearchResults = () => {
    setLeadSearchResultsOpen(false);
    setApolloSearchResults([]);
    setApolloDuplicateIds(new Set());
  };

  return (
    <Card
      sx={{
        mb: 2,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
              {lead.name}
            </Typography>
            {lead.totalApiCosts !== undefined && lead.totalApiCosts > 0 && (
              <Chip
                label={`API: $${lead.totalApiCosts < 0.01 ? lead.totalApiCosts.toFixed(4) : lead.totalApiCosts.toFixed(2)}`}
                size="small"
                color="info"
                sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Box>
          <IconButton size="small" onClick={() => onEdit(lead)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {lead.company}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
            {lead.email}
          </Typography>
        </Box>

        {lead.phone && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {lead.phone}
            </Typography>
          </Box>
        )}

        {/* Custom Fields */}
        {cardCustomFields.length > 0 && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            {cardCustomFields.map((field) => {
              const value = formatCustomFieldValue(field, lead.customFields?.[field.name]);
              if (!value) return null;

              return (
                <Box key={field.id} sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {field.label}
                  </Typography>
                  {field.type === 'select' || field.type === 'radio' ? (
                    <Chip label={value} size="small" sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }} />
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {value}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            fullWidth
            variant={lead.blogQualified ? "contained" : "outlined"}
            size="small"
            onClick={handleQualifyClick}
            color={lead.blogQualified ? (lead.blogQualificationData?.qualified ? "success" : "error") : "primary"}
            startIcon={lead.blogQualified ? <CheckCircleIcon /> : null}
            sx={{ textTransform: 'none' }}
          >
            {lead.blogQualified
              ? (lead.blogQualificationData?.qualified ? "✓ Qualified" : "Not Qualified")
              : "Qualify Blog"
            }
          </Button>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            onClick={handleFindWritingProgramClick}
            startIcon={<ArticleIcon />}
            sx={{ textTransform: 'none' }}
          >
            Find Writing Program
          </Button>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            onClick={handleFindLeadsByTitle}
            startIcon={<SearchIcon />}
            sx={{ textTransform: 'none' }}
          >
            Find Leads by Title
          </Button>
        </Box>
      </CardContent>

      {/* Qualification Dialog */}
      <Dialog open={qualifyDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Qualify Blog for {lead.company}</DialogTitle>
        <DialogContent>
          {isQualifying && !qualificationResult ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={48} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Analyzing blog for {lead.company}...
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                This may take 10-15 seconds
              </Typography>
            </Box>
          ) : !qualificationResult ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No website found in lead data. Please enter the company website to analyze their blog.
              </Typography>
              <TextField
                autoFocus
                margin="dense"
                label="Company Website"
                type="url"
                fullWidth
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                disabled={isQualifying}
              />
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Alert severity={qualificationResult.qualified ? 'success' : 'warning'} sx={{ mb: 2 }}>
                {qualificationResult.qualified ? (
                  <>
                    <strong>✅ QUALIFIED!</strong> This company meets all criteria.
                  </>
                ) : (
                  <>
                    <strong>Not Qualified</strong> - Does not meet all criteria.
                  </>
                )}
              </Alert>

              <Typography variant="subtitle2" gutterBottom>
                Qualification Criteria ({qualificationResult.qualified ? '3/3' :
                  [qualificationResult.hasActiveBlog, qualificationResult.hasMultipleAuthors, qualificationResult.isDeveloperB2BSaas].filter(Boolean).length + '/3'})
              </Typography>

              <Box sx={{ ml: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  {qualificationResult.hasActiveBlog ? '✅' : '❌'}
                  <Typography variant="body2">
                    Active blog: {qualificationResult.blogPostCount} posts in last 30 days
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  {qualificationResult.hasMultipleAuthors ? '✅' : '❌'}
                  <Typography variant="body2">
                    Multiple authors: {qualificationResult.authorCount} unique authors
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {qualificationResult.isDeveloperB2BSaas ? '✅' : '❌'}
                  <Typography variant="body2">
                    Developer-first B2B SaaS
                  </Typography>
                </Box>
              </Box>

              {qualificationResult.authorNames && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Authors</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {qualificationResult.authorNames}
                  </Typography>
                </Box>
              )}

              {qualificationResult.lastBlogCreatedAt && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Last Post</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {qualificationResult.lastBlogCreatedAt}
                  </Typography>
                </Box>
              )}

              {qualificationResult.contentSummary && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Content Topics</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                    {qualificationResult.contentSummary}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Additional Info</Typography>
                <Typography variant="body2" color="text.secondary">
                  • Authors are: {qualificationResult.authorsAreEmployees}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Covers AI topics: {qualificationResult.coversAiTopics ? 'Yes' : 'No'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Analysis method: {qualificationResult.analysisMethod}
                </Typography>
              </Box>

              {qualificationResult.costInfo && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.main', color: 'info.contrastText', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    API Cost
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      ${qualificationResult.costInfo.totalCost < 0.01
                        ? qualificationResult.costInfo.totalCost.toFixed(4)
                        : qualificationResult.costInfo.totalCost.toFixed(2)
                      }
                    </Typography>
                    <Typography variant="caption">
                      ({qualificationResult.costInfo.totalTokens.toLocaleString()} tokens • {qualificationResult.costInfo.model})
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!isQualifying && (
            <Button onClick={handleCloseDialog}>
              {qualificationResult ? 'Close' : 'Cancel'}
            </Button>
          )}
          {!qualificationResult && !isQualifying && (
            <Button
              onClick={handleManualQualify}
              variant="contained"
              disabled={!website.trim()}
            >
              Qualify
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Writing Program Finder Dialog */}
      <Dialog open={writingProgramDialogOpen} onClose={handleCloseWritingProgramDialog} maxWidth="md" fullWidth>
        <DialogTitle>Writing Program for {lead.company}</DialogTitle>
        <DialogContent>
          {isFindingWritingProgram && !writingProgramResult ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={48} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Searching for writing programs...
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Checking ~210 URL patterns across the domain
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                This may take 15-30 seconds
              </Typography>
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, width: '100%', maxWidth: 500 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                  Common patterns being checked:
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', display: 'block' }}>
                  • /write-for-us, /guest-authors<br/>
                  • /contributor-program, /writers-program<br/>
                  • /blog/write-for-us, /community/write-for-us<br/>
                  • blog.{writingProgramWebsite.replace(/^https?:\/\//, '').split('/')[0]}/write-for-us<br/>
                  • {writingProgramWebsite.replace(/^https?:\/\//, '').split('.')[0]}.notion.site/Write-for-us<br/>
                  • and 200+ more variations...
                </Typography>
              </Box>
            </Box>
          ) : !writingProgramResult ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {writingProgramWebsite ? 'Website found. Click "Search" to find writing programs.' : 'No website found in lead data. Please enter the company website.'}
              </Typography>
              <TextField
                autoFocus
                margin="dense"
                label="Company Website"
                type="url"
                fullWidth
                value={writingProgramWebsite}
                onChange={(e) => setWritingProgramWebsite(e.target.value)}
                placeholder="https://example.com"
                disabled={isFindingWritingProgram}
              />
              {writingProgramError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {writingProgramError}
                </Alert>
              )}
            </>
          ) : (
            <Box sx={{ mt: 2 }}>
              {(() => {
                const visibleUrls = writingProgramResult.validUrls.filter(r => !declinedUrls.has(r.url));
                const approvedCount = Array.from(approvedUrls).length;

                return (
                  <>
                    <Alert severity={visibleUrls.length > 0 ? "success" : "info"} sx={{ mb: 2 }}>
                      {visibleUrls.length > 0 ? (
                        <>
                          <strong>Found {visibleUrls.length} writing program(s)!</strong>
                          {approvedCount > 0 && <> ({approvedCount} approved)</>}
                          <br/>
                          <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                            Checked {writingProgramResult.totalChecked} URLs, filtered out invalid/404 pages
                          </Typography>
                        </>
                      ) : (
                        <>
                          <strong>No writing programs found</strong><br/>
                          <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                            Checked {writingProgramResult.totalChecked} URLs, all returned 404 or invalid content
                          </Typography>
                        </>
                      )}
                    </Alert>

                    {visibleUrls.length > 0 && (
                <>

                  <Typography variant="subtitle2" gutterBottom>
                    Valid Writing Program URLs
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    {writingProgramResult.validUrls
                      .filter(result => !declinedUrls.has(result.url))
                      .map((result, index) => {
                        const isApproved = approvedUrls.has(result.url);
                        return (
                          <Box
                            key={index}
                            sx={{
                              mb: 2,
                              p: 2,
                              border: 1,
                              borderColor: isApproved ? 'success.main' : 'divider',
                              borderRadius: 1,
                              bgcolor: isApproved ? 'success.light' : 'transparent',
                              opacity: isApproved ? 0.8 : 1,
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box sx={{ flex: 1 }}>
                                <Link href={result.url} target="_blank" rel="noopener" sx={{ fontWeight: 600 }}>
                                  {result.url}
                                </Link>
                                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                  <Chip
                                    label={`Status: ${result.status || 'Found'}`}
                                    size="small"
                                    color="success"
                                  />
                                  {isApproved && (
                                    <Chip
                                      icon={<CheckCircleIcon />}
                                      label="Approved"
                                      size="small"
                                      color="success"
                                      variant="filled"
                                    />
                                  )}
                                  {result.finalUrl && result.finalUrl !== result.url && (
                                    <Typography variant="caption" color="text.secondary">
                                      (redirects to: {result.finalUrl})
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 0.5, ml: 2 }}>
                                {!isApproved && (
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleApproveUrl(result.url)}
                                    title="Approve and save to lead"
                                  >
                                    <CheckIcon />
                                  </IconButton>
                                )}
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeclineUrl(result.url)}
                                  title="Decline and hide"
                                >
                                  <CloseIcon />
                                </IconButton>
                              </Box>
                            </Box>
                          </Box>
                        );
                      })}
                  </Box>

                  {writingProgramResult.patternsFound.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Patterns Found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {writingProgramResult.patternsFound.join(', ')}
                      </Typography>
                    </Box>
                  )}
                </>
              )}

              {writingProgramResult.usedAiFallback && writingProgramResult.aiSuggestions && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    AI Suggestions
                  </Typography>
                  {writingProgramResult.aiSuggestions.map((suggestion, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Link href={suggestion.url} target="_blank" rel="noopener" sx={{ fontWeight: 600 }}>
                          {suggestion.url}
                        </Link>
                        <Chip
                          label={suggestion.confidence}
                          size="small"
                          color={suggestion.confidence === 'high' ? 'success' : suggestion.confidence === 'medium' ? 'warning' : 'default'}
                        />
                        {suggestion.verified && (
                          <Chip label="✓ Verified" size="small" color="success" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {suggestion.reasoning}
                      </Typography>
                      {suggestion.verificationError && (
                        <Typography variant="caption" color="error">
                          Verification failed: {suggestion.verificationError}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}

              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Total URLs checked: {writingProgramResult.totalChecked}
                </Typography>
              </Box>

                    {writingProgramResult.costInfo && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.main', color: 'info.contrastText', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                          API Cost
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            ${writingProgramResult.costInfo.totalCost < 0.01
                              ? writingProgramResult.costInfo.totalCost.toFixed(4)
                              : writingProgramResult.costInfo.totalCost.toFixed(2)
                            }
                          </Typography>
                          <Typography variant="caption">
                            ({writingProgramResult.costInfo.totalTokens.toLocaleString()} tokens • {writingProgramResult.costInfo.model})
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </>
                );
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!isFindingWritingProgram && (
            <Button onClick={handleCloseWritingProgramDialog}>
              {writingProgramResult ? 'Close' : 'Cancel'}
            </Button>
          )}
          {!writingProgramResult && !isFindingWritingProgram && (
            <Button
              onClick={handleManualFindWritingProgram}
              variant="contained"
              disabled={!writingProgramWebsite.trim()}
            >
              Search
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Title Selection Dialog */}
      <TitleSelectionDialog
        open={titleSelectionOpen}
        companyName={lead.company}
        onClose={() => setTitleSelectionOpen(false)}
        onSearch={handleTitleSearch}
      />

      {/* Lead Search Results Dialog */}
      <LeadSearchResultsDialog
        open={leadSearchResultsOpen}
        companyName={lead.company}
        results={apolloSearchResults}
        duplicateIds={apolloDuplicateIds}
        isLoading={apolloSearchLoading}
        onClose={handleCloseLeadSearchResults}
        onImport={handleImportLeads}
      />
    </Card>
  );
};
