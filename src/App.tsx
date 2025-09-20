import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './app/providers';
import { AppLayout } from './components/layout';
import { DashboardPage, SettingsPage } from './pages';
import { CompaniesPage } from './features/companies';
import { IdeasPage } from './features/ideas';
import { PipelinePage } from './features/pipeline';
import { TasksPage } from './features/tasks';
import { AnalyticsPage } from './features/analytics';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/ideas" element={<IdeasPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </AppLayout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
