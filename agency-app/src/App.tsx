// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CssBaseline, Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { PipelineConfigProvider } from './contexts/PipelineConfigContext';
import ProtectedRoute from './ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import ClientManagement from './pages/clients/ClientManagement';
import ClientDetail from './pages/clients/ClientDetail';
import TaskReview from './pages/tasks/TaskReview';
import TeamManagement from './pages/team/TeamManagement';
import WriterPerformance from './pages/team/WriterPerformance';
import ProjectMonitoring from './pages/analytics/ProjectMonitoring';
import WeeklyRevenue from './pages/analytics/WeeklyRevenue';

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
  
  // Routes that need full-height fixed layout (CRM board)
  const fixedHeightRoutes = ['/', '/crm', '/leads'];
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
          <Route path="/clients" element={<ClientManagement />} />
          <Route path="/clients/:clientId" element={<ClientDetail />} />
          <Route path="/review/:taskId" element={<TaskReview />} />
          <Route path="/team" element={<TeamManagement />} />
          <Route path="/writer/:userId" element={<WriterPerformance />} />
          <Route path="/analytics" element={<WeeklyRevenue />} />
          <Route path="/monitoring" element={<ProjectMonitoring />} />
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