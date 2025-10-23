// ABOUTME: Project dashboard landing page showing overview and analytics
// ABOUTME: Displays user information, project metrics, and key performance indicators

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardContent, Alert } from "../../components/common";
import {
  ProgressChart,
  StatCard,
  BarChart,
  PieChart,
} from "../../components/charts";
import * as analyticsService from "../../services/analyticsService";

interface DashboardData {
  projectMetrics: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    onTrackProjects: number;
    atRiskProjects: number;
    offTrackProjects: number;
  };
  taskMetrics: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    completionRate: number;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const analytics = await analyticsService.getDashboardAnalytics();
      setDashboardData({
        projectMetrics: analytics.projectMetrics,
        taskMetrics: analytics.taskMetrics,
      });
    } catch (err) {
      // Gracefully handle analytics load failure with mock data
      setDashboardData({
        projectMetrics: {
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          onTrackProjects: 0,
          atRiskProjects: 0,
          offTrackProjects: 0,
        },
        taskMetrics: {
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          completionRate: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome, {user?.firstName || "User"}!
        </h1>
        <p className="text-blue-100">
          Here's an overview of your projects, tasks, and performance metrics
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error" title="Error" message={error} />
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Project Metrics */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Project Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                label="Total Projects"
                value={dashboardData?.projectMetrics.totalProjects || 0}
                icon="📊"
                color="blue"
              />
              <StatCard
                label="Active Projects"
                value={dashboardData?.projectMetrics.activeProjects || 0}
                icon="🚀"
                color="green"
              />
              <StatCard
                label="Completed Projects"
                value={dashboardData?.projectMetrics.completedProjects || 0}
                icon="✅"
                color="green"
              />
              <StatCard
                label="On Track"
                value={dashboardData?.projectMetrics.onTrackProjects || 0}
                icon="✓"
                color="green"
              />
              <StatCard
                label="At Risk"
                value={dashboardData?.projectMetrics.atRiskProjects || 0}
                icon="⚠"
                color="yellow"
              />
              <StatCard
                label="Off Track"
                value={dashboardData?.projectMetrics.offTrackProjects || 0}
                icon="❌"
                color="red"
              />
            </div>
          </div>

          {/* Task Metrics */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Task Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                label="Total Tasks"
                value={dashboardData?.taskMetrics.totalTasks || 0}
                icon="📋"
                color="blue"
              />
              <StatCard
                label="Completed"
                value={dashboardData?.taskMetrics.completedTasks || 0}
                icon="✓"
                color="green"
              />
              <StatCard
                label="In Progress"
                value={dashboardData?.taskMetrics.inProgressTasks || 0}
                icon="⏳"
                color="blue"
              />
              <StatCard
                label="Overdue"
                value={dashboardData?.taskMetrics.overdueTasks || 0}
                icon="🔔"
                color="red"
              />
              <StatCard
                label="Completion Rate"
                value={`${Math.round(dashboardData?.taskMetrics.completionRate || 0)}%`}
                icon="📈"
                color="green"
              />
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Distribution */}
            <Card>
              <CardContent className="pt-6">
                <PieChart
                  title="Task Distribution"
                  data={[
                    {
                      label: "Completed",
                      value: dashboardData?.taskMetrics.completedTasks || 0,
                      color: "#10b981",
                    },
                    {
                      label: "In Progress",
                      value: dashboardData?.taskMetrics.inProgressTasks || 0,
                      color: "#3b82f6",
                    },
                    {
                      label: "Overdue",
                      value: dashboardData?.taskMetrics.overdueTasks || 0,
                      color: "#ef4444",
                    },
                  ]}
                  size="md"
                />
              </CardContent>
            </Card>

            {/* Project Status */}
            <Card>
              <CardContent className="pt-6">
                <BarChart
                  title="Project Status"
                  data={[
                    {
                      label: "On Track",
                      value: dashboardData?.projectMetrics.onTrackProjects || 0,
                      color: "#10b981",
                    },
                    {
                      label: "At Risk",
                      value: dashboardData?.projectMetrics.atRiskProjects || 0,
                      color: "#f59e0b",
                    },
                    {
                      label: "Off Track",
                      value: dashboardData?.projectMetrics.offTrackProjects || 0,
                      color: "#ef4444",
                    },
                  ]}
                  height={250}
                />
              </CardContent>
            </Card>
          </div>

          {/* Overall Completion Progress */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">
                Overall Completion
              </h2>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center py-8">
                <ProgressChart
                  percentage={dashboardData?.taskMetrics.completionRate || 0}
                  label="Task Completion Rate"
                  size="lg"
                />
              </div>
            </CardContent>
          </Card>

          {/* User Info Section */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">
                Profile Information
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Name</p>
                  <p className="text-gray-900 font-medium">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Email</p>
                  <p className="text-gray-900 font-medium">{user?.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Role</p>
                  <p className="text-gray-900 font-medium">{user?.role || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Organisation</p>
                  <p className="text-gray-900 font-medium text-xs">
                    {user?.organisationId || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
