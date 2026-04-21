import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  LinkedIn as LinkedInIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { LinkedInDmTemplate } from '../../types/linkedinDmTemplate';
import {
  subscribeToLinkedInDmTemplates,
  addLinkedInDmTemplate,
  updateLinkedInDmTemplate,
  deleteLinkedInDmTemplate,
  setDefaultLinkedInDmTemplate,
  getDefaultLinkedInDmTemplateId,
} from '../../services/api/linkedinDmTemplates';
import {
  OUTBOUND_TEMPLATE_VARS,
  replaceOutboundTemplateVariables,
} from '../../services/api/templateVariablesService';

const SAMPLE_CANDIDATE = {
  name: 'Ahmed Sameh',
  linkedInUrl: 'https://linkedin.com/in/ahmed-sameh',
  currentRole: 'Software Engineer',
  currentCompany: 'Instabug',
  university: 'Cairo University',
  tier: 'standard' as const,
  recommendedOfferEgp: 35000,
  techStack: ['Python', 'LangChain', 'React'],
  writingSignals: 'TA at Cairo Uni, LinkedIn JS series',
};

export const OutboundLinkedInTemplatesTab: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<LinkedInDmTemplate[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBody, setEditBody] = useState('');

  useEffect(() => {
    const unsub = subscribeToLinkedInDmTemplates((list) => {
      setTemplates(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    getDefaultLinkedInDmTemplateId(user.uid).then(setDefaultId);
  }, [user?.uid]);

  const handleAdd = () => {
    setIsNew(true);
    setEditingId(null);
    setEditName('');
    setEditBody('');
  };

  const handleEdit = (template: LinkedInDmTemplate) => {
    setIsNew(false);
    setEditingId(template.id);
    setEditName(template.name);
    setEditBody(template.body);
  };

  const handleCancel = () => {
    setIsNew(false);
    setEditingId(null);
    setEditName('');
    setEditBody('');
  };

  const handleSave = async () => {
    if (!editName.trim() || !editBody.trim()) {
      setError('Please fill in both name and body.');
      return;
    }
    if (!user?.uid) {
      setError('You must be signed in.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await addLinkedInDmTemplate({ name: editName.trim(), body: editBody.trim() }, user.uid);
        setSuccess('Template created.');
      } else if (editingId) {
        await updateLinkedInDmTemplate(editingId, { name: editName.trim(), body: editBody.trim() }, user.uid);
        setSuccess('Template updated.');
      }
      handleCancel();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this template? This cannot be undone.')) return;
    try {
      setSaving(true);
      await deleteLinkedInDmTemplate(id);
      if (defaultId === id && user?.uid) {
        await setDefaultLinkedInDmTemplate(user.uid, null);
        setDefaultId(null);
      }
      setSuccess('Template deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete template.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user?.uid) return;
    try {
      await setDefaultLinkedInDmTemplate(user.uid, id);
      setDefaultId(id);
      setSuccess('Default template updated for your account.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to set default.');
    }
  };

  const insertVar = (key: string) => {
    setEditBody((b) => `${b}${key}`);
  };

  const preview = editBody ? replaceOutboundTemplateVariables(editBody, SAMPLE_CANDIDATE as any) : '';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Outbound LinkedIn DM Templates
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Shared templates used as a fallback when a sourced candidate has no skill-generated draft.
            Mark one as your personal default for the Copy DM action.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          disabled={isNew || editingId !== null}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)' },
          }}
        >
          Add Template
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Editor */}
      {(isNew || editingId) && (
        <Paper sx={{ p: 3, mb: 3, border: '2px solid #667eea' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            {isNew ? 'New Template' : 'Edit Template'}
          </Typography>

          <TextField
            label="Template Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            fullWidth
            placeholder='e.g., "Standard tier cold open"'
            sx={{ mb: 2 }}
          />

          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              Insert variable:
            </Typography>
            {OUTBOUND_TEMPLATE_VARS.map((v) => (
              <Tooltip key={v.key} title={v.description} arrow>
                <Chip
                  label={v.key}
                  size="small"
                  onClick={() => insertVar(v.key)}
                  sx={{
                    mr: 0.5,
                    mb: 0.5,
                    cursor: 'pointer',
                    bgcolor: '#f0e6ff',
                    color: '#667eea',
                    fontWeight: 600,
                    fontSize: '11px',
                  }}
                />
              </Tooltip>
            ))}
          </Box>

          <TextField
            label="DM Body"
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            fullWidth
            multiline
            minRows={5}
            maxRows={12}
            placeholder="Hi {{firstName}}, noticed your work on {{currentCompany}}..."
            sx={{ mb: 2 }}
          />

          {preview && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f8fafc' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Preview (sample candidate)
              </Typography>
              <Typography sx={{ fontSize: '13px', whiteSpace: 'pre-wrap', mt: 0.5, color: '#1e293b' }}>
                {preview}
              </Typography>
            </Paper>
          )}

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              Save Template
            </Button>
          </Box>
        </Paper>
      )}

      {/* List */}
      {templates.length === 0 && !isNew && !editingId ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <LinkedInIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No LinkedIn DM templates yet. Click "Add Template" to create one.
          </Typography>
        </Paper>
      ) : (
        templates.map((template) => {
          const isDefault = defaultId === template.id;
          return (
            <Paper key={template.id} sx={{ p: 3, mb: 2, borderLeft: isDefault ? '4px solid #667eea' : '4px solid transparent' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {template.name}
                    </Typography>
                    {isDefault && (
                      <Chip
                        label="My default"
                        size="small"
                        icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                        sx={{ fontSize: '10px', fontWeight: 700, bgcolor: '#ede9fe', color: '#6d28d9' }}
                      />
                    )}
                  </Box>
                  <Typography sx={{ mt: 1, fontSize: '13px', color: '#475569', whiteSpace: 'pre-wrap' }}>
                    {template.body}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, ml: 2, alignItems: 'center' }}>
                  <Tooltip title={isDefault ? 'Your default' : 'Set as my default'} arrow>
                    <IconButton size="small" onClick={() => handleSetDefault(template.id)} disabled={isDefault}>
                      {isDefault ? <CheckCircleIcon color="primary" /> : <RadioIcon />}
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => handleEdit(template)} disabled={isNew || editingId !== null}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(template.id)} disabled={saving || isNew || editingId !== null} sx={{ color: '#ef4444' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          );
        })
      )}
    </Box>
  );
};
