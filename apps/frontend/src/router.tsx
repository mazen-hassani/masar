// ABOUTME: React Router configuration with public and protected routes
// ABOUTME: Implements role-based access control and nested routing

import { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Role } from "./types";

// Page imports
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/projects/DashboardPage";
import NotFoundPage from "./pages/NotFoundPage";
import LoadingPage from "./pages/LoadingPage";

/**
 * Protected Route Component
 * Redirects to login if not authenticated
 */
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

/**
 * Role-Based Route Component
 * Restricts access to specific roles
 */
interface RoleBasedRouteProps {
  allowedRoles: Role[];
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

/**
 * Public Route Component
 * Redirects to dashboard if already authenticated
 */
const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

/**
 * Layout Wrapper
 * Provides consistent layout for authenticated pages
 */
const LayoutWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
            <nav className="space-x-4">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </a>
              <a href="/projects" className="text-gray-600 hover:text-gray-900">
                Projects
              </a>
              <a href="/profile" className="text-gray-600 hover:text-gray-900">
                Profile
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-gray-500 text-sm">
          <p>&copy; 2024 Task Management Tool. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

/**
 * Route Configuration
 */
export const routes = [
  // Public routes
  {
    path: "/",
    element: <PublicRoute />,
    children: [
      {
        index: true,
        element: <Navigate to="/login" replace />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
    ],
  },

  // Protected routes
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        path: "dashboard",
        element: (
          <LayoutWrapper>
            <DashboardPage />
          </LayoutWrapper>
        ),
      },
      {
        path: "projects",
        element: (
          <LayoutWrapper>
            <Outlet />
          </LayoutWrapper>
        ),
        children: [
          {
            index: true,
            element: <div>Projects List</div>,
          },
          {
            path: ":projectId",
            element: <Outlet />,
            children: [
              {
                path: "dashboard",
                element: <div>Project Dashboard</div>,
              },
              {
                path: "gantt",
                element: <div>Gantt Chart</div>,
              },
              {
                path: "kanban",
                element: <div>Kanban Board</div>,
              },
              {
                path: "settings",
                element: <div>Project Settings</div>,
              },
            ],
          },
        ],
      },
      {
        path: "profile",
        element: (
          <LayoutWrapper>
            <div>User Profile</div>
          </LayoutWrapper>
        ),
      },
      {
        path: "admin",
        element: <RoleBasedRoute allowedRoles={[Role.PMO]} />,
        children: [
          {
            path: "users",
            element: (
              <LayoutWrapper>
                <div>User Management</div>
              </LayoutWrapper>
            ),
          },
          {
            path: "organisations",
            element: (
              <LayoutWrapper>
                <div>Organisation Settings</div>
              </LayoutWrapper>
            ),
          },
        ],
      },
    ],
  },

  // 404
  {
    path: "*",
    element: <NotFoundPage />,
  },
];
