// src/components/settings/OfferTemplateTab.tsx
// Offer template tab with version management (dropdown, labels, per-version editing)

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Chip,
  Paper,
  CircularProgress,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
  Tooltip,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Save as SaveIcon,
  ContentCopy as CopyIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Article as ArticleIcon,
  Create as CreateIcon,
  CalendarToday as CalendarIcon,
  Tune as TuneIcon,
  Email as EmailIcon,
  Label as LabelIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import {
  getSettings,
  subscribeToSettings,
  addOfferTemplateVersion,
  updateOfferTemplateVersion,
  deleteOfferTemplateVersion,
} from '../../services/api/settings';
import { AppSettings, OfferTemplateVersion, TemplateVariable, DEFAULT_TEMPLATE_VARIABLES } from '../../types/settings';
import { subscribeToLeads } from '../../services/api/leads';
import { subscribeToCompanies } from '../../services/api/companies';
import { Lead } from '../../types/lead';
import { Company } from '../../types/crm';
import {
  buildTemplateVariables,
  groupVariablesByCategory,
  getCategoryLabel,
  replaceTemplateVariables,
} from '../../services/api/templateVariablesService';
import { getFieldDefinitions } from '../../services/api/fieldDefinitionsService';
import { FieldDefinition } from '../../types/fieldDefinitions';
import TiptapRichTextEditor from '../common/TiptapRichTextEditor';
import { SafeHtmlRenderer, getHtmlCharCount, isHtmlEmpty } from '../../utils/htmlHelpers';

export const OfferTemplateTab: React.FC = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Version state
  const [versions, setVersions] = useState<OfferTemplateVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState('v1');
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Editing state for the selected version
  const [versionName, setVersionName] = useState('');
  const [offerTemplate, setOfferTemplate] = useState('');
  const [offerHeadline, setOfferHeadline] = useState('');
  const [versionLabels, setVersionLabels] = useState<string[]>([]);

  // Label options from field definitions
  const [labelOptions, setLabelOptions] = useState<string[]>([]);

  // Template variables
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>(DEFAULT_TEMPLATE_VARIABLES);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Load settings and subscribe
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getSettings();
        setSettings(data);
        const v = data.offerTemplateVersions || [];
        setVersions(v);
        // Load selected version (or first)
        const current = v.find(ver => ver.id === selectedVersionId) || v[0];
        if (current) {
          loadVersionIntoState(current);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        setError('Failed to load settings');
      }
    };

    loadSettings();

    const unsubscribe = subscribeToSettings((updatedSettings) => {
      setSettings(updatedSettings);
      const v = updatedSettings.offerTemplateVersions || [];
      setVersions(v);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load label options from field definitions
  useEffect(() => {
    const fetchLabelOptions = async () => {
      try {
        const defs = await getFieldDefinitions('company');
        const labelsDef = defs.find((d: FieldDefinition) => d.name === 'labels');
        setLabelOptions(labelsDef?.options || []);
      } catch (err) {
        console.error('Error fetching label options:', err);
      }
    };
    fetchLabelOptions();
  }, []);

  // Subscribe to leads and companies for template variables
  useEffect(() => {
    const unsubLeads = subscribeToLeads((leadsData) => setLeads(leadsData));
    const unsubCompanies = subscribeToCompanies((companiesData) => setCompanies(companiesData));
    return () => { unsubLeads(); unsubCompanies(); };
  }, []);

  // Build template variables when data changes
  useEffect(() => {
    if (leads.length > 0 || companies.length > 0) {
      setTemplateVariables(buildTemplateVariables(leads, companies));
    }
  }, [leads, companies]);

  const loadVersionIntoState = (version: OfferTemplateVersion) => {
    setSelectedVersionId(version.id);
    setVersionName(version.name);
    setOfferTemplate(version.offerTemplate);
    setOfferHeadline(version.offerHeadline);
    setVersionLabels(version.labels || []);
  };

  const selectedVersion = useMemo(
    () => versions.find(v => v.id === selectedVersionId),
    [versions, selectedVersionId]
  );

  const handleVersionChange = (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (version) {
      loadVersionIntoState(version);
    }
  };

  const handleAddVersion = async () => {
    if (!user) return;
    try {
      const newVersion = await addOfferTemplateVersion(
        { name: `Version ${versions.length + 1}`, offerTemplate: '', offerHeadline: '', labels: [] },
        user.uid
      );
      // Reload from the returned version
      setVersions(prev => [...prev, newVersion]);
      loadVersionIntoState(newVersion);
      setSuccess(`Template version "${newVersion.name}" created`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create version');
    }
  };

  const handleDeleteVersion = async () => {
    if (!user || !selectedVersion || selectedVersion.isDefault) return;
    try {
      await deleteOfferTemplateVersion(selectedVersion.id, user.uid);
      setVersions(prev => prev.filter(v => v.id !== selectedVersion.id));
      // Switch to V1
      const v1 = versions.find(v => v.isDefault) || versions[0];
      if (v1) loadVersionIntoState(v1);
      setDeleteDialogOpen(false);
      setSuccess('Template version deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete version');
    }
  };

  const handleSave = async () => {
    if (!user || !selectedVersion) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateOfferTemplateVersion(
        selectedVersion.id,
        { name: versionName, offerTemplate, offerHeadline, labels: versionLabels },
        user.uid
      );
      setSuccess('Template saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleInsertVariable = (variable: string) => {
    setOfferTemplate(prev => prev + variable);
  };

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
  };

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'basic':
        return { icon: <PersonIcon sx={{ fontSize: 14 }} />, color: '#667eea', bgColor: 'rgba(102, 126, 234, 0.08)', type: 'lead' as const };
      case 'outreach':
        return { icon: <EmailIcon sx={{ fontSize: 14 }} />, color: '#667eea', bgColor: 'rgba(102, 126, 234, 0.08)', type: 'lead' as const };
      case 'dates':
        return { icon: <CalendarIcon sx={{ fontSize: 14 }} />, color: '#667eea', bgColor: 'rgba(102, 126, 234, 0.08)', type: 'lead' as const };
      case 'custom':
        return { icon: <TuneIcon sx={{ fontSize: 14 }} />, color: '#667eea', bgColor: 'rgba(102, 126, 234, 0.08)', type: 'lead' as const };
      case 'company':
        return { icon: <BusinessIcon sx={{ fontSize: 14 }} />, color: '#059669', bgColor: 'rgba(5, 150, 105, 0.08)', type: 'company' as const };
      case 'blog_analysis':
        return { icon: <ArticleIcon sx={{ fontSize: 14 }} />, color: '#059669', bgColor: 'rgba(5, 150, 105, 0.08)', type: 'company' as const };
      case 'writing_program':
        return { icon: <CreateIcon sx={{ fontSize: 14 }} />, color: '#059669', bgColor: 'rgba(5, 150, 105, 0.08)', type: 'company' as const };
      default:
        return { icon: <TuneIcon sx={{ fontSize: 14 }} />, color: '#64748b', bgColor: 'rgba(100, 116, 139, 0.08)', type: 'lead' as const };
    }
  };

  // Preview with sample data
  const { headlinePreview, templatePreview } = useMemo(() => {
    const sampleLead: Partial<Lead> = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      company: 'Acme Corporation',
      phone: '+1 (555) 123-4567',
      status: 'qualified',
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-20'),
      outreach: {
        linkedIn: { status: 'sent', profileUrl: 'https://linkedin.com/in/johndoe' },
        email: { status: 'opened' },
      },
      customFields: { lead_owner: 'Sarah Smith', priority: 'High', deal_value: '50000' },
    };
    const sampleCompany: Company | undefined = companies[0];
    const headlineText = offerHeadline ? replaceTemplateVariables(offerHeadline, sampleLead, sampleCompany) : '';
    const messageText = offerTemplate ? replaceTemplateVariables(offerTemplate, sampleLead, sampleCompany) : 'No template yet. Start typing above to see a preview.';
    return { headlinePreview: headlineText, templatePreview: messageText };
  }, [offerTemplate, offerHeadline, companies]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  };

  return (
    <Box>
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

      {/* Version Management Bar */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Template Version</InputLabel>
            <Select
              value={selectedVersionId}
              label="Template Version"
              onChange={(e) => handleVersionChange(e.target.value)}
            >
              {versions.map(v => (
                <MenuItem key={v.id} value={v.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">{v.name}</Typography>
                    {v.isDefault && (
                      <Chip label="Default" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                    {v.labels.length > 0 && (
                      <Chip
                        label={`${v.labels.length} label${v.labels.length > 1 ? 's' : ''}`}
                        size="small"
                        sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(102, 126, 234, 0.1)', color: '#667eea' }}
                      />
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="Add new template version">
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddVersion}
              sx={{
                borderColor: '#667eea',
                color: '#667eea',
                textTransform: 'none',
                '&:hover': { borderColor: '#5568d3', bgcolor: 'rgba(102, 126, 234, 0.05)' },
              }}
            >
              Add Version
            </Button>
          </Tooltip>

          {selectedVersion && !selectedVersion.isDefault && (
            <Tooltip title="Delete this version">
              <IconButton
                size="small"
                onClick={() => setDeleteDialogOpen(true)}
                sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' } }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Version Name & Labels */}
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField
            label="Version Name"
            size="small"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            sx={{ minWidth: 200, bgcolor: 'white' }}
          />

          <Autocomplete
            multiple
            size="small"
            options={labelOptions}
            value={versionLabels}
            onChange={(_, newValue) => setVersionLabels(newValue)}
            freeSolo
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option}
                  label={option}
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                  }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Assigned Labels"
                placeholder="Select labels..."
                sx={{ minWidth: 300, bgcolor: 'white' }}
              />
            )}
          />
        </Box>

        {selectedVersion?.isDefault && versionLabels.length === 0 && (
          <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1, display: 'block' }}>
            Default version is used when no other version matches a company's labels.
          </Typography>
        )}
      </Paper>

      {/* Heading */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        {versionName || 'Offer Template'}
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
        Edit the template for this version. Variables will be replaced with actual lead/company data when copying.
      </Typography>

      {/* Available Variables */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#64748b' }}>
          Available Variables ({templateVariables.length})
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8', mb: 3, display: 'block' }}>
          Click a variable to insert it, or click the copy icon to copy it to clipboard
        </Typography>

        {Object.entries(groupVariablesByCategory(templateVariables)).map(([category, variables]) => {
          const categoryStyle = getCategoryStyle(category);
          return (
            <Box key={category} sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, p: 1,
                  borderRadius: 1, bgcolor: categoryStyle.bgColor,
                  border: `1px solid ${categoryStyle.color}30`,
                }}
              >
                <Box sx={{ color: categoryStyle.color, display: 'flex', alignItems: 'center' }}>
                  {categoryStyle.icon}
                </Box>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: categoryStyle.color, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '13px' }}
                >
                  {getCategoryLabel(category)}
                </Typography>
                <Chip
                  label={categoryStyle.type === 'lead' ? 'LEAD' : 'COMPANY'}
                  size="small"
                  sx={{
                    height: '18px', fontSize: '10px', fontWeight: 700, ml: 'auto',
                    bgcolor: categoryStyle.color, color: 'white', '& .MuiChip-label': { px: 1 },
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {variables.map((variable) => (
                  <Chip
                    key={variable.key}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <code style={{ fontSize: '13px', fontWeight: 600 }}>{variable.key}</code>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          - {variable.description}
                        </Typography>
                      </Box>
                    }
                    onClick={() => handleInsertVariable(variable.key)}
                    onDelete={() => handleCopyVariable(variable.key)}
                    deleteIcon={<CopyIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      bgcolor: 'white', border: `1px solid ${categoryStyle.color}20`, cursor: 'pointer',
                      '&:hover': { bgcolor: categoryStyle.bgColor, borderColor: categoryStyle.color },
                      '& .MuiChip-deleteIcon': { color: categoryStyle.color, '&:hover': { color: categoryStyle.color, opacity: 0.8 } },
                    }}
                  />
                ))}
              </Box>
            </Box>
          );
        })}
      </Paper>

      {/* Headline Field */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
          Offer Headline
        </Typography>
        <TiptapRichTextEditor
          value={offerHeadline}
          onChange={setOfferHeadline}
          placeholder="Enter your offer headline... (e.g., New Blog Idea: {{company_chosen_idea}})"
          height={100}
        />
      </Box>

      {/* Template Editor (Message Body) */}
      <Box sx={{ mb: 2, position: 'relative' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
          Message Body
        </Typography>
        <TiptapRichTextEditor
          value={offerTemplate}
          onChange={setOfferTemplate}
          placeholder="Enter your offer message here... Use double curly braces for variables (e.g., {{name}}, {{company}})."
          height={350}
        />
      </Box>

      {/* Character Count */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          {getHtmlCharCount(offerTemplate)} characters
        </Typography>
        {selectedVersion?.updatedAt && (
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
            Last updated: {formatDate(selectedVersion.updatedAt)}
          </Typography>
        )}
      </Box>

      {/* Preview Section */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Preview (with sample data)
      </Typography>
      <Paper sx={{ p: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', mb: 3, minHeight: 120 }}>
        {headlinePreview && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#64748b', fontSize: '12px', mb: 0.5 }}>
              Headline:
            </Typography>
            <SafeHtmlRenderer html={headlinePreview} sx={{ fontWeight: 600, color: '#1e293b', fontFamily: '"Inter", sans-serif' }} />
          </Box>
        )}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#64748b', fontSize: '12px', mb: 0.5 }}>
            Message:
          </Typography>
          <SafeHtmlRenderer
            html={templatePreview}
            sx={{ fontFamily: '"Inter", sans-serif', lineHeight: 1.6, color: '#1e293b', fontSize: '14px' }}
          />
        </Box>
      </Paper>

      {/* Save Button */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || isHtmlEmpty(offerTemplate)}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textTransform: 'none', px: 4, fontWeight: 600,
            '&:hover': { background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)' },
            '&:disabled': { background: '#e2e8f0', color: '#94a3b8' },
          }}
        >
          {saving ? 'Saving...' : 'Save Template'}
        </Button>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Template Version</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedVersion?.name}</strong>? Companies with matching labels will fall back to the default template.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteVersion} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
