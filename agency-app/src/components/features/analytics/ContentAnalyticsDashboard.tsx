import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import {
  Sync as SyncIcon,
  Dashboard as OverviewIcon,
  LinkedIn as LinkedInIcon,
  Article as TDSIcon,
  MenuBook as MediumIcon,
} from '@mui/icons-material';
import ContentSyncDialog from './ContentSyncDialog';
import ContentOverview from './ContentOverview';
import LinkedInAnalyticsPanel from './LinkedInAnalyticsPanel';
import TDSAnalyticsPanel from './TDSAnalyticsPanel';
import MediumAnalyticsPanel from './MediumAnalyticsPanel';
import MonthlyContentPerformance from './MonthlyContentPerformance';
import {
  getContentAnalyticsSummary,
  getLinkedInDiscovery,
  getLinkedInEngagement,
  getLinkedInPosts,
  getLinkedInFollowers,
  getLinkedInDemographics,
  getTDSSummary,
  getTDSArticles,
  getMediumSummary,
  getMediumStories,
} from '../../../services/api/contentAnalyticsService';
import type {
  ContentAnalyticsSummary,
  LinkedInDiscovery,
  LinkedInDailyEngagement,
  LinkedInTopPost,
  LinkedInFollowers,
  LinkedInDemographics,
  TDSSummary,
  TDSArticle,
  MediumSummary,
  MediumStory,
} from '../../../types/contentAnalytics';

type PlatformView = 'overview' | 'linkedin' | 'tds' | 'medium';

const VALID_VIEWS: PlatformView[] = ['overview', 'linkedin', 'tds', 'medium'];

const ContentAnalyticsDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as PlatformView | null;
  const initialView = viewParam && VALID_VIEWS.includes(viewParam) ? viewParam : 'overview';
  const [activeView, setActiveView] = useState<PlatformView>(initialView);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Summary data
  const [summary, setSummary] = useState<ContentAnalyticsSummary | null>(null);

  // LinkedIn data
  const [linkedInDiscovery, setLinkedInDiscovery] = useState<LinkedInDiscovery | null>(null);
  const [linkedInEngagement, setLinkedInEngagement] = useState<LinkedInDailyEngagement[]>([]);
  const [linkedInPosts, setLinkedInPosts] = useState<LinkedInTopPost[]>([]);
  const [linkedInFollowers, setLinkedInFollowers] = useState<LinkedInFollowers | null>(null);
  const [linkedInDemographics, setLinkedInDemographics] = useState<LinkedInDemographics | null>(null);

  // TDS data
  const [tdsSummary, setTdsSummary] = useState<TDSSummary | null>(null);
  const [tdsArticles, setTdsArticles] = useState<TDSArticle[]>([]);

  // Medium data
  const [mediumSummary, setMediumSummary] = useState<MediumSummary | null>(null);
  const [mediumStories, setMediumStories] = useState<MediumStory[]>([]);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);

      const [
        summaryData,
        discovery,
        engagement,
        posts,
        followers,
        demographics,
        tdsSum,
        tdsArt,
        medSum,
        medSt,
      ] = await Promise.all([
        getContentAnalyticsSummary(),
        getLinkedInDiscovery(),
        getLinkedInEngagement(),
        getLinkedInPosts(),
        getLinkedInFollowers(),
        getLinkedInDemographics(),
        getTDSSummary(),
        getTDSArticles(),
        getMediumSummary(),
        getMediumStories(),
      ]);

      setSummary(summaryData);
      setLinkedInDiscovery(discovery);
      setLinkedInEngagement(engagement);
      setLinkedInPosts(posts);
      setLinkedInFollowers(followers);
      setLinkedInDemographics(demographics);
      setTdsSummary(tdsSum);
      setTdsArticles(tdsArt);
      setMediumSummary(medSum);
      setMediumStories(medSt);
    } catch (error) {
      console.error('Failed to load content analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleSyncSuccess = () => {
    loadAllData();
  };

  const formatSyncTime = (timestamp: any) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const hasAnyData = summary !== null || linkedInPosts.length > 0 || tdsArticles.length > 0 || mediumStories.length > 0;

  return (
    <Box>
      {/* Header Row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        {/* Platform Toggle */}
        <ToggleButtonGroup
          value={activeView}
          exclusive
          onChange={(_, value) => { if (value) { setActiveView(value); setSearchParams({ tab: 'personal', view: value }); } }}
          sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '14px',
              px: 2,
              py: 1,
              border: '1px solid rgba(102, 126, 234, 0.3)',
              '&.Mui-selected': {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4292 100%)',
                },
              },
              '&:hover': {
                background: 'rgba(102, 126, 234, 0.08)',
              },
            },
          }}
        >
          <ToggleButton value="overview">
            <OverviewIcon sx={{ mr: 1, fontSize: 20 }} />
            Overview
          </ToggleButton>
          <ToggleButton value="linkedin">
            <LinkedInIcon sx={{ mr: 1, fontSize: 20 }} />
            LinkedIn
          </ToggleButton>
          <ToggleButton value="tds">
            <TDSIcon sx={{ mr: 1, fontSize: 20 }} />
            TDS
          </ToggleButton>
          <ToggleButton value="medium">
            <MediumIcon sx={{ mr: 1, fontSize: 20 }} />
            Medium
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Sync Button + Last Sync */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {summary?.lastSyncAt && (
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Last sync: {formatSyncTime(summary.lastSyncAt)}
            </Typography>
          )}
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            onClick={() => setSyncDialogOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              textTransform: 'none',
              px: 3,
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4292 100%)',
              },
            }}
          >
            Sync Data
          </Button>
        </Box>
      </Box>

      {/* Platform Sync Timestamps */}
      {summary?.platforms && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            { key: 'linkedin', label: 'LinkedIn', data: summary.platforms.linkedin },
            { key: 'tds', label: 'TDS', data: summary.platforms.tds },
            { key: 'medium', label: 'Medium', data: summary.platforms.medium },
          ].map(({ key, label, data }) => (
            <Typography key={key} variant="caption" sx={{
              color: data ? '#64748b' : '#94a3b8',
              background: 'rgba(255,255,255,0.7)',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontSize: '11px',
            }}>
              {label}: {data ? formatSyncTime(data.lastSyncAt) : 'Not synced'}
            </Typography>
          ))}
        </Box>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      )}

      {/* No Data State */}
      {!loading && !hasAnyData && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No content analytics data yet. Click "Sync Data" to import your LinkedIn, TDS, or Medium analytics.
        </Alert>
      )}

      {/* Content Panels */}
      {!loading && (
        <>
          {activeView === 'overview' && (
            <>
              <ContentOverview
                summary={summary}
                linkedInPosts={linkedInPosts}
                tdsArticles={tdsArticles}
                mediumStories={mediumStories}
                loading={false}
              />
              <Box sx={{ mt: 4 }}>
                <MonthlyContentPerformance
                  linkedInPosts={linkedInPosts}
                  tdsArticles={tdsArticles}
                  mediumStories={mediumStories}
                />
              </Box>
            </>
          )}
          {activeView === 'linkedin' && (
            <LinkedInAnalyticsPanel
              discovery={linkedInDiscovery}
              engagement={linkedInEngagement}
              posts={linkedInPosts}
              followers={linkedInFollowers}
              demographics={linkedInDemographics}
              loading={false}
            />
          )}
          {activeView === 'tds' && (
            <TDSAnalyticsPanel
              summary={tdsSummary}
              articles={tdsArticles}
              loading={false}
            />
          )}
          {activeView === 'medium' && (
            <MediumAnalyticsPanel
              summary={mediumSummary}
              stories={mediumStories}
              loading={false}
            />
          )}
        </>
      )}

      {/* Sync Dialog */}
      <ContentSyncDialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        onSuccess={handleSyncSuccess}
      />
    </Box>
  );
};

export default ContentAnalyticsDashboard;
