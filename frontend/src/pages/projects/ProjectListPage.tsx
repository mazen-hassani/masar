import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { projectService } from '../../services';
import Layout from '../../components/layout/Layout';
import { RoleGuard } from '../../components/common/RoleGuard';
import { Project, Role, ProjectStatus, TrackingStatus } from '../../types';

interface ProjectFilters {
  search: string;
  status: ProjectStatus | 'ALL';
  trackingStatus: TrackingStatus | 'ALL';
  assignedToMe: boolean;
}

export const ProjectListPage: React.FC = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    status: 'ALL',
    trackingStatus: 'ALL',
    assignedToMe: false
  });

  const {
    data: projects = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['projects', filters],
    queryFn: () => projectService.getProjects(filters)
  });

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Role-based filtering
      if (user?.role === Role.PM && filters.assignedToMe && project.projectManager?.id !== user.id) {
        return false;
      }
      if (user?.role === Role.TEAM_MEMBER && !project.teamMembers?.some(member => member.id === user.id)) {
        return false;
      }
      if (user?.role === Role.CLIENT && project.clientId !== user.id) {
        return false;
      }

      // Search filtering
      if (filters.search && !project.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !project.description?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Status filtering
      if (filters.status !== 'ALL' && project.status !== filters.status) {
        return false;
      }

      // Tracking status filtering
      if (filters.trackingStatus !== 'ALL' && project.trackingStatus !== filters.trackingStatus) {
        return false;
      }

      return true;
    });
  }, [projects, filters, user]);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.PLANNING:
        return 'bg-gray-100 text-gray-800';
      case ProjectStatus.ACTIVE:
        return 'bg-blue-100 text-blue-800';
      case ProjectStatus.ON_HOLD:
        return 'bg-yellow-100 text-yellow-800';
      case ProjectStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case ProjectStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrackingStatusColor = (trackingStatus: TrackingStatus) => {
    switch (trackingStatus) {
      case TrackingStatus.ON_TRACK:
        return 'bg-green-100 text-green-800';
      case TrackingStatus.AT_RISK:
        return 'bg-yellow-100 text-yellow-800';
      case TrackingStatus.DELAYED:
        return 'bg-red-100 text-red-800';
      case TrackingStatus.CRITICAL:
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = (project: Project): number => {
    return project.percentageComplete || 0;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load projects</h3>
            <p className="text-gray-500 mb-4">There was an error loading the projects list.</p>
            <button
              onClick={() => refetch()}
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Projects
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <RoleGuard allowedRoles={[Role.PMO, Role.PM]}>
              <Link
                to="/projects/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </Link>
            </RoleGuard>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Search projects..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as ProjectStatus | 'ALL' }))}
                >
                  <option value="ALL">All Statuses</option>
                  <option value={ProjectStatus.PLANNING}>Planning</option>
                  <option value={ProjectStatus.ACTIVE}>Active</option>
                  <option value={ProjectStatus.ON_HOLD}>On Hold</option>
                  <option value={ProjectStatus.COMPLETED}>Completed</option>
                  <option value={ProjectStatus.CANCELLED}>Cancelled</option>
                </select>
              </div>

              <div>
                <label htmlFor="trackingStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Tracking
                </label>
                <select
                  id="trackingStatus"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={filters.trackingStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, trackingStatus: e.target.value as TrackingStatus | 'ALL' }))}
                >
                  <option value="ALL">All Tracking</option>
                  <option value={TrackingStatus.ON_TRACK}>On Track</option>
                  <option value={TrackingStatus.AT_RISK}>At Risk</option>
                  <option value={TrackingStatus.DELAYED}>Delayed</option>
                  <option value={TrackingStatus.CRITICAL}>Critical</option>
                </select>
              </div>

              <div className="flex items-end">
                {user?.role === Role.PM && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      checked={filters.assignedToMe}
                      onChange={(e) => setFilters(prev => ({ ...prev, assignedToMe: e.target.checked }))}
                    />
                    <span className="ml-2 text-sm text-gray-700">My Projects Only</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredProjects.map((project) => {
              const progress = calculateProgress(project);
              return (
                <li key={project.id}>
                  <Link
                    to={`/projects/${project.id}`}
                    className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-primary-600 truncate">
                              {project.name}
                            </p>
                            {project.description && (
                              <p className="text-sm text-gray-500 truncate mt-1">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          <p>
                            {project.startDate && new Date(project.startDate).toLocaleDateString()}
                            {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString()}`}
                          </p>
                          {project.projectManager && (
                            <>
                              <span className="mx-2">•</span>
                              <p>PM: {project.projectManager.firstName} {project.projectManager.lastName}</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {/* Progress Bar */}
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-500 w-10">{progress}%</span>
                        </div>
                        
                        {/* Status Badges */}
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                            {project.status.replace('_', ' ')}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTrackingStatusColor(project.trackingStatus)}`}>
                            {project.trackingStatus.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {projects.length === 0 
                ? "Get started by creating a new project."
                : "Try adjusting your search criteria or filters."
              }
            </p>
            <RoleGuard allowedRoles={[Role.PMO, Role.PM]}>
              <div className="mt-6">
                <Link
                  to="/projects/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Project
                </Link>
              </div>
            </RoleGuard>
          </div>
        )}
      </div>
    </Layout>
  );
};