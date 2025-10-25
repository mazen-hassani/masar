// ABOUTME: React Router configuration with public and protected routes
// ABOUTME: Implements role-based access control and nested routing

import React, { ReactNode } from "react";
import { Navigate, Outlet, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Role } from "./types";

// Page imports
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import DashboardPage from "./pages/projects/DashboardPage";
import ProjectsPage from "./pages/projects/ProjectsPage";
import ProjectDetailPage from "./pages/projects/ProjectDetailPage";
import ActivityDetailPage from "./pages/projects/ActivityDetailPage";
import GanttPage from "./pages/projects/GanttPage";
import KanbanPage from "./pages/projects/KanbanPage";
import ProfilePage from "./pages/ProfilePage";
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
  const { logout, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-4">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">📊 Task Manager</h1>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Dashboard
              </Link>
              <Link to="/projects" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Projects
              </Link>
              <Link to="/profile" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Profile
              </Link>
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center gap-1"
                >
                  ⚙️
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Account Settings
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      disabled={isLoading}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      {isLoading ? "Signing out..." : "Sign Out"}
                    </button>
                  </div>
                )}
              </div>
            </nav>

            {/* Mobile Menu */}
            <div className="md:hidden relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 hover:text-gray-900 text-2xl"
              >
                ☰
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                  <Link
                    to="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/projects"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Projects
                  </Link>
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    disabled={isLoading}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    {isLoading ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-center text-gray-500 text-xs sm:text-sm">
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
      {
        path: "forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "reset-password",
        element: <ResetPasswordPage />,
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
            element: <ProjectsPage />,
          },
          {
            path: ":projectId",
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <ProjectDetailPage />,
              },
              {
                path: "dashboard",
                element: <div>Project Dashboard</div>,
              },
              {
                path: "activities/:activityId",
                element: <ActivityDetailPage />,
              },
              {
                path: "gantt",
                element: <GanttPage />,
              },
              {
                path: "kanban",
                element: <KanbanPage />,
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
            <ProfilePage />
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
