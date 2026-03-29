// src/pages/analytics/OutboundAnalytics.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import ContentAnalyticsDashboard from '../../components/features/analytics/ContentAnalyticsDashboard';
import CompanyWebsiteAnalytics from '../../components/features/analytics/CompanyWebsiteAnalytics';

// Modern theme
const modernTheme = createTheme({
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inbound-tabpanel-${index}`}
      aria-labelledby={`inbound-tab-${index}`}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

const OutboundAnalytics: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialTab = () => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'company' ? 1 : 0;
  };
  const [currentTab, setCurrentTab] = useState(getInitialTab);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    const tabName = newValue === 1 ? 'company' : 'personal';
    setSearchParams({ tab: tabName });
  };

  return (
    <ThemeProvider theme={modernTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        {/* Fixed Header with Tabs */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Box sx={{ px: 4, pt: 2 }}>
            <Typography variant="h5" sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}>
              Content Analytics
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
              Monitor content marketing performance across LinkedIn, TDS, and Medium
            </Typography>
          </Box>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            aria-label="content analytics tabs"
            sx={{
              px: 4,
              '& .MuiTabs-indicator': {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab
              icon={<PersonIcon />}
              iconPosition="start"
              label="Personal"
              id="inbound-tab-0"
              aria-controls="inbound-tabpanel-0"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '15px',
                minHeight: 64,
                color: '#64748b',
                '&.Mui-selected': {
                  color: '#667eea',
                },
                '&:hover': {
                  color: '#667eea',
                  background: 'rgba(102, 126, 234, 0.05)',
                },
              }}
            />
            <Tab
              icon={<BusinessIcon />}
              iconPosition="start"
              label="Company"
              id="inbound-tab-1"
              aria-controls="inbound-tabpanel-1"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '15px',
                minHeight: 64,
                color: '#64748b',
                '&.Mui-selected': {
                  color: '#667eea',
                },
                '&:hover': {
                  color: '#667eea',
                  background: 'rgba(102, 126, 234, 0.05)',
                },
              }}
            />
          </Tabs>
        </Box>

        {/* Personal Tab Content */}
        <TabPanel value={currentTab} index={0}>
          <Box sx={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            minHeight: 'calc(100vh - 140px)',
            p: 4,
          }}>
            <ContentAnalyticsDashboard />
          </Box>
        </TabPanel>

        {/* Company Tab Content */}
        <TabPanel value={currentTab} index={1}>
          <Box sx={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            minHeight: 'calc(100vh - 140px)',
            p: 4,
          }}>
            <CompanyWebsiteAnalytics />
          </Box>
        </TabPanel>
      </Box>
    </ThemeProvider>
  );
};

export default OutboundAnalytics;
