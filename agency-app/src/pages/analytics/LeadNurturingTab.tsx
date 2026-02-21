// src/pages/analytics/LeadNurturingTab.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Tooltip,
  Collapse,
  Button,
  Chip,
} from '@mui/material';
import {
  Spa as NurtureIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Email as EmailIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  RssFeed as BlogActivityIcon,
} from '@mui/icons-material';
import { subscribeToLeads, updateLeadField } from '../../services/api/leads';
import { getCompany, updateCompany } from '../../services/api/companies';
import { analyzeBlog } from '../../services/firebase/cloudFunctions';
import { transformBlogResult } from '../../services/api/bulkBlogAnalysisService';
import { getCompanyWebsite } from '../../services/api/websiteFieldMappingService';
import { getCompanyBlogUrl } from '../../services/api/blogUrlFieldMappingService';
import { BulkBlogAnalysisDialog } from '../../components/features/analytics/BulkBlogAnalysisDialog';
import { Lead } from '../../types/lead';
import { Company } from '../../types/crm';
import { useAuth } from '../../contexts/AuthContext';

type BlogActivityTier = 'high' | 'medium' | 'low' | 'very_low' | 'not_analyzed';

function getBlogActivityTier(company: Company | undefined): BlogActivityTier {
  if (!company?.blogAnalysis) return 'not_analyzed';

  const { monthlyFrequency, lastActivePost } = company.blogAnalysis;

  if (monthlyFrequency === 0) return 'very_low';

  if (lastActivePost) {
    const lastPostDate = new Date(lastActivePost);
    const daysSince = Math.floor(
      (Date.now() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince > 90 && monthlyFrequency <= 1) return 'very_low';
  }

  if (monthlyFrequency >= 4) return 'high';
  if (monthlyFrequency >= 2) return 'medium';
  if (monthlyFrequency >= 1) return 'low';

  return 'very_low';
}

const TIER_CONFIG: Record<BlogActivityTier, { label: string; bgcolor: string; color: string }> = {
  high: { label: 'High', bgcolor: '#dcfce7', color: '#16a34a' },
  medium: { label: 'Medium', bgcolor: '#fef3c7', color: '#d97706' },
  low: { label: 'Low', bgcolor: '#fee2e2', color: '#dc2626' },
  very_low: { label: 'Inactive', bgcolor: '#f1f5f9', color: '#94a3b8' },
  not_analyzed: { label: 'N/A', bgcolor: '#f8fafc', color: '#cbd5e1' },
};

function getAnalyzedAgoLabel(lastAnalyzedAt: Date | undefined): string {
  if (!lastAnalyzedAt) return '';
  const d = lastAnalyzedAt instanceof Date ? lastAnalyzedAt : new Date(lastAnalyzedAt);
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const LeadNurturingTab: React.FC = () => {
  const { userProfile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingEmailLeadId, setEditingEmailLeadId] = useState<string | null>(null);
  const [editingEmailValue, setEditingEmailValue] = useState<string>('');
  const [savingEmailLeadId, setSavingEmailLeadId] = useState<string | null>(null);
  const [editingDateLeadId, setEditingDateLeadId] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState<string>('');
  const [editingSecondDateLeadId, setEditingSecondDateLeadId] = useState<string | null>(null);
  const [editingSecondDateValue, setEditingSecondDateValue] = useState<string>('');

  // Blog activity state
  const [companyMap, setCompanyMap] = useState<Map<string, Company>>(new Map());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [singleCheckLoadingId, setSingleCheckLoadingId] = useState<string | null>(null);
  const prevCompanyIdsRef = useRef<string>('');

  // Subscribe to leads
  useEffect(() => {
    const unsubscribe = subscribeToLeads((leadsData) => {
      setLeads(leadsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Get nurture leads sorted by last contacted date
  const nurtureLeads = leads
    .filter(lead => lead.status === 'nurture')
    .sort((a, b) => {
      if (!a.lastContactedDate && !b.lastContactedDate) return 0;
      if (!a.lastContactedDate) return 1;
      if (!b.lastContactedDate) return -1;
      return new Date(a.lastContactedDate).getTime() - new Date(b.lastContactedDate).getTime();
    });

  // Fetch company data for nurture leads
  const fetchCompanyData = useCallback(async (companyIds: string[]) => {
    try {
      const companies = await Promise.all(
        companyIds.map(id => getCompany(id))
      );
      setCompanyMap(prev => {
        const next = new Map(prev);
        companies.forEach(company => {
          if (company) next.set(company.id, company);
        });
        return next;
      });
    } catch (err) {
      console.error('Failed to fetch company data:', err);
    }
  }, []);

  useEffect(() => {
    const uniqueCompanyIds = Array.from(new Set(
      nurtureLeads
        .map(lead => lead.companyId)
        .filter((id): id is string => !!id)
    ));

    const idsKey = uniqueCompanyIds.sort().join(',');
    if (idsKey === prevCompanyIdsRef.current || uniqueCompanyIds.length === 0) return;
    prevCompanyIdsRef.current = idsKey;

    fetchCompanyData(uniqueCompanyIds);
  }, [nurtureLeads, fetchCompanyData]);

  // Single lead blog check handler
  const handleSingleBlogCheck = async (lead: Lead) => {
    if (!lead.companyId) return;
    const company = companyMap.get(lead.companyId);
    if (!company) return;

    const url = getCompanyBlogUrl(company) || getCompanyWebsite(company) || company.website;
    if (!url) return;

    setSingleCheckLoadingId(lead.id);
    try {
      const result = await analyzeBlog(company.name, url);
      const analysisData = transformBlogResult(result, url);
      await updateCompany(company.id, { blogAnalysis: analysisData });
      setCompanyMap(prev => {
        const next = new Map(prev);
        next.set(company.id, { ...company, blogAnalysis: analysisData });
        return next;
      });
    } catch (err) {
      console.error('Blog check failed:', err);
    } finally {
      setSingleCheckLoadingId(null);
    }
  };

  // Get deduplicated companies for bulk operation
  const getUniqueCompanies = (): Company[] => {
    const seen = new Set<string>();
    const result: Company[] = [];
    nurtureLeads.forEach(lead => {
      if (lead.companyId && !seen.has(lead.companyId)) {
        seen.add(lead.companyId);
        const company = companyMap.get(lead.companyId);
        if (company) result.push(company);
      }
    });
    return result;
  };

  // Refresh company data after bulk analysis
  const handleBulkComplete = (updatedCompanyIds: string[]) => {
    if (updatedCompanyIds.length > 0) {
      fetchCompanyData(updatedCompanyIds);
    }
    setBulkDialogOpen(false);
  };

  // Toggle row expansion
  const toggleRow = (leadId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  // Format date for display
  const formatDate = (date: Date | undefined): string => {
    if (!date) return '—';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format date for input
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  };

  // Handle save final email
  const handleSaveFinalEmail = async (leadId: string) => {
    try {
      setSavingEmailLeadId(leadId);
      await updateLeadField(leadId, 'finalEmail', editingEmailValue);
      await updateLeadField(leadId, 'finalEmailUpdatedAt', new Date());
      await updateLeadField(leadId, 'finalEmailUpdatedBy', userProfile?.uid || '');
      setEditingEmailLeadId(null);
      setEditingEmailValue('');
    } catch (error) {
      console.error('Failed to save final email:', error);
    } finally {
      setSavingEmailLeadId(null);
    }
  };

  // Handle start editing final email
  const handleStartEditingEmail = (lead: Lead) => {
    setEditingEmailLeadId(lead.id);
    setEditingEmailValue(lead.finalEmail || '');
  };

  // Handle cancel editing final email
  const handleCancelEditingEmail = () => {
    setEditingEmailLeadId(null);
    setEditingEmailValue('');
  };

  // Handle save date
  const handleSaveDate = async (leadId: string) => {
    try {
      const dateValue = editingDateValue ? new Date(editingDateValue) : null;
      await updateLeadField(leadId, 'lastContactedDate', dateValue);
      setEditingDateLeadId(null);
      setEditingDateValue('');
    } catch (error) {
      console.error('Failed to update last contacted date:', error);
    }
  };

  // Handle start editing date
  const handleStartEditingDate = (lead: Lead) => {
    setEditingDateLeadId(lead.id);
    setEditingDateValue(formatDateForInput(lead.lastContactedDate));
  };

  // Handle cancel editing date
  const handleCancelEditingDate = () => {
    setEditingDateLeadId(null);
    setEditingDateValue('');
  };

  // Handle save second contact date
  const handleSaveSecondDate = async (leadId: string) => {
    try {
      const dateValue = editingSecondDateValue ? new Date(editingSecondDateValue) : null;
      await updateLeadField(leadId, 'secondContactDate', dateValue);
      setEditingSecondDateLeadId(null);
      setEditingSecondDateValue('');
    } catch (error) {
      console.error('Failed to update second contact date:', error);
    }
  };

  const handleStartEditingSecondDate = (lead: Lead) => {
    setEditingSecondDateLeadId(lead.id);
    setEditingSecondDateValue(formatDateForInput(lead.secondContactDate));
  };

  const handleCancelEditingSecondDate = () => {
    setEditingSecondDateLeadId(null);
    setEditingSecondDateValue('');
  };

  // Calculate day gap between first and second contact
  const getDayGap = (first: Date | undefined, second: Date | undefined): number | null => {
    if (!first || !second) return null;
    const d1 = first instanceof Date ? first : new Date(first);
    const d2 = second instanceof Date ? second : new Date(second);
    return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={8}>
        <CircularProgress sx={{ color: '#667eea' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #00bcd4 0%, #00acc1 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          <NurtureIcon fontSize="large" sx={{ color: '#00bcd4' }} />
          Lead Nurturing
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your nurture leads and track final emails sent
        </Typography>
      </Box>

      {/* Nurture Leads Table */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NurtureIcon sx={{ color: '#00bcd4' }} />
            All Nurture Leads
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<BlogActivityIcon />}
            onClick={() => setBulkDialogOpen(true)}
            disabled={nurtureLeads.length === 0}
            sx={{
              textTransform: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              },
            }}
          >
            Check All Blog Activity
          </Button>
        </Box>

        {nurtureLeads.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <NurtureIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No leads in nurture stage
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Move leads to the nurture stage to see them here
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ width: 50 }} />
                  <TableCell sx={{ fontWeight: 600 }}>Lead Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Blog Activity</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>First Contact</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Follow-Up</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nurtureLeads.map((lead) => (
                  <React.Fragment key={lead.id}>
                    {/* Main Row */}
                    <TableRow
                      hover
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#f8fafc' }
                      }}
                    >
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => toggleRow(lead.id)}
                        >
                          {expandedRows.has(lead.id) ? (
                            <KeyboardArrowUpIcon />
                          ) : (
                            <KeyboardArrowDownIcon />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell onClick={() => toggleRow(lead.id)}>
                        <Typography variant="body2" fontWeight={600}>
                          {lead.name}
                        </Typography>
                      </TableCell>
                      <TableCell onClick={() => toggleRow(lead.id)}>
                        <Typography variant="body2" color="text.secondary">
                          {lead.company || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell onClick={() => toggleRow(lead.id)}>
                        <Typography variant="body2" color="text.secondary">
                          {lead.email || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const company = lead.companyId ? companyMap.get(lead.companyId) : undefined;
                          const tier = getBlogActivityTier(company);
                          const cfg = TIER_CONFIG[tier];
                          const analyzedAt = company?.blogAnalysis?.lastAnalyzedAt;
                          const freq = company?.blogAnalysis?.monthlyFrequency;

                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Tooltip title={
                                tier !== 'not_analyzed' && analyzedAt
                                  ? `${freq} posts/mo - Analyzed ${getAnalyzedAgoLabel(analyzedAt)}`
                                  : 'Not analyzed yet'
                              }>
                                <Chip
                                  label={cfg.label}
                                  size="small"
                                  sx={{
                                    fontSize: '10px',
                                    height: 22,
                                    bgcolor: cfg.bgcolor,
                                    color: cfg.color,
                                    fontWeight: 600,
                                  }}
                                />
                              </Tooltip>
                              <Tooltip title="Check blog activity">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSingleBlogCheck(lead);
                                    }}
                                    disabled={singleCheckLoadingId === lead.id || !lead.companyId}
                                    sx={{ p: 0.3 }}
                                  >
                                    {singleCheckLoadingId === lead.id
                                      ? <CircularProgress size={14} sx={{ color: '#667eea' }} />
                                      : <RefreshIcon sx={{ fontSize: 14, color: '#667eea' }} />
                                    }
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {editingDateLeadId === lead.id ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TextField
                              type="date"
                              size="small"
                              value={editingDateValue}
                              onChange={(e) => setEditingDateValue(e.target.value)}
                              sx={{
                                width: 140,
                                '& .MuiInputBase-input': {
                                  fontSize: '0.8rem',
                                  py: 0.5,
                                }
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleSaveDate(lead.id)}
                              sx={{ color: '#4caf50' }}
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={handleCancelEditingDate}
                              sx={{ color: '#ef4444' }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              cursor: 'pointer',
                              '&:hover .edit-icon': { opacity: 1 }
                            }}
                            onClick={() => handleStartEditingDate(lead)}
                          >
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(lead.lastContactedDate)}
                            </Typography>
                            <Tooltip title="Edit date">
                              <EditIcon
                                className="edit-icon"
                                sx={{
                                  fontSize: 14,
                                  color: '#94a3b8',
                                  opacity: 0,
                                  transition: 'opacity 0.2s'
                                }}
                              />
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSecondDateLeadId === lead.id ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TextField
                              type="date"
                              size="small"
                              value={editingSecondDateValue}
                              onChange={(e) => setEditingSecondDateValue(e.target.value)}
                              sx={{
                                width: 140,
                                '& .MuiInputBase-input': {
                                  fontSize: '0.8rem',
                                  py: 0.5,
                                }
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleSaveSecondDate(lead.id)}
                              sx={{ color: '#4caf50' }}
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={handleCancelEditingSecondDate}
                              sx={{ color: '#ef4444' }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              cursor: 'pointer',
                              '&:hover .edit-icon-second': { opacity: 1 }
                            }}
                            onClick={() => handleStartEditingSecondDate(lead)}
                          >
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(lead.secondContactDate)}
                              </Typography>
                              {(() => {
                                const gap = getDayGap(lead.lastContactedDate, lead.secondContactDate);
                                if (gap === null) return null;
                                return (
                                  <Typography variant="caption" sx={{ color: '#667eea', fontWeight: 600, fontSize: '10px' }}>
                                    ({gap}d gap)
                                  </Typography>
                                );
                              })()}
                            </Box>
                            <Tooltip title="Edit date">
                              <EditIcon
                                className="edit-icon-second"
                                sx={{
                                  fontSize: 14,
                                  color: '#94a3b8',
                                  opacity: 0,
                                  transition: 'opacity 0.2s'
                                }}
                              />
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row */}
                    <TableRow>
                      <TableCell sx={{ py: 0, borderBottom: expandedRows.has(lead.id) ? undefined : 'none' }} colSpan={7}>
                        <Collapse in={expandedRows.has(lead.id)} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 3, px: 2 }}>
                            {/* Final Email Section */}
                            <Box sx={{
                              p: 2,
                              bgcolor: '#f8fafc',
                              borderRadius: 2,
                              border: '1px solid #e2e8f0'
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <EmailIcon sx={{ fontSize: 18, color: '#667eea' }} />
                                  Final Email
                                </Typography>
                                {lead.finalEmailUpdatedAt && (
                                  <Typography variant="caption" color="text.secondary">
                                    Last updated: {formatDate(lead.finalEmailUpdatedAt)}
                                  </Typography>
                                )}
                              </Box>

                              {editingEmailLeadId === lead.id ? (
                                <Box>
                                  <TextField
                                    multiline
                                    rows={6}
                                    fullWidth
                                    value={editingEmailValue}
                                    onChange={(e) => setEditingEmailValue(e.target.value)}
                                    placeholder="Enter the final email sent to this lead..."
                                    sx={{
                                      mb: 2,
                                      '& .MuiOutlinedInput-root': {
                                        bgcolor: 'white',
                                      }
                                    }}
                                  />
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary">
                                      {editingEmailValue.length} characters
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={handleCancelEditingEmail}
                                        sx={{ textTransform: 'none' }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        onClick={() => handleSaveFinalEmail(lead.id)}
                                        disabled={savingEmailLeadId === lead.id}
                                        startIcon={savingEmailLeadId === lead.id ? <CircularProgress size={16} /> : <SaveIcon />}
                                        sx={{
                                          textTransform: 'none',
                                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        }}
                                      >
                                        {savingEmailLeadId === lead.id ? 'Saving...' : 'Save Email'}
                                      </Button>
                                    </Box>
                                  </Box>
                                </Box>
                              ) : (
                                <Box>
                                  {lead.finalEmail && lead.finalEmail.trim().length > 0 ? (
                                    <Box>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          whiteSpace: 'pre-wrap',
                                          bgcolor: 'white',
                                          p: 2,
                                          borderRadius: 1,
                                          border: '1px solid #e2e8f0',
                                          mb: 2
                                        }}
                                      >
                                        {lead.finalEmail}
                                      </Typography>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleStartEditingEmail(lead)}
                                        startIcon={<EditIcon />}
                                        sx={{ textTransform: 'none' }}
                                      >
                                        Edit Email
                                      </Button>
                                    </Box>
                                  ) : (
                                    <Box sx={{ textAlign: 'center', py: 2 }}>
                                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        No final email added yet
                                      </Typography>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        onClick={() => handleStartEditingEmail(lead)}
                                        startIcon={<EditIcon />}
                                        sx={{
                                          textTransform: 'none',
                                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        }}
                                      >
                                        Add Final Email
                                      </Button>
                                    </Box>
                                  )}
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Bulk Blog Analysis Dialog */}
      <BulkBlogAnalysisDialog
        open={bulkDialogOpen}
        companies={getUniqueCompanies()}
        onClose={() => setBulkDialogOpen(false)}
        onComplete={handleBulkComplete}
      />
    </Box>
  );
};

export default LeadNurturingTab;
