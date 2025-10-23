// ABOUTME: Project dashboard landing page showing overview and quick stats
// ABOUTME: Displays user information, recent projects, and navigation options

import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardContent } from "../../components/common";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome, {user?.firstName || "User"}!
        </h1>
        <p className="text-blue-100">
          Here's an overview of your projects and tasks
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">0</div>
              <p className="text-gray-600 text-sm mt-1">Total Projects</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">0</div>
              <p className="text-gray-600 text-sm mt-1">Active Tasks</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">0</div>
              <p className="text-gray-600 text-sm mt-1">Due Soon</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">0</div>
              <p className="text-gray-600 text-sm mt-1">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects Section */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500">
              No projects yet. Create one to get started!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* User Info Section */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
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
              <p className="text-gray-600 text-sm">Organisation ID</p>
              <p className="text-gray-900 font-medium text-xs">
                {user?.organisationId || "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
