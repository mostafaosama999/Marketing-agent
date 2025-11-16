// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CssBaseline, Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { PipelineConfigProvider } from './contexts/PipelineConfigContext';
import ProtectedRoute from './ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import GmailCallback from './pages/auth/GmailCallback';
import TeamManagement from './pages/team/TeamManagement';
import TeamMemberPerformance from './pages/team/TeamMemberPerformance';
import ProjectMonitoring from './pages/analytics/ProjectMonitoring';
import LeadAnalytics from './pages/analytics/LeadAnalytics';
import OutboundAnalytics from './pages/analytics/OutboundAnalytics';
import InboundGeneration from './pages/analytics/InboundGeneration';
import CompaniesPage from './pages/companies/CompaniesPage';
import CompanyDetailPage from './pages/companies/CompanyDetailPage';
import LeadDetailPage from './pages/leads/LeadDetailPage';
import SettingsPage from './pages/settings/SettingsPage';

// Components
import Navbar from './components/layout/Navbar';
import CRMBoard from './components/features/crm/CRMBoard';

// Component to handle different layouts based on route
function AppContent() {
  const location = useLocation();
  
  // Set body class for login page
  React.useEffect(() => {
    if (location.pathname === '/login') {
      document.body.classList.add('login-page');
    } else {
      document.body.classList.remove('login-page');
    }
    return () => {
      document.body.classList.remove('login-page');
    };
  }, [location.pathname]);
  
  // Routes that need full-height fixed layout (CRM board, Companies)
  const fixedHeightRoutes = ['/', '/crm', '/leads', '/companies'];
  const isFixedHeightRoute = fixedHeightRoutes.includes(location.pathname);

  if (isFixedHeightRoute) {
    // Fixed height layout for CRM board
    return (
      <Box sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <Navbar />
        <Box sx={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Routes>
            <Route path="/" element={<CRMBoard />} />
            <Route path="/crm" element={<CRMBoard />} />
            <Route path="/leads" element={<CRMBoard />} />
            <Route path="/companies" element={<CompaniesPage />} />
          </Routes>
        </Box>
      </Box>
    );
  }

  // Normal scrollable layout for other pages
  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Navbar />
      <Box sx={{
        flex: 1,
        overflow: 'auto'
      }}>
        <Routes>
          <Route path="/companies/:companyId" element={<CompanyDetailPage />} />
          <Route path="/leads/:leadId" element={<LeadDetailPage />} />
          <Route path="/team" element={<TeamManagement />} />
          <Route path="/team-member/:userId" element={<TeamMemberPerformance />} />
          <Route path="/analytics" element={<LeadAnalytics />} />
          <Route path="/analytics/outbound" element={<OutboundAnalytics />} />
          <Route path="/inbound-generation" element={<InboundGeneration />} />
          <Route path="/auth/gmail/callback" element={<GmailCallback />} />
          <Route path="/monitoring" element={<ProjectMonitoring />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <AuthProvider>
      <PipelineConfigProvider>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/login" element={<Login onLogin={() => {}} />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppContent />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </PipelineConfigProvider>
    </AuthProvider>
  );
}

export default App;