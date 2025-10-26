// src/components/features/crm/ArchivedLeadsView.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Button,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Unarchive as UnarchiveIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { Lead } from '../../../types/lead';
import { subscribeToArchivedLeads } from '../../../services/api/leads';
import { usePipelineConfigContext } from '../../../contexts/PipelineConfigContext';

interface ArchivedLeadsViewProps {
  onClose: () => void;
  onLeadClick: (lead: Lead) => void;
  onUnarchive: (leadId: string) => Promise<void>;
}

export const ArchivedLeadsView: React.FC<ArchivedLeadsViewProps> = ({
  onClose,
  onLeadClick,
  onUnarchive,
}) => {
  const [archivedLeads, setArchivedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { getLabel } = usePipelineConfigContext();

  useEffect(() => {
    const unsubscribe = subscribeToArchivedLeads((leads) => {
      setArchivedLeads(leads);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleUnarchive = async (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();
    if (window.confirm('Restore this lead to the active pipeline?')) {
      try {
        await onUnarchive(leadId);
      } catch (error) {
        console.error('Error unarchiving lead:', error);
        alert('Failed to unarchive lead. Please try again.');
      }
    }
  };

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: 'calc(100vh - 48px)',
        display: 'flex',
        flexDirection: 'column',
        p: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                fontWeight: 700,
                mb: 1,
              }}
            >
              Archived Leads
            </Typography>
            <Typography variant="subtitle1" sx={{ color: '#64748b', fontWeight: 400 }}>
              {archivedLeads.length} archived {archivedLeads.length === 1 ? 'lead' : 'leads'}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<CloseIcon />}
            onClick={onClose}
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
            Back to CRM
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#667eea' }} />
          </Box>
        ) : archivedLeads.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Archived Leads
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Archived leads will appear here
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ flex: 1 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Company</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Archived Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc', textAlign: 'center' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {archivedLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'rgba(102, 126, 234, 0.04)',
                      },
                    }}
                  >
                    <TableCell onClick={() => onLeadClick(lead)}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {lead.name}
                      </Typography>
                    </TableCell>
                    <TableCell onClick={() => onLeadClick(lead)}>
                      <Typography variant="body2" color="text.secondary">
                        {lead.email || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell onClick={() => onLeadClick(lead)}>
                      <Typography variant="body2" color="text.secondary">
                        {lead.company || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell onClick={() => onLeadClick(lead)}>
                      <Chip
                        label={getLabel(lead.status)}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(102, 126, 234, 0.1)',
                          color: '#667eea',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell onClick={() => onLeadClick(lead)}>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(lead.archivedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="Unarchive">
                        <IconButton
                          size="small"
                          onClick={(e) => handleUnarchive(e, lead.id)}
                          sx={{
                            color: '#f59e0b',
                            '&:hover': {
                              bgcolor: 'rgba(245, 158, 11, 0.08)',
                            },
                          }}
                        >
                          <UnarchiveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => onLeadClick(lead)}
                          sx={{
                            color: '#667eea',
                            '&:hover': {
                              bgcolor: 'rgba(102, 126, 234, 0.08)',
                            },
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};
