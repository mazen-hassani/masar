import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { projectService } from '../../services';
import Layout from '../../components/layout/Layout';
import { RoleGuard } from '../../components/common/RoleGuard';
import { Role, Project, TrackingStatus, ProjectStatus, Priority } from '../../types';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  overdueProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  teamMembers: number;
}

interface ProjectHealthMetric {
  project: Project;
  healthScore: number;
  riskFactors: string[];
  recommendations: string[];
}

export const EnhancedDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  const {
    data: projects = [],
    isLoading: projectsLoading
  } = useQuery({
    queryKey: ['dashboard-projects'],
    queryFn: () => projectService.getProjects()
  });

  const {
    data: dashboardStats,
    isLoading: statsLoading
  } = useQuery({
    queryKey: ['dashboard-stats', selectedTimeframe],
    queryFn: () => getDashboardStats(projects, selectedTimeframe),
    enabled: projects.length > 0
  });

  // Mock function to calculate dashboard stats
  const getDashboardStats = (projects: Project[], timeframe: string): Promise<DashboardStats> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const activeProjects = projects.filter(p => p.status === ProjectStatus.ACTIVE).length;
        const completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED).length;
        const overdueProjects = projects.filter(p => p.trackingStatus === TrackingStatus.DELAYED || p.trackingStatus === TrackingStatus.CRITICAL).length;
        
        resolve({
          totalProjects: projects.length,
          activeProjects,
          completedProjects,
          overdueProjects,
          totalTasks: projects.reduce((sum, p) => sum + (p.activities?.reduce((aSum, a) => aSum + (a.tasks?.length || 0), 0) || 0), 0),
          completedTasks: Math.floor(projects.length * 156 * 0.7), // Mock data
          overdueTasks: Math.floor(projects.length * 23 * 0.15), // Mock data
          teamMembers: Math.floor(projects.length * 8.5) // Mock data
        });
      }, 300);
    });
  };

  const calculateProjectHealth = (project: Project): ProjectHealthMetric => {
    let healthScore = 100;
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    // Health scoring logic
    if (project.trackingStatus === TrackingStatus.CRITICAL) {
      healthScore -= 40;
      riskFactors.push('Critical tracking status');
      recommendations.push('Immediate attention required');
    } else if (project.trackingStatus === TrackingStatus.DELAYED) {
      healthScore -= 25;
      riskFactors.push('Project behind schedule');
      recommendations.push('Review timeline and resources');
    } else if (project.trackingStatus === TrackingStatus.AT_RISK) {
      healthScore -= 15;
      riskFactors.push('At risk of delays');
      recommendations.push('Monitor closely');
    }

    if (project.percentageComplete < 50 && project.status === ProjectStatus.ACTIVE) {
      healthScore -= 10;
      riskFactors.push('Low completion percentage');
      recommendations.push('Accelerate task completion');
    }

    if (project.priority === Priority.CRITICAL || project.priority === Priority.HIGH) {
      if (project.trackingStatus !== TrackingStatus.ON_TRACK) {
        healthScore -= 20;
        riskFactors.push('High priority project not on track');
        recommendations.push('Escalate to management');
      }
    }

    return {
      project,
      healthScore: Math.max(0, healthScore),
      riskFactors,
      recommendations
    };
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    if (score >= 40) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    if (score >= 60) {
      return (
        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  };

  const renderKPITiles = () => {
    if (statsLoading || !dashboardStats) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-32"></div>
          ))}
        </div>
      );
    }

    const kpiData = [
      {
        title: 'Total Projects',
        value: dashboardStats.totalProjects,
        change: '+12%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        ),
        color: 'blue'
      },
      {
        title: 'Active Projects',
        value: dashboardStats.activeProjects,
        change: '+8%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        color: 'green'
      },
      {
        title: 'Completed Tasks',
        value: dashboardStats.completedTasks,
        change: '+23%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        color: 'purple'
      },
      {
        title: 'Overdue Items',
        value: dashboardStats.overdueTasks,
        change: '-5%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        color: 'red'
      }
    ];

    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      red: 'bg-red-500'
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiData.map((kpi, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-md ${colorClasses[kpi.color]} text-white`}>
                    {kpi.icon}
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{kpi.title}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{kpi.value.toLocaleString()}</div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        kpi.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {kpi.changeType === 'positive' ? (
                          <svg className="self-center flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="self-center flex-shrink-0 h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="sr-only">{kpi.changeType === 'positive' ? 'Increased' : 'Decreased'} by</span>
                        {kpi.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderProjectHealthOverview = () => {
    const healthMetrics = projects.map(calculateProjectHealth);
    const criticalProjects = healthMetrics.filter(m => m.healthScore < 60);
    const healthyProjects = healthMetrics.filter(m => m.healthScore >= 80);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Project Health Summary */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Project Health Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Healthy Projects</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(healthyProjects.length / projects.length) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-900">{healthyProjects.length}/{projects.length}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">At Risk Projects</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ width: `${(criticalProjects.length / projects.length) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-900">{criticalProjects.length}/{projects.length}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <p><strong>Average Health Score:</strong> {Math.round(healthMetrics.reduce((sum, m) => sum + m.healthScore, 0) / healthMetrics.length)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Projects Alert */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Critical Attention Required</h3>
            {criticalProjects.length > 0 ? (
              <div className="space-y-3">
                {criticalProjects.slice(0, 3).map((metric) => (
                  <div key={metric.project.id} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {getHealthIcon(metric.healthScore)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{metric.project.name}</p>
                      <p className="text-sm text-red-600">Health Score: {metric.healthScore}%</p>
                      <div className="mt-1">
                        {metric.riskFactors.slice(0, 2).map((factor, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mr-1">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {criticalProjects.length > 3 && (
                  <div className="text-center">
                    <button className="text-sm text-primary-600 hover:text-primary-500">
                      View {criticalProjects.length - 3} more critical projects
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">All Projects Healthy</h3>
                <p className="mt-1 text-sm text-gray-500">No projects require critical attention at this time.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRecentActivity = () => {
    const recentActivities = [
      { type: 'project_created', message: 'New project "Website Redesign" created', time: '2 hours ago', user: 'John Doe' },
      { type: 'task_completed', message: 'Task "Database Migration" completed', time: '4 hours ago', user: 'Jane Smith' },
      { type: 'project_status', message: 'Project "Mobile App" status changed to In Progress', time: '6 hours ago', user: 'Mike Johnson' },
      { type: 'user_assigned', message: 'Sarah Wilson assigned to "API Development"', time: '1 day ago', user: 'Tom Brown' },
      { type: 'milestone_reached', message: 'Milestone "Phase 1 Complete" reached', time: '2 days ago', user: 'System' }
    ];

    const getActivityIcon = (type: string) => {
      switch (type) {
        case 'project_created':
          return <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
        case 'task_completed':
          return <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
        case 'project_status':
          return <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>;
        case 'user_assigned':
          return <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" /></svg>;
        case 'milestone_reached':
          return <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 100-2h-5zM12 9a1 1 0 100 2h5a1 1 0 100-2h-5zM12 5a1 1 0 100 2h5a1 1 0 100-2h-5zM4 13a2 2 0 114 0v6a2 2 0 11-4 0v-6zM4 5a2 2 0 114 0v4a2 2 0 11-4 0V5z" clipRule="evenodd" /></svg>;
        default:
          return <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>;
      }
    };

    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="flow-root">
            <ul className="-mb-8">
              {recentActivities.map((activity, activityIdx) => (
                <li key={activityIdx}>
                  <div className="relative pb-8">
                    {activityIdx !== recentActivities.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-900">{activity.message}</p>
                          <p className="text-xs text-gray-500">by {activity.user}</p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {activity.time}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  if (projectsLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6 w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const getRoleBasedGreeting = () => {
    switch (user?.role) {
      case Role.PMO:
        return {
          title: `Welcome back, ${user.firstName}!`,
          subtitle: 'Here\'s your organization-wide project portfolio overview'
        };
      case Role.PM:
        return {
          title: `Good day, ${user.firstName}!`,
          subtitle: 'Monitor your projects and team performance'
        };
      case Role.TEAM_MEMBER:
        return {
          title: `Hi ${user.firstName}!`,
          subtitle: 'Track your tasks and project contributions'
        };
      case Role.CLIENT:
        return {
          title: `Hello ${user.firstName}!`,
          subtitle: 'View the progress of your projects'
        };
      default:
        return {
          title: `Welcome back!`,
          subtitle: 'Here\'s your project dashboard'
        };
    }
  };

  const greeting = getRoleBasedGreeting();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              {greeting.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {greeting.subtitle}
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
            <RoleGuard allowedRoles={[Role.PMO, Role.PM]}>
              <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Report
              </button>
            </RoleGuard>
          </div>
        </div>

        {/* KPI Tiles */}
        {renderKPITiles()}

        {/* Project Health Overview */}
        <RoleGuard allowedRoles={[Role.PMO, Role.PM]}>
          {renderProjectHealthOverview()}
        </RoleGuard>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Charts will go here in next step */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Project Progress Over Time</h3>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p>Charts will be implemented in the next step</p>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-1">
            {renderRecentActivity()}
          </div>
        </div>
      </div>
    </Layout>
  );
};