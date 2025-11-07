// src/pages/settings/SettingsPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Alert,
  Chip,
  Paper,
  CircularProgress,
  Divider,
  IconButton,
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
import { AppSettings, DEFAULT_TEMPLATE_VARIABLES, TemplateVariable } from '../../types/settings';
import { AI_PROMPTS, PROMPT_CATEGORIES, PromptMetadata } from '../../data/prompts';
import PromptCard from '../../components/settings/PromptCard';
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
import TiptapRichTextEditor from '../../components/common/TiptapRichTextEditor';
import { SafeHtmlRenderer, getHtmlCharCount, isHtmlEmpty } from '../../utils/htmlHelpers';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [offerTemplate, setOfferTemplate] = useState('');
  const [offerHeadline, setOfferHeadline] = useState('');

  // Custom prompts state (loaded from localStorage)
  const [customPrompts, setCustomPrompts] = useState<Record<string, PromptMetadata>>({});

  // Leads, companies, and dynamic template variables
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>(DEFAULT_TEMPLATE_VARIABLES);

  // Load settings on mount and subscribe to changes
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await getSettings();
        setSettings(data);
        setOfferTemplate(data.offerTemplate);
        setOfferHeadline(data.offerHeadline || '');
      } catch (err) {
        console.error('Error loading settings:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToSettings((updatedSettings) => {
      setSettings(updatedSettings);
      setOfferTemplate(updatedSettings.offerTemplate);
      setOfferHeadline(updatedSettings.offerHeadline || '');
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to leads for dynamic template variables
  useEffect(() => {
    const unsubscribe = subscribeToLeads((leadsData) => {
      setLeads(leadsData);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to companies for dynamic template variables
  useEffect(() => {
    const unsubscribe = subscribeToCompanies((companiesData) => {
      setCompanies(companiesData);
    });

    return () => unsubscribe();
  }, []);

  // Build template variables when leads or companies change
  useEffect(() => {
    if (leads.length > 0 || companies.length > 0) {
      const variables = buildTemplateVariables(leads, companies);
      setTemplateVariables(variables);
    }
  }, [leads, companies]);

  // Load custom prompts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('custom_prompts');
    if (saved) {
      try {
        setCustomPrompts(JSON.parse(saved));
      } catch (err) {
        console.error('Error loading custom prompts:', err);
      }
    }
  }, []);

  // Save custom prompt
  const handleSavePrompt = (updatedPrompt: PromptMetadata) => {
    const newCustomPrompts = {
      ...customPrompts,
      [updatedPrompt.id]: updatedPrompt,
    };
    setCustomPrompts(newCustomPrompts);
    localStorage.setItem('custom_prompts', JSON.stringify(newCustomPrompts));
    setSuccess(`Prompt "${updatedPrompt.name}" saved successfully!`);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Get merged prompt (custom overrides default)
  const getPrompt = (promptId: string): PromptMetadata => {
    const defaultPrompt = AI_PROMPTS.find(p => p.id === promptId);
    const customPrompt = customPrompts[promptId];
    return customPrompt || defaultPrompt!;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSaveOfferTemplate = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateSettings({ offerTemplate, offerHeadline }, user.uid);
      setSuccess('Offer template saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Handle copy to clipboard with feedback
  const handleInsertVariable = (variable: string) => {
    setOfferTemplate((prev) => prev + variable);
  };

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
  };

  // Helper function to get category styling (icon and color)
  const getCategoryStyle = (category: string): { icon: React.ReactNode; color: string; bgColor: string; type: 'lead' | 'company' } => {
    switch (category) {
      case 'basic':
        return {
          icon: <PersonIcon sx={{ fontSize: 14 }} />,
          color: '#667eea',
          bgColor: 'rgba(102, 126, 234, 0.08)',
          type: 'lead'
        };
      case 'outreach':
        return {
          icon: <EmailIcon sx={{ fontSize: 14 }} />,
          color: '#667eea',
          bgColor: 'rgba(102, 126, 234, 0.08)',
          type: 'lead'
        };
      case 'dates':
        return {
          icon: <CalendarIcon sx={{ fontSize: 14 }} />,
          color: '#667eea',
          bgColor: 'rgba(102, 126, 234, 0.08)',
          type: 'lead'
        };
      case 'custom':
        return {
          icon: <TuneIcon sx={{ fontSize: 14 }} />,
          color: '#667eea',
          bgColor: 'rgba(102, 126, 234, 0.08)',
          type: 'lead'
        };
      case 'company':
        return {
          icon: <BusinessIcon sx={{ fontSize: 14 }} />,
          color: '#059669',
          bgColor: 'rgba(5, 150, 105, 0.08)',
          type: 'company'
        };
      case 'blog_analysis':
        return {
          icon: <ArticleIcon sx={{ fontSize: 14 }} />,
          color: '#059669',
          bgColor: 'rgba(5, 150, 105, 0.08)',
          type: 'company'
        };
      case 'writing_program':
        return {
          icon: <CreateIcon sx={{ fontSize: 14 }} />,
          color: '#059669',
          bgColor: 'rgba(5, 150, 105, 0.08)',
          type: 'company'
        };
      default:
        return {
          icon: <TuneIcon sx={{ fontSize: 14 }} />,
          color: '#64748b',
          bgColor: 'rgba(100, 116, 139, 0.08)',
          type: 'lead'
        };
    }
  };

  // Generate preview with sample data
  const { headlinePreview, templatePreview } = useMemo(() => {
    // Create sample lead data for preview (includes custom fields)
    const sampleLead: Partial<Lead> = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      company: 'Acme Corporation',
      phone: '+1 (555) 123-4567',
      status: 'qualified',
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-20'),
      outreach: {
        linkedIn: {
          status: 'sent',
          profileUrl: 'https://linkedin.com/in/johndoe',
        },
        email: {
          status: 'opened',
        },
      },
      customFields: {
        lead_owner: 'Sarah Smith',
        priority: 'High',
        deal_value: '50000',
      },
    };

    // Create sample company data for preview
    const sampleCompany: Company | undefined = companies[0]; // Use first company if available

    const headlineText = offerHeadline
      ? replaceTemplateVariables(offerHeadline, sampleLead, sampleCompany)
      : '';

    const messageText = offerTemplate
      ? replaceTemplateVariables(offerTemplate, sampleLead, sampleCompany)
      : 'No template yet. Start typing above to see a preview.';

    return {
      headlinePreview: headlineText,
      templatePreview: messageText,
    };
  }, [offerTemplate, offerHeadline, companies]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress size={48} sx={{ color: '#667eea' }} />
        <Typography variant="body1" color="text.secondary">
          Loading settings...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 4,
      }}
    >
      {/* Main Content Card */}
      <Box
        sx={{
          maxWidth: 1200,
          margin: '0 auto',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 4, pb: 2 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              mb: 1,
            }}
          >
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure application settings and preferences
          </Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 4 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Offer Template" />
            <Tab label="AI Prompts" />
            <Tab label="General" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ p: 4 }}>
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

          {/* Offer Template Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Global Offer Template
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                Create a message template with variables. This template will be used for all leads in outreach.
              </Typography>

              {/* Available Variables */}
              <Paper sx={{ p: 3, mb: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, mb: 2, color: '#64748b' }}
                >
                  Available Variables ({templateVariables.length})
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', mb: 3, display: 'block' }}>
                  Click a variable to insert it, or click the copy icon to copy it to clipboard
                </Typography>

                {/* Group variables by category */}
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
                            '& .MuiChip-label': {
                              px: 1,
                            },
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {variables.map((variable) => (
                          <Chip
                            key={variable.key}
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <code style={{ fontSize: '13px', fontWeight: 600 }}>
                                  {variable.key}
                                </code>
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
                                '&:hover': {
                                  color: categoryStyle.color,
                                  opacity: 0.8,
                                },
                              },
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
                  placeholder="Enter your offer message here... Use double curly braces for variables (e.g., {{name}}, {{company}}). You can format text with bold, italic, lists, etc."
                  height={350}
                />
              </Box>

              {/* Character Count */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  {getHtmlCharCount(offerTemplate)} characters
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
                {/* Headline Preview */}
                {headlinePreview && (
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        color: '#64748b',
                        fontSize: '12px',
                        mb: 0.5,
                      }}
                    >
                      Headline:
                    </Typography>
                    <SafeHtmlRenderer
                      html={headlinePreview}
                      sx={{
                        fontWeight: 600,
                        color: '#1e293b',
                        fontFamily: '"Inter", sans-serif',
                      }}
                    />
                  </Box>
                )}

                {/* Message Preview */}
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: '#64748b',
                      fontSize: '12px',
                      mb: 0.5,
                    }}
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

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSaveOfferTemplate}
                  disabled={saving || isHtmlEmpty(offerTemplate)}
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
                  {saving ? 'Saving...' : 'Save Template'}
                </Button>
              </Box>
            </Box>
          </TabPanel>

          {/* AI Prompts Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                AI Prompts Library
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                View and manage all AI prompts used throughout the application for content generation,
                blog analysis, and more. Click on any prompt to expand and view its full configuration.
              </Typography>


              {/* Group prompts by category */}
              {PROMPT_CATEGORIES.map((category) => {
                const categoryPrompts = AI_PROMPTS.filter((p) => p.category === category && p.id !== 'linkedin-condensed-insights');
                if (categoryPrompts.length === 0) return null;

                return (
                  <Box key={category} sx={{ mb: 4 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        fontSize: '16px',
                        mb: 2,
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      {category}
                      <Chip
                        label={categoryPrompts.length}
                        size="small"
                        sx={{
                          bgcolor: '#f1f5f9',
                          color: '#64748b',
                          fontWeight: 600,
                          fontSize: '12px',
                          height: 22,
                        }}
                      />
                    </Typography>

                    {categoryPrompts.map((defaultPrompt) => {
                      const prompt = getPrompt(defaultPrompt.id);
                      const isCustomized = !!customPrompts[defaultPrompt.id];
                      return (
                        <Box key={defaultPrompt.id} sx={{ position: 'relative' }}>
                          {isCustomized && (
                            <Chip
                              label="Customized"
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 16,
                                right: 16,
                                zIndex: 1,
                                bgcolor: '#f59e0b',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '11px',
                              }}
                            />
                          )}
                          <PromptCard
                            prompt={prompt}
                            editable={true}
                            onSave={handleSavePrompt}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                );
              })}

              {/* If no prompts */}
              {AI_PROMPTS.length === 0 && (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 8,
                    px: 4,
                  }}
                >
                  <Typography variant="body1" sx={{ color: '#94a3b8' }}>
                    No prompts configured yet.
                  </Typography>
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* General Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                px: 4,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: '#64748b',
                  mb: 2,
                }}
              >
                General Settings
              </Typography>
              <Typography variant="body1" sx={{ color: '#94a3b8', mb: 3, maxWidth: 600, mx: 'auto' }}>
                Configure general application preferences, notifications, and other settings. This feature is coming soon!
              </Typography>
              <Chip
                label="Coming Soon"
                sx={{
                  bgcolor: '#dbeafe',
                  color: '#1e40af',
                  fontWeight: 600,
                  fontSize: '14px',
                  px: 2,
                  py: 2.5,
                }}
              />
            </Box>
          </TabPanel>
        </Box>
      </Box>
    </Box>
  );
};

export default SettingsPage;
