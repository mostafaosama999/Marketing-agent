// src/pages/events/EventCompaniesTab.tsx
import React, { useState, useEffect, useMemo } from 'react';
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
  Tooltip,
  Typography,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  RemoveCircle as RemoveCircleIcon,
  HelpOutline as HelpIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
} from '@mui/icons-material';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase/firestore';
import {
  EventCompany,
  EventCompanyFormData,
  EventCompanyRole,
  IcpMatch,
  ICP_MATCH_LABELS,
} from '../../types/event';

interface EventCompaniesTabProps {
  eventId: string;
  companies: EventCompany[];
  onAddCompany: (data: EventCompanyFormData) => Promise<string | null>;
  onUpdateCompany: (companyId: string, updates: Partial<EventCompany>) => Promise<void>;
  onDeleteCompany: (companyId: string) => Promise<void>;
}

const ROLE_OPTIONS: { value: EventCompanyRole; label: string }[] = [
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'exhibitor', label: 'Exhibitor' },
  { value: 'speaker', label: 'Speaker' },
  { value: 'organizer', label: 'Organizer' },
  { value: 'host', label: 'Host' },
  { value: 'attendee', label: 'Attendee' },
];

const DEFAULT_ROLE_COLOR = { bg: '#f1f5f9', text: '#475569' };

const PRIORITY_OPTIONS: { value: 'high' | 'medium' | 'low'; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'low', label: 'Low', color: '#64748b' },
];

const ICP_COLORS: Record<IcpMatch, string> = {
  yes: '#16a34a',
  partial: '#f59e0b',
  no: '#ef4444',
};

const ICP_ICONS: Record<IcpMatch, React.ReactNode> = {
  yes: <CheckCircleIcon sx={{ fontSize: 18, color: '#16a34a' }} />,
  partial: <HelpIcon sx={{ fontSize: 18, color: '#f59e0b' }} />,
  no: <RemoveCircleIcon sx={{ fontSize: 18, color: '#ef4444' }} />,
};

const ROLE_COLORS: Record<EventCompanyRole, { bg: string; text: string }> = {
  sponsor: { bg: '#dbeafe', text: '#1e40af' },
  exhibitor: { bg: '#f3e8ff', text: '#7c3aed' },
  speaker: { bg: '#dcfce7', text: '#166534' },
  organizer: { bg: '#fef9c3', text: '#854d0e' },
  host: { bg: '#e0e7ff', text: '#3730a3' },
  attendee: { bg: '#f1f5f9', text: '#475569' },
};

const emptyForm: EventCompanyFormData = {
  companyName: '',
  companyWebsite: null,
  entityId: null,
  role: 'attendee',
  sponsorshipTier: null,
  employeeCount: null,
  funding: null,
  description: null,
  icpMatch: 'no',
  icpReason: '',
  hasCwp: false,
  priority: 'medium',
};

export const EventCompaniesTab: React.FC<EventCompaniesTabProps> = ({
  eventId,
  companies,
  onAddCompany,
  onUpdateCompany,
  onDeleteCompany,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<EventCompanyFormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Fetch entities for matching
  const [entities, setEntities] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'entities'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: (doc.data().name || '') as string,
      }));
      setEntities(data);
    });
    return () => unsubscribe();
  }, []);

  // Build a map of lowercase entity names to entity IDs for matching
  const entityMatchMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const entity of entities) {
      if (entity.name) {
        map.set(entity.name.toLowerCase().trim(), entity);
      }
    }
    return map;
  }, [entities]);

  const findEntityMatch = (companyName: string): { id: string; name: string } | null => {
    const normalized = companyName.toLowerCase().trim();
    // Exact match
    if (entityMatchMap.has(normalized)) return entityMatchMap.get(normalized)!;
    // Partial match (entity name contained in company name or vice versa)
    for (const [key, entity] of Array.from(entityMatchMap.entries())) {
      if (normalized.includes(key) || key.includes(normalized)) return entity;
    }
    return null;
  };

  const handleOpenDialog = () => {
    setFormData({ ...emptyForm });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({ ...emptyForm });
  };

  const handleSave = async () => {
    if (!formData.companyName.trim()) return;
    setSaving(true);
    try {
      await onAddCompany(formData);
      handleCloseDialog();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
          Companies ({companies.length})
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
          Add Company
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
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Company</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Employees</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>ICP Match</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Funding</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>CWP</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>In CRM</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '13px' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    No companies added yet
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => {
                const roleColors = ROLE_COLORS[company.role] || DEFAULT_ROLE_COLOR;
                const priorityConfig = PRIORITY_OPTIONS.find((p) => p.value === company.priority);

                return (
                  <TableRow
                    key={company.id}
                    sx={{
                      '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.04)' },
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {company.companyName}
                      </Typography>
                      {company.companyWebsite && (
                        <Typography
                          variant="caption"
                          component="a"
                          href={company.companyWebsite.startsWith('http') ? company.companyWebsite : `https://${company.companyWebsite}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            color: '#667eea',
                            textDecoration: 'none',
                            display: 'block',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          {company.companyWebsite}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ROLE_OPTIONS.find((r) => r.value === company.role)?.label || company.role}
                        size="small"
                        sx={{
                          bgcolor: roleColors.bg,
                          color: roleColors.text,
                          fontWeight: 600,
                          fontSize: '12px',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#475569' }}>
                        {company.employeeCount?.toLocaleString() || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {ICP_ICONS[company.icpMatch]}
                        <Typography
                          variant="body2"
                          sx={{ color: ICP_COLORS[company.icpMatch], fontWeight: 600 }}
                        >
                          {ICP_MATCH_LABELS[company.icpMatch]}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#475569' }}>
                        {company.funding || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={company.hasCwp ? 'Yes' : 'No'}
                        size="small"
                        sx={{
                          bgcolor: company.hasCwp ? '#dcfce7' : '#f1f5f9',
                          color: company.hasCwp ? '#166534' : '#64748b',
                          fontWeight: 600,
                          fontSize: '12px',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {priorityConfig && (
                        <Chip
                          label={priorityConfig.label}
                          size="small"
                          sx={{
                            bgcolor: `${priorityConfig.color}15`,
                            color: priorityConfig.color,
                            fontWeight: 600,
                            fontSize: '12px',
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const match = company.entityId
                          ? { id: company.entityId, name: company.companyName }
                          : findEntityMatch(company.companyName);
                        if (match) {
                          return (
                            <Tooltip title={`Matched: ${match.name}`}>
                              <Chip
                                icon={<LinkIcon sx={{ fontSize: 14 }} />}
                                label="Linked"
                                size="small"
                                component="a"
                                href={`/companies/${match.id}`}
                                clickable
                                sx={{
                                  bgcolor: '#dcfce7',
                                  color: '#166534',
                                  fontWeight: 600,
                                  fontSize: '12px',
                                  '& .MuiChip-icon': { color: '#166534' },
                                }}
                              />
                            </Tooltip>
                          );
                        }
                        return (
                          <Chip
                            icon={<LinkOffIcon sx={{ fontSize: 14 }} />}
                            label="Not in CRM"
                            size="small"
                            sx={{
                              bgcolor: '#f1f5f9',
                              color: '#94a3b8',
                              fontWeight: 500,
                              fontSize: '12px',
                              '& .MuiChip-icon': { color: '#94a3b8' },
                            }}
                          />
                        );
                      })()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => onDeleteCompany(company.id)}
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

      {/* Add Company Dialog */}
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
          Add Company
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Company Name"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              fullWidth
              required
              size="small"
            />
            <TextField
              label="Website"
              value={formData.companyWebsite || ''}
              onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value || null })}
              fullWidth
              size="small"
            />
            <TextField
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as EventCompanyRole })}
              select
              fullWidth
              size="small"
            >
              {ROLE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Employees"
              value={formData.employeeCount || ''}
              onChange={(e) =>
                setFormData({ ...formData, employeeCount: e.target.value ? Number(e.target.value) : null })
              }
              type="number"
              fullWidth
              size="small"
            />
            <TextField
              label="Funding"
              value={formData.funding || ''}
              onChange={(e) => setFormData({ ...formData, funding: e.target.value || null })}
              fullWidth
              size="small"
              placeholder="e.g. Series B, $20M"
            />
            <TextField
              label="ICP Match"
              value={formData.icpMatch}
              onChange={(e) => setFormData({ ...formData, icpMatch: e.target.value as IcpMatch })}
              select
              fullWidth
              size="small"
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="partial">Partial</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>
            <TextField
              label="ICP Reason"
              value={formData.icpReason}
              onChange={(e) => setFormData({ ...formData, icpReason: e.target.value })}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.hasCwp}
                  onChange={(e) => setFormData({ ...formData, hasCwp: e.target.checked })}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#667eea',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: '#667eea',
                    },
                  }}
                />
              }
              label="Has CWP"
            />
            <TextField
              label="Priority"
              value={formData.priority || 'medium'}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value as 'high' | 'medium' | 'low' })
              }
              select
              fullWidth
              size="small"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none', color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !formData.companyName.trim()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              },
            }}
          >
            {saving ? 'Adding...' : 'Add Company'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
