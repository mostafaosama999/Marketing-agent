// src/pages/analytics/AnalyticsPage.tsx
import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import LeadAnalytics from './LeadAnalytics';
import CompanyAnalytics from './CompanyAnalytics';

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
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

const AnalyticsPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
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
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            aria-label="analytics tabs"
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
              icon={<TrendingUpIcon />}
              iconPosition="start"
              label="Leads Analytics"
              id="analytics-tab-0"
              aria-controls="analytics-tabpanel-0"
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
              label="Company Analytics"
              id="analytics-tab-1"
              aria-controls="analytics-tabpanel-1"
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

        {/* Tab Panels */}
        <TabPanel value={currentTab} index={0}>
          <LeadAnalytics />
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          <CompanyAnalytics />
        </TabPanel>
      </Box>
    </ThemeProvider>
  );
};

export default AnalyticsPage;
