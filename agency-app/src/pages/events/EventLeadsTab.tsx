// src/pages/events/EventLeadsTab.tsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import {
  EventLead,
  EventLeadFormData,
  EventLeadRole,
  EventLeadPersona,
  OutreachStatus,
  PERSONA_LABELS,
  PERSONA_COLORS,
} from '../../types/event';

interface EventLeadsTabProps {
  eventId: string;
  leads: EventLead[];
  onAddLead: (data: EventLeadFormData) => Promise<string | null>;
  onUpdateLead: (leadId: string, updates: Partial<EventLead>) => Promise<void>;
  onDeleteLead: (leadId: string) => Promise<void>;
}

const LEAD_ROLE_OPTIONS: { value: EventLeadRole; label: string }[] = [
  { value: 'speaker', label: 'Speaker' },
  { value: 'panelist', label: 'Panelist' },
  { value: 'workshop_leader', label: 'Workshop Leader' },
  { value: 'attendee', label: 'Attendee' },
];

const PERSONA_OPTIONS: { value: EventLeadPersona; label: string }[] = [
  { value: 'decision_maker', label: 'Decision Maker' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'practitioner', label: 'Practitioner' },
  { value: 'skip', label: 'Skip' },
];

const OUTREACH_STATUS_OPTIONS: { value: OutreachStatus; label: string }[] = [
  { value: 'not_sent', label: 'Not Sent' },
  { value: 'sent', label: 'Sent' },
  { value: 'replied', label: 'Replied' },
  { value: 'no_response', label: 'No Response' },
  { value: 'meeting_booked', label: 'Meeting Booked' },
];

const OUTREACH_STATUS_COLORS: Record<OutreachStatus, { bg: string; text: string }> = {
  not_sent: { bg: '#f1f5f9', text: '#64748b' },
  sent: { bg: '#dbeafe', text: '#1e40af' },
  replied: { bg: '#dcfce7', text: '#166534' },
  no_response: { bg: '#fef9c3', text: '#854d0e' },
  meeting_booked: { bg: '#f3e8ff', text: '#7c3aed' },
};

const emptyLeadForm: EventLeadFormData = {
  name: '',
  title: null,
  company: '',
  companyId: null,
  leadId: null,
  linkedinUrl: null,
  email: null,
  role: 'attendee',
  sessionTitle: null,
  persona: 'practitioner',
  whyRelevant: '',
  preEventOutreach: { status: 'not_sent' },
  postEventOutreach: { status: 'not_sent' },
};

export const EventLeadsTab: React.FC<EventLeadsTabProps> = ({
  eventId,
  leads,
  onAddLead,
  onUpdateLead,
  onDeleteLead,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<EventLeadFormData>({ ...emptyLeadForm });
  const [saving, setSaving] = useState(false);

  const handleOpenDialog = () => {
    setFormData({ ...emptyLeadForm });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({ ...emptyLeadForm });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.company.trim()) return;
    setSaving(true);
    try {
      await onAddLead(formData);
      handleCloseDialog();
    } finally {
      setSaving(false);
    }
  };

  const renderOutreachChip = (status: OutreachStatus | undefined, label: string) => {
    const s = status || 'not_sent';
    const colors = OUTREACH_STATUS_COLORS[s];
    const statusLabel = OUTREACH_STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

    return (
      <Chip
        label={statusLabel}
        size="small"
        sx={{
          bgcolor: colors.bg,
          color: colors.text,
          fontWeight: 600,
          fontSize: '11px',
          height: '22px',
        }}
      />
    );
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
          Leads ({leads.length})
        </Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={handleOpenDialog}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
            },
          }}
        >
          Add Lead
        </Button>
      </Box>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 2.5,
          border: '1px solid rgba(0, 0, 0, 0.06)',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Company</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Persona</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Pre-event</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Post-event</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    No leads added yet
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => {
                const personaColors = PERSONA_COLORS[lead.persona];
                const roleLabel = LEAD_ROLE_OPTIONS.find((r) => r.value === lead.role)?.label || lead.role;

                return (
                  <TableRow
                    key={lead.id}
                    sx={{
                      '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.04)' },
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {lead.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#475569' }}>
                        {lead.title || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#475569' }}>
                        {lead.company}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={PERSONA_LABELS[lead.persona]}
                        size="small"
                        sx={{
                          bgcolor: personaColors.bg,
                          color: personaColors.text,
                          fontWeight: 600,
                          fontSize: '12px',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#475569' }}>
                        {roleLabel}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {renderOutreachChip(lead.preEventOutreach?.status, 'Pre')}
                    </TableCell>
                    <TableCell>
                      {renderOutreachChip(lead.postEventOutreach?.status, 'Post')}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => onDeleteLead(lead.id)}
                        sx={{
                          color: '#ef4444',
                          '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Lead Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Add Lead
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              size="small"
            />
            <TextField
              label="Title"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value || null })}
              fullWidth
              size="small"
              placeholder="e.g. VP Engineering"
            />
            <TextField
              label="Company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              fullWidth
              required
              size="small"
            />
            <TextField
              label="LinkedIn URL"
              value={formData.linkedinUrl || ''}
              onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value || null })}
              fullWidth
              size="small"
            />
            <TextField
              label="Email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value || null })}
              fullWidth
              size="small"
            />
            <TextField
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as EventLeadRole })}
              select
              fullWidth
              size="small"
            >
              {LEAD_ROLE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Persona"
              value={formData.persona}
              onChange={(e) => setFormData({ ...formData, persona: e.target.value as EventLeadPersona })}
              select
              fullWidth
              size="small"
            >
              {PERSONA_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Session Title"
              value={formData.sessionTitle || ''}
              onChange={(e) => setFormData({ ...formData, sessionTitle: e.target.value || null })}
              fullWidth
              size="small"
              placeholder="Talk or workshop title (if applicable)"
            />
            <TextField
              label="Why Relevant"
              value={formData.whyRelevant}
              onChange={(e) => setFormData({ ...formData, whyRelevant: e.target.value })}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none', color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !formData.name.trim() || !formData.company.trim()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              },
            }}
          >
            {saving ? 'Adding...' : 'Add Lead'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
