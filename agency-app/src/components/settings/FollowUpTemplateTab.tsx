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
  TextField,
} from '@mui/material';
import {
  Save as SaveIcon,
  ContentCopy as CopyIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Article as ArticleIcon,
  Create as CreateIcon,
  CalendarToday as CalendarIcon,
  Tune as TuneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { getSettings, updateSettings, subscribeToSettings } from '../../services/api/settings';
import { AppSettings, TemplateVariable, DEFAULT_TEMPLATE_VARIABLES } from '../../types/settings';
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
import TiptapRichTextEditor from '../common/TiptapRichTextEditor';
import { SafeHtmlRenderer, getHtmlCharCount, isHtmlEmpty } from '../../utils/htmlHelpers';

export const FollowUpTemplateTab: React.FC = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [followUpTemplate, setFollowUpTemplate] = useState('');
  const [followUpSubject, setFollowUpSubject] = useState('');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>(DEFAULT_TEMPLATE_VARIABLES);

  // Load settings and subscribe
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getSettings();
        setSettings(data);
        setFollowUpTemplate(data.followUpTemplate || '');
        setFollowUpSubject(data.followUpSubject || '');
      } catch (err) {
        console.error('Error loading settings:', err);
        setError('Failed to load settings');
      }
    };

    loadSettings();

    const unsubscribe = subscribeToSettings((updatedSettings) => {
      setSettings(updatedSettings);
      setFollowUpTemplate(updatedSettings.followUpTemplate || '');
      setFollowUpSubject(updatedSettings.followUpSubject || '');
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to leads for template variables
  useEffect(() => {
    const unsubscribe = subscribeToLeads((leadsData) => {
      setLeads(leadsData);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to companies for template variables
  useEffect(() => {
    const unsubscribe = subscribeToCompanies((companiesData) => {
      setCompanies(companiesData);
    });
    return () => unsubscribe();
  }, []);

  // Build template variables when data changes
  useEffect(() => {
    if (leads.length > 0 || companies.length > 0) {
      const variables = buildTemplateVariables(leads, companies);
      setTemplateVariables(variables);
    }
  }, [leads, companies]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateSettings({ followUpTemplate, followUpSubject }, user.uid);
      setSuccess('Follow-up template saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving follow-up template:', err);
      setError(err.message || 'Failed to save follow-up template');
    } finally {
      setSaving(false);
    }
  };

  const handleInsertVariable = (variable: string) => {
    setFollowUpTemplate((prev) => prev + variable);
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

  // Generate preview with sample data
  const { subjectPreview, templatePreview } = useMemo(() => {
    const sampleLead: Partial<Lead> = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      company: 'Acme Corporation',
      phone: '+1 (555) 123-4567',
      status: 'contacted',
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-20'),
      outreach: {
        email: {
          status: 'sent',
          originalSubject: 'Blog Writing Opportunity at Acme Corporation',
        },
      },
      customFields: {
        lead_owner: 'Sarah Smith',
        priority: 'High',
      },
    };

    const sampleCompany: Company | undefined = companies[0];

    const subjectText = followUpSubject
      ? replaceTemplateVariables(followUpSubject, sampleLead, sampleCompany)
      : 'Re: Blog Writing Opportunity at Acme Corporation';

    const messageText = followUpTemplate
      ? replaceTemplateVariables(followUpTemplate, sampleLead, sampleCompany)
      : 'No template yet. Start typing above to see a preview.';

    return {
      subjectPreview: subjectText,
      templatePreview: messageText,
    };
  }, [followUpTemplate, followUpSubject, companies]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Follow-Up Email Template
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
        Create a follow-up message template for leads who haven't replied. This will be sent as a reply
        in the same Gmail thread as the original email.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1.5,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: categoryStyle.bgColor,
                  border: `1px solid ${categoryStyle.color}30`,
                }}
              >
                <Box sx={{ color: categoryStyle.color, display: 'flex', alignItems: 'center' }}>
                  {categoryStyle.icon}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: categoryStyle.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '13px',
                  }}
                >
                  {getCategoryLabel(category)}
                </Typography>
                <Chip
                  label={categoryStyle.type === 'lead' ? 'LEAD' : 'COMPANY'}
                  size="small"
                  sx={{
                    height: '18px',
                    fontSize: '10px',
                    fontWeight: 700,
                    ml: 'auto',
                    bgcolor: categoryStyle.color,
                    color: 'white',
                    '& .MuiChip-label': { px: 1 },
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
                      bgcolor: 'white',
                      border: `1px solid ${categoryStyle.color}20`,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: categoryStyle.bgColor,
                        borderColor: categoryStyle.color,
                      },
                      '& .MuiChip-deleteIcon': {
                        color: categoryStyle.color,
                        '&:hover': { color: categoryStyle.color, opacity: 0.8 },
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          );
        })}
      </Paper>

      {/* Subject Field */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
          Follow-Up Subject (optional)
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8', mb: 1, display: 'block' }}>
          Leave empty to use "Re: original subject" automatically
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder='e.g., Re: {{company}} - Following up on my previous email'
          value={followUpSubject}
          onChange={(e) => setFollowUpSubject(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
            },
          }}
        />
      </Box>

      {/* Template Editor */}
      <Box sx={{ mb: 2, position: 'relative' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
          Follow-Up Message Body
        </Typography>
        <TiptapRichTextEditor
          value={followUpTemplate}
          onChange={setFollowUpTemplate}
          placeholder="Enter your follow-up message here... Use variables like {{name}}, {{company}} for personalization."
          height={350}
        />
      </Box>

      {/* Character Count */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          {getHtmlCharCount(followUpTemplate)} characters
        </Typography>
        {settings?.updatedAt && (
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
            Last updated: {formatDate(settings.updatedAt)}
          </Typography>
        )}
      </Box>

      {/* Preview Section */}
      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Preview (with sample data)
      </Typography>

      <Paper
        sx={{
          p: 3,
          bgcolor: '#f8fafc',
          border: '1px solid #e2e8f0',
          mb: 3,
          minHeight: 120,
        }}
      >
        {/* Subject Preview */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, color: '#64748b', fontSize: '12px', mb: 0.5 }}
          >
            Subject:
          </Typography>
          <Typography
            sx={{ fontWeight: 600, color: '#1e293b', fontFamily: '"Inter", sans-serif' }}
          >
            {subjectPreview}
          </Typography>
        </Box>

        {/* Message Preview */}
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, color: '#64748b', fontSize: '12px', mb: 0.5 }}
          >
            Message:
          </Typography>
          <SafeHtmlRenderer
            html={templatePreview}
            sx={{
              fontFamily: '"Inter", sans-serif',
              lineHeight: 1.6,
              color: '#1e293b',
              fontSize: '14px',
            }}
          />
        </Box>
      </Paper>

      {/* Save Button */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || isHtmlEmpty(followUpTemplate)}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textTransform: 'none',
            px: 4,
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
            },
            '&:disabled': {
              background: '#e2e8f0',
              color: '#94a3b8',
            },
          }}
        >
          {saving ? 'Saving...' : 'Save Follow-Up Template'}
        </Button>
      </Box>
    </Box>
  );
};

export default FollowUpTemplateTab;
