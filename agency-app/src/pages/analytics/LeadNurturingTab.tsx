// src/pages/analytics/LeadNurturingTab.tsx
import React, { useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import { subscribeToLeads, updateLeadField } from '../../services/api/leads';
import { Lead } from '../../types/lead';
import { useAuth } from '../../contexts/AuthContext';

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

  // Subscribe to leads
  useEffect(() => {
    const unsubscribe = subscribeToLeads((leadsData) => {
      setLeads(leadsData);
      // Expand all nurture leads by default
      const nurtureIds = leadsData
        .filter(lead => lead.status === 'nurture')
        .map(lead => lead.id);
      setExpandedRows(new Set(nurtureIds));
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
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <NurtureIcon sx={{ color: '#00bcd4' }} />
          All Nurture Leads
        </Typography>

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
                  <TableCell sx={{ fontWeight: 600 }}>Last Contacted</TableCell>
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
                    </TableRow>

                    {/* Expanded Row */}
                    <TableRow>
                      <TableCell sx={{ py: 0, borderBottom: expandedRows.has(lead.id) ? undefined : 'none' }} colSpan={5}>
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
    </Box>
  );
};

export default LeadNurturingTab;
