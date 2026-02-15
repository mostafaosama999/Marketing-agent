// src/pages/settings/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { getSettings, subscribeToSettings } from '../../services/api/settings';
import { AppSettings } from '../../types/settings';
import { AI_PROMPTS, PROMPT_CATEGORIES, PromptMetadata } from '../../data/prompts';
import PromptCard from '../../components/settings/PromptCard';
import { ReleaseNotesTab } from '../../components/settings/ReleaseNotesTab';
import { FieldDefinitionsTab } from '../../components/settings/FieldDefinitionsTab';
import { GmailIntegrationTab } from '../../components/settings/GmailIntegrationTab';
import { FollowUpTemplateTab } from '../../components/settings/FollowUpTemplateTab';
import { OfferTemplateTab } from '../../components/settings/OfferTemplateTab';

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

const TAB_SLUGS = [
  'offer-template',
  'follow-up-template',
  'ai-prompts',
  'release-notes',
  'field-definitions',
  'integrations',
] as const;

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tabValue = Math.max(0, TAB_SLUGS.indexOf(tab as any));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Custom prompts state (loaded from localStorage)
  const [customPrompts, setCustomPrompts] = useState<Record<string, PromptMetadata>>({});

  // Load settings on mount and subscribe to changes
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await getSettings();
        setSettings(data);
      } catch (err) {
        console.error('Error loading settings:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    const unsubscribe = subscribeToSettings((updatedSettings) => {
      setSettings(updatedSettings);
    });

    return () => unsubscribe();
  }, []);

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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    navigate(`/settings/${TAB_SLUGS[newValue]}`, { replace: true });
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
            <Tab label="Follow-Up Template" />
            <Tab label="AI Prompts" />
            <Tab label="Release Notes" />
            <Tab label="Field Definitions" />
            <Tab label="Integrations" />
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
            <OfferTemplateTab />
          </TabPanel>

          {/* Follow-Up Template Tab */}
          <TabPanel value={tabValue} index={1}>
            <FollowUpTemplateTab />
          </TabPanel>

          {/* AI Prompts Tab */}
          <TabPanel value={tabValue} index={2}>
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

          {/* Release Notes Tab */}
          <TabPanel value={tabValue} index={3}>
            <ReleaseNotesTab />
          </TabPanel>

          {/* Field Definitions Tab */}
          <TabPanel value={tabValue} index={4}>
            <FieldDefinitionsTab />
          </TabPanel>

          {/* Integrations Tab */}
          <TabPanel value={tabValue} index={5}>
            <GmailIntegrationTab />
          </TabPanel>
        </Box>
      </Box>
    </Box>
  );
};

export default SettingsPage;
