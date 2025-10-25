// ABOUTME: React Router configuration with public and protected routes
// ABOUTME: Implements role-based access control and nested routing

import React, { ReactNode } from "react";
import { Navigate, Outlet, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useLanguage } from "./context/LanguageContext";
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
  const { t, language, setLanguage } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header - Modern Design */}
      <header className="bg-white shadow-md sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-4">
            {/* Logo and App Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                M
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                  {t('app_name')}
                </h1>
                <p className="text-xs text-gray-500">{t('app_tagline')}</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors"
              >
                {t('dashboard')}
              </Link>
              <Link
                to="/projects"
                className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors"
              >
                {t('projects')}
              </Link>
              <Link
                to="/profile"
                className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors"
              >
                {t('profile')}
              </Link>

              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 border border-gray-300 rounded-lg hover:border-blue-600 transition-all flex items-center gap-2"
                >
                  🌐 {language.toUpperCase()}
                </button>
                {isLanguageOpen && (
                  <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                    <button
                      onClick={() => {
                        setLanguage('en');
                        setIsLanguageOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        language === 'en'
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('ar');
                        setIsLanguageOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        language === 'ar'
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      العربية
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('hi');
                        setIsLanguageOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${
                        language === 'hi'
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      हिन्दी
                    </button>
                  </div>
                )}
              </div>

              {/* Settings Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ⚙️
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                    >
                      {t('settings')}
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      disabled={isLoading}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      {isLoading ? t('loading') : t('sign_out')}
                    </button>
                  </div>
                )}
              </div>
            </nav>

            {/* Mobile Menu */}
            <div className="md:hidden flex items-center gap-3">
              {/* Mobile Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                  className="p-2 text-gray-600 hover:text-blue-600 text-lg"
                >
                  🌐
                </button>
                {isLanguageOpen && (
                  <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                    <button
                      onClick={() => {
                        setLanguage('en');
                        setIsLanguageOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1 text-xs ${
                        language === 'en'
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('ar');
                        setIsLanguageOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1 text-xs ${
                        language === 'ar'
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      العربية
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('hi');
                        setIsLanguageOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1 text-xs ${
                        language === 'hi'
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      हिन्दी
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 hover:text-gray-900 text-2xl"
              >
                ☰
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-16 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                  <Link
                    to="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    {t('dashboard')}
                  </Link>
                  <Link
                    to="/projects"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    {t('projects')}
                  </Link>
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    {t('profile')}
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    disabled={isLoading}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {isLoading ? t('loading') : t('sign_out')}
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
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 text-center text-gray-500 text-xs sm:text-sm">
          <p>&copy; 2024 {t('app_name')}. All rights reserved.</p>
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
