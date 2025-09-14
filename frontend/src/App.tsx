import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { UnauthorizedPage } from './pages/auth/UnauthorizedPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              
              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
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
  );
}

export default App;
