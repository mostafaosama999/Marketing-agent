import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  TextField,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { getSettings, updateSettings } from '../../services/api/settings';
import { HiringEmailTemplate } from '../../types/settings';

export const HiringEmailTemplatesTab: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<HiringEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await getSettings();
        setTemplates(settings.hiringEmailTemplates || []);
      } catch (err) {
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAdd = () => {
    const newId = `ht-${Date.now()}`;
    setEditingId(newId);
    setEditName('');
    setEditSubject('');
    setEditBody('');
  };

  const handleEdit = (template: HiringEmailTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditSubject(template.subject);
    setEditBody(template.body);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditName('');
    setEditSubject('');
    setEditBody('');
  };

  const handleSave = async () => {
    if (!editName.trim() || !editSubject.trim() || !editBody.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const existing = templates.find((t) => t.id === editingId);
      let updated: HiringEmailTemplate[];

      if (existing) {
        updated = templates.map((t) =>
          t.id === editingId
            ? { ...t, name: editName.trim(), subject: editSubject.trim(), body: editBody.trim() }
            : t
        );
      } else {
        updated = [
          ...templates,
          {
            id: editingId!,
            name: editName.trim(),
            subject: editSubject.trim(),
            body: editBody.trim(),
          },
        ];
      }

      await updateSettings({ hiringEmailTemplates: updated }, user?.uid || '');
      setTemplates(updated);
      setEditingId(null);
      setSuccess('Template saved');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setSaving(true);
      const updated = templates.filter((t) => t.id !== id);
      await updateSettings({ hiringEmailTemplates: updated }, user?.uid || '');
      setTemplates(updated);
      setSuccess('Template deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = bodyRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = editBody.substring(0, start) + variable + editBody.substring(end);
      setEditBody(newBody);
      // Restore cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      setEditBody((prev) => prev + variable);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Hiring Email Templates
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Create reusable email templates for communicating with hiring applicants
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          disabled={editingId !== null}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
            },
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
      {editingId && (
        <Paper sx={{ p: 3, mb: 3, border: '2px solid #667eea' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            {templates.find((t) => t.id === editingId) ? 'Edit Template' : 'New Template'}
          </Typography>

          <TextField
            label="Template Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            fullWidth
            placeholder='e.g., "Test Task", "Rejection", "Interview"'
            sx={{ mb: 2 }}
          />

          <TextField
            label="Subject"
            value={editSubject}
            onChange={(e) => setEditSubject(e.target.value)}
            fullWidth
            placeholder="e.g., Next Stage for the Software Engineer Role at Codecontent"
            sx={{ mb: 2 }}
          />

          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              Available variables:
            </Typography>
            <Chip
              label="{{name}}"
              size="small"
              onClick={() => insertVariable('{{name}}')}
              sx={{ mr: 0.5, cursor: 'pointer', bgcolor: '#f0e6ff', color: '#667eea', fontWeight: 600 }}
            />
            <Chip
              label="{{email}}"
              size="small"
              onClick={() => insertVariable('{{email}}')}
              sx={{ cursor: 'pointer', bgcolor: '#f0e6ff', color: '#667eea', fontWeight: 600 }}
            />
          </Box>

          <TextField
            label="Email Body"
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            inputRef={bodyRef}
            fullWidth
            multiline
            rows={8}
            placeholder={`Hello {{name}},\n\nThank you for applying...\n\nBest regards,\nCodeContent Team`}
            sx={{ mb: 2 }}
          />

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

      {/* Template List */}
      {templates.length === 0 && !editingId ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <EmailIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No hiring email templates yet. Click "Add Template" to create one.
          </Typography>
        </Paper>
      ) : (
        templates.map((template) => (
          <Paper key={template.id} sx={{ p: 3, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {template.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Subject: {template.subject}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}
                >
                  {template.body.substring(0, 150)}
                  {template.body.length > 150 ? '...' : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, ml: 2 }}>
                <IconButton
                  size="small"
                  onClick={() => handleEdit(template)}
                  disabled={editingId !== null}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(template.id)}
                  disabled={saving || editingId !== null}
                  sx={{ color: '#ef4444' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        ))
      )}
    </Box>
  );
};
