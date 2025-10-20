import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './app/providers';
import { AppLayout } from './components/layout';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth';
import { CircularProgress, Box } from '@mui/material';

// Lazy load all page components for better code splitting
// This reduces initial bundle size by ~60-70%
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CompaniesPage = lazy(() => import('./features/companies/pages/CompaniesPage'));
const CRMPage = lazy(() => import('./features/crm/pages/CRMPage'));
const CompaniesManagementPage = lazy(() => import('./features/crm/pages/CompaniesManagementPage'));
const IdeasPage = lazy(() => import('./features/ideas/pages/IdeasPage'));
const PipelinePage = lazy(() => import('./features/pipeline/pages/PipelinePage'));
const TasksPage = lazy(() => import('./features/tasks/pages/TasksPage'));
const AnalyticsPage = lazy(() => import('./features/analytics/pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Loading fallback component shown while pages load
const LoadingFallback = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="400px"
    flexDirection="column"
    gap={2}
  >
    <CircularProgress />
    <Box sx={{ color: 'text.secondary', fontSize: '14px' }}>
      Loading...
    </Box>
  </Box>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ProtectedRoute>
            <AppLayout>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/companies-research" element={<CompaniesPage />} />
                  <Route path="/companies" element={<CompaniesManagementPage />} />
                  <Route path="/ideas" element={<IdeasPage />} />
                  <Route path="/pipeline" element={<PipelinePage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/crm" element={<CRMPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </Suspense>
            </AppLayout>
          </ProtectedRoute>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
