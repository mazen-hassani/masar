import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { UnauthorizedPage } from './pages/auth/UnauthorizedPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { ProjectListPage } from './pages/projects/ProjectListPage';
import { ProjectCreationWizard } from './pages/projects/ProjectCreationWizard';
import { ProjectOverviewPage } from './pages/projects/ProjectOverviewPage';
import { ActivityTaskManager } from './pages/projects/ActivityTaskManager';
import { ProjectGanttPage } from './pages/projects/ProjectGanttPage';
import { EnhancedDashboardPage } from './pages/dashboard/EnhancedDashboardPage';
import { Role } from './types';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              
              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <EnhancedDashboardPage />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <ProjectListPage />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/projects/new"
                element={
                  <ProtectedRoute requiredRoles={[Role.PMO, Role.PM]}>
                    <ProjectCreationWizard />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/projects/:id"
                element={
                  <ProtectedRoute>
                    <ProjectOverviewPage />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/projects/:id/activities"
                element={
                  <ProtectedRoute>
                    <ActivityTaskManager />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/projects/:id/gantt"
                element={
                  <ProtectedRoute>
                    <ProjectGanttPage />
                  </ProtectedRoute>
                }
              />
              
              {/* PMO-only routes */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute requiredRoles={[Role.PMO]}>
                    <div className="p-8">
                      <h1 className="text-2xl font-bold">Admin Panel</h1>
                      <p>PMO administration features coming soon...</p>
                    </div>
                  </ProtectedRoute>
                }
              />
              
              {/* Project routes (PM and above) */}
              <Route
                path="/projects/:id/*"
                element={
                  <ProtectedRoute requiredRoles={[Role.PMO, Role.PM]}>
                    <div className="p-8">
                      <h1 className="text-2xl font-bold">Project Management</h1>
                      <p>Project details, Gantt charts, and Kanban boards coming soon...</p>
                    </div>
                  </ProtectedRoute>
                }
              />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* 404 route */}
              <Route
                path="*"
                element={
                  <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900">404</h1>
                      <p className="mt-2 text-gray-600">Page not found</p>
                      <a href="/dashboard" className="mt-4 inline-block text-primary-600 hover:text-primary-500">
                        Go to Dashboard
                      </a>
                    </div>
                  </div>
                }
              />
            </Routes>
          </div>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
